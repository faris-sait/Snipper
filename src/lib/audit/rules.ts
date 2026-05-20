import { TOOLS, getPlanFrom, getToolFrom } from "@/lib/pricing/tools";
import { ALTERNATIVES } from "@/lib/pricing/alternatives";
import type { Tool, ToolId } from "@/lib/pricing/types";
import type {
  AuditInput,
  Recommendation,
  RecommendationKind,
  SpendLine,
} from "./types";

/**
 * A Rule inspects one spend line against the full audit context and an explicit
 * pricing registry, and may emit a candidate Recommendation. The engine collects
 * every candidate and picks the one with the largest *friction-adjusted* savings
 * (see FRICTION_WEIGHT in engine.ts).
 *
 * Rules MUST be pure: same inputs → same outputs. They never read network, env,
 * or the module-level `TOOLS` constant — pricing comes in as a parameter so the
 * engine can re-run an old audit against its stored pricing snapshot.
 */
export type Rule = (
  line: SpendLine,
  ctx: AuditInput,
  tools: Record<ToolId, Tool>,
) => Recommendation | null;

/**
 * Rule 1: same vendor, cheaper plan that still fits.
 *
 * We deliberately ONLY fire on plans that require a minimum seat count (Team /
 * Business tiers). Without explicit usage data we can't tell whether a Pro/Plus
 * user could safely drop to a cheaper consumer tier — and a finance reviewer
 * would (rightly) push back on a recommendation built on no signal. Team-tier
 * overspend is unambiguous: per-seat math doesn't lie.
 */
export const ruleCheaperVendorPlan: Rule = (line, _ctx, tools) => {
  const fromPlan = getPlanFrom(tools, line.toolId, line.planId);
  if (!fromPlan.minSeats) return null;

  // Once you're well past the team-tier break-even (3× the minimum seat count),
  // the per-seat plans stop being cheaper — bail before suggesting a downgrade
  // that wouldn't actually save anything.
  if (line.seats >= fromPlan.minSeats * 3) return null;

  const tool = getToolFrom(tools, line.toolId);
  const candidates = tool.plans
    .filter((p) => p.id !== line.planId)
    .filter((p) => p.kind === "seat") // never recommend dropping to "free" without usage data.
    .filter((p) => !p.requiresContract) // contact-sales tiers are never auto-suggested.
    .filter((p) => !p.minSeats || line.seats >= p.minSeats)
    .map((p) => ({ plan: p, projected: p.pricePerSeatMonthly * line.seats }))
    .filter((c) => c.projected < line.monthlySpendUsd);

  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => (a.projected < b.projected ? a : b));
  const savings = line.monthlySpendUsd - best.projected;
  if (savings < 5) return null;

  return {
    kind: "downgrade_plan",
    toToolId: line.toolId,
    toPlanId: best.plan.id,
    projectedMonthlyUsd: round(best.projected),
    monthlySavingsUsd: round(savings),
    reason: `${tool.displayName} ${best.plan.vendorPlanName} covers ${line.seats} seat${line.seats === 1 ? "" : "s"} for ${formatBudget(best.projected)}/mo vs your current ${formatBudget(line.monthlySpendUsd)} on ${fromPlan.vendorPlanName}.`,
    confidence: "high",
  };
};

/**
 * Rule 2: a different vendor's tool covers the same use case for substantially less.
 *
 * Driven by the curated ALTERNATIVES table — we never recommend a swap that
 * isn't pre-vetted as a like-for-like match for the use case. This is the
 * "defensible reasoning" the brief asks for: every swap traces to a row a
 * finance person can read.
 */
