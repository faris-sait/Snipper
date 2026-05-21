import "server-only";

import { timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "__admin";

/**
 * Constant-time comparison of the supplied token against `ADMIN_TOKEN`. Both
 * branches that bail out (no env, no token) return false to keep this safe
 * to call with whatever the request supplied.
 */
export function verifyAdminToken(
  candidate: string | null | undefined,
  expected: string | null | undefined = process.env.ADMIN_TOKEN,
): boolean {
  if (!expected) return false;
  if (!candidate) return false;

  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
