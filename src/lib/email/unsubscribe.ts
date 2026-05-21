import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUnsubscribeToken(
  email: string,
  secret: string | null | undefined = process.env.UNSUBSCRIBE_SECRET,
): string | null {
  if (!secret) return null;

  return createHmac("sha256", secret).update(normaliseEmail(email)).digest("hex");
}

export function verifyUnsubscribeToken(
  email: string,
  token: string,
  secret: string | null | undefined = process.env.UNSUBSCRIBE_SECRET,
): boolean {
  const expected = createUnsubscribeToken(email, secret);
  if (!expected) return false;

  const actual = token.trim().toLowerCase();
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function buildUnsubscribeUrl(
  siteUrl: string,
  email: string,
  secret: string | null | undefined = process.env.UNSUBSCRIBE_SECRET,
): string | null {
  const token = createUnsubscribeToken(email, secret);
  if (!token) return null;

  const base = siteUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    email: normaliseEmail(email),
    token,
  });

  return `${base}/api/unsubscribe?${params.toString()}`;
}
