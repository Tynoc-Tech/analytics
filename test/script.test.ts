import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanUrl, start } from "../src/script/index";

type Sent = { target: string; body: Record<string, unknown> };

let sent: Sent[] = [];
const originalPush = history.pushState;
const originalReplace = history.replaceState;

function addScript(attrs: Record<string, string> = {}): void {
  const script = document.createElement("script");
  script.setAttribute("data-tynoc-analytics", "");
  script.dataset.mode = "production";
  for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
  document.head.appendChild(script);
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

beforeEach(() => {
  sent = [];
  history.replaceState = originalReplace;
  history.pushState = originalPush;
  history.replaceState(null, "", "/");
  delete window.tynoc;
  delete window.tynocInsightsLoaded;
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: (target: string, blob: Blob) => {
      void blob.text().then((text) => sent.push({ target, body: JSON.parse(text) }));
      return true;
    },
  });
});

afterEach(() => {
  document.head.innerHTML = "";
  vi.restoreAllMocks();
});

describe("cleanUrl", () => {
  it("keeps only allowed query parameters and drops the hash", () => {
    expect(cleanUrl("https://a.com/p?utm_source=x&token=secret&ref=hn#top")).toBe(
      "https://a.com/p?utm_source=x&ref=hn",
    );
  });
});

describe("browser script", () => {
  it("sends a pageview on start and on client navigation", async () => {
    addScript();
    start();
    history.pushState(null, "", "/pricing?email=a@b.com");
    await flush();
    expect(sent.map((s) => s.target)).toEqual(["/_tynoc/insights/view", "/_tynoc/insights/view"]);
    expect(sent[0].body).toMatchObject({ v: 1, type: "pageview", url: "https://example.com/", source: "browser" });
    expect(sent[1].body.url).toBe("https://example.com/pricing");
  });

  it("dedupes pageviews for the same path", async () => {
    addScript();
    start();
    history.replaceState(null, "", "/");
    await flush();
    expect(sent).toHaveLength(1);
  });

  it("replays queued commands and applies beforeSend", async () => {
    window.tynoc = Object.assign(() => undefined, {
      q: [
        ["event", { name: "Signup", data: { plan: "pro" } }],
        ["beforeSend", (e: { url: string }) => (e.url.includes("/private") ? null : e)],
      ],
    });
    addScript({ "data-disable-auto-track": "1" });
    start();
    window.tynoc?.("pageview", { route: "/blog/[slug]", path: "/blog/hi" });
    history.pushState(null, "", "/private");
    window.tynoc?.("pageview", { route: "/private", path: "/private" });
    await flush();
    expect(sent.map((s) => s.body.type)).toEqual(["event", "pageview"]);
    expect(sent[0].body).toMatchObject({ name: "Signup", data: { plan: "pro" } });
    expect(sent[1].body).toMatchObject({ route: "/blog/[slug]" });
  });

  it("only logs in development mode", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    addScript({ "data-mode": "development" });
    start();
    await flush();
    expect(sent).toHaveLength(0);
    expect(log).toHaveBeenCalled();
  });
});
