import type { EventProperties } from "./types";

export const MAX_EVENT_NAME_LENGTH = 255;
export const MAX_PROPERTY_LENGTH = 255;
export const MAX_PROPERTIES = 32;

export type CleanProperties = Record<string, string | number | boolean | null>;

export interface ParseResult {
  ok: boolean;
  data?: CleanProperties;
  error?: string;
}

/**
 * Validates custom event properties.
 * Values must be string, number, boolean or null. Nested objects are rejected.
 * Strings longer than 255 characters are truncated.
 */
export function parseProperties(properties: EventProperties | undefined): ParseResult {
  if (properties === undefined || properties === null) return { ok: true, data: undefined };
  if (typeof properties !== "object" || Array.isArray(properties)) {
    return { ok: false, error: "Event properties must be a plain object." };
  }

  const out: CleanProperties = {};
  let count = 0;
  for (const [rawKey, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    const key = rawKey.slice(0, MAX_PROPERTY_LENGTH);
    if (!key) continue;
    if (value === null || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return { ok: false, error: `Property "${key}" must be a finite number.` };
      }
      out[key] = value;
    } else if (typeof value === "string") {
      out[key] = value.slice(0, MAX_PROPERTY_LENGTH);
    } else {
      return {
        ok: false,
        error: `Property "${key}" has an unsupported value. Use string, number, boolean or null (no nested objects).`,
      };
    }
    count += 1;
    if (count > MAX_PROPERTIES) {
      return { ok: false, error: `Too many properties. The limit is ${MAX_PROPERTIES}.` };
    }
  }
  return { ok: true, data: out };
}

export function cleanEventName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_EVENT_NAME_LENGTH);
}
