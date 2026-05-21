import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildRerunUrl } from "../templates";

describe("buildRerunUrl", () => {
  it("returns the bare rerun URL when no pricing version is supplied", () => {
    expect(buildRerunUrl("https://snipper.example.com", "abc12345xyzz", undefined)).toBe(
      "https://snipper.example.com/a/abc12345xyzz/rerun",
    );
    expect(buildRerunUrl("https://snipper.example.com", "abc12345xyzz", null)).toBe(
      "https://snipper.example.com/a/abc12345xyzz/rerun",
    );
    expect(buildRerunUrl("https://snipper.example.com", "abc12345xyzz", "")).toBe(
      "https://snipper.example.com/a/abc12345xyzz/rerun",
    );
  });

  it("appends ?v=<pricingVersion> when supplied (URL-encoded)", () => {
    expect(
      buildRerunUrl("https://snipper.example.com", "abc12345xyzz", "70ff75ede007c931"),
    ).toBe("https://snipper.example.com/a/abc12345xyzz/rerun?v=70ff75ede007c931");
  });

  it("encodes pricing-version characters that need escaping", () => {
    const url = buildRerunUrl("https://snipper.example.com", "abc12345xyzz", "ab cd&ef");
    expect(url).toBe("https://snipper.example.com/a/abc12345xyzz/rerun?v=ab%20cd%26ef");
  });
});
