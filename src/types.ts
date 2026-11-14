export type Mode = "auto" | "development" | "production";

export type AllowedPropertyValue = string | number | boolean | null | undefined;

export type EventProperties = Record<string, AllowedPropertyValue>;

export interface BeforeSendEvent {
  type: "pageview" | "event";
  url: string;
}

export type BeforeSend = (event: BeforeSendEvent) => BeforeSendEvent | null;

export interface AnalyticsProps {
  /** Override automatic environment detection. Default: "auto". */
  mode?: Mode;
  /** Log events to the browser console. Default: true in development. */
  debug?: boolean;
  /** Change or drop events before they are sent. Return null to drop. */
  beforeSend?: BeforeSend;
  /** Custom ingest base path. Default: "/_tynoc/insights". */
  endpoint?: string;
  /** Custom script URL. Default: "<endpoint>/script.js". */
  scriptSrc?: string;
  /** Disable automatic pageview tracking (used by framework integrations). */
  disableAutoTrack?: boolean;
  /** Route pattern for the current page, e.g. "/blog/[slug]". */
  route?: string | null;
  /** Current path, used with `route` by framework integrations. */
  path?: string | null;
  /** Internal: integration name. */
  framework?: string;
}

export interface TynocQueueCommand {
  0: "pageview" | "event" | "beforeSend";
  1?: unknown;
  length: number;
}

export interface TynocGlobal {
  (command: "pageview", payload?: { route?: string | null; path?: string | null }): void;
  (command: "event", payload: { name: string; data?: Record<string, unknown> }): void;
  (command: "beforeSend", fn: BeforeSend): void;
  q?: unknown[][];
}

declare global {
  interface Window {
    tynoc?: TynocGlobal;
    tynocInsightsLoaded?: boolean;
  }
}
