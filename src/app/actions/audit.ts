"use server";

import { headers } from "next/headers";

import { runAudit } from "@/lib/audit/engine";
import { generateAuditId, isWellFormedAuditId } from "@/lib/audit/id";
import { AuditFormSchema } from "@/lib/audit/schema";
import type { AuditResult } from "@/lib/audit/types";
import {
  persistAudit,
  persistLead,
  persistNotifySignup,
} from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";

export type RunAuditState =
  | { status: "ok"; auditId: string | null; result: AuditResult }
  | { status: "error"; message: string };

export type CaptureLeadState =
  | { status: "ok"; persisted: boolean }
  | { status: "error"; message: string };

interface RunAuditArgs {
  input: unknown;
  /** Honeypot field — bots fill every input; humans never see it. */
  honeypot?: string;
}

export async function runAuditAction(args: RunAuditArgs): Promise<RunAuditState> {
  if (args.honeypot && args.honeypot.trim().length > 0) {
    return { status: "error", message: "Submission rejected." };
  }

  const parsed = AuditFormSchema.safeParse(args.input);
  if (!parsed.success) {
    return { status: "error", message: "Form input was invalid." };
  }

  const result = runAudit(parsed.data);

  if (!isPersistenceConfigured()) {
    // Local-only mode — engine still ran, but no shareable link.
    return { status: "ok", auditId: null, result };
  }

  const id = generateAuditId();
  try {
    await persistAudit({
      id,
      input: parsed.data,
      result,
      requestMeta: await collectRequestMeta(),
    });
    return { status: "ok", auditId: id, result };
  } catch {
    // If persistence fails, fall back to local-only — the user still gets
    // their audit, they just don't get a share link this time.
    return { status: "ok", auditId: null, result };
  }
}

export type CaptureLeadKind = "lead" | "notify";

interface CaptureLeadArgs {
  /**
   * "lead": audit-attached email capture (auditId required). Goes to audit_leads.
   * "notify": passive watch list — audit_id is optional context. Goes to notify_signups.
   */
  kind: CaptureLeadKind;
  auditId: string | null;
  email: string;
  company?: string;
  role?: string;
  teamSize?: number;
  honeypot?: string;
}

export async function captureLeadAction(
  args: CaptureLeadArgs,
): Promise<CaptureLeadState> {
  if (args.honeypot && args.honeypot.trim().length > 0) {
    return { status: "error", message: "Submission rejected." };
  }
  const email = args.email.trim().toLowerCase();
  if (!isPlausibleEmail(email)) {
    return { status: "error", message: "Enter a valid email." };
  }
  if (args.auditId !== null && !isWellFormedAuditId(args.auditId)) {
    return { status: "error", message: "Bad audit reference." };
  }

  if (!isPersistenceConfigured()) {
    // Local-only mode — caller will fall back to localStorage. We still
    // return ok so the UI can show the success state. The audit-id requirement
    // only matters when we'd actually persist a row.
    return { status: "ok", persisted: false };
  }

  if (args.kind === "lead" && !args.auditId) {
    return { status: "error", message: "Lead capture requires an audit." };
  }

  try {
    if (args.kind === "lead") {
      await persistLead({
        audit_id: args.auditId!,
        email,
        company: nullableTrim(args.company),
        role: nullableTrim(args.role),
        team_size: typeof args.teamSize === "number" ? args.teamSize : null,
      });
    } else {
      await persistNotifySignup({ email, audit_id: args.auditId });
    }
    return { status: "ok", persisted: true };
  } catch {
    return { status: "ok", persisted: false };
  }
}

async function collectRequestMeta(): Promise<Record<string, unknown>> {
  // headers() is async in Next 16; we only ever read forwarded-for / user-agent.
  // None of these go to the public audit projection.
  try {
    const h = await headers();
    return {
      ua: h.get("user-agent") ?? null,
      // Trust the platform's forwarded-for; the value gets set by Vercel/Netlify.
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      referer: h.get("referer") ?? null,
    };
  } catch {
    return {};
  }
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function nullableTrim(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
