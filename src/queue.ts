import type { TynocGlobal } from "./types";

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Makes sure `window.tynoc` exists. Before the script loads, calls are stored
 * in `window.tynoc.q` and replayed by the script when it starts.
 */
export function initQueue(): void {
  if (!isBrowser()) return;
  if (window.tynoc) return;
  const fn = function (...args: unknown[]) {
    (fn.q = fn.q || []).push(args);
  } as TynocGlobal & { q?: unknown[][] };
  window.tynoc = fn;
}

export function call(...args: unknown[]): void {
  if (!isBrowser()) return;
  initQueue();
  (window.tynoc as unknown as (...a: unknown[]) => void)(...args);
}
