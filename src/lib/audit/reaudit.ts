import "server-only";

import { getSupabaseService } from "@/lib/db/supabase";
import type { Tool, ToolId } from "@/lib/pricing/types";

import { diffAuditResults, isNonTrivialAuditDiff, type AuditDiff } from "./diff";
import { runAudit } from "./engine";
import type { AuditInput, AuditResult } from "./types";
import { listAuditsWithSnapshot } from "@/lib/db/audits";

interface AuditLeadRow {
  audit_id: string;
  email: string;
  created_at: string;
}

interface ReauditNotificationRow {
  audit_id: string;
}

export interface AffectedAudit {
  auditId: string;
  input: AuditInput;
  oldResult: AuditResult;
  newResult: AuditResult;
  diff: AuditDiff;
}

export interface FindAffectedAuditsResult {
  scanned: number;
  affectedAudits: AffectedAudit[];
}

/**
 * Re-run every stored audit that has a pricing snapshot against the current
 * pricing registry, skipping audits already notified for this pricing version.
 */
export async function findAffectedAudits(
  currentTools: Record<ToolId, Tool>,
  pricingVersion: string,
): Promise<FindAffectedAuditsResult> {
  const audits = await listAuditsWithSnapshot();
  if (audits.length === 0) {
    return { scanned: 0, affectedAudits: [] };
  }

  const alreadyNotified = await listAlreadyNotifiedAuditIds(
    audits.map((audit) => audit.id),
    pricingVersion,
  );

  const affectedAudits: AffectedAudit[] = [];
  for (const audit of audits) {
    if (alreadyNotified.has(audit.id)) continue;

    const newResult = runAudit(audit.input, undefined, currentTools);
    const diff = diffAuditResults(audit.result, newResult);
    if (!isNonTrivialAuditDiff(diff)) continue;

    affectedAudits.push({
      auditId: audit.id,
      input: audit.input,
      oldResult: audit.result,
      newResult,
      diff,
    });
  }

  return { scanned: audits.length, affectedAudits };
}

/**
 * Group changed audits by recipient email. If multiple lead rows exist for the
 * same audit, keep the earliest one so later phases can insert a single
 * `(audit_id, pricing_version)` notification row without PK conflicts.
 */
export async function groupAffectedByEmail(
  affectedAudits: AffectedAudit[],
): Promise<Map<string, AffectedAudit[]>> {
  if (affectedAudits.length === 0) return new Map();

  const sb = getSupabaseService();
  if (!sb) return new Map();

  const auditIds = affectedAudits.map((audit) => audit.auditId);
  const { data, error } = await sb
    .from("audit_leads")
    .select("audit_id, email, created_at")
    .in("audit_id", auditIds)
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`groupAffectedByEmail: ${error.message}`);
  }

  const emailByAudit = new Map<string, string>();
  for (const row of (data ?? []) as AuditLeadRow[]) {
    if (!emailByAudit.has(row.audit_id)) {
      emailByAudit.set(row.audit_id, row.email.trim().toLowerCase());
    }
  }

  const grouped = new Map<string, AffectedAudit[]>();
  for (const affectedAudit of affectedAudits) {
    const email = emailByAudit.get(affectedAudit.auditId);
    if (!email) continue;

    const bucket = grouped.get(email);
    if (bucket) {
      bucket.push(affectedAudit);
    } else {
      grouped.set(email, [affectedAudit]);
    }
  }

  return grouped;
}
async function listAlreadyNotifiedAuditIds(
  auditIds: string[],
  pricingVersion: string,
): Promise<Set<string>> {
  if (auditIds.length === 0) return new Set();

  const sb = getSupabaseService();
  if (!sb) return new Set();

  const { data, error } = await sb
    .from("reaudit_notifications")
    .select("audit_id")
    .eq("pricing_version", pricingVersion)
    .in("audit_id", auditIds);

  if (error) {
    throw new Error(`listAlreadyNotifiedAuditIds: ${error.message}`);
  }

  return new Set(((data ?? []) as ReauditNotificationRow[]).map((row) => row.audit_id));
}
