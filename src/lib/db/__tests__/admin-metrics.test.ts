import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeCtr } from "../admin-metrics";

describe("computeCtr", () => {
  it("returns null when no notifications were sent", () => {
    expect(computeCtr(0, 0)).toBeNull();
    expect(computeCtr(5, 0)).toBeNull();
  });

  it("computes a 0..1 ratio when clicks are below notifications", () => {
    expect(computeCtr(0, 4)).toBe(0);
    expect(computeCtr(1, 4)).toBe(0.25);
    expect(computeCtr(3, 4)).toBe(0.75);
  });

  it("caps at 1 even if click count exceeds notifications", () => {
    // Defensive: shouldn't happen because we count distinct clicks, but
    // arithmetic above 1 is meaningless for a CTR display.
    expect(computeCtr(7, 5)).toBe(1);
  });
});
