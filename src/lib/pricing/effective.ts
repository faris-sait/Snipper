import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseService } from "@/lib/db/supabase";
import { ALTERNATIVES } from "./alternatives";
import { TOOLS } from "./tools";
import type { Plan, Tool, ToolId } from "./types";

/**
 * Per-audit snapshot: just the tools referenced in the audit's input (plus
 * any alternative-target tools the engine might swap into). Keeps each row
 * to ~1-2 KB rather than the full ~10 KB TOOLS registry.
 */
export type PricingSnapshot = Partial<Record<ToolId, Tool>>;

export type OverridableFields = Partial<
  Pick<
    Plan,
    | "pricePerSeatMonthly"
    | "vendorPlanName"
    | "kind"
    | "minSeats"
    | "requiresContract"
    | "allowance"
  >
>;

interface PricingOverrideRow {
  tool_id: string;
  plan_id: string;
  overrides: OverridableFields;
}

/**
 * Result of resolving the "currently effective" pricing registry — the in-code
 * `TOOLS` constant overlaid with any `pricing_overrides` rows.
 *
 * `version` is a stable 16-char prefix of sha256(canonicalJson(tools)). It's
 * the idempotency key for `reaudit_notifications`: detect-changes can run
 * repeatedly against the same pricing without re-sending emails.
 */
export interface EffectiveTools {
  tools: Record<ToolId, Tool>;
  version: string;
}

/**
 * Read the effective tools registry. Local-only fallback: when Supabase isn't
 * configured (or the query errors), returns the in-code `TOOLS` so the audit
 * flow still works in dev. The version reflects whatever was actually applied.
 */
export async function getEffectiveTools(): Promise<EffectiveTools> {
  const sb = getSupabaseService();
  if (!sb) return { tools: TOOLS, version: hashTools(TOOLS) };

  const { data, error } = await sb
    .from("pricing_overrides")
    .select("tool_id, plan_id, overrides");

  if (error || !data) {
    return { tools: TOOLS, version: hashTools(TOOLS) };
  }

  const tools = applyOverrides(TOOLS, data as PricingOverrideRow[]);
  return { tools, version: hashTools(tools) };
}

/**
 * Build the per-audit pricing snapshot: only the plans for tools referenced in
 * `input.lines`, plus any alternative-target tools the engine might evaluate
 * for a switch_tool recommendation. Stored on `audits.pricing_snapshot`.
 */
export function buildPerAuditSnapshot(
  tools: Record<ToolId, Tool>,
  inputLineToolIds: Iterable<ToolId>,
): PricingSnapshot {
  const wanted = new Set<ToolId>(inputLineToolIds);
  for (const alt of ALTERNATIVES) {
    if (wanted.has(alt.fromToolId)) {
      wanted.add(alt.toToolId);
    }
  }
  const snapshot: PricingSnapshot = {};
  for (const id of wanted) {
    const tool = tools[id];
    if (tool) snapshot[id] = tool;
  }
  return snapshot;
}

/**
 * Merge a per-audit snapshot back into the full default TOOLS so the engine
 * has a complete registry to operate on when re-running an old audit. Anything
 * the snapshot doesn't override falls back to the in-code TOOLS — fine because
 * the engine only consults plans for the audit's lines and their alternatives,
 * which the snapshot already covers.
 */
export function applySnapshotToTools(
  snapshot: PricingSnapshot,
): Record<ToolId, Tool> {
  // Deep clone TOOLS so we don't mutate the module-level constant.
  const cloned = JSON.parse(JSON.stringify(TOOLS)) as Record<ToolId, Tool>;
  for (const [toolId, tool] of Object.entries(snapshot)) {
    if (tool) cloned[toolId as ToolId] = tool;
  }
  return cloned;
}

function applyOverrides(
  base: Record<ToolId, Tool>,
  rows: PricingOverrideRow[],
): Record<ToolId, Tool> {
  if (rows.length === 0) return base;

  // Deep clone via JSON round-trip — TOOLS is JSON-safe (no Date / function / Symbol values).
  const cloned = JSON.parse(JSON.stringify(base)) as Record<ToolId, Tool>;

  for (const row of rows) {
    const tool = cloned[row.tool_id as ToolId];
    if (!tool) continue;
    const plan = tool.plans.find((p) => p.id === row.plan_id);
    if (!plan) continue;
    Object.assign(plan, row.overrides);
  }
  return cloned;
}

function hashTools(tools: Record<ToolId, Tool>): string {
  return createHash("sha256").update(canonicalJson(tools)).digest("hex").slice(0, 16);
}

/**
 * Canonical JSON for hashing — keys sorted, no whitespace. The hash must
 * change iff a price moved OR a plan was added/removed/changed.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .filter((k) => obj[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(",") +
    "}"
  );
}
