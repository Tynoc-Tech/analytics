type Params = Record<string, string | string[] | undefined> | null | undefined;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceSegments(path: string, search: string, replacement: string): string {
  // Only replace whole path segments, so "/a" does not match inside "/ab".
  const re = new RegExp(`/${escapeRegExp(search)}(?=[/?#]|$)`);
  return path.replace(re, `/${replacement}`);
}

/**
 * Turns a concrete pathname into a route pattern using framework params.
 * computeRoute("/blog/hello", { slug: "hello" }) === "/blog/[slug]"
 * computeRoute("/docs/a/b", { key: ["a", "b"] }) === "/docs/[...key]"
 * Returns the pathname unchanged when there are no params,
 * and null when there is no pathname.
 */
export function computeRoute(pathname: string | null | undefined, params: Params): string | null {
  if (!pathname) return null;
  if (!params) return pathname;

  let result = pathname;
  try {
    const entries = Object.entries(params);

    // Single-value params first: replace the full value as one segment.
    for (const [key, value] of entries) {
      if (typeof value === "string" && value) {
        const replaced = replaceSegments(result, value, `[${key}]`);
        if (replaced !== result) result = replaced;
      }
    }

    // Catch-all params: replace the joined segments.
    for (const [key, value] of entries) {
      if (Array.isArray(value) && value.length > 0) {
        const joined = value.join("/");
        const replaced = replaceSegments(result, joined, `[...${key}]`);
        if (replaced !== result) result = replaced;
      }
    }
    return result;
  } catch {
    return pathname;
  }
}
