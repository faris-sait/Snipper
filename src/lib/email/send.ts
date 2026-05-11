import "server-only";

import type { AuditInput, AuditResult } from "@/lib/audit/types";

import { getFromAddress, getResend, isEmailConfigured } from "./client";
import {
  renderLeadConfirmation,
  renderNotifyConfirmation,
  type RenderedEmail,
} from "./templates";

export type SendStatus =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

interface SendArgs {
  to: string;
  rendered: RenderedEmail;
}

/**
 * Best-effort send. Never throws. Skips silently when env vars are unset
 * (local-only mode), logs Resend errors to the server console without
 * failing the caller. The lead/notify capture flow is the source of value;
 * email is a confirmation, not a gate.
 */
async function send({ to, rendered }: SendArgs): Promise<SendStatus> {
  if (!isEmailConfigured()) {
    return { status: "skipped", reason: "RESEND env vars not set" };
  }

  const client = getResend();
  const from = getFromAddress();
  if (!client || !from) {
    return { status: "skipped", reason: "Resend client not initialised" };
  }

  try {
    const response = await client.emails.send({
      from,
      to: [to],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (response.error) {
      // Log server-side, return error status — don't propagate.
      console.error("[email] resend error:", response.error);
      return { status: "error", reason: response.error.message };
    }
    return { status: "sent", messageId: response.data?.id ?? "unknown" };
  } catch (err) {
    console.error("[email] send threw:", err);
    return {
      status: "error",
      reason: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/** Public: confirmation for a lead-capture submit on a savings-bearing audit. */
export async function sendAuditLeadConfirmation(args: {
  to: string;
  input: AuditInput;
  result: AuditResult;
  shareUrl: string | null;
}): Promise<SendStatus> {
  const rendered = renderLeadConfirmation({
    input: args.input,
    result: args.result,
    shareUrl: args.shareUrl,
  });
  return send({ to: args.to, rendered });
}

/** Public: confirmation for a notify-me signup on the optimal/modest path. */
export async function sendNotifyConfirmation(args: {
  to: string;
  shareUrl: string | null;
}): Promise<SendStatus> {
  const rendered = renderNotifyConfirmation({ shareUrl: args.shareUrl });
  return send({ to: args.to, rendered });
}
