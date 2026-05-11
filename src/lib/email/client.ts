import "server-only";

import { Resend } from "resend";

let cached: Resend | null | undefined;

/**
 * Returns the Resend client, or `null` when transactional email isn't
 * configured. Callers must handle the null case so the app stays usable in
 * local-only mode — like the Supabase fallback in `src/lib/db/supabase.ts`,
 * email is a feature, not a hard dependency.
 */
export function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

/** From-address pulled from env. Must be a domain verified in Resend. */
export function getFromAddress(): string | null {
  const from = process.env.RESEND_FROM_EMAIL;
  return from ?? null;
}
