/**
 * Tiny localStorage / sessionStorage helpers for form draft persistence.
 *
 * Why not a `useLocalStorage` hook? React-hook-form already owns the form
 * state — wrapping it in another stateful hook produces stale-state bugs
 * the first time the user switches tabs or restores from history. These
 * functions are stateless, get called from `useEffect`, and never own the
 * truth about what's in the form.
 */

const isBrowser = typeof window !== "undefined";

export function loadJson<T>(storage: Storage | null, key: string, fallback: T): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(storage: Storage | null, key: string, value: T): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full, in private mode, or disabled — silently no-op.
  }
}

export function clearKey(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // no-op
  }
}

export const localStorageOrNull = (): Storage | null =>
  isBrowser ? window.localStorage : null;

export const sessionStorageOrNull = (): Storage | null =>
  isBrowser ? window.sessionStorage : null;

export const STORAGE_KEYS = {
  /** Draft form state for /audit */
  draftForm: "snipper:draft:v1",
  /** Hand-off slot for the most recent audit result, read by /audit/result */
  lastResult: "snipper:last_result:v1",
  /**
   * Optimal-path "notify me" signup. Phase 5 will migrate this entry into the
   * Supabase + transactional-email pipeline; until then we hold it locally so
   * the lead isn't lost.
   */
  notifySignup: "snipper:notify_signup:v1",
} as const;
