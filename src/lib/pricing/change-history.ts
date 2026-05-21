import type { OverridableFields } from "./effective";
import type { Plan, Tool, ToolId } from "./types";
import { formatUsd } from "@/lib/utils";

export interface OverrideChangeLine {
  field: keyof OverridableFields;
  label: string;
  was: string;
  now: string;
}

export interface ResolvedOverrideRow {
  toolId: string;
  planId: string;
  updatedAt: string;
  toolDisplayName: string;
  planName: string;
  changes: OverrideChangeLine[];
  /** True when the tool/plan no longer exists in the in-code TOOLS registry. */
  orphaned: boolean;
}

/**
 * Resolve a raw `pricing_overrides` row against the in-code TOOLS registry,
 * producing a human-readable change list. Pure — used by the `/changes` page
 * and unit-tested without Supabase.
 */
export function resolveOverrideRow(args: {
  toolId: string;
  planId: string;
  overrides: OverridableFields;
  updatedAt: string;
  tools: Record<ToolId, Tool>;
}): ResolvedOverrideRow {
  const tool = args.tools[args.toolId as ToolId];
  const plan = tool?.plans.find((p) => p.id === args.planId);

  if (!tool || !plan) {
    return {
      toolId: args.toolId,
      planId: args.planId,
      updatedAt: args.updatedAt,
      toolDisplayName: args.toolId,
      planName: args.planId,
      changes: [],
      orphaned: true,
    };
  }

  return {
    toolId: args.toolId,
    planId: args.planId,
    updatedAt: args.updatedAt,
    toolDisplayName: tool.displayName,
    planName: plan.vendorPlanName,
    changes: diffPlanFields(plan, args.overrides),
    orphaned: false,
  };
}

function diffPlanFields(
  baseline: Plan,
  overrides: OverridableFields,
): OverrideChangeLine[] {
  const lines: OverrideChangeLine[] = [];

  for (const key of Object.keys(overrides) as Array<keyof OverridableFields>) {
    const next = overrides[key];
    if (next === undefined) continue;
    const prev = baseline[key];
    if (deepEqual(prev, next)) continue;

    lines.push({
      field: key,
      label: FIELD_LABELS[key] ?? key,
      was: formatField(key, prev),
      now: formatField(key, next),
    });
  }

  return lines;
}

const FIELD_LABELS: Record<keyof OverridableFields, string> = {
  pricePerSeatMonthly: "Price / seat / mo",
  vendorPlanName: "Plan name",
  kind: "Plan kind",
  minSeats: "Minimum seats",
  requiresContract: "Requires contract",
  allowance: "Allowance",
};

function formatField(
  field: keyof OverridableFields,
  value: unknown,
): string {
  if (value === undefined || value === null) return "—";
  if (field === "pricePerSeatMonthly" && typeof value === "number") {
    return `${formatUsd(value)}/seat`;
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number" || typeof value === "string") return String(value);
  return JSON.stringify(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
