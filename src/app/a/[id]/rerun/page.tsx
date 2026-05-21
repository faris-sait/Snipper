import type { ReactNode } from "react";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteLogo } from "@/components/site-logo";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditDiff, LineDiff } from "@/lib/audit/diff";
import { isWellFormedAuditId } from "@/lib/audit/id";
import { rerunAuditAgainstCurrentPricing } from "@/lib/audit/reaudit";
import type { AuditLineResult, Recommendation } from "@/lib/audit/types";
import { getPublicAudit } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { getEffectiveTools } from "@/lib/pricing/effective";
import { getPlanFrom, getToolFrom } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";
import { cn, formatUsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RerunAuditPage({ params }: PageProps) {
  const { id } = await params;

  if (!isWellFormedAuditId(id)) notFound();
  if (!isPersistenceConfigured()) notFound();

  const audit = await getPublicAudit(id).catch(() => null);
  if (!audit) notFound();

  if (!audit.pricing_snapshot) {
    return (
      <PageChrome id={id}>
        <p className="text-muted-fg mb-3 font-mono text-[11px] tracking-tight uppercase">
          Re-audit unavailable
        </p>
        <Card>
          <CardBody className="p-8">
            <p className="text-3xl font-medium tracking-tight md:text-4xl">
              This audit predates pricing snapshots.
            </p>
            <p className="text-muted-fg mt-3 max-w-2xl text-base leading-relaxed">
              The original result still exists, but Snipper cannot show a defensible rerun diff
              because this audit was saved before Round 2 started storing per-audit pricing context.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/a/${id}`}
                className="border-border bg-card text-fg hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium tracking-tight transition-colors"
              >
                View original audit
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/audit"
                className="text-muted-fg hover:text-fg inline-flex h-10 items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
              >
                run a fresh audit
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </CardBody>
        </Card>
      </PageChrome>
    );
  }

  const effective = await getEffectiveTools();
  const { oldTools, newResult, diff } = rerunAuditAgainstCurrentPricing(
    { input: audit.input, result: audit.result, pricing_snapshot: audit.pricing_snapshot },
    effective.tools,
  );
  const changedLines = diff.lines.filter((line) => line.kind !== "unchanged");
  const unchangedLines = diff.lines.filter((line) => line.kind === "unchanged");
  const hero = describeHero(diff, changedLines.length);
  const rerunDate = new Date().toISOString().slice(0, 10);

  return (
    <PageChrome id={id}>
      <p className="text-muted-fg mb-3 font-mono text-[11px] tracking-tight uppercase">
        Re-audit diff · saved {new Date(audit.created_at).toISOString().slice(0, 10)} · rerun{" "}
        {rerunDate}
      </p>

      <Card className="mb-6">
        <CardBody className="p-8">
          <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">{hero.eyebrow}</p>
          <p className="mt-3 text-4xl font-medium tracking-tight md:text-5xl">{hero.title}</p>
          <p className="text-muted-fg mt-3 max-w-2xl text-base leading-relaxed">{hero.body}</p>

          <div className="mt-6 flex flex-wrap gap-3 font-mono text-[11px] tracking-tight uppercase">
            <StatPill label="changed tools" value={`${changedLines.length}`} />
            <StatPill label="unchanged tools" value={`${unchangedLines.length}`} />
            <StatPill label="pricing version" value={effective.version} />
          </div>
        </CardBody>
      </Card>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Original audit"
          note={`Saved ${new Date(audit.created_at).toISOString().slice(0, 10)}`}
          monthlySavingsUsd={audit.result.totals.monthlySavingsUsd}
          annualSavingsUsd={audit.result.totals.annualSavingsUsd}
          projectedMonthlyUsd={audit.result.totals.recommendedMonthlyUsd}
        />
        <SummaryCard
          label="Current rerun"
          note={`Live pricing · ${effective.version}`}
          monthlySavingsUsd={newResult.totals.monthlySavingsUsd}
          annualSavingsUsd={newResult.totals.annualSavingsUsd}
          projectedMonthlyUsd={newResult.totals.recommendedMonthlyUsd}
          deltaSavingsUsd={diff.totals.deltaSavings}
        />
      </section>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What changed</CardTitle>
          <p className="text-muted-fg mt-1 text-xs">
            The same reported stack, recomputed against current pricing and compared with the
            original saved result.
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          {changedLines.length === 0 ? (
            <p className="text-muted-fg text-sm leading-relaxed">
              No material recommendation change right now. This rerun still lands on the same answer
              as the original audit.
            </p>
          ) : (
            <ol role="list" className="-mx-2">
              {changedLines.map((line, i) => (
                <li key={`${line.toolId}-${line.planId}-${i}`}>
                  <DiffLineCard line={line} oldTools={oldTools} newTools={effective.tools} />
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {unchangedLines.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Still unchanged</CardTitle>
            <p className="text-muted-fg mt-1 text-xs">
              These tools still point to the same recommendation after the rerun.
            </p>
          </CardHeader>
          <CardBody className="pt-0">
            <ul className="space-y-2">
              {unchangedLines.map((line, i) => {
                const current = line.newLineResult ?? line.oldLineResult;
                if (!current) return null;
                return (
                  <li
                    key={`${line.toolId}-${line.planId}-stable-${i}`}
                    className="border-border/60 flex flex-col gap-1 rounded-xl border px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {toolName(oldTools, current.line.toolId)}{" "}
                        {planName(oldTools, current.line.toolId, current.line.planId)}
                      </p>
                      <p className="text-muted-fg text-sm">
                        {describeRecommendation(
                          current.recommendation,
                          effective.tools,
                          current.line.toolId,
                        )}
                      </p>
                    </div>
                    <p className="text-muted-fg font-mono text-xs tabular-nums">
                      {formatUsd(current.recommendation.monthlySavingsUsd)}/mo
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/a/${id}`}
          className="border-border bg-card text-fg hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium tracking-tight transition-colors"
        >
          View original audit
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/audit"
          className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
        >
          run your own audit
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </PageChrome>
  );
}

function PageChrome({ id, children }: { id: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <SiteLogo size="sm" />
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/a/${id}`}
            className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
          >
            original audit
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href="/audit"
            className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
          >
            run your own
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>
      {children}
    </main>
  );
}

function SummaryCard({
  label,
  note,
  monthlySavingsUsd,
  annualSavingsUsd,
  projectedMonthlyUsd,
  deltaSavingsUsd,
}: {
  label: string;
  note: string;
  monthlySavingsUsd: number;
  annualSavingsUsd: number;
  projectedMonthlyUsd: number;
  deltaSavingsUsd?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <p className="text-muted-fg mt-1 text-xs">{note}</p>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="text-4xl font-medium tracking-tight tabular-nums">
          <span className="text-accent">{formatUsd(monthlySavingsUsd)}</span>
          <span className="text-muted-fg ml-2 text-xl font-normal">/mo</span>
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-fg">Annualized</dt>
            <dd className="font-mono tabular-nums">{formatUsd(annualSavingsUsd)}/yr</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-fg">Projected stack</dt>
            <dd className="font-mono tabular-nums">{formatUsd(projectedMonthlyUsd)}/mo</dd>
          </div>
          {typeof deltaSavingsUsd === "number" && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-fg">Change vs original</dt>
              <dd
                className={cn(
                  "font-mono tabular-nums",
                  deltaSavingsUsd > 0 && "text-success",
                  deltaSavingsUsd < 0 && "text-warning",
                )}
              >
                {formatSignedUsd(deltaSavingsUsd)}/mo
              </dd>
            </div>
          )}
        </dl>
      </CardBody>
    </Card>
  );
}

function DiffLineCard({
  line,
  oldTools,
  newTools,
}: {
  line: LineDiff;
  oldTools: Record<ToolId, Tool>;
  newTools: Record<ToolId, Tool>;
}) {
  const current = line.oldLineResult ?? line.newLineResult;
  if (!current) return null;

  return (
    <article className="border-border/60 border-t px-2 py-5 first:border-t-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="font-medium">{toolName(oldTools, current.line.toolId)}</p>
            <p className="text-muted-fg text-xs">
              {planName(oldTools, current.line.toolId, current.line.planId)} · {current.line.seats}
              &nbsp;seat{current.line.seats === 1 ? "" : "s"} ·{" "}
              {formatUsd(current.line.monthlySpendUsd)}/mo
            </p>
          </div>
        </div>
        <ChangeBadge kind={line.kind} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RecommendationPanel label="Before" result={line.oldLineResult} tools={oldTools} />
        <RecommendationPanel label="Now" result={line.newLineResult} tools={newTools} accent />
      </div>
    </article>
  );
}

function RecommendationPanel({
  label,
  result,
  tools,
  accent = false,
}: {
  label: string;
  result: AuditLineResult | null;
  tools: Record<ToolId, Tool>;
  accent?: boolean;
}) {
  if (!result) {
    return (
      <div className="border-border/60 rounded-xl border px-4 py-4">
        <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">{label}</p>
        <p className="text-muted-fg mt-2 text-sm">No saved recommendation.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/60 rounded-xl border px-4 py-4",
        accent && "bg-muted/30 border-accent/20",
      )}
    >
      <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">{label}</p>
      <p className="mt-2 text-sm font-medium">
        {describeRecommendation(result.recommendation, tools, result.line.toolId)}
      </p>
      <p className="text-muted-fg mt-1 text-sm leading-relaxed">{result.recommendation.reason}</p>
      <dl className="text-muted-fg mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tracking-tight uppercase">
        <div className="inline-flex items-center gap-1">
          <dt>save</dt>
          <dd className="text-fg">{formatUsd(result.recommendation.monthlySavingsUsd)}/mo</dd>
        </div>
        <div className="inline-flex items-center gap-1">
          <dt>projected</dt>
          <dd className="text-fg">{formatUsd(result.recommendation.projectedMonthlyUsd)}/mo</dd>
        </div>
      </dl>
    </div>
  );
}

function ChangeBadge({ kind }: { kind: LineDiff["kind"] }) {
  const label =
    kind === "recommendation_changed"
      ? "Target changed"
      : kind === "savings_changed"
        ? "Math changed"
        : "Unchanged";

  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] tracking-tight uppercase",
        kind === "recommendation_changed" && "bg-accent text-accent-fg",
        kind === "savings_changed" && "border-border bg-card text-muted-fg border",
      )}
    >
      {label}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="border-border bg-card text-muted-fg inline-flex items-center gap-1.5 rounded border px-2 py-1">
      <span>{label}</span>
      <span className="text-fg">{value}</span>
    </span>
  );
}

function describeHero(diff: AuditDiff, changedLineCount: number) {
  const moved =
    changedLineCount === 0
      ? "No line-level recommendation changed."
      : changedLineCount === 1
        ? "1 tool moved."
        : `${changedLineCount} tools moved.`;

  if (diff.totals.signal === "better") {
    return {
      eyebrow: "Current pricing is more favorable",
      title: `${formatUsd(diff.totals.deltaSavings)} more savings per month.`,
      body: `The same reported stack now saves ${formatUsd(diff.totals.newSavings)}/mo instead of ${formatUsd(diff.totals.oldSavings)}/mo. ${moved}`,
    };
  }

  if (diff.totals.signal === "worse") {
    return {
      eyebrow: "Current pricing is less favorable",
      title: `${formatUsd(Math.abs(diff.totals.deltaSavings))}/mo less savings than the original audit.`,
      body: `The same reported stack now saves ${formatUsd(diff.totals.newSavings)}/mo instead of ${formatUsd(diff.totals.oldSavings)}/mo. ${moved}`,
    };
  }

  if (changedLineCount > 0) {
    return {
      eyebrow: "Recommendation moved",
      title: `Savings stayed flat, but the best move changed.`,
      body: `Estimated savings still land at ${formatUsd(diff.totals.newSavings)}/mo, but the recommendation target changed under current pricing. ${moved}`,
    };
  }

  return {
    eyebrow: "No material change",
    title: `This audit still lands on the same answer.`,
    body: `Current pricing still points to ${formatUsd(diff.totals.newSavings)}/mo in savings for the same reported stack.`,
  };
}

function describeRecommendation(
  rec: Recommendation,
  tools: Record<ToolId, Tool>,
  fromToolId: ToolId,
) {
  switch (rec.kind) {
    case "downgrade_plan":
      return rec.toPlanId
        ? `Downgrade to ${planName(tools, fromToolId, rec.toPlanId)}`
        : "Downgrade plan";
    case "switch_tool":
      if (rec.toToolId && rec.toPlanId) {
        return `Switch to ${toolName(tools, rec.toToolId)} ${planName(tools, rec.toToolId, rec.toPlanId)}`;
      }
      if (rec.toToolId) {
        return `Switch to ${toolName(tools, rec.toToolId)}`;
      }
      return "Switch tool";
    case "use_credex":
      return "Use Credex credits";
    case "consolidate":
      return "Consolidate into the existing stack";
    case "optimal":
      return "Already a fit";
  }
}

function toolName(tools: Record<ToolId, Tool>, toolId: ToolId) {
  try {
    return getToolFrom(tools, toolId).displayName;
  } catch {
    return toolId;
  }
}

function planName(tools: Record<ToolId, Tool>, toolId: ToolId, planId: string) {
  try {
    return getPlanFrom(tools, toolId, planId).vendorPlanName;
  } catch {
    return planId;
  }
}

function formatSignedUsd(n: number) {
  return `${n > 0 ? "+" : ""}${formatUsd(n)}`;
}
