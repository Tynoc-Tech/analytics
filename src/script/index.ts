/*
 * Tynoc Web Analytics browser script.
 * Built as a small IIFE (dist/script.js) and served from /_tynoc/insights/script.js.
 * No cookies, no local storage, no personal data.
 */

import { parseProperties } from "../properties";
import type { EventProperties } from "../types";

type Payload = Record<string, unknown>;
type BeforeSendEvent = { type: "pageview" | "event"; url: string };
type BeforeSend = (event: BeforeSendEvent) => BeforeSendEvent | null | undefined;

const ALLOWED_QUERY = /^(utm_[a-z_]+|ref|source|via)$/i;
const DEFAULT_ENDPOINT = "/_tynoc/insights";

function findScript(): HTMLScriptElement | null {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current) return current;
  return (
    document.querySelector<HTMLScriptElement>("script[data-tynoc-analytics]") ||
    document.querySelector<HTMLScriptElement>('script[src*="/_tynoc/insights/script.js"]')
  );
}

export function cleanUrl(href: string): string {
  try {
    const url = new URL(href);
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (ALLOWED_QUERY.test(key)) kept.append(key, value);
    });
    const query = kept.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return href.split("#")[0].split("?")[0];
  }
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  );
}

function externalReferrer(): string | null {
  const ref = document.referrer;
  if (!ref) return null;
  try {
    const url = new URL(ref);
    if (url.host === location.host) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

export function start(): void {
  if (typeof window === "undefined" || window.tynocInsightsLoaded) return;
  window.tynocInsightsLoaded = true;

  const script = findScript();
  const data = script ? script.dataset : ({} as DOMStringMap);
  const endpoint = (data.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");
  const mode = data.mode || (isLocalHost(location.hostname) ? "development" : "production");
  const dev = mode === "development";
  const debug = data.debug === "true" || (dev && data.debug !== "false");
  const autoTrack = !data.disableAutoTrack;
  const sdkn = data.sdkn || "script";
  const sdkv = data.sdkv || "";

  let beforeSend: BeforeSend | null = null;
  let lastPath: string | null = null;
  let firstView = true;

  function log(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    if (debug) console.log("[Tynoc Web Analytics]", ...args);
  }

  function deliver(path: "view" | "event", body: Payload): void {
    if (dev) {
      log(`[${body.type === "event" ? "event" : "pageview"}]`, body.type === "event" ? body.name : body.url, body);
      return;
    }
    log(body.type, body);
    const target = `${endpoint}/${path}`;
    const json = JSON.stringify(body);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(target, new Blob([json], { type: "application/json" }))) {
        return;
      }
    } catch {
      // fall back to fetch
    }
    try {
      void fetch(target, {
        method: "POST",
        body: json,
        headers: { "content-type": "application/json" },
        keepalive: true,
        credentials: "omit",
      }).catch(() => undefined);
    } catch {
      // never break the page
    }
  }

  function prepare(type: "pageview" | "event"): string | null {
    if (navigator.webdriver && !dev) return null;
    let event: BeforeSendEvent | null | undefined = { type, url: cleanUrl(location.href) };
    if (beforeSend) {
      try {
        event = beforeSend(event);
      } catch (error) {
        log("beforeSend threw an error. The event was dropped.", error);
        return null;
      }
    }
    if (!event || typeof event.url !== "string") {
      log(`${type} dropped by beforeSend`);
      return null;
    }
    return cleanUrl(event.url);
  }

  function pageview(options?: { route?: string | null; path?: string | null }): void {
    const current = (options && options.path) || location.pathname;
    const key = current + location.search;
    if (key === lastPath) return;
    lastPath = key;

    const url = prepare("pageview");
    if (!url) return;
    deliver("view", {
      v: 1,
      type: "pageview",
      source: "browser",
      url,
      route: (options && options.route) || null,
      referrer: firstView ? externalReferrer() : null,
      sdkn,
      sdkv,
    });
    firstView = false;
  }

  function event(payload: { name?: unknown; data?: unknown } | undefined): void {
    const name = payload && typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
      log("Event name must be a non-empty string.");
      return;
    }
    const parsed = parseProperties(payload!.data as EventProperties | undefined);
    if (!parsed.ok) {
      log(parsed.error);
      return;
    }
    const url = prepare("event");
    if (!url) return;
    deliver("event", {
      v: 1,
      type: "event",
      source: "browser",
      url,
      route: null,
      referrer: null,
      name: name.slice(0, 255),
      data: parsed.data,
      sdkn,
      sdkv,
    });
  }

  function command(name: unknown, arg?: unknown): void {
    if (name === "pageview") pageview(arg as { route?: string | null; path?: string | null });
    else if (name === "event") event(arg as { name?: unknown; data?: unknown });
    else if (name === "beforeSend" && typeof arg === "function") beforeSend = arg as BeforeSend;
  }

  const queued = (window.tynoc && window.tynoc.q) || [];
  const api = function (name: unknown, arg?: unknown) {
    command(name, arg);
  } as unknown as NonNullable<Window["tynoc"]>;
  window.tynoc = api;

  // beforeSend must be set before replaying pageviews and events.
  for (const args of queued) if (args[0] === "beforeSend") command(args[0], args[1]);
  for (const args of queued) if (args[0] !== "beforeSend") command(args[0], args[1]);

  if (autoTrack) {
    pageview();
    const originalPush = history.pushState;
    history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = originalPush.apply(this, args);
      setTimeout(() => pageview(), 0);
      return result;
    };
    const originalReplace = history.replaceState;
    history.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
      const result = originalReplace.apply(this, args);
      setTimeout(() => pageview(), 0);
      return result;
    };
    window.addEventListener("popstate", () => pageview());
  }
}
