import { getPlan } from "@/lib/pricing/tools";
import { classifyPlanHealth } from "./plan-health";
import { ALL_RULES, FRICTION_WEIGHT, type Rule } from "./rules";
import type {
  AuditInput,
  AuditLineResult,
  AuditResult,
  AuditTotals,
  Recommendation,
  SpendLine,
} from "./types";

const SAVINGS_THRESHOLD_FOR_CREDEX = 500; // brief: ">$500/mo savings → surface Credex"
const OPTIMAL_THRESHOLD = 100; // brief: "<$100/mo → 'you're spending well'"

/**
 * Run the audit. The engine:
 *   1. Validates each spend line resolves to a real plan,
 *   2. Runs every rule against every line and collects candidate recommendations,
 *   3. Picks the highest-savings candidate per line (or "optimal" if none beats it),
 *   4. Aggregates totals and decides whether to surface the Credex CTA.
 *
 * Pure function — no I/O, no Date.now(), deterministic for tests.
 */
export function runAudit(input: AuditInput, rules: Rule[] = ALL_RULES): AuditResult {
  const results: AuditLineResult[] = input.lines.map((line) => ({
    line,
    recommendation: pickBest(line, input, rules),
    planHealth: classifyPlanHealth(line.toolId, line.planId),
  }));

  const totals = computeTotals(results);

  return {
    input,
    results,
    totals,
    surfaceCredex: totals.monthlySavingsUsd >= SAVINGS_THRESHOLD_FOR_CREDEX,
    isOptimal:
      totals.monthlySavingsUsd < OPTIMAL_THRESHOLD ||
      results.every((r) => r.recommendation.kind === "optimal"),
  };
}

function pickBest(line: SpendLine, ctx: AuditInput, rules: Rule[]): Recommendation {
  // Validate the plan exists — if not, skip. The form layer should prevent this,
  // but defending here keeps the engine usable from arbitrary callers.
  try {
    getPlan(line.toolId, line.planId);
  } catch {
    return optimalRecommendation(line, "Unrecognised plan — left as-is.");
  }

  const candidates = rules
    .map((rule) => rule(line, ctx))
    .filter((r): r is Recommendation => r !== null);

  if (candidates.length === 0) {
    return optimalRecommendation(line, "Already on the best fit for this usage profile.");
  }

  // Rank by friction-adjusted savings so we don't push a $60 tool migration
  // ahead of a $40 one-click downgrade. The user-facing `monthlySavingsUsd`
  // field on the returned recommendation is the unweighted real saving.
  return candidates.reduce((a, b) =>
    weighted(a) > weighted(b) ? a : b,
  );
}

function weighted(rec: Recommendation): number {
  return rec.monthlySavingsUsd * FRICTION_WEIGHT[rec.kind];
}

function optimalRecommendation(line: SpendLine, reason: string): Recommendation {
  return {
    kind: "optimal",
    projectedMonthlyUsd: line.monthlySpendUsd,
    monthlySavingsUsd: 0,
    reason,
    confidence: "high",
  };
}

function computeTotals(results: AuditLineResult[]): AuditTotals {
  const currentMonthlyUsd = round(
    results.reduce((sum, r) => sum + r.line.monthlySpendUsd, 0),
  );
  const recommendedMonthlyUsd = round(
    results.reduce((sum, r) => sum + r.recommendation.projectedMonthlyUsd, 0),
  );
  const monthlySavingsUsd = round(currentMonthlyUsd - recommendedMonthlyUsd);
  const annualSavingsUsd = round(monthlySavingsUsd * 12);
  const savingsPct =
    currentMonthlyUsd > 0 ? round((monthlySavingsUsd / currentMonthlyUsd) * 100) : 0;
  return { currentMonthlyUsd, recommendedMonthlyUsd, monthlySavingsUsd, annualSavingsUsd, savingsPct };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
