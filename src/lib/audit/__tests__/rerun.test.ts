import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPerAuditSnapshot } from "@/lib/pricing/effective";
import { TOOLS } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";

import { runAudit } from "../engine";
import { rerunAuditAgainstCurrentPricing } from "../reaudit";
import type { AuditInput } from "../types";

function withSeatPrice(
  base: Record<ToolId, Tool>,
  toolId: ToolId,
  planId: string,
  pricePerSeatMonthly: number,
): Record<ToolId, Tool> {
  return {
    ...base,
    [toolId]: {
      ...base[toolId],
      plans: base[toolId].plans.map((plan) =>
        plan.id === planId ? { ...plan, pricePerSeatMonthly } : plan,
      ),
    },
  };
}

describe("rerunAuditAgainstCurrentPricing", () => {
  it("keeps the saved snapshot for the original side and reruns against current pricing", () => {
    const input: AuditInput = {
      teamSize: 2,
      primaryUseCase: "coding",
      lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
    };
    const originalTools = withSeatPrice(TOOLS, "cursor", "pro", 18);
    const currentTools = withSeatPrice(TOOLS, "cursor", "pro", 60);
    const oldResult = runAudit(input, undefined, originalTools);
    const pricingSnapshot = buildPerAuditSnapshot(
      originalTools,
      input.lines.map((line) => line.toolId),
    );

    const rerun = rerunAuditAgainstCurrentPricing(
      { input, result: oldResult, pricing_snapshot: pricingSnapshot },
      currentTools,
    );

    expect(rerun.oldTools.cursor.plans.find((plan) => plan.id === "pro")?.pricePerSeatMonthly).toBe(
      18,
    );
    expect(rerun.oldResult).toEqual(oldResult);
    expect(rerun.newResult.results[0]?.recommendation.kind).toBe("switch_tool");
    expect(rerun.diff.lines[0]?.kind).toBe("recommendation_changed");
    expect(rerun.priceChanges).toContain("Cursor Pro moved from $18/seat to $60/seat.");
  });
});
