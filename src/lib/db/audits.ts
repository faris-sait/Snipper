import "server-only";

import type { AuditFormValues } from "@/lib/audit/schema";
import type { AuditResult } from "@/lib/audit/types";
import { getSupabaseService } from "./supabase";

export interface PublicAuditRow {
  id: string;
  created_at: string;
  input: AuditFormValues;
  result: AuditResult;
  monthly_savings_usd: number;
  current_monthly_usd: number;
}

/**
 * Insert a freshly-run audit. Throws if Supabase isn't configured — callers
 * should branch on `isPersistenceConfigured()` first when they want a graceful
 * local-only fallback.
 */
export async function persistAudit(args: {
  id: string;
  input: AuditFormValues;
  result: AuditResult;
  requestMeta?: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("audits").insert({
    id: args.id,
    input: args.input,
    result: args.result,
    monthly_savings_usd: args.result.totals.monthlySavingsUsd,
    current_monthly_usd: args.result.totals.currentMonthlyUsd,
    request_meta: args.requestMeta ?? null,
  });
  if (error) throw new Error(`persistAudit: ${error.message}`);
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
  const { error } = await sb
    .from("audit_leads")
    .upsert(row, { onConflict: "audit_id,email" });
  if (error) throw new Error(`persistLead: ${error.message}`);
}

export async function persistNotifySignup(row: {
  email: string;
  audit_id: string | null;
}): Promise<void> {
  const sb = getSupabaseService();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("notify_signups")
    .upsert(row, { onConflict: "email" });
  if (error) throw new Error(`persistNotifySignup: ${error.message}`);
}
