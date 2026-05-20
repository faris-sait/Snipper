import { NextResponse } from "next/server";

import { findAffectedAudits, groupAffectedByEmail } from "@/lib/audit/reaudit";
import { deliverGroupedReauditNotifications } from "@/lib/audit/reaudit-delivery";
import { persistReauditNotifications } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { sendReauditNotification } from "@/lib/email/send";
import { getEffectiveTools } from "@/lib/pricing/effective";

// Reads pricing_overrides + audits from Supabase and runs the engine — Node
// runtime keeps this consistent with the rest of the server-action surface.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/detect-changes
 *
 * Bearer-authenticated. Re-runs the audit engine for every stored audit that
 * has a captured pricing_snapshot, against the current effective tools (TOOLS
 * overlaid with pricing_overrides). Sends one consolidated email per affected
 * recipient and writes the reaudit_notifications idempotency rows for the
 * audits that were actually sent.
 *
 * Phase 5: the same diff/orchestration helpers drive both the count and the
 * send path, so detect-changes and the rerun UI agree on what changed.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPersistenceConfigured()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }

  const effective = await getEffectiveTools();
  const { scanned, affectedAudits } = await findAffectedAudits(effective.tools, effective.version);
  const grouped = await groupAffectedByEmail(affectedAudits);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const delivery = await deliverGroupedReauditNotifications({
    grouped: new Map(
      Array.from(grouped.entries()).map(([email, audits]) => [
        email,
        audits.map((audit) => ({ auditId: audit.auditId, diff: audit.diff })),
      ]),
    ),
    pricingVersion: effective.version,
    siteUrl,
    sendEmail: sendReauditNotification,
    persistNotifications: persistReauditNotifications,
  });

  return NextResponse.json({
    scanned,
    affected: affectedAudits.length,
    recipients: delivery.recipientCount,
    notifiedRecipients: delivery.notifiedRecipients,
    skippedRecipients: delivery.skippedRecipients,
    failedRecipients: delivery.failedRecipients,
    loggedAudits: delivery.loggedAudits,
    logErrors: delivery.logErrors,
    pricingVersion: effective.version,
  });
}
