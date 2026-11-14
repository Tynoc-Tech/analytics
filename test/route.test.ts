import { describe, expect, it } from "vitest";
import { computeRoute } from "../src/route";

describe("computeRoute", () => {
  it("returns null without a pathname", () => {
    expect(computeRoute(null, {})).toBeNull();
  });

  it("returns the pathname when there are no params", () => {
    expect(computeRoute("/about", null)).toBe("/about");
    expect(computeRoute("/about", {})).toBe("/about");
  });

  it("replaces a dynamic segment", () => {
    expect(computeRoute("/blog/hello-world", { slug: "hello-world" })).toBe("/blog/[slug]");
  });

  it("replaces several dynamic segments", () => {
    expect(computeRoute("/shop/shoes/42", { category: "shoes", id: "42" })).toBe("/shop/[category]/[id]");
  });

  it("replaces catch-all segments", () => {
    expect(computeRoute("/docs/a/b/c", { key: ["a", "b", "c"] })).toBe("/docs/[...key]");
  });

  it("only replaces whole segments", () => {
    expect(computeRoute("/ab/a", { id: "a" })).toBe("/ab/[id]");
  });
});
