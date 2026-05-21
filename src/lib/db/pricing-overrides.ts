import "server-only";

import type { OverridableFields } from "@/lib/pricing/effective";
import { getSupabaseService } from "./supabase";

/**
 * Insert or update a per-(tool, plan) pricing override. Service-role only —
 * RLS is enabled on `pricing_overrides` with no policies, so anon and
 * authenticated roles can neither read nor write.
 */
export async function upsertPricingOverride(row: {
  tool_id: string;
  plan_id: string;
  overrides: OverridableFields;
}): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("pricing_overrides").upsert(
    { ...row, updated_at: new Date().toISOString() },
    { onConflict: "tool_id,plan_id" },
  );
  if (error) throw new Error(`upsertPricingOverride: ${error.message}`);
}

export interface PricingOverrideHistoryRow {
  tool_id: string;
  plan_id: string;
  overrides: OverridableFields;
  updated_at: string;
}

/**
 * List pricing_overrides rows updated within the last `sinceDays` days,
 * newest first. Powers the public `/changes` feed (Phase 7.7).
 */
export async function listRecentPricingOverrides(
  sinceDays: number = 7,
): Promise<PricingOverrideHistoryRow[]> {
  const sb = getSupabaseService();
  if (!sb) return [];

  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("pricing_overrides")
    .select("tool_id, plan_id, overrides, updated_at")
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`listRecentPricingOverrides: ${error.message}`);
  return (data ?? []) as PricingOverrideHistoryRow[];
}

/** Clear the override for one (tool, plan) pair. Idempotent. */
export async function deletePricingOverride(
  toolId: string,
  planId: string,
): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("pricing_overrides")
    .delete()
    .eq("tool_id", toolId)
    .eq("plan_id", planId);
  if (error) throw new Error(`deletePricingOverride: ${error.message}`);
}
