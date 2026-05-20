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
