import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../unsubscribe";

const SECRET = "test-unsubscribe-secret";

describe("unsubscribe token helpers", () => {
  it("verifies a token produced for the same email", () => {
    const token = createUnsubscribeToken("Alex@Example.com", SECRET);
    expect(token).not.toBeNull();
    expect(verifyUnsubscribeToken("alex@example.com", token!, SECRET)).toBe(true);
  });

  it("rejects a token for a different email", () => {
    const token = createUnsubscribeToken("alex@example.com", SECRET);
    expect(verifyUnsubscribeToken("mallory@example.com", token!, SECRET)).toBe(false);
  });

  it("rejects when the secret is missing", () => {
    const token = createUnsubscribeToken("alex@example.com", SECRET);
    expect(verifyUnsubscribeToken("alex@example.com", token!, undefined)).toBe(false);
  });

  it("rejects a tampered token of the same length", () => {
    const token = createUnsubscribeToken("alex@example.com", SECRET)!;
    const tampered = token.replace(token[0]!, token[0] === "a" ? "b" : "a");
    expect(verifyUnsubscribeToken("alex@example.com", tampered, SECRET)).toBe(false);
  });

  it("builds a URL with normalised email and a query token", () => {
    const url = buildUnsubscribeUrl("https://snipper.example.com/", "Alex@Example.com", SECRET);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.pathname).toBe("/api/unsubscribe");
    expect(parsed.searchParams.get("email")).toBe("alex@example.com");
    expect(parsed.searchParams.get("token")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns null when no secret is configured", () => {
    expect(buildUnsubscribeUrl("https://snipper.example.com", "alex@example.com", undefined)).toBeNull();
  });
});
