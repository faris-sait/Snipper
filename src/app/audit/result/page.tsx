"use client";

import { ArrowRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getOrGenerateSummaryAction } from "@/app/actions/audit";
import { SiteLogo } from "@/components/site-logo";
import { AuditLineCard } from "@/components/audit/audit-line-card";
import { LeadCaptureForm } from "@/components/audit/lead-capture-form";
import { NotifyMeForm } from "@/components/audit/notify-me-form";
import { ShareLink } from "@/components/audit/share-link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type { AuditResult } from "@/lib/audit/types";
import {
  STORAGE_KEYS,
  loadJson,
  sessionStorageOrNull,
} from "@/lib/hooks/use-draft-storage";
import { formatUsd } from "@/lib/utils";

export default function AuditResultPage() {
  const [result, setResult] = useState<AuditResult | null | undefined>(undefined);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    const storage = sessionStorageOrNull();
    const stored = loadJson<AuditResult | null>(
      storage,
      STORAGE_KEYS.lastResult,
      null,
    );
    const storedId = loadJson<string | null>(storage, STORAGE_KEYS.lastAuditId, null);
    // One-time hydration from sessionStorage on mount. This *is* the sync
    // boundary with the external store, not avoidable effect-driven state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(stored);
    setAuditId(storedId);
  }, []);

  // Phase 5 — AI summary loads after the page renders so the engine result
  // is on screen immediately and the model call (or its fallback) drops in
  // when ready. Templated fallback inside the action means we always end up
  // with a paragraph, just possibly the deterministic one.
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    (async () => {
      const state = await getOrGenerateSummaryAction({
        auditId,
        input: result.input,
        result,
      });
      if (cancelled) return;
      if (state.status === "ok") {
        setSummary(state.text);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, auditId]);

  const flaggedSummary = useMemo(() => summariseFlags(result), [result]);

  if (result === undefined) {
    return <LoadingSkeleton />;
  }

  if (result === null) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
          No audit found
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Run an audit first.</h1>
        <Link
          href="/audit"
          className="bg-accent text-accent-fg mt-8 inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium tracking-tight"
        >
          Start the audit
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <SiteLogo size="sm" />
        <Link
          href="/audit"
          className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          run another
        </Link>
      </header>

      <Card className="mb-6">
        <CardBody className="p-8">
          {result.totals.monthlySavingsUsd <= 0 ? (
            <>
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                You&apos;re spending well
              </p>
              <p className="mt-3 text-4xl font-medium tracking-tight md:text-5xl">
                Nothing obvious to cut.
              </p>
              <p className="text-muted-fg mt-3 text-base">
                Your stack looks within range for a{" "}
                {USE_CASE_PHRASES[result.input.primaryUseCase]}{" "}
                team. Drop your email and we&apos;ll let you know if a new
                optimization shows up.
              </p>
              <div className="mt-6 max-w-md">
                <NotifyMeForm auditId={auditId} />
              </div>
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
                per year — small but real wins on the per-tool list below. Drop
                your email and we&apos;ll let you know if a bigger optimization
                shows up.
              </p>
              <div className="mt-6 max-w-md">
                <NotifyMeForm auditId={auditId} />
              </div>
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
                {result.totals.savingsPct.toFixed(0)}% off your current{" "}
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
                {formatUsd(result.totals.monthlySavingsUsd)}/mo of your spend.
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
          {summary ? (
            <p className="text-fg pretty text-[15px] leading-relaxed">{summary}</p>
          ) : (
            <SummarySkeleton />
          )}
        </CardBody>
      </Card>

      {flaggedSummary && (
        <p
          className="text-muted-fg mb-3 font-mono text-[11px] tracking-tight uppercase"
          role="status"
        >
          {flaggedSummary}
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
                  primaryUseCase={result.input.primaryUseCase}
                />
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {!result.isOptimal && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {result.surfaceCredex ? "Get this audit + Credex follow-up" : "Email me my audit"}
            </CardTitle>
            <p className="text-muted-fg mt-1 text-xs">
              We don&apos;t store anything until you ask for the report.
            </p>
          </CardHeader>
          <CardBody className="pt-0">
            <LeadCaptureForm
              auditId={auditId}
              variant={result.surfaceCredex ? "credex" : "report"}
            />
          </CardBody>
        </Card>
      )}

      {auditId && (
        <div className="mt-6">
          <p className="text-muted-fg mb-2 font-mono text-[11px] tracking-tight uppercase">
            Share this audit
          </p>
          <ShareLink auditId={auditId} />
          <p className="text-muted-fg mt-2 text-xs">
            Public link strips identifying details — only tools and savings show.
          </p>
        </div>
      )}

      <p className="text-muted-fg mt-8 font-mono text-xs">
        Pricing verified 2026-05-07 · summary written by Claude with a templated
        fallback if the API errors.
      </p>
    </main>
  );
}

function SummarySkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pulse space-y-2 motion-reduce:animate-none"
    >
      <div className="bg-muted h-3 w-full rounded" />
      <div className="bg-muted h-3 w-[96%] rounded" />
      <div className="bg-muted h-3 w-[92%] rounded" />
      <div className="bg-muted h-3 w-3/4 rounded" />
      <span className="sr-only">Generating summary…</span>
    </div>
  );
}

function summariseFlags(result: AuditResult | null | undefined): string | null {
  if (!result) return null;
  let risk = 0;
  let watch = 0;
  for (const r of result.results) {
    if (r.planHealth.status === "risk") risk += 1;
    else if (r.planHealth.status === "watch") watch += 1;
  }
  if (risk === 0 && watch === 0) return null;
  const parts: string[] = [];
  if (risk > 0) parts.push(`${risk} plan${risk === 1 ? "" : "s"} flagged as risk`);
  if (watch > 0) parts.push(`${watch} to watch`);
  return parts.join(" · ");
}

function LoadingSkeleton() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <div className="mb-10 h-3 w-16" />
      <div
        role="status"
        aria-live="polite"
        className="border-border bg-card animate-pulse rounded-2xl border p-8 motion-reduce:animate-none"
      >
        <div className="bg-muted h-3 w-32 rounded" />
        <div className="bg-muted mt-4 h-12 w-64 rounded" />
        <div className="bg-muted mt-3 h-3 w-48 rounded" />
        <span className="sr-only">Loading audit…</span>
      </div>
      <div className="border-border bg-card mt-6 animate-pulse rounded-2xl border p-6 motion-reduce:animate-none">
        <div className="bg-muted h-3 w-40 rounded" />
        <div className="bg-muted mt-4 h-3 w-3/4 rounded" />
        <div className="bg-muted mt-2 h-3 w-5/6 rounded" />
      </div>
    </main>
  );
}
