import { describe, expect, it } from "vitest";
import { classifyPlanHealth } from "../plan-health";

describe("classifyPlanHealth", () => {
  it("flags Claude Max 20x as a risk plan with a rate-limit note", () => {
    // Vineeth interview surfaced this as the user-felt pain point — the public
    // rate-limit-shock pattern post-v2.1.89 is what we want this rule to encode.
    const health = classifyPlanHealth("claude", "max_20x");
    expect(health.status).toBe("risk");
    expect(health.note).toMatch(/rate.?limit/i);
  });

  it("flags premium consumer tiers as watch (Cursor Ultra, ChatGPT Pro)", () => {
    expect(classifyPlanHealth("cursor", "ultra").status).toBe("watch");
    expect(classifyPlanHealth("chatgpt", "pro").status).toBe("watch");
  });

  it("flags Claude Pro for the annual prepay opportunity", () => {
    const health = classifyPlanHealth("claude", "pro");
    expect(health.status).toBe("watch");
    expect(health.note).toMatch(/annual/i);
  });

  it("flags plans with non-public list pricing for invoice verification", () => {
    expect(classifyPlanHealth("github_copilot", "business").status).toBe("watch");
    expect(classifyPlanHealth("v0", "premium").status).toBe("watch");
  });

  it("returns ok with no note for plans not in the registry", () => {
    expect(classifyPlanHealth("cursor", "pro")).toEqual({ status: "ok" });
    expect(classifyPlanHealth("claude", "free")).toEqual({ status: "ok" });
    expect(classifyPlanHealth("anthropic_api", "usage")).toEqual({ status: "ok" });
  });

  it("returns ok rather than throwing on unknown tool/plan combinations", () => {
    // Defensive default — engine should never have to null-check this field.
    expect(classifyPlanHealth("nonexistent", "garbage")).toEqual({ status: "ok" });
  });
});
