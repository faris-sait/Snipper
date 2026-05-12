import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { BenchmarkComparison } from "@/lib/benchmark/compute";
import { formatUsd } from "@/lib/utils";

const LABEL_BY_POSITION = {
  lean: "Lean for your size",
  in_range: "Typical for your size",
  elevated: "Elevated for your size",
  heavy: "Top decile for your size",
} as const;

interface Props {
  comparison: BenchmarkComparison;
  /** "your" vs "this" — different copy on the result page vs the public share page. */
  voice?: "first-person" | "third-person";
}

/**
 * Render the per-developer benchmark for an audit. Compares the team's
 * observed $/dev/mo to the bucket baseline + p10/p90 range, surfaces the
 * relative position, and shows a simple bar so the comparison is readable
 * at a glance.
 */
export function BenchmarkCard({ comparison, voice = "first-person" }: Props) {
  const {
    bucket,
    expectedPerDevMonthly,
    leanPerDevMonthly,
    heavyPerDevMonthly,
    observedPerDevMonthly,
    position,
    headline,
  } = comparison;

  // Clamp the bar position to the chart range [lean, heavy] so very high or
  // very low spends still produce a sensible visual.
  const span = Math.max(1, heavyPerDevMonthly - leanPerDevMonthly);
  const pctOfRange = Math.max(
    0,
    Math.min(1, (observedPerDevMonthly - leanPerDevMonthly) / span),
  );
  const averageOffset = Math.max(
    0,
    Math.min(1, (expectedPerDevMonthly - leanPerDevMonthly) / span),
  );

  const possessive = voice === "first-person" ? "Your" : "This";

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>How {possessive.toLowerCase()} stack compares</CardTitle>
        <p className="text-muted-fg mt-1 text-xs">
          {possessive} per-developer AI spend versus teams the same size.
        </p>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl font-medium tracking-tight tabular-nums">
            {formatUsd(observedPerDevMonthly)}
          </p>
          <p className="text-muted-fg text-sm">
            /dev/mo · {possessive.toLowerCase()} stack
          </p>
        </div>
        <p className="text-muted-fg mt-1 text-xs font-mono uppercase tracking-tight">
          {LABEL_BY_POSITION[position]}
        </p>
        <p className="text-fg pretty mt-3 text-sm leading-relaxed">{headline}</p>

        <div className="relative mt-6 h-2 w-full rounded-full bg-muted">
          <div
            aria-hidden
            className="bg-accent/30 absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pctOfRange * 100}%` }}
          />
          <div
            aria-hidden
            className="bg-fg absolute top-1/2 h-3 w-0.5 -translate-y-1/2"
            style={{ left: `${averageOffset * 100}%` }}
            title="Average"
          />
          <div
            aria-hidden
            className="bg-accent absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${pctOfRange * 100}%` }}
            title={`${possessive} team`}
          />
        </div>
        <div className="text-muted-fg mt-2 flex justify-between text-[11px] font-mono tracking-tight">
          <span>{formatUsd(leanPerDevMonthly)} lean</span>
          <span>{formatUsd(expectedPerDevMonthly)} avg · {bucket.label}</span>
          <span>{formatUsd(heavyPerDevMonthly)} heavy</span>
        </div>
      </CardBody>
    </Card>
  );
}
