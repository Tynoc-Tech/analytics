import { afterEach, describe, expect, it, vi } from "vitest";
import { inject, track } from "../src/index";

function scripts(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll("script[data-tynoc-analytics]"));
}

afterEach(() => {
  document.head.innerHTML = "";
  delete window.tynoc;
  vi.restoreAllMocks();
});

describe("inject", () => {
  it("adds the script once", () => {
    inject({ mode: "production" });
    inject({ mode: "production" });
    const list = scripts();
    expect(list).toHaveLength(1);
    expect(list[0].getAttribute("src")).toBe("/_tynoc/insights/script.js");
    expect(list[0].dataset.mode).toBe("production");
    expect(list[0].dataset.sdkn).toBe("@tynoc/analytics");
  });

  it("supports a custom endpoint and disabled auto tracking", () => {
    inject({ mode: "production", endpoint: "/stats/", disableAutoTrack: true, framework: "next" });
    const [script] = scripts();
    expect(script.getAttribute("src")).toBe("/stats/script.js");
    expect(script.dataset.endpoint).toBe("/stats");
    expect(script.dataset.disableAutoTrack).toBe("1");
    expect(script.dataset.sdkn).toBe("@tynoc/analytics/next");
  });

  it("queues beforeSend and events before the script loads", () => {
    const beforeSend = (event: { type: "pageview" | "event"; url: string }) => event;
    inject({ mode: "production", beforeSend });
    track("Signup", { plan: "pro" });
    expect(window.tynoc?.q).toEqual([
      ["beforeSend", beforeSend],
      ["event", { name: "Signup", data: { plan: "pro" } }],
    ]);
  });

  it("does not queue invalid events", () => {
    inject({ mode: "production" });
    track("Bad", { nested: { a: 1 } as unknown as string });
    expect(window.tynoc?.q ?? []).toEqual([]);
  });
});
