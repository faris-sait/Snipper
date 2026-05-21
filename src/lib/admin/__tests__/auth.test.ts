import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyAdminToken } from "../auth";

describe("verifyAdminToken", () => {
  it("returns true when candidate matches the expected token", () => {
    expect(verifyAdminToken("hunter2", "hunter2")).toBe(true);
  });

  it("returns false for a mismatched same-length token", () => {
    expect(verifyAdminToken("hunterX", "hunter2")).toBe(false);
  });

  it("returns false for a different-length token (length-leak safe)", () => {
    expect(verifyAdminToken("short", "hunter2")).toBe(false);
    expect(verifyAdminToken("muchlongertoken", "hunter2")).toBe(false);
  });

  it("returns false when no expected token is configured", () => {
    expect(verifyAdminToken("anything", undefined)).toBe(false);
    expect(verifyAdminToken("anything", "")).toBe(false);
  });

  it("returns false when the candidate is empty or missing", () => {
    expect(verifyAdminToken(null, "hunter2")).toBe(false);
    expect(verifyAdminToken(undefined, "hunter2")).toBe(false);
    expect(verifyAdminToken("", "hunter2")).toBe(false);
  });
});
