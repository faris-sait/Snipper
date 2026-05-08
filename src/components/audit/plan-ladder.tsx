import { ArrowUpRight } from "lucide-react";

import { TOOLS } from "@/lib/pricing/tools";
import type { Plan, ToolId } from "@/lib/pricing/types";
import { cn, formatUsd } from "@/lib/utils";

interface PlanLadderProps {
  toolId: ToolId;
  currentPlanId: string;
  /**
   * Plan id the engine recommended (only when the recommendation stays on the
   * same vendor — switch_tool recommendations don't surface here).
   */
  recommendedPlanId?: string;
  seats: number;
  /**
   * User-reported spend on the current plan. Used to compute a Δ column so the
   * user sees real savings against their actual invoice, not against list price.
   */
  currentMonthlyUsd: number;
}

/**
 * Per-vendor "plan ladder" — shows every plan the vendor offers ordered by
 * projected cost at the user's seat count, with current and recommended plans
 * highlighted. The benchmark the brief asks for: instead of just one suggested
 * action, the user can see the full landscape and verify the engine's pick.
 */
export function PlanLadder({
  toolId,
  currentPlanId,
  recommendedPlanId,
  seats,
  currentMonthlyUsd,
}: PlanLadderProps) {
  const tool = TOOLS[toolId];
  const ordered = [...tool.plans].sort((a, b) => sortPlan(a, b, seats));
  const sourceUrl = tool.plans[0]?.sourceUrl;

  return (
    <div className="border-border/60 overflow-hidden rounded-xl border">
      <div className="border-border/60 bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">
          {tool.displayName} plan ladder · {seats} seat{seats === 1 ? "" : "s"}
        </p>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-fg hover:text-fg inline-flex items-center gap-1 font-mono text-[11px] tracking-tight transition-colors"
          >
            vendor pricing
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
      <ul role="list" className="divide-border/60 divide-y">
        {ordered.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const isRecommended = p.id === recommendedPlanId;
          const projected = projectedFor(p, seats);
          const delta = projected !== null ? projected - currentMonthlyUsd : null;
          return (
            <li
              key={p.id}
              className={cn(
                "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm",
                isCurrent && "bg-muted/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  className={cn(
                    "truncate font-medium",
                    isRecommended && !isCurrent && "text-accent",
                  )}
                >
                  {p.vendorPlanName}
                </span>
                {isCurrent && <Badge tone="muted">current</Badge>}
                {isRecommended && !isCurrent && <Badge tone="accent">recommended</Badge>}
              </div>
              <span className="text-muted-fg font-mono text-xs tabular-nums">
                {formatPerSeat(p)}
              </span>
              <span className="font-mono text-xs tabular-nums">
                {projected === null ? "—" : formatUsd(projected)}
              </span>
              <span
                className={cn(
                  "text-right font-mono text-xs tabular-nums",
                  delta !== null && delta < 0 && "text-success",
                  delta === null && "text-muted-fg",
                )}
              >
                {formatDelta(delta, isCurrent)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "muted" | "accent";
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] tracking-tight uppercase",
        tone === "muted" && "border-border bg-card text-muted-fg border",
        tone === "accent" && "bg-accent text-accent-fg",
      )}
    >
      {children}
    </span>
  );
}

function projectedFor(plan: Plan, seats: number): number | null {
  if (plan.requiresContract) return null;
  if (plan.kind === "free") return 0;
  if (plan.kind === "usage") return null;
  return Math.round(plan.pricePerSeatMonthly * seats * 100) / 100;
}

function formatPerSeat(plan: Plan): string {
  if (plan.requiresContract) return "contact sales";
  if (plan.kind === "free") return "free";
  if (plan.kind === "usage") return "usage-based";
  return `${formatUsd(plan.pricePerSeatMonthly)}/seat`;
}

function formatDelta(delta: number | null, isCurrent: boolean): string {
  if (isCurrent) return "you are here";
  if (delta === null) return "—";
  if (delta === 0) return "—";
  if (delta < 0) return `−${formatUsd(Math.abs(delta))}`;
  return `+${formatUsd(delta)}`;
}

function sortPlan(a: Plan, b: Plan, seats: number): number {
  // Sort by projected cost ascending. Plans without a projectable price
  // (usage-based, contract) sink to the bottom of the list.
  const ap = projectedFor(a, seats);
  const bp = projectedFor(b, seats);
  if (ap === null && bp === null) return 0;
  if (ap === null) return 1;
  if (bp === null) return -1;
  return ap - bp;
}