export const ruleCheaperAlternative: Rule = (line, ctx, tools) => {
  const swaps = ALTERNATIVES.filter(
    (a) =>
      a.fromToolId === line.toolId &&
      a.validForUseCases.includes(ctx.primaryUseCase),
  );
  if (swaps.length === 0) return null;

  const candidates = swaps
    .map((swap) => {
      const toTool = getToolFrom(tools, swap.toToolId);
      const cheapest = pickCheapestFittingPlan(toTool, line.seats);
      if (!cheapest) return null;
      const projected = cheapest.pricePerSeatMonthly * line.seats;
      return { swap, toTool, plan: cheapest, projected };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .filter((c) => c.projected < line.monthlySpendUsd);

  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => (a.projected < b.projected ? a : b));
  const savings = line.monthlySpendUsd - best.projected;
  // Switching tools has real friction (re-onboarding, re-tuning workflows).
  // Demand at least $10/mo of headroom before suggesting it.
  if (savings < 10) return null;

  return {
    kind: "switch_tool",
    toToolId: best.toTool.id,
    toPlanId: best.plan.id,
    projectedMonthlyUsd: round(best.projected),
    monthlySavingsUsd: round(savings),
    reason: `${best.toTool.displayName} ${best.plan.vendorPlanName} covers your ${ctx.primaryUseCase} use case for ${formatBudget(best.projected)}/mo. ${best.swap.rationale}`,
    confidence: ctx.primaryUseCase === "mixed" ? "medium" : "high",
  };
};

/**
 * Rule 3: high spend with no plan-level fix — point to Credex for credit-based
 * discounts. Only fires on vendors where Credex is known to source credits and
 * spend is at least $200/mo (below that, the friction of switching to credit
 * billing isn't worth the savings).
 *
 * Brief: "Are they paying retail when they could get the same thing through credits?"
 */
const CREDEX_VENDORS = new Set<Tool["id"]>([
  "anthropic_api",
  "openai_api",
  "claude",
  "chatgpt",
]);
const CREDEX_DISCOUNT = 0.25; // conservative — typical Credex savings 20–30% off retail

export const ruleUseCredex: Rule = (line, _ctx, tools) => {
  if (!CREDEX_VENDORS.has(line.toolId)) return null;
  if (line.monthlySpendUsd < 200) return null;

  const projected = line.monthlySpendUsd * (1 - CREDEX_DISCOUNT);
  const savings = line.monthlySpendUsd - projected;
  const tool = getToolFrom(tools, line.toolId);

  return {
    kind: "use_credex",
    projectedMonthlyUsd: round(projected),
    monthlySavingsUsd: round(savings),
    reason: `At ${formatBudget(line.monthlySpendUsd)}/mo on ${tool.displayName}, Credex-sourced credits typically save 20–30% off retail with no plan change required.`,
    confidence: "medium",
  };
};

export const ALL_RULES: Rule[] = [
  ruleCheaperVendorPlan,
  ruleCheaperAlternative,
  ruleUseCredex,
];

/**
 * Friction-adjusted ranking weight. The engine multiplies a recommendation's
 * raw monthly savings by its friction weight when deciding which one to surface;
 * the user-facing `monthlySavingsUsd` field is unchanged. The intent: a $40
 * one-click downgrade beats a $60 full-tool migration, but a $200 swap still
 * wins over a $40 downgrade.
 */
export const FRICTION_WEIGHT: Record<RecommendationKind, number> = {
  downgrade_plan: 1.0,
  use_credex: 0.9,
  switch_tool: 0.6,
  consolidate: 0.7,
  optimal: 0,
};

function pickCheapestFittingPlan(tool: Tool, seats: number) {
  const fits = tool.plans.filter((p) => {
    if (p.requiresContract) return false;
    if (p.kind === "free") return false; // mirror the "no free downgrades" rule above.
    if (p.kind === "usage") return false;
    if (p.minSeats && seats < p.minSeats) return false;
    return true;
  });
  if (fits.length === 0) return null;
  return fits.reduce((a, b) => (a.pricePerSeatMonthly < b.pricePerSeatMonthly ? a : b));
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function formatBudget(n: number) {
  return `$${Math.round(n)}`;
}

// Re-export to give consumers a single import surface.
export { TOOLS };
