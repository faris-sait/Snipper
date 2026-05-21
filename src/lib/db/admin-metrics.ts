import "server-only";

import { getSupabaseService } from "./supabase";

export interface AdminMetrics {
  audits: number;
  notifications: number;
  uniqueClicks: number;
  /** Click-through rate as a 0..1 ratio, or null when there are no notifications yet. */
  ctr: number | null;
}

/**
 * Pure CTR computation, broken out so it can be unit-tested without Supabase.
 */
export function computeCtr(uniqueClicks: number, notifications: number): number | null {
  if (notifications <= 0) return null;
  return Math.min(1, uniqueClicks / notifications);
}

interface ClickRow {
  notification_audit_id: string;
  notification_pricing_version: string;
}

/**
 * Collect the three counters the admin dashboard reports. Returns zeros when
 * Supabase isn't configured rather than throwing — `/admin` should still
 * render a recognisable empty state in local-only mode.
 */
export async function loadAdminMetrics(): Promise<AdminMetrics> {
  const sb = getSupabaseService();
  if (!sb) {
    return { audits: 0, notifications: 0, uniqueClicks: 0, ctr: null };
  }

  const [auditsRes, notifsRes, clicksRes] = await Promise.all([
    sb.from("audits").select("id", { count: "exact", head: true }),
    sb.from("reaudit_notifications").select("audit_id", { count: "exact", head: true }),
    sb
      .from("reaudit_clicks")
      .select("notification_audit_id, notification_pricing_version"),
  ]);

  if (auditsRes.error) {
    throw new Error(`loadAdminMetrics.audits: ${auditsRes.error.message}`);
  }
  if (notifsRes.error) {
    throw new Error(`loadAdminMetrics.notifications: ${notifsRes.error.message}`);
  }
  if (clicksRes.error) {
    throw new Error(`loadAdminMetrics.clicks: ${clicksRes.error.message}`);
  }

  const audits = auditsRes.count ?? 0;
  const notifications = notifsRes.count ?? 0;

  const uniqueClickKeys = new Set<string>();
  for (const row of (clicksRes.data ?? []) as ClickRow[]) {
    uniqueClickKeys.add(`${row.notification_audit_id}:${row.notification_pricing_version}`);
  }
  const uniqueClicks = uniqueClickKeys.size;

  return {
    audits,
    notifications,
    uniqueClicks,
    ctr: computeCtr(uniqueClicks, notifications),
  };
}
