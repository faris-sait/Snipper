import "server-only";

import { getSupabaseService } from "@/lib/db/supabase";
import { applySnapshotToTools, type PricingSnapshot } from "@/lib/pricing/effective";
import { getPlanFrom, getToolFrom } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";
import { formatUsd } from "@/lib/utils";

import { diffAuditResults, isNonTrivialAuditDiff, type AuditDiff } from "./diff";
import { runAudit } from "./engine";
import type { AuditInput, AuditResult, Recommendation } from "./types";
import { listAuditsWithSnapshot } from "@/lib/db/audits";

interface UnsubscribedEmailRow {
  email: string;
}

interface ReauditNotificationRow {
  audit_id: string;
}

export interface AffectedAudit {
  auditId: string;
  email: string | null;
  priceChanges: string[];
  input: AuditInput;
  oldResult: AuditResult;
  newResult: AuditResult;
  diff: AuditDiff;
}

interface SnapshotBackedAudit {
  input: AuditInput;
  result: AuditResult;
  pricing_snapshot: PricingSnapshot;
}

export interface RerunAuditResult {
  oldTools: Record<ToolId, Tool>;
  oldResult: AuditResult;
  newResult: AuditResult;
  diff: AuditDiff;
  priceChanges: string[];
}

export interface FindAffectedAuditsResult {
  scanned: number;
  affectedAudits: AffectedAudit[];
}

/**
 * Shared single-audit rerun path for both the `/a/[id]/rerun` page and the
 * bulk detect-changes scan so they stay aligned on what changed.
 */
export function rerunAuditAgainstCurrentPricing(
  audit: SnapshotBackedAudit,
  currentTools: Record<ToolId, Tool>,
): RerunAuditResult {
  const oldTools = applySnapshotToTools(audit.pricing_snapshot);
  const newResult = runAudit(audit.input, undefined, currentTools);
  const diff = diffAuditResults(audit.result, newResult);

  return {
    oldTools,
    oldResult: audit.result,
    newResult,
    diff,
    priceChanges: summariseAuditPriceChanges(diff, oldTools, currentTools),
  };
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

    const rerun = rerunAuditAgainstCurrentPricing(audit, currentTools);
    if (!isNonTrivialAuditDiff(rerun.diff)) continue;

    affectedAudits.push({
      auditId: audit.id,
      email: audit.email,
      priceChanges: rerun.priceChanges,
      input: audit.input,
      oldResult: rerun.oldResult,
      newResult: rerun.newResult,
      diff: rerun.diff,
    });
  }

  return { scanned: audits.length, affectedAudits };
}

/**
 * Group changed audits by the canonical email stored on the audit row, while
 * skipping any recipient whose email has unsubscribed from re-audit alerts.
 *
 * Suppression is email-scoped (not audit-scoped): a single unsubscribed
 * `audit_leads` row for an email is enough to mute every past and future
 * audit that maps back to that email.
 */
export async function groupAffectedByEmail(
  affectedAudits: AffectedAudit[],
): Promise<Map<string, AffectedAudit[]>> {
  if (affectedAudits.length === 0) return new Map();

  const sb = getSupabaseService();
  if (!sb) return groupAffectedAuditsByEmail(affectedAudits, new Set());

  const candidateEmails = Array.from(
    new Set(
      affectedAudits
        .map((audit) => audit.email?.trim().toLowerCase() ?? null)
        .filter((email): email is string => Boolean(email)),
    ),
  );
  if (candidateEmails.length === 0) return new Map();

  const { data, error } = await sb
    .from("audit_leads")
    .select("email")
    .in("email", candidateEmails)
    .not("unsubscribed_at", "is", null);

  if (error) {
    throw new Error(`groupAffectedByEmail: ${error.message}`);
  }

  const unsubscribedEmails = new Set(
    ((data ?? []) as UnsubscribedEmailRow[]).map((row) =>
      row.email.trim().toLowerCase(),
    ),
  );

  return groupAffectedAuditsByEmail(affectedAudits, unsubscribedEmails);
}

export function groupAffectedAuditsByEmail(
  affectedAudits: AffectedAudit[],
  unsubscribedEmails: Set<string>,
): Map<string, AffectedAudit[]> {
  const grouped = new Map<string, AffectedAudit[]>();
  for (const affectedAudit of affectedAudits) {
    const email = affectedAudit.email?.trim().toLowerCase() ?? null;
    if (!email) continue;
    if (unsubscribedEmails.has(email)) continue;

    const bucket = grouped.get(email);
    if (bucket) {
      bucket.push(affectedAudit);
    } else {
      grouped.set(email, [affectedAudit]);
    }
  }

  return grouped;
}

export function summariseAuditPriceChanges(
  diff: AuditDiff,
  oldTools: Record<ToolId, Tool>,
  newTools: Record<ToolId, Tool>,
): string[] {
  const seen = new Set<string>();
  const summaries: string[] = [];

  for (const line of diff.lines) {
    const current = line.oldLineResult ?? line.newLineResult;
    if (!current) continue;

    const candidates = [
      { toolId: current.line.toolId, planId: current.line.planId },
      getRecommendationTarget(line.oldLineResult?.recommendation, current.line.toolId),
      getRecommendationTarget(line.newLineResult?.recommendation, current.line.toolId),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const key = `${candidate.toolId}/${candidate.planId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const summary = summarisePlanPriceChange(
        oldTools,
        newTools,
        candidate.toolId,
        candidate.planId,
      );
      if (summary) {
        summaries.push(summary);
      }
    }
  }

  return summaries.slice(0, 3);
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

function getRecommendationTarget(
  recommendation: Recommendation | undefined,
  fromToolId: ToolId,
): { toolId: ToolId; planId: string } | null {
  if (!recommendation) return null;

  if (recommendation.kind === "downgrade_plan" && recommendation.toPlanId) {
    return { toolId: fromToolId, planId: recommendation.toPlanId };
  }

  if (recommendation.kind === "switch_tool" && recommendation.toToolId && recommendation.toPlanId) {
    return { toolId: recommendation.toToolId, planId: recommendation.toPlanId };
  }

  return null;
}

function summarisePlanPriceChange(
  oldTools: Record<ToolId, Tool>,
  newTools: Record<ToolId, Tool>,
  toolId: ToolId,
  planId: string,
): string | null {
  try {
    const before = getPlanFrom(oldTools, toolId, planId);
    const after = getPlanFrom(newTools, toolId, planId);
    if (before.pricePerSeatMonthly === after.pricePerSeatMonthly) return null;

    const toolName = getToolFrom(newTools, toolId).displayName;
    const planName = after.vendorPlanName || before.vendorPlanName || planId;

    return `${toolName} ${planName} moved from ${formatUsd(before.pricePerSeatMonthly)}/seat to ${formatUsd(after.pricePerSeatMonthly)}/seat.`;
  } catch {
    return null;
  }
}
