import { describe, expect, it } from "vitest";
import { generateAuditId, isWellFormedAuditId } from "../id";

describe("generateAuditId", () => {
  it("produces an id of the requested length (default 12)", () => {
    expect(generateAuditId()).toHaveLength(12);
    expect(generateAuditId(8)).toHaveLength(8);
    expect(generateAuditId(20)).toHaveLength(20);
  });

  it("only emits characters from the URL-safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateAuditId();
      expect(id).toMatch(/^[0-9a-zA-Z]+$/);
    }
  });

  it("produces distinct ids on repeated calls (no obvious sequence)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateAuditId());
    }
    // 200 ids out of a 62^12 space → collisions effectively impossible.
    expect(seen.size).toBe(200);
  });

  it("rejects non-positive lengths defensively", () => {
    expect(() => generateAuditId(0)).toThrow();
    expect(() => generateAuditId(-1)).toThrow();
  });
});

describe("isWellFormedAuditId", () => {
  it("accepts a freshly-generated id", () => {
    expect(isWellFormedAuditId(generateAuditId())).toBe(true);
  });

  it("rejects ids with disallowed characters or shapes", () => {
    expect(isWellFormedAuditId("")).toBe(false);
    expect(isWellFormedAuditId("has space")).toBe(false);
    expect(isWellFormedAuditId("has-dash")).toBe(false);
    expect(isWellFormedAuditId("has/slash")).toBe(false);
    expect(isWellFormedAuditId("a".repeat(33))).toBe(false);
  });

  it("rejects non-string inputs without throwing", () => {
    expect(isWellFormedAuditId(null)).toBe(false);
    expect(isWellFormedAuditId(undefined)).toBe(false);
    expect(isWellFormedAuditId(123)).toBe(false);
    expect(isWellFormedAuditId({ id: "abc" })).toBe(false);
  });
});
