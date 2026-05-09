/**
 * URL-safe audit id generator.
 *
 * 12 chars from a 62-symbol alphabet → 62^12 ≈ 3.2 × 10^21 possible ids.
 * Ample headroom for a take-home; collision probability after a million
 * audits is < 1 in 10^9 (birthday-paradox bound).
 *
 * Uses `crypto.getRandomValues` so the same code runs on Node, Edge, and the
 * browser without conditional imports.
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateAuditId(length = 12): string {
  if (length <= 0) throw new Error("Audit id length must be positive");
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    // Bias is negligible: 256 % 62 = 8 favoured slots out of 62, so the
    // worst-case skew is ~3% per character. Acceptable for non-cryptographic
    // identity use; if we ever need uniform distribution we can rejection-sample.
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

const ID_PATTERN = /^[A-Za-z0-9]{1,32}$/;

/**
 * Defensive check for ids coming off the URL. Doesn't prove the id exists in
 * the database — just rejects obviously malformed inputs before we hit it.
 */
export function isWellFormedAuditId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}
