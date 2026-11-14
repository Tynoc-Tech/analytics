import { cleanEventName, parseProperties } from "./properties";
import { call, initQueue, isBrowser } from "./queue";
import type { AnalyticsProps, EventProperties, Mode } from "./types";

declare const __PKG_VERSION__: string;

export const SDK_NAME = "@tynoc/analytics";
export const SDK_VERSION: string = __PKG_VERSION__;
export const DEFAULT_ENDPOINT = "/_tynoc/insights";
const SCRIPT_MARKER = "data-tynoc-analytics";

function detectEnvironment(): "development" | "production" {
  try {
    const env = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
    if (env === "development" || env === "test") return "development";
  } catch {
    // process is not available in this runtime
  }
  return "production";
}

let currentMode: "development" | "production" = "production";

function resolveMode(mode: Mode = "auto"): "development" | "production" {
  currentMode = mode === "auto" ? detectEnvironment() : mode;
  return currentMode;
}

export function isDevelopment(): boolean {
  return currentMode === "development";
}

/**
 * Adds the Tynoc Web Analytics script to the page. Safe to call more than once.
 */
export function inject(props: AnalyticsProps = {}): void {
  if (!isBrowser()) return;
  const mode = resolveMode(props.mode);
  initQueue();

  if (props.beforeSend) call("beforeSend", props.beforeSend);

  if (document.head.querySelector(`script[${SCRIPT_MARKER}]`)) return;

  const endpoint = (props.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");
  const script = document.createElement("script");
  script.src = props.scriptSrc || `${endpoint}/script.js`;
  script.defer = true;
  script.setAttribute(SCRIPT_MARKER, "");
  script.dataset.sdkn = SDK_NAME + (props.framework ? `/${props.framework}` : "");
  script.dataset.sdkv = SDK_VERSION;
  script.dataset.mode = mode;
  if (props.endpoint) script.dataset.endpoint = endpoint;
  if (props.disableAutoTrack) script.dataset.disableAutoTrack = "1";
  const debug = props.debug ?? mode === "development";
  if (debug) script.dataset.debug = "true";

  script.onerror = () => {
    // eslint-disable-next-line no-console
    console.log(
      `[Tynoc Web Analytics] Failed to load script from ${script.src}. ` +
        "Enable Web Analytics in your Tynoc project settings and redeploy, or check for content blockers.",
    );
  };

  document.head.appendChild(script);
}

/** Sends a pageview. Used by framework integrations when the route changes. */
export function pageview(options: { route?: string | null; path?: string | null } = {}): void {
  call("pageview", { route: options.route ?? null, path: options.path ?? null });
}

/** Tracks a custom event from the browser. */
export function track(name: string, properties?: EventProperties): void {
  if (!isBrowser()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Tynoc Web Analytics] track() from '@tynoc/analytics' only works in the browser. " +
        "Use '@tynoc/analytics/server' on the server.",
    );
    return;
  }
  const eventName = cleanEventName(name);
  if (!eventName) {
    if (isDevelopment()) console.error("[Tynoc Web Analytics] Event name must be a non-empty string.");
    return;
  }
  const parsed = parseProperties(properties);
  if (!parsed.ok) {
    if (isDevelopment()) console.error(`[Tynoc Web Analytics] ${parsed.error}`);
    return;
  }
  call("event", { name: eventName, data: parsed.data });
}

export type { AnalyticsProps, BeforeSend, BeforeSendEvent, EventProperties, Mode } from "./types";
export { computeRoute } from "./route";

const analytics: { inject: typeof inject; track: typeof track; pageview: typeof pageview } = {
  inject,
  track,
  pageview,
};
export default analytics;
