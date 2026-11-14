import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "../src/server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("server track", () => {
  it("posts to TYNOC_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TYNOC_URL", "my-app.deploy.tynoc.com");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchMock);

    await track("Order", { total: 499 }, { url: "https://my-app.deploy.tynoc.com/checkout" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://my-app.deploy.tynoc.com/_tynoc/insights/event");
    expect(JSON.parse(init.body)).toMatchObject({
      type: "event",
      source: "server",
      name: "Order",
      data: { total: 499 },
      url: "https://my-app.deploy.tynoc.com/checkout",
    });
  });

  it("uses the host header when TYNOC_URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TYNOC_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchMock);
    await track("Ping", undefined, { headers: new Headers({ host: "shop.example.com" }) });
    expect(fetchMock.mock.calls[0][0]).toBe("https://shop.example.com/_tynoc/insights/event");
  });

  it("never throws when fetch fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TYNOC_URL", "x.deploy.tynoc.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(track("Order")).resolves.toBeUndefined();
  });

  it("does not send in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TYNOC_URL", "x.deploy.tynoc.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await track("Order");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
