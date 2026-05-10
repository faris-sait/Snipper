import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type {
  AuditInput,
  AuditLineResult,
  AuditResult,
  Recommendation,
} from "@/lib/audit/types";
import type { ToolId } from "@/lib/pricing/types";
import { getPlan, getTool } from "@/lib/pricing/tools";

/**
 * The exact system prompt sent to Claude Haiku 4.5 for the personalised audit
 * summary. Mirrored verbatim into PROMPTS.md so the assignment reviewer can
 * read what the model actually saw — keep these in sync if you edit either.
 */
export const SUMMARY_SYSTEM_PROMPT = `You are an analyst writing the executive-summary paragraph for an AI-spend audit. The audit's numbers and recommendations were produced by a deterministic rules engine — your job is to translate them into one readable paragraph that a finance-literate reader would call "obviously fair."

Constraints (all non-negotiable):
- Exactly one paragraph. Plain prose. No bullets, no headings, no markdown.
- 80–130 words.
- Use only the facts in the audit JSON. Do not invent vendors, plans, prices, or savings.
- No exclamation marks, no superlatives ("massive", "huge", "incredible"), no salesy verbs ("unlock", "supercharge", "transform").
- Match tone to the "tier" field:
  - "material" — calm, action-oriented; name the strongest single move.
  - "modest" — honest about the size; frame as hygiene, not headline savings.
  - "none" — reassuring; mention re-running after a vendor pricing change.
- Do not mention Credex by name — the audit page already has that CTA. Your job is the analytical summary, not the pitch.
- End with one sentence the reader could forward to a teammate.

Output: only the paragraph. No preamble, no closing remark, no quotation marks.`;

type Tier = "material" | "modest" | "none";

export function buildSummaryUserPrompt(
  input: AuditInput,
  result: AuditResult,
): string {
  const payload = {
    tier: pickTier(result),
    team_size: input.teamSize,
    use_case: USE_CASE_PHRASES[input.primaryUseCase],
    current_monthly_usd: round2(result.totals.currentMonthlyUsd),
    monthly_savings_usd: round2(result.totals.monthlySavingsUsd),
    annual_savings_usd: round2(result.totals.annualSavingsUsd),
    savings_pct: round2(result.totals.savingsPct),
    is_optimal: result.isOptimal,
    lines: result.results.map(toLinePayload),
  };
  return `Write the summary paragraph for this audit:\n\n${JSON.stringify(payload, null, 2)}`;
}

function pickTier(result: AuditResult): Tier {
  if (result.totals.monthlySavingsUsd <= 0) return "none";
  if (result.isOptimal) return "modest";
  return "material";
}

function toLinePayload(line: AuditLineResult) {
  return {
    tool: getTool(line.line.toolId).displayName,
    current_plan: safePlanName(line.line.toolId, line.line.planId),
    seats: line.line.seats,
    current_spend_usd: round2(line.line.monthlySpendUsd),
    recommendation: describeRec(line.recommendation, line.line.toolId),
    savings_usd: round2(line.recommendation.monthlySavingsUsd),
    plan_health: line.planHealth.status,
  };
}

function describeRec(rec: Recommendation, fromToolId: ToolId): string {
  switch (rec.kind) {
    case "downgrade_plan": {
      const target = rec.toPlanId ? safePlanName(fromToolId, rec.toPlanId) : null;
      return target ? `downgrade to ${target}` : "downgrade plan";
    }
    case "switch_tool": {
      const target = rec.toToolId ? getTool(rec.toToolId).displayName : null;
      return target ? `switch to ${target}` : "switch tool";
    }
    case "consolidate":
      return "consolidate into existing stack";
    case "use_credex":
      return "use discounted credits";
    case "optimal":
      return "no change";
  }
}

function safePlanName(toolId: ToolId, planId: string): string {
  try {
    return getPlan(toolId, planId).vendorPlanName;
  } catch {
    return planId;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
