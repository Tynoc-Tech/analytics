import { createElement } from "react";
import type { ReactElement } from "react";
import { useParams, usePathname } from "next/navigation";
import { Analytics as ReactAnalytics } from "./react";
import { computeRoute } from "./route";
import { track } from "./index";
import type { AnalyticsProps } from "./types";

export type NextAnalyticsProps = Omit<AnalyticsProps, "route" | "path" | "framework" | "disableAutoTrack">;

/**
 * Tynoc Web Analytics for Next.js. Add it once in your root layout.
 * Dynamic pages are grouped by route, for example "/blog/[slug]".
 */
export function Analytics(props: NextAnalyticsProps): ReactElement {
  const pathname = usePathname();
  const params = useParams() as Record<string, string | string[]> | null;
  const route = computeRoute(pathname, params);

  return createElement(ReactAnalytics, {
    ...props,
    framework: "next",
    disableAutoTrack: true,
    route: route ?? pathname ?? "/",
    path: pathname,
  });
}

export { track };
export type { BeforeSend, BeforeSendEvent, EventProperties } from "./types";
