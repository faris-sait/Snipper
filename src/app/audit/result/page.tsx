"use client";

import { ArrowRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditResult } from "@/lib/audit/types";
import { STORAGE_KEYS, loadJson, sessionStorageOrNull } from "@/lib/hooks/use-draft-storage";
import { TOOLS, getPlan } from "@/lib/pricing/tools";
import { formatUsd } from "@/lib/utils";

const KIND_LABEL: Record<AuditResult["results"][number]["recommendation"]["kind"], string> = {
  downgrade_plan: "Downgrade plan",
  switch_tool: "Switch tool",
  consolidate: "Consolidate",
  use_credex: "Use Credex credits",
  optimal: "Already a fit",
};

export default function AuditResultPage() {
  const [result, setResult] = useState<AuditResult | null | undefined>(undefined);

  useEffect(() => {
    const stored = loadJson<AuditResult | null>(
      sessionStorageOrNull(),
      STORAGE_KEYS.lastResult,
      null,
    );
    // One-time hydration from sessionStorage on mount. This *is* the sync
    // boundary with the external store, not avoidable effect-driven state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(stored);
  }, []);

  if (result === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-24">
        <p className="text-muted-fg text-sm">Loading audit…</p>
      </main>
    );
  }

  if (result === null) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
          No audit found
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Run an audit first.
        </h1>
        <Link
          href="/audit"
          className="bg-accent text-accent-fg mt-8 inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium tracking-tight"
        >
          Start the audit
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <Link
          href="/"
          className="text-muted-fg hover:text-fg font-mono text-xs tracking-tight transition-colors"
        >
          ← back
        </Link>
        <Link
          href="/audit"
          className="text-muted-fg hover:text-fg inline-flex items-center gap-1.5 font-mono text-xs tracking-tight transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" />
          run another
        </Link>
      </header>

      <Card className="mb-8">
        <CardBody className="p-8">
          {result.isOptimal ? (
            <>
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                You&apos;re spending well
              </p>
              <p className="mt-3 text-4xl font-medium tracking-tight md:text-5xl">
                Nothing obvious to cut.
              </p>
              <p className="text-muted-fg mt-3 text-base">
                Your stack looks within range. We&apos;ll let you know if a new optimization
                applies — drop your email below.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                Estimated monthly savings
              </p>
              <p className="mt-3 text-5xl font-medium tracking-tight md:text-6xl">
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
        <Card className="bg-accent text-accent-fg mb-8 border-transparent">
          <CardBody className="p-6 md:flex md:items-center md:justify-between">
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
              className="bg-accent-fg text-accent mt-4 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium tracking-tight md:mt-0 md:shrink-0"
            >
              Talk to Credex
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Per-tool breakdown</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 pt-3">
          {result.results.map((line, i) => {
            const tool = TOOLS[line.line.toolId];
            const fromPlan = (() => {
              try {
                return getPlan(line.line.toolId, line.line.planId);
              } catch {
                return null;
              }
            })();
            const toPlan =
              line.recommendation.toToolId && line.recommendation.toPlanId
                ? (() => {
                    try {
                      return getPlan(
                        line.recommendation.toToolId,
                        line.recommendation.toPlanId,
                      );
                    } catch {
                      return null;
                    }
                  })()
                : null;
            const toTool = line.recommendation.toToolId
              ? TOOLS[line.recommendation.toToolId]
              : null;

            return (
              <div
                key={`${line.line.toolId}-${line.line.planId}-${i}`}
                className="border-border/60 flex flex-col gap-3 border-b py-4 last:border-0 last:pb-0 md:flex-row md:items-baseline md:justify-between"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-medium">{tool.displayName}</p>
                    <p className="text-muted-fg text-xs">
                      {fromPlan?.vendorPlanName} · {line.line.seats} seat
                      {line.line.seats === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-muted-fg pretty mt-1 text-sm leading-relaxed">
                    <span className="font-medium">
                      {KIND_LABEL[line.recommendation.kind]}
                      {toTool && toPlan ? ` → ${toTool.displayName} ${toPlan.vendorPlanName}` : ""}
                      :{" "}
                    </span>
                    {line.recommendation.reason}
                  </p>
                </div>
                <div className="text-right md:shrink-0">
                  <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">
                    Save / mo
                  </p>
                  <p className="font-mono text-base tabular-nums">
                    {line.recommendation.monthlySavingsUsd > 0
                      ? formatUsd(line.recommendation.monthlySavingsUsd)
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <p className="text-muted-fg mt-8 font-mono text-xs">
        Pricing verified 2026-05-07. Email capture, share-link, and AI-written summary land in
        Phases 4 & 5.
      </p>
    </main>
  );
}
