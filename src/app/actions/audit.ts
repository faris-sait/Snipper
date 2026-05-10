"use server";

import { headers } from "next/headers";

import { generateSummary } from "@/lib/ai/summary";
import { runAudit } from "@/lib/audit/engine";
import { generateAuditId, isWellFormedAuditId } from "@/lib/audit/id";
import { AuditFormSchema } from "@/lib/audit/schema";
import type { AuditInput, AuditResult } from "@/lib/audit/types";
import {
  getAuditSummary,
  persistAudit,
  persistLead,
  persistNotifySignup,
  setAuditSummary,
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

// ---------------------------------------------------------------------------
// Phase 5 — AI-generated personalised summary
// ---------------------------------------------------------------------------

export type SummaryActionState =
  | {
      status: "ok";
      text: string;
      source: "ai" | "templated";
      /** True when read straight from the cached audits.ai_summary column. */
      cached: boolean;
    }
  | { status: "error"; message: string };

interface SummaryArgs {
  auditId: string | null;
  /**
   * The audit input + result the result page already has in sessionStorage.
   * We don't recompute server-side — the engine is pure and the user is the
   * only consumer of their own summary, so any malformed payload at worst
   * forces the templated fallback for that one user.
   */
  input: AuditInput;
  result: AuditResult;
}

/**
 * Resolve the personalised summary for an audit:
 *   1. If we have a valid auditId AND persistence: try the cached summary.
 *   2. Otherwise (or on cache miss): call Claude Haiku 4.5 with a 3s budget,
 *      falling back to the deterministic templated paragraph on any failure.
 *   3. On AI success with a valid auditId: cache for next view.
 *
 * Templated fallbacks are NOT cached — they're deterministic from input + result,
 * so caching wouldn't save anything, and skipping the cache lets the next view
 * try AI again if the prior failure was transient.
 */
export async function getOrGenerateSummaryAction(
  args: SummaryArgs,
): Promise<SummaryActionState> {
  const persistAvailable =
    !!args.auditId &&
    isWellFormedAuditId(args.auditId) &&
    isPersistenceConfigured();

  if (persistAvailable) {
    const cached = await getAuditSummary(args.auditId!).catch(() => null);
    if (cached) {
      return { status: "ok", text: cached, source: "ai", cached: true };
    }
  }

  const gen = await generateSummary(args.input, args.result);

  if (persistAvailable && gen.source === "ai") {
    // Best-effort persist; a write failure here just means the next view
    // re-generates. Don't propagate.
    await setAuditSummary(args.auditId!, gen.text).catch(() => {});
  }

  return { status: "ok", text: gen.text, source: gen.source, cached: false };
}
