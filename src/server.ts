import { cleanEventName, parseProperties } from "./properties";
import type { EventProperties } from "./types";

declare const __PKG_VERSION__: string;

const SDK_NAME = "@tynoc/analytics/server";
const TIMEOUT_MS = 3000;

export interface ServerTrackOptions {
  /** Request headers, used to read the page URL and the deployment host. */
  headers?: Headers | Record<string, string | string[] | undefined>;
  /** Full origin to send to, e.g. "https://my-app.deploy.tynoc.com". Defaults to TYNOC_URL. */
  baseUrl?: string;
  /** Page URL the event belongs to. Defaults to the request referer. */
  url?: string;
}

function env(name: string): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

function readHeader(headers: ServerTrackOptions["headers"], name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function resolveBaseUrl(options: ServerTrackOptions): string | null {
  const explicit = options.baseUrl || env("TYNOC_URL");
  if (explicit) {
    const withScheme = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withScheme.replace(/\/+$/, "");
  }
  const host = readHeader(options.headers, "x-forwarded-host") || readHeader(options.headers, "host");
  return host ? `https://${host}` : null;
}

function log(message: string): void {
  if (env("NODE_ENV") === "development") {
    // eslint-disable-next-line no-console
    console.log(`[Tynoc Web Analytics] ${message}`);
  }
}

/**
 * Tracks a custom event from server code (route handlers, server actions).
 * Never throws. Resolves when the event has been sent or dropped.
 */
export async function track(
  name: string,
  properties?: EventProperties,
  options: ServerTrackOptions = {},
): Promise<void> {
  try {
    const eventName = cleanEventName(name);
    if (!eventName) {
      log("Event name must be a non-empty string.");
      return;
    }
    const parsed = parseProperties(properties);
    if (!parsed.ok) {
      log(parsed.error || "Invalid event properties.");
      return;
    }
    const baseUrl = resolveBaseUrl(options);
    if (!baseUrl) {
      log("Skipped server event: TYNOC_URL is not set and no request headers were given.");
      return;
    }
    if (env("NODE_ENV") === "development") {
      log(`[event] ${eventName} ${JSON.stringify(parsed.data ?? {})}`);
      return;
    }

    const body = {
      v: 1,
      type: "event",
      source: "server",
      name: eventName,
      data: parsed.data,
      url: options.url || readHeader(options.headers, "referer") || baseUrl,
      route: null,
      referrer: null,
      sdkn: SDK_NAME,
      sdkv: __PKG_VERSION__,
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : undefined;
    try {
      const response = await fetch(`${baseUrl}/_tynoc/insights/event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller?.signal,
      });
      if (!response.ok) log(`Server event was not accepted (HTTP ${response.status}).`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (error) {
    log(`Failed to send server event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export type { EventProperties } from "./types";
