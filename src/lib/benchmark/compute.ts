import type { AuditInput, AuditResult } from "@/lib/audit/types";

import {
  USE_CASE_FACTOR,
  bucketForTeamSize,
  type BenchmarkBucket,
} from "./data";

export type BenchmarkPosition = "lean" | "in_range" | "elevated" | "heavy";

export interface BenchmarkComparison {
  bucket: BenchmarkBucket;
  /** Adjusted average for this team's use case mix. */
  expectedPerDevMonthly: number;
  /** Adjusted p10 and p90 for the same use case. */
  leanPerDevMonthly: number;
  heavyPerDevMonthly: number;
  /** Observed value from the audit. */
  observedPerDevMonthly: number;
  /**
   * Positive = above expected (heavier), negative = below expected (leaner).
   * Computed off `observed - expected` divided by expected.
   */
  deltaPct: number;
  position: BenchmarkPosition;
  /** Short one-line headline suitable for the result page card. */
  headline: string;
}

/**
 * Compare an audit's per-developer spend against the bucket for its team
 * size and use case. Returns null when there isn't enough signal — zero
 * total spend, zero seats, or a degenerate team size — rather than printing
 * an apples-to-oranges comparison.
 */
export function compareToBenchmark(
  input: AuditInput,
  result: AuditResult,
): BenchmarkComparison | null {
  const teamSize = Math.max(1, Math.floor(input.teamSize));
  const current = result.totals.currentMonthlyUsd;
  if (current <= 0) return null;

  const bucket = bucketForTeamSize(teamSize);
  const factor = USE_CASE_FACTOR[input.primaryUseCase] ?? 1;
  const expectedPerDevMonthly = round(bucket.baselinePerDevMonthly * factor);
  const leanPerDevMonthly = round(bucket.p10PerDevMonthly * factor);
  const heavyPerDevMonthly = round(bucket.p90PerDevMonthly * factor);
  const observedPerDevMonthly = round(current / teamSize);

  const deltaPct =
    expectedPerDevMonthly === 0
      ? 0
      : (observedPerDevMonthly - expectedPerDevMonthly) / expectedPerDevMonthly;

  let position: BenchmarkPosition;
  if (observedPerDevMonthly <= leanPerDevMonthly) {
    position = "lean";
  } else if (observedPerDevMonthly >= heavyPerDevMonthly) {
    position = "heavy";
  } else if (deltaPct > 0.15) {
    position = "elevated";
  } else {
    position = "in_range";
  }

  const headline = headlineFor(position, deltaPct);

  return {
    bucket,
    expectedPerDevMonthly,
    leanPerDevMonthly,
    heavyPerDevMonthly,
    observedPerDevMonthly,
    deltaPct,
    position,
    headline,
  };
}

function headlineFor(p: BenchmarkPosition, deltaPct: number): string {
  switch (p) {
    case "lean":
      return "Below the lean tenth for your size — likely under-resourced if anything.";
    case "in_range":
      return "Within the typical range for your team size and use case.";
    case "elevated":
      return `Around ${pctLabel(deltaPct)} above the average for your size.`;
    case "heavy":
      return `Top decile for your size — ${pctLabel(deltaPct)} above the average.`;
  }
}

function pctLabel(delta: number): string {
  const pct = Math.round(Math.abs(delta) * 100);
  return `${pct}%`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
