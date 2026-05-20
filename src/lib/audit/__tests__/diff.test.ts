import { describe, expect, it } from "vitest";

import { TOOLS } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";

import { diffAuditResults, isNonTrivialAuditDiff } from "../diff";
import { runAudit } from "../engine";
import type { AuditInput } from "../types";

function input(partial: Partial<AuditInput> = {}): AuditInput {
  return {
    lines: [],
    teamSize: 1,
    primaryUseCase: "coding",
    ...partial,
  };
}

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

describe("diffAuditResults", () => {
  it("returns unchanged lines and a same signal when nothing moved", () => {
    const oldResult = runAudit(
      input({
        lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
      }),
    );
    const diff = diffAuditResults(oldResult, oldResult);

    expect(diff.totals.deltaSavings).toBe(0);
    expect(diff.totals.signal).toBe("same");
    expect(diff.lines[0]?.kind).toBe("unchanged");
    expect(isNonTrivialAuditDiff(diff)).toBe(false);
  });

  it("flags recommendation_changed when the recommendation kind changes", () => {
    const auditInput = input({
      lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
    });
    const oldResult = runAudit(auditInput);
    const newTools = withSeatPrice(TOOLS, "cursor", "pro", 60);
    const newResult = runAudit(auditInput, undefined, newTools);

    const diff = diffAuditResults(oldResult, newResult);

    expect(oldResult.results[0]?.recommendation.kind).toBe("downgrade_plan");
    expect(newResult.results[0]?.recommendation.kind).toBe("switch_tool");
    expect(diff.lines[0]?.kind).toBe("recommendation_changed");
    expect(isNonTrivialAuditDiff(diff)).toBe(true);
  });

  it("flags recommendation_changed when the target plan changes", () => {
    const auditInput = input({
      primaryUseCase: "writing",
      lines: [
        {
          toolId: "claude",
          planId: "team_standard",
          seats: 5,
          monthlySpendUsd: 125,
        },
      ],
    });
    const oldResult = runAudit(auditInput);
    const newTools = {
      ...TOOLS,
      claude: {
        ...TOOLS.claude,
        plans: TOOLS.claude.plans.map((plan) => {
          if (plan.id === "max_5x") return { ...plan, pricePerSeatMonthly: 15 };
          return plan;
        }),
      },
    } satisfies Record<ToolId, Tool>;
    const newResult = runAudit(auditInput, undefined, newTools);

    const diff = diffAuditResults(oldResult, newResult);

    expect(oldResult.results[0]?.recommendation.toPlanId).toBe("pro");
    expect(newResult.results[0]?.recommendation.toPlanId).toBe("max_5x");
    expect(diff.lines[0]?.kind).toBe("recommendation_changed");
    expect(isNonTrivialAuditDiff(diff)).toBe(true);
  });

  it("flags savings_changed when only the savings amount moves", () => {
    const auditInput = input({
      primaryUseCase: "writing",
      lines: [
        {
          toolId: "claude",
          planId: "team_standard",
          seats: 5,
          monthlySpendUsd: 125,
        },
      ],
    });
    const oldResult = runAudit(auditInput);
    const newTools = withSeatPrice(TOOLS, "claude", "pro", 22);
    const newResult = runAudit(auditInput, undefined, newTools);

    const diff = diffAuditResults(oldResult, newResult);

    expect(oldResult.results[0]?.recommendation.toPlanId).toBe("pro");
    expect(newResult.results[0]?.recommendation.toPlanId).toBe("pro");
    expect(diff.lines[0]?.kind).toBe("savings_changed");
    expect(diff.totals.deltaSavings).toBe(-10);
    expect(diff.totals.signal).toBe("worse");
    expect(isNonTrivialAuditDiff(diff)).toBe(true);
  });

  it("handles multi-line mixed diffs", () => {
    const auditInput = input({
      teamSize: 5,
      primaryUseCase: "coding",
      lines: [
        { toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 },
        { toolId: "openai_api", planId: "usage", seats: 1, monthlySpendUsd: 400 },
        {
          toolId: "claude",
          planId: "team_standard",
          seats: 5,
          monthlySpendUsd: 125,
        },
      ],
    });
    const oldResult = runAudit(auditInput);
    const newResult = runAudit(
      auditInput,
      undefined,
      withSeatPrice(withSeatPrice(TOOLS, "cursor", "pro", 60), "claude", "pro", 22),
    );

    const diff = diffAuditResults(oldResult, newResult);

    expect(diff.lines.map((line) => line.kind)).toEqual([
      "recommendation_changed",
      "unchanged",
      "savings_changed",
    ]);
    expect(diff.totals.signal).toBe("better");
    expect(isNonTrivialAuditDiff(diff)).toBe(true);
  });
});
