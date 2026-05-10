import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuditLineCard } from "@/components/audit/audit-line-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { generateSummary } from "@/lib/ai/summary";
import { isWellFormedAuditId } from "@/lib/audit/id";
import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type { AuditLineResult } from "@/lib/audit/types";
import { getPublicAudit, setAuditSummary } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { formatUsd } from "@/lib/utils";

// The public route reads a runtime DB row, so it must opt out of static
// rendering. Without `force-dynamic` Next.js would try to prerender at build
// time and either skip the page or cache the empty-state shell.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isWellFormedAuditId(id) || !isPersistenceConfigured()) {
    return { title: "Audit not found" };
  }
  const audit = await getPublicAudit(id).catch(() => null);
  if (!audit) return { title: "Audit not found" };

  const { totals, isOptimal } = audit.result;
  const title = isOptimal
    ? "AI spend audit: nothing obvious to cut"
    : `AI spend audit: ${formatUsd(totals.monthlySavingsUsd)}/mo savings (${formatUsd(
        totals.annualSavingsUsd,
      )}/yr)`;
  const description = isOptimal
    ? "An audit of an AI tool stack — already on the cheapest defensible plans for the use case."
    : `${formatUsd(totals.monthlySavingsUsd)}/mo of plausible savings on this stack, with a sourced reason for every number.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: audit.created_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicAuditPage({ params }: PageProps) {
  const { id } = await params;
  if (!isWellFormedAuditId(id)) notFound();
  if (!isPersistenceConfigured()) notFound();

  const audit = await getPublicAudit(id).catch(() => null);
  if (!audit) notFound();

  const { result, input } = audit;
  const flagged = summariseFlags(result.results);

  // Phase 5 — render the AI summary inline so shared links never flicker.
  // First view of a fresh audit pays the (capped) AI call; subsequent views
  // hit the cached column. Templated fallback handles every error path.
  let summaryText = audit.ai_summary;
  if (!summaryText) {
    const gen = await generateSummary(input, result);
    summaryText = gen.text;
    if (gen.source === "ai") {
      await setAuditSummary(id, gen.text).catch(() => {});
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <Link
          href="/"
          className="text-muted-fg hover:text-fg font-mono text-xs tracking-tight transition-colors"
        >
          ← Snipper
        </Link>
        <Link
          href="/audit"
          className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
        >
          run your own
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <p className="text-muted-fg mb-3 font-mono text-[11px] tracking-tight uppercase">
        Shared audit · {new Date(audit.created_at).toISOString().slice(0, 10)}
      </p>

      <Card className="mb-6">
        <CardBody className="p-8">
          {result.totals.monthlySavingsUsd <= 0 ? (
            <>
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                This stack is spending well
              </p>
              <p className="mt-3 text-4xl font-medium tracking-tight md:text-5xl">
                Nothing obvious to cut.
              </p>
              <p className="text-muted-fg mt-3 text-base">
                Already on the cheapest defensible plans for a{" "}
                {USE_CASE_PHRASES[input.primaryUseCase]}{" "}
                team.
              </p>
            </>
          ) : result.isOptimal ? (
            <>
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                Modest savings
              </p>
              <p className="mt-3 text-5xl font-medium tracking-tight tabular-nums md:text-6xl">
                <span className="text-accent">
                  {formatUsd(result.totals.monthlySavingsUsd)}
                </span>
                <span className="text-muted-fg ml-2 text-2xl font-normal">/mo</span>
              </p>
              <p className="text-muted-fg mt-2 text-base">
                {formatUsd(result.totals.annualSavingsUsd)}{" "}
                per year — small but real wins on the per-tool list below.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                Estimated monthly savings
              </p>
              <p className="mt-3 text-5xl font-medium tracking-tight tabular-nums md:text-6xl">
                <span className="text-accent">
                  {formatUsd(result.totals.monthlySavingsUsd)}
                </span>
                <span className="text-muted-fg ml-2 text-2xl font-normal">/mo</span>
              </p>
              <p className="text-muted-fg mt-2 text-base">
                {formatUsd(result.totals.annualSavingsUsd)} per year ·{" "}
                {result.totals.savingsPct.toFixed(0)}% off the current{" "}
                {formatUsd(result.totals.currentMonthlyUsd)}/mo
              </p>
            </>
          )}
        </CardBody>
      </Card>

      {result.surfaceCredex && (
        <Card className="bg-accent text-accent-fg mb-6 border-transparent">
          <CardBody className="p-6 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className="font-mono text-xs tracking-tight uppercase opacity-80">
                Highest-leverage move
              </p>
              <p className="mt-2 text-xl font-medium tracking-tight">
                Credex sources discounted credits for{" "}
                {formatUsd(result.totals.monthlySavingsUsd)}/mo of this spend.
              </p>
            </div>
            <Link
              href="https://credex.rocks"
              target="_blank"
              rel="noreferrer"
              className="bg-accent-fg text-accent mt-4 inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-medium tracking-tight md:mt-0"
            >
              Talk to Credex
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <p className="text-fg pretty text-[15px] leading-relaxed">{summaryText}</p>
        </CardBody>
      </Card>

      {flagged && (
        <p className="text-muted-fg mb-3 font-mono text-[11px] tracking-tight uppercase">
          {flagged}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Per-tool breakdown</CardTitle>
          <p className="text-muted-fg mt-1 text-xs">
            Tap a row to see the full plan ladder, plan-health note, and source.
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          <ol role="list" className="-mx-2">
            {result.results.map((line, i) => (
              <li key={`${line.line.toolId}-${line.line.planId}-${i}`}>
                <AuditLineCard
                  result={line}
                  primaryUseCase={input.primaryUseCase}
                />
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-fg font-mono text-xs">
          Pricing verified 2026-05-07 · every number cites a vendor source.
        </p>
        <Link
          href="/audit"
          className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
        >
          run your own audit
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </main>
  );
}

function summariseFlags(lines: AuditLineResult[]): string | null {
  let risk = 0;
  let watch = 0;
  for (const r of lines) {
    if (r.planHealth.status === "risk") risk += 1;
    else if (r.planHealth.status === "watch") watch += 1;
  }
  if (risk === 0 && watch === 0) return null;
  const parts: string[] = [];
  if (risk > 0) parts.push(`${risk} plan${risk === 1 ? "" : "s"} flagged as risk`);
  if (watch > 0) parts.push(`${watch} to watch`);
  return parts.join(" · ");
}
