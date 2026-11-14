import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Analytics } from "../src/react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  delete window.tynoc;
});

describe("<Analytics />", () => {
  it("injects the script and sends a pageview for each route change", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Analytics, { mode: "production", route: "/blog/[slug]", path: "/blog/a" }));
    });
    await act(async () => {
      root.render(createElement(Analytics, { mode: "production", route: "/blog/[slug]", path: "/blog/b" }));
    });

    const script = document.head.querySelector<HTMLScriptElement>("script[data-tynoc-analytics]");
    expect(script?.dataset.disableAutoTrack).toBe("1");
    expect(script?.dataset.sdkn).toBe("@tynoc/analytics/react");
    expect(window.tynoc?.q).toEqual([
      ["pageview", { route: "/blog/[slug]", path: "/blog/a" }],
      ["pageview", { route: "/blog/[slug]", path: "/blog/b" }],
    ]);
    await act(async () => root.unmount());
  });
});
