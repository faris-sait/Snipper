"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";
import { findAffectedAudits, groupAffectedByEmail } from "@/lib/audit/reaudit";
import { deliverGroupedReauditNotifications } from "@/lib/audit/reaudit-delivery";
import { persistReauditNotifications } from "@/lib/db/audits";
import {
  deletePricingOverride,
  upsertPricingOverride,
} from "@/lib/db/pricing-overrides";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { sendReauditNotification } from "@/lib/email/send";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { getEffectiveTools } from "@/lib/pricing/effective";
import { TOOLS } from "@/lib/pricing/tools";

export type AdminActionResult =
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

async function requireAuthed(): Promise<true | AdminActionResult> {
  const cookieStore = await cookies();
  const supplied = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminToken(supplied)) {
    return { status: "error", message: "Not authenticated." };
  }
  return true;
}

/** Set or update a per-(tool, plan) override. Validates against the in-code registry. */
export async function setPricingOverrideAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const authed = await requireAuthed();
  if (authed !== true) return authed;

  const toolId = String(formData.get("toolId") ?? "").trim();
  const planId = String(formData.get("planId") ?? "").trim();
  const priceRaw = String(formData.get("pricePerSeatMonthly") ?? "").trim();

  if (!toolId || !planId) {
    return { status: "error", message: "Tool and plan are required." };
  }
  if (priceRaw === "") {
    return { status: "error", message: "Price is required." };
  }
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    return { status: "error", message: "Price must be a non-negative number." };
  }

  // Validate (tool, plan) against the in-code registry so we never write a row
  // the engine can't apply at audit time.
  const tool = TOOLS[toolId as keyof typeof TOOLS];
  const plan = tool?.plans.find((p) => p.id === planId);
  if (!tool || !plan) {
    return { status: "error", message: `Unknown tool/plan: ${toolId} / ${planId}` };
  }

  try {
    await upsertPricingOverride({
      tool_id: toolId,
      plan_id: planId,
      overrides: { pricePerSeatMonthly: price },
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to write override.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/changes");
  return {
    status: "ok",
    message: `${tool.displayName} / ${plan.vendorPlanName} → $${price}/seat`,
  };
}

/** Clear an override for a (tool, plan) pair. Idempotent. */
export async function clearPricingOverrideAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const authed = await requireAuthed();
  if (authed !== true) return authed;

  const toolId = String(formData.get("toolId") ?? "").trim();
  const planId = String(formData.get("planId") ?? "").trim();
  if (!toolId || !planId) {
    return { status: "error", message: "Tool and plan are required." };
  }

  try {
    await deletePricingOverride(toolId, planId);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to clear override.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/changes");
  return { status: "ok", message: `Cleared override on ${toolId} / ${planId}.` };
}

/**
 * Trigger the detect-changes scan from the dashboard. Same code path as
 * `POST /api/detect-changes`, just invoked through the cookie-authed action
 * so the reviewer doesn't need curl or a bearer token.
 */
export async function runDetectChangesAction(
  _prev: AdminActionResult | null,
  _formData: FormData,
): Promise<AdminActionResult> {
  const authed = await requireAuthed();
  if (authed !== true) return authed;

  if (!isPersistenceConfigured()) {
    return { status: "error", message: "Persistence not configured." };
  }

  try {
    const effective = await getEffectiveTools();
    const { affectedAudits } = await findAffectedAudits(
      effective.tools,
      effective.version,
    );
    const grouped = await groupAffectedByEmail(affectedAudits);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const delivery = await deliverGroupedReauditNotifications({
      grouped: new Map(
        Array.from(grouped.entries()).map(([email, audits]) => [
          email,
          audits.map((audit) => ({
            auditId: audit.auditId,
            diff: audit.diff,
            priceChanges: audit.priceChanges,
            pricingVersion: effective.version,
          })),
        ]),
      ),
      pricingVersion: effective.version,
      siteUrl,
      sendEmail: async ({ to, siteUrl: site, items }) => {
        const unsubscribeUrl = buildUnsubscribeUrl(site, to);
        return sendReauditNotification({ to, siteUrl: site, items, unsubscribeUrl });
      },
      persistNotifications: persistReauditNotifications,
    });

    revalidatePath("/admin");
    return {
      status: "ok",
      message: `Scanned ${affectedAudits.length} affected · sent ${delivery.notifiedRecipients} email(s) · pricing v${effective.version.slice(0, 8)}…`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "detect-changes failed.",
    };
  }
}
