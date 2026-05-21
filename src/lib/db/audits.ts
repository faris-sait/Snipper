import "server-only";

import type { AuditFormValues } from "@/lib/audit/schema";
import type { AuditResult } from "@/lib/audit/types";
import type { PricingSnapshot } from "@/lib/pricing/effective";
import { getSupabaseService } from "./supabase";

export interface PublicAuditRow {
  id: string;
  created_at: string;
  input: AuditFormValues;
  result: AuditResult;
  monthly_savings_usd: number;
  current_monthly_usd: number;
  ai_summary: string | null;
  /** Null on pre-Round-2 rows; populated for every audit captured after the migration. */
  pricing_snapshot: PricingSnapshot | null;
}

/**
 * Insert a freshly-run audit. Throws if Supabase isn't configured — callers
 * should branch on `isPersistenceConfigured()` first when they want a graceful
 * local-only fallback.
 */
export async function persistAudit(args: {
  id: string;
  email: string;
  input: AuditFormValues;
  result: AuditResult;
  /** Round 2: the plans for tools referenced by this audit at audit-run time. */
  pricingSnapshot?: PricingSnapshot;
  requestMeta?: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("audits").insert({
    id: args.id,
    email: args.email,
    input: args.input,
    result: args.result,
    monthly_savings_usd: args.result.totals.monthlySavingsUsd,
    current_monthly_usd: args.result.totals.currentMonthlyUsd,
    pricing_snapshot: args.pricingSnapshot ?? null,
    request_meta: args.requestMeta ?? null,
  });
  if (error) throw new Error(`persistAudit: ${error.message}`);
}

/** Row shape returned by `listAuditsWithSnapshot` — server-only reads. */
export interface AuditWithSnapshot {
  id: string;
  created_at: string;
  email: string | null;
  input: AuditFormValues;
  result: AuditResult;
  pricing_snapshot: PricingSnapshot;
}

/**
 * Read all audits eligible for re-audit detection — those with a captured
 * pricing snapshot. Pre-Round-2 rows have NULL `pricing_snapshot` and are
 * filtered out here, so detect-changes never fires against an audit whose
 * original pricing context is unknown.
 */
export async function listAuditsWithSnapshot(): Promise<AuditWithSnapshot[]> {
  const sb = getSupabaseService();
  if (!sb) return [];
  const { data, error } = await sb
    .from("audits")
    .select("id, created_at, email, input, result, pricing_snapshot")
    .not("pricing_snapshot", "is", null);
  if (error) throw new Error(`listAuditsWithSnapshot: ${error.message}`);
  return (data ?? []) as AuditWithSnapshot[];
}

export async function setAuditEmail(auditId: string, email: string): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("audits").update({ email }).eq("id", auditId);
  if (error) throw new Error(`setAuditEmail: ${error.message}`);
}

/**
 * Fetch the PII-free public projection of an audit. Returns null when the id
 * doesn't exist OR when persistence isn't configured (local-only mode).
 */
export async function getPublicAudit(id: string): Promise<PublicAuditRow | null> {
  const sb = getSupabaseService();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_public_audit", { p_id: id });
  if (error) throw new Error(`getPublicAudit: ${error.message}`);
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  const row = (Array.isArray(data) ? data[0] : data) as PublicAuditRow;
  return row;
}

export async function persistLead(row: {
  audit_id: string;
  email: string;
  company: string | null;
  role: string | null;
  team_size: number | null;
}): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("audit_leads").upsert(row, { onConflict: "audit_id,email" });
  if (error) throw new Error(`persistLead: ${error.message}`);
}

export async function persistNotifySignup(row: {
  email: string;
  audit_id: string | null;
}): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("notify_signups").upsert(row, { onConflict: "email" });
  if (error) throw new Error(`persistNotifySignup: ${error.message}`);
}

export async function persistReauditNotifications(
  rows: Array<{
    audit_id: string;
    pricing_version: string;
    email: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;

  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");

  const { error } = await sb
    .from("reaudit_notifications")
    .upsert(rows, { onConflict: "audit_id,pricing_version" });

  if (error) {
    throw new Error(`persistReauditNotifications: ${error.message}`);
  }
}

/** Phase 5 — read the cached AI summary off an audit row. Null if not yet generated. */
export async function getAuditSummary(id: string): Promise<string | null> {
  const sb = getSupabaseService();
  if (!sb) return null;
  const { data, error } = await sb.from("audits").select("ai_summary").eq("id", id).maybeSingle();
  if (error) throw new Error(`getAuditSummary: ${error.message}`);
  return (data?.ai_summary as string | null) ?? null;
}

/** Phase 5 — cache the generated summary so re-renders don't re-bill the API. */
export async function setAuditSummary(id: string, summary: string): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("audits").update({ ai_summary: summary }).eq("id", id);
  if (error) throw new Error(`setAuditSummary: ${error.message}`);
}
