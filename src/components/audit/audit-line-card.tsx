"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { useId, useState } from "react";

import { PlanLadder } from "@/components/audit/plan-ladder";
import { TOOLS, getPlan } from "@/lib/pricing/tools";
import type { Plan, ToolId, UseCase } from "@/lib/pricing/types";
import type { AuditLineResult } from "@/lib/audit/types";
import type { PlanHealthStatus } from "@/lib/audit/plan-health";
import { cn, formatUsd } from "@/lib/utils";

interface AuditLineCardProps {
  result: AuditLineResult;
  primaryUseCase: UseCase;
}

const KIND_LABEL: Record<AuditLineResult["recommendation"]["kind"], string> = {
  downgrade_plan: "Downgrade plan",
  switch_tool: "Switch tool",
  consolidate: "Consolidate",
  use_credex: "Use Credex credits",
  optimal: "Already a fit",
};

const HEALTH_BADGE_LABEL: Record<PlanHealthStatus, string> = {
  ok: "Healthy",
  watch: "Watch",
  risk: "Plan risk",
};

export function AuditLineCard({ result, primaryUseCase }: AuditLineCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();

  const { line, recommendation, planHealth } = result;
  const tool = TOOLS[line.toolId];
  const fromPlan = safeGetPlan(line.toolId, line.planId);
  const toTool = recommendation.toToolId ? TOOLS[recommendation.toToolId] : null;
  const toPlan =
    recommendation.toToolId && recommendation.toPlanId
      ? safeGetPlan(recommendation.toToolId, recommendation.toPlanId)
      : null;

  // The plan-ladder highlights a recommended plan only when the engine's pick
  // is a same-vendor downgrade. Cross-vendor switches are summarised in the
  // expanded body separately so the ladder stays unambiguous.
  const recommendedPlanIdSameVendor =
    recommendation.toToolId === line.toolId ? recommendation.toPlanId : undefined;

  const isCrossVendor =
    recommendation.kind === "switch_tool" &&
    !!toTool &&
    toTool.id !== line.toolId;

  return (
    <article className="border-border/60 border-t first:border-t-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-accent w-full rounded-md px-2 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-medium">{tool.displayName}</p>
              <p className="text-muted-fg text-xs">
                {fromPlan?.vendorPlanName} · {line.seats} seat
                {line.seats === 1 ? "" : "s"} ·{" "}
                {formatUsd(line.monthlySpendUsd)}/mo
              </p>
              {planHealth.status !== "ok" && (
                <HealthBadge status={planHealth.status} />
              )}
            </div>
            <p className="text-muted-fg pretty mt-1 text-sm leading-relaxed">
              <span className="text-fg font-medium">
                {KIND_LABEL[recommendation.kind]}
                {toTool && toPlan
                  ? ` → ${toTool.displayName} ${toPlan.vendorPlanName}`
                  : ""}
                :{" "}
              </span>
              {recommendation.reason}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 md:shrink-0">
            <div className="text-right">
              <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">
                Save / mo
              </p>
              <p className="font-mono text-base tabular-nums">
                {recommendation.monthlySavingsUsd > 0
                  ? formatUsd(recommendation.monthlySavingsUsd)
                  : "—"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "text-muted-fg h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                open && "rotate-180",
              )}
              aria-hidden
            />
            <span className="sr-only">{open ? "Collapse" : "Expand"} details</span>
          </div>
        </div>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="space-y-4 px-2 pb-5"
        >
          {planHealth.note && (
            <PlanHealthNote status={planHealth.status} note={planHealth.note} />
          )}

          {isCrossVendor && toTool && toPlan && (
            <CrossVendorNote
              toolId={toTool.id}
              plan={toPlan}
              seats={line.seats}
              projectedMonthlyUsd={recommendation.projectedMonthlyUsd}
            />
          )}

          <PlanLadder
            toolId={line.toolId as ToolId}
            currentPlanId={line.planId}
            recommendedPlanId={recommendedPlanIdSameVendor}
            seats={line.seats}
            currentMonthlyUsd={line.monthlySpendUsd}
          />

          <dl className="text-muted-fg flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-tight">
            <div className="inline-flex items-center gap-1">
              <dt className="uppercase">use case</dt>
              <dd className="text-fg">{primaryUseCase}</dd>
            </div>
            <div className="inline-flex items-center gap-1">
              <dt className="uppercase">confidence</dt>
              <dd className="text-fg">{recommendation.confidence}</dd>
            </div>
            {fromPlan && (
              <a
                href={fromPlan.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-fg ml-auto inline-flex items-center gap-1 transition-colors"
              >
                source · verified {fromPlan.verifiedDate}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </dl>
        </div>
      )}
    </article>
  );
}

function HealthBadge({ status }: { status: Exclude<PlanHealthStatus, "ok"> }) {
  return (
    <span
      className={cn(
        "border-border bg-card text-muted-fg inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-tight uppercase",
        status === "risk" && "border-warning/50 text-warning",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "risk" ? "bg-warning" : "bg-muted-fg",
        )}
        aria-hidden
      />
      {HEALTH_BADGE_LABEL[status]}
    </span>
  );
}

function PlanHealthNote({
  status,
  note,
}: {
  status: PlanHealthStatus;
  note: string;
}) {
  if (status === "ok") return null;
  return (
    <div
      className={cn(
        "border-border/60 bg-muted/40 rounded-xl border px-4 py-3",
        status === "risk" && "border-warning/40",
      )}
    >
      <p
        className={cn(
          "font-mono text-[11px] tracking-tight uppercase",
          status === "risk" ? "text-warning" : "text-muted-fg",
        )}
      >
        {status === "risk" ? "Plan risk" : "Watch"}
      </p>
      <p className="text-fg pretty mt-1 text-sm leading-relaxed">{note}</p>
    </div>
  );
}

function CrossVendorNote({
  toolId,
  plan,
  seats,
  projectedMonthlyUsd,
}: {
  toolId: ToolId;
  plan: Plan;
  seats: number;
  projectedMonthlyUsd: number;
}) {
  const tool = TOOLS[toolId];
  return (
    <div className="border-border/60 bg-muted/40 rounded-xl border px-4 py-3">
      <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">
        Recommended swap
      </p>
      <p className="text-fg pretty mt-1 text-sm leading-relaxed">
        <span className="font-medium">
          {tool.displayName} {plan.vendorPlanName}
        </span>{" "}
        — {seats} seat{seats === 1 ? "" : "s"} ×{" "}
        {plan.kind === "seat" ? `${formatUsd(plan.pricePerSeatMonthly)}/mo` : "usage"} ={" "}
        <span className="font-mono tabular-nums">
          {formatUsd(projectedMonthlyUsd)}/mo
        </span>
        .{" "}
        <a
          href={plan.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted-fg hover:text-fg inline-flex items-center gap-1 font-mono text-[11px] transition-colors"
        >
          source
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </p>
    </div>
  );
}

function safeGetPlan(toolId: string, planId: string) {
  try {
    return getPlan(toolId as ToolId, planId);
  } catch {
    return null;
  }
}
