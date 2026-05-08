import type { ToolId, UseCase } from "@/lib/pricing/types";
import type { PlanHealth } from "./plan-health";

/**
 * One line in the user's spend table: "I'm on Cursor Business with 4 seats,
 * paying $160/mo." We trust the spend the user reports rather than recalculating
 * from list price (they may have annual discounts, grandfathered rates, etc.).
 */
export interface SpendLine {
  toolId: ToolId;
  planId: string;
  seats: number;
  monthlySpendUsd: number;
}

export interface AuditInput {
  lines: SpendLine[];
  teamSize: number;
  primaryUseCase: UseCase;
}

export type RecommendationKind =
  | "downgrade_plan"
  | "switch_tool"
  | "consolidate"
  | "use_credex"
  | "optimal";

export interface Recommendation {
  kind: RecommendationKind;
  toToolId?: ToolId;
  toPlanId?: string;
  /** Projected monthly spend after applying this recommendation. */
  projectedMonthlyUsd: number;
  monthlySavingsUsd: number;
  reason: string;
  /** How confident we are this swap actually fits the user. */
  confidence: "high" | "medium" | "low";
}

export interface AuditLineResult {
  line: SpendLine;
  recommendation: Recommendation;
  /**
   * Standalone signal about the plan itself (rate-limit risk, annual prepay,
   * unpublished pricing) — independent of whether a cheaper option exists.
   */
  planHealth: PlanHealth;
}

export interface AuditTotals {
  currentMonthlyUsd: number;
  recommendedMonthlyUsd: number;
  monthlySavingsUsd: number;
  annualSavingsUsd: number;
  /** Percentage of current spend that could be saved (0-100). */
  savingsPct: number;
}

export interface AuditResult {
  input: AuditInput;
  results: AuditLineResult[];
  totals: AuditTotals;
  /** True when monthly savings >= $500 — the brief's CTA threshold. */
  surfaceCredex: boolean;
  /** True when monthly savings < $100 OR every line is already optimal. */
  isOptimal: boolean;
}
