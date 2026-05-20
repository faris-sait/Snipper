import type { ToolId } from "@/lib/pricing/types";

import type { AuditLineResult, AuditResult } from "./types";

const CHANGE_TOLERANCE_USD = 1;

export type AuditDiffSignal = "better" | "worse" | "same";
export type LineDiffKind = "unchanged" | "recommendation_changed" | "savings_changed";

export interface LineDiff {
  toolId: ToolId;
  planId: string;
  kind: LineDiffKind;
  oldLineResult: AuditLineResult | null;
  newLineResult: AuditLineResult | null;
}

export interface AuditDiff {
  lines: LineDiff[];
  totals: {
    oldSavings: number;
    newSavings: number;
    deltaSavings: number;
    signal: AuditDiffSignal;
  };
}

/**
 * Compare the stored audit result against a freshly re-run one. The line order
 * is stable because both results come from the same input payload.
 */
export function diffAuditResults(oldResult: AuditResult, newResult: AuditResult): AuditDiff {
  const lines: LineDiff[] = [];
  const lineCount = Math.max(oldResult.results.length, newResult.results.length);

  for (let i = 0; i < lineCount; i++) {
    const oldLineResult = oldResult.results[i] ?? null;
    const newLineResult = newResult.results[i] ?? null;
    const fallback = oldLineResult ?? newLineResult;
    if (!fallback) continue;

    lines.push({
      toolId: fallback.line.toolId,
      planId: fallback.line.planId,
      kind: classifyLineDiff(oldLineResult, newLineResult),
      oldLineResult,
      newLineResult,
    });
  }

  const oldSavings = oldResult.totals.monthlySavingsUsd;
  const newSavings = newResult.totals.monthlySavingsUsd;
  const deltaSavings = round(newSavings - oldSavings);

  return {
    lines,
    totals: {
      oldSavings,
      newSavings,
      deltaSavings,
      signal: classifySignal(deltaSavings),
    },
  };
}

/**
 * The brief's trigger threshold: a pricing change matters when the total moves
 * by at least $1 OR the recommendation target itself changed.
 */
export function isNonTrivialAuditDiff(diff: AuditDiff): boolean {
  return (
    Math.abs(diff.totals.deltaSavings) >= CHANGE_TOLERANCE_USD ||
    diff.lines.some((line) => line.kind === "recommendation_changed")
  );
}

function classifyLineDiff(
  oldLineResult: AuditLineResult | null,
  newLineResult: AuditLineResult | null,
): LineDiffKind {
  if (!oldLineResult || !newLineResult) {
    return "recommendation_changed";
  }

  if (!sameRecommendation(oldLineResult, newLineResult)) {
    return "recommendation_changed";
  }

  const savingsDelta = Math.abs(
    newLineResult.recommendation.monthlySavingsUsd - oldLineResult.recommendation.monthlySavingsUsd,
  );
  const projectedDelta = Math.abs(
    newLineResult.recommendation.projectedMonthlyUsd -
      oldLineResult.recommendation.projectedMonthlyUsd,
  );

  if (savingsDelta >= CHANGE_TOLERANCE_USD || projectedDelta >= CHANGE_TOLERANCE_USD) {
    return "savings_changed";
  }

  return "unchanged";
}

function sameRecommendation(
  oldLineResult: AuditLineResult,
  newLineResult: AuditLineResult,
): boolean {
  return (
    oldLineResult.recommendation.kind === newLineResult.recommendation.kind &&
    oldLineResult.recommendation.toToolId === newLineResult.recommendation.toToolId &&
    oldLineResult.recommendation.toPlanId === newLineResult.recommendation.toPlanId
  );
}

function classifySignal(deltaSavings: number): AuditDiffSignal {
  if (deltaSavings >= CHANGE_TOLERANCE_USD) return "better";
  if (deltaSavings <= -CHANGE_TOLERANCE_USD) return "worse";
  return "same";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
