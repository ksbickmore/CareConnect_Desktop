/**
 * Tiny localStorage persistence helper. The SRS calls for a zero-backend
 * app whose runtime data is held "client side using localStorage hooks", so
 * each repository hydrates from a namespaced key on creation and writes back
 * after every mutation.
 *
 * Both functions are guarded: `localStorage` is absent when the renderer is
 * evaluated outside a browser context (e.g. a unit-test runner), and quota /
 * serialization errors must never crash the data layer.
 */

const PREFIX = 'careconnect:';

/** Read + parse the value at `key`, falling back to `fallback` on any miss. */
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialize + persist `value` at `key`. Silently no-ops on failure. */
export function saveJSON(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded / serialization error — nothing actionable to do.
  }
}
