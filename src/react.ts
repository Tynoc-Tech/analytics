import { createElement, Fragment, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { inject, pageview, track } from "./index";
import type { AnalyticsProps } from "./types";

/**
 * Tynoc Web Analytics for React apps.
 * Pass `route` and `path` to group dynamic pages (for example "/blog/[slug]").
 * Without them, the script tracks pageviews automatically.
 */
export function Analytics(props: AnalyticsProps): ReactElement {
  const manual = props.route !== undefined || props.disableAutoTrack === true;
  const beforeSendRef = useRef(props.beforeSend);
  beforeSendRef.current = props.beforeSend;

  useEffect(() => {
    inject({
      ...props,
      framework: props.framework || "react",
      disableAutoTrack: manual,
      beforeSend: props.beforeSend ? (event) => beforeSendRef.current?.(event) ?? null : undefined,
    });
    // Inject runs once; later prop changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.route !== undefined && props.route !== null) {
      pageview({ route: props.route, path: props.path ?? null });
    }
  }, [props.route, props.path]);

  return createElement(Fragment, null);
}

export { track };
export type { AnalyticsProps, BeforeSend, BeforeSendEvent, EventProperties } from "./types";
