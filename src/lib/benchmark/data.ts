/**
 * Benchmark dataset — per-developer monthly AI tool spend, bucketed by team
 * size and weighted by primary use case.
 *
 * Numbers are directional estimates derived from public signal (vendor list
 * pricing × typical seat coverage, plus Anthropic / OpenAI usage-billed
 * direct-API spend reported in published case studies and 2025 dev surveys).
 * Treat them as a sanity-check baseline, not a precise market reading.
 */
import type { UseCase } from "@/lib/pricing/types";

export interface BenchmarkBucket {
  /** Inclusive lower bound on team size. */
  minSize: number;
  /** Inclusive upper bound (Infinity for the top bucket). */
  maxSize: number;
  /** Human-readable label, e.g. "1–10 people". */
  label: string;
  /**
   * Average AI tool spend per developer per month for a *coding-primary*
   * team in this size bucket. Use-case multipliers below adjust for
   * writing / data / research / mixed teams.
   */
  baselinePerDevMonthly: number;
  /**
   * Rough p10–p90 range for the same bucket, for the "you're in the top
   * decile" / "lean for your size" framing on the result page.
   */
  p10PerDevMonthly: number;
  p90PerDevMonthly: number;
}

export const BENCHMARK_BUCKETS: BenchmarkBucket[] = [
  {
    minSize: 1,
    maxSize: 10,
    label: "1–10 people",
    baselinePerDevMonthly: 80,
    p10PerDevMonthly: 30,
    p90PerDevMonthly: 160,
  },
  {
    minSize: 11,
    maxSize: 50,
    label: "11–50 people",
    baselinePerDevMonthly: 160,
    p10PerDevMonthly: 70,
    p90PerDevMonthly: 280,
  },
  {
    minSize: 51,
    maxSize: 200,
    label: "51–200 people",
    baselinePerDevMonthly: 240,
    p10PerDevMonthly: 120,
    p90PerDevMonthly: 380,
  },
  {
    minSize: 201,
    maxSize: Number.POSITIVE_INFINITY,
    label: "201+ people",
    baselinePerDevMonthly: 320,
    p10PerDevMonthly: 180,
    p90PerDevMonthly: 480,
  },
];

/**
 * How much each use case skews per-developer AI spend vs the
 * coding-primary baseline. Coding teams buy IDE assistants AND chat AND
 * direct API access; writing teams typically just buy chat seats.
 */
export const USE_CASE_FACTOR: Record<UseCase, number> = {
  coding: 1.0,
  writing: 0.55,
  data: 0.85,
  research: 0.9,
  mixed: 1.0,
};

export function bucketForTeamSize(teamSize: number): BenchmarkBucket {
  const found = BENCHMARK_BUCKETS.find(
    (b) => teamSize >= b.minSize && teamSize <= b.maxSize,
  );
  // teamSize is validated to >= 1 by Zod, so the first bucket always matches.
  return found ?? BENCHMARK_BUCKETS[0]!;
}
