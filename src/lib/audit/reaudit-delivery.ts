import type { AuditDiff } from "./diff";

export type ReauditSendStatus =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

export interface AddressableAffectedAudit {
  auditId: string;
  diff: AuditDiff;
}

export interface DeliverGroupedReauditNotificationsResult {
  recipientCount: number;
  notifiedRecipients: number;
  skippedRecipients: number;
  failedRecipients: number;
  loggedAudits: number;
  logErrors: number;
}

/**
 * Pure orchestration for the Phase 5 send path: one consolidated email per
 * recipient, and one `(audit_id, pricing_version)` log row per successfully
 * emailed audit.
 */
export async function deliverGroupedReauditNotifications(args: {
  grouped: Map<string, AddressableAffectedAudit[]>;
  pricingVersion: string;
  siteUrl: string;
  sendEmail: (args: {
    to: string;
    siteUrl: string;
    items: AddressableAffectedAudit[];
    unsubscribeUrl?: string | null;
  }) => Promise<ReauditSendStatus>;
  persistNotifications: (
    rows: Array<{ audit_id: string; pricing_version: string; email: string }>,
  ) => Promise<void>;
}): Promise<DeliverGroupedReauditNotificationsResult> {
  let notifiedRecipients = 0;
  let skippedRecipients = 0;
  let failedRecipients = 0;
  let loggedAudits = 0;
  let logErrors = 0;

  for (const [email, audits] of args.grouped) {
    const status = await args.sendEmail({
      to: email,
      siteUrl: args.siteUrl,
      items: audits,
    });

    if (status.status === "skipped") {
      skippedRecipients++;
      continue;
    }

    if (status.status === "error") {
      failedRecipients++;
      continue;
    }

    notifiedRecipients++;

    try {
      await args.persistNotifications(
        audits.map((audit) => ({
          audit_id: audit.auditId,
          pricing_version: args.pricingVersion,
          email,
        })),
      );
      loggedAudits += audits.length;
    } catch (error) {
      logErrors++;
      console.error("[reaudit] failed to persist notification log:", error);
    }
  }

  return {
    recipientCount: args.grouped.size,
    notifiedRecipients,
    skippedRecipients,
    failedRecipients,
    loggedAudits,
    logErrors,
  };
}
