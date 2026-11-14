import { describe, expect, it } from "vitest";
import { cleanEventName, parseProperties } from "../src/properties";

describe("parseProperties", () => {
  it("accepts flat values", () => {
    expect(parseProperties({ plan: "pro", seats: 3, trial: false, coupon: null })).toEqual({
      ok: true,
      data: { plan: "pro", seats: 3, trial: false, coupon: null },
    });
  });

  it("drops undefined values", () => {
    expect(parseProperties({ a: undefined, b: "x" }).data).toEqual({ b: "x" });
  });

  it("rejects nested objects", () => {
    const result = parseProperties({ nested: { a: 1 } as unknown as string });
    expect(result.ok).toBe(false);
  });

  it("truncates long strings to 255 characters", () => {
    const result = parseProperties({ text: "x".repeat(400) });
    expect((result.data?.text as string).length).toBe(255);
  });

  it("rejects non-finite numbers", () => {
    expect(parseProperties({ n: Number.NaN }).ok).toBe(false);
  });
});

describe("cleanEventName", () => {
  it("trims and validates names", () => {
    expect(cleanEventName("  Signup ")).toBe("Signup");
    expect(cleanEventName("")).toBeNull();
    expect(cleanEventName(42)).toBeNull();
  });
});
