import "server-only";

import { getSupabaseService } from "./supabase";

/**
 * Insert a click row for a (audit_id, pricing_version) notification. Best-
 * effort: never throws. The PK includes `clicked_at` so duplicate visits in
 * the same millisecond are de-duped at the database level; the admin
 * dashboard further reduces to `count(distinct (audit_id, pricing_version))`.
 *
 * Called from the `/a/[id]/rerun` server component when the visitor arrived
 * with `?v=<pricing_version>` on the URL.
 */
export async function recordReauditClick(
  auditId: string,
  pricingVersion: string,
): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) return;

  try {
    const { error } = await sb.from("reaudit_clicks").insert({
      notification_audit_id: auditId,
      notification_pricing_version: pricingVersion,
    });
    if (error) {
      // Most expected: duplicate on the PK if clicked_at collides (very rare).
      // Anything else is logged for observability; click attribution is best-
      // effort so we never propagate the error to the rerun render path.
      console.warn("[reaudit-clicks] insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[reaudit-clicks] insert threw:", err);
  }
}
