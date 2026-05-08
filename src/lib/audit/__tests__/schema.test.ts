import { describe, expect, it } from "vitest";
import { AuditFormSchema } from "../schema";

describe("AuditFormSchema", () => {
  it("accepts a single-tool well-formed payload", () => {
    const result = AuditFormSchema.safeParse({
      teamSize: 1,
      primaryUseCase: "coding",
      lines: [{ toolId: "cursor", planId: "pro", seats: 1, monthlySpendUsd: 20 }],
    });
    expect(result.success).toBe(true);
  });

  it("coerces stringified numbers (form inputs always send strings)", () => {
    const result = AuditFormSchema.safeParse({
      teamSize: "5",
      primaryUseCase: "mixed",
      lines: [
        { toolId: "cursor", planId: "pro", seats: "2", monthlySpendUsd: "40" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.teamSize).toBe(5);
      expect(result.data.lines[0]!.seats).toBe(2);
      expect(result.data.lines[0]!.monthlySpendUsd).toBe(40);
    }
  });

  it("rejects an empty lines array — must audit at least one tool", () => {
    const result = AuditFormSchema.safeParse({
      teamSize: 1,
      primaryUseCase: "coding",
      lines: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a planId that does not exist on the chosen tool", () => {
    // "ultra" is a valid Cursor plan but not a Claude plan — schema must catch this.
    const result = AuditFormSchema.safeParse({
      teamSize: 1,
      primaryUseCase: "coding",
      lines: [
        { toolId: "claude", planId: "ultra", seats: 1, monthlySpendUsd: 200 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative spend and zero seats", () => {
    const result = AuditFormSchema.safeParse({
      teamSize: 1,
      primaryUseCase: "coding",
      lines: [
        { toolId: "cursor", planId: "pro", seats: 0, monthlySpendUsd: -10 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
