import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type {
  AuditInput,
  AuditResult,
  Recommendation,
  SpendLine,
} from "@/lib/audit/types";
import { getPlan, getTool } from "@/lib/pricing/tools";
import { formatUsd } from "@/lib/utils";

/**
 * Deterministic ~100-word fallback paragraph used when the Anthropic API call
 * errors, times out, or persistence isn't configured for caching. Pure: no
 * env, no time, no network — same input deterministically produces the same
 * paragraph, which is what the engine tests rely on.
 *
 * Three tiers, matching the result-page hero:
 *   - savings <= 0      → "spending well" — reassuring, points at re-run trigger
 *   - isOptimal && >0   → "modest" — honest about the size, frames it as hygiene
 *   - else              → "material" — action-oriented, names the top move
 */
export function buildTemplatedSummary(
  input: AuditInput,
  result: AuditResult,
): string {
  const useCase = USE_CASE_PHRASES[input.primaryUseCase];
  const N = input.lines.length;
  const toolWord = N === 1 ? "AI tool" : "AI tools";
  const teamWord = input.teamSize === 1 ? "1-person" : `${input.teamSize}-person`;

  const current = formatUsd(result.totals.currentMonthlyUsd);
  const monthly = formatUsd(result.totals.monthlySavingsUsd);
  const annual = formatUsd(result.totals.annualSavingsUsd);
  const pct = Math.round(result.totals.savingsPct);

  const top = topActionable(result);

  if (result.totals.monthlySavingsUsd <= 0) {
    return [
      `For a ${teamWord} ${useCase} team running ${N} ${toolWord},`,
      `the audit didn't surface a defensible reason to switch or downgrade —`,
      `current spend of ${current}/mo lands on plans that fit the actual workload,`,
      `with no obvious over-fit tier and no quiet overage to chase.`,
      `This is the rarer outcome: most stacks have at least one line worth re-pricing.`,
      `The safest next step is to set a reminder to re-run this audit after the next vendor`,
      `pricing change or when team size shifts; we'll email if a meaningful optimization`,
      `later opens up against this stack.`,
    ].join(" ");
  }

  if (result.isOptimal) {
    const topClause = top
      ? ` The biggest single line is ${describeMove(top.line, top.recommendation)} at ${formatUsd(top.recommendation.monthlySavingsUsd)}/mo.`
      : "";
    return [
      `For a ${teamWord} ${useCase} team running ${N} ${toolWord},`,
      `the stack is mostly priced where it should be — current spend ${current}/mo, with`,
      `${monthly}/mo (${annual}/year) of small but defensible savings on the per-tool list below.${topClause}`,
      `These aren't headline moves; they're hygiene — close the unused seat, drop to the cheaper plan`,
      `that still fits the workload, then leave the stack alone until the next vendor pricing change.`,
      `Worth doing once. Not worth obsessing over.`,
    ].join(" ");
  }

  const topClause = top
    ? ` The strongest single move is ${describeMove(top.line, top.recommendation)}, which alone accounts for ${formatUsd(top.recommendation.monthlySavingsUsd)}/mo of that total.`
    : "";
  return [
    `Your ${N}-${toolWord === "AI tool" ? "tool" : "tool"} stack costs ${current}/mo for a ${teamWord} ${useCase} team.`,
    `The audit identified ${monthly}/mo (${annual}/year, or ${pct}% of current spend) of defensible savings —`,
    `every number traces to a vendor's published pricing on the workload you're already running.${topClause}`,
    `None of these are aggressive switches; the recommendations are downgrades or alternatives that fit actual usage,`,
    `with per-tool reasoning surfaced on the breakdown below.`,
    `Forward this audit to whoever signs the bills — line-by-line, the math is verifiable.`,
  ].join(" ");
}

interface TopMove {
  line: SpendLine;
  recommendation: Recommendation;
}

function topActionable(result: AuditResult): TopMove | null {
  let best: TopMove | null = null;
  for (const r of result.results) {
    if (r.recommendation.kind === "optimal") continue;
    if (
      best === null ||
      r.recommendation.monthlySavingsUsd > best.recommendation.monthlySavingsUsd
    ) {
      best = { line: r.line, recommendation: r.recommendation };
    }
  }
  return best;
}

function describeMove(line: SpendLine, rec: Recommendation): string {
  const fromTool = getTool(line.toolId).displayName;
  switch (rec.kind) {
    case "downgrade_plan": {
      const targetPlan = rec.toPlanId
        ? safePlanName(line.toolId, rec.toPlanId)
        : null;
      return targetPlan
        ? `downgrading ${fromTool} to ${targetPlan}`
        : `downgrading ${fromTool}`;
    }
    case "switch_tool": {
      const toTool = rec.toToolId ? getTool(rec.toToolId).displayName : null;
      return toTool
        ? `switching ${fromTool} to ${toTool}`
        : `switching off ${fromTool}`;
    }
    case "consolidate":
      return `consolidating ${fromTool} into the existing stack`;
    case "use_credex":
      return `routing ${fromTool} spend through discounted credits`;
    case "optimal":
      return `keeping ${fromTool} on its current plan`;
  }
}

function safePlanName(toolId: SpendLine["toolId"], planId: string): string | null {
  try {
    return getPlan(toolId, planId).vendorPlanName;
  } catch {
    return null;
  }
}
