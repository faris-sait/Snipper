"use server";

import { headers } from "next/headers";

import { generateSummary } from "@/lib/ai/summary";
import { runAudit } from "@/lib/audit/engine";
import { generateAuditId, isWellFormedAuditId } from "@/lib/audit/id";
import { AuditFormSchema } from "@/lib/audit/schema";
import type { AuditInput, AuditResult } from "@/lib/audit/types";
import {
  getAuditSummary,
  getPublicAudit,
  persistAudit,
  persistLead,
  persistNotifySignup,
  setAuditEmail,
  setAuditSummary,
} from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { buildPerAuditSnapshot, getEffectiveTools } from "@/lib/pricing/effective";
import { sendAuditLeadConfirmation, sendNotifyConfirmation } from "@/lib/email/send";
import { renderAuditReportPdfBuffer } from "@/lib/pdf/render";

export type RunAuditState =
  | { status: "ok"; auditId: string | null; result: AuditResult }
  | { status: "error"; message: string };

export type CaptureLeadState =
  | { status: "ok"; persisted: boolean }
  | { status: "error"; message: string };

interface RunAuditArgs {
  input: unknown;
  email: string;
  /** Honeypot field — bots fill every input; humans never see it. */
  honeypot?: string;
  /**
   * Optional referrer audit ID passed through from a `?via=` query param.
   * Stored in `request_meta` for attribution.
   */
  via?: string | null;
}

export async function runAuditAction(args: RunAuditArgs): Promise<RunAuditState> {
  if (args.honeypot && args.honeypot.trim().length > 0) {
    return { status: "error", message: "Submission rejected." };
  }
  const email = args.email.trim().toLowerCase();
  if (!isPlausibleEmail(email)) {
    return { status: "error", message: "Enter a valid email." };
  }

  const parsed = AuditFormSchema.safeParse(args.input);
  if (!parsed.success) {
    return { status: "error", message: "Form input was invalid." };
  }

  // Round 2: resolve effective pricing (TOOLS + any pricing_overrides) and
  // run the engine against it. Capturing the per-audit snapshot here means
  // detect-changes can later re-run the engine against this audit's stored
  // pricing context to render an exact diff of what changed.
  const effective = await getEffectiveTools();
  const result = runAudit(parsed.data, undefined, effective.tools);

  if (!isPersistenceConfigured()) {
    // Local-only mode — engine still ran, but no shareable link.
    return { status: "ok", auditId: null, result };
  }

  const id = generateAuditId();
  try {
    // Mirror the canonical-length guard on `/a/[id]?via=` — anything other
    // than a 12-char id never persists into `request_meta.referred_by`.
    const referrer =
      args.via && isWellFormedAuditId(args.via) && args.via.length === 12 ? args.via : null;
    const pricingSnapshot = buildPerAuditSnapshot(
      effective.tools,
      parsed.data.lines.map((l) => l.toolId),
    );
    await persistAudit({
      id,
      email,
      input: parsed.data,
      result,
      pricingSnapshot,
      requestMeta: {
        ...(await collectRequestMeta()),
        ...(referrer ? { referred_by: referrer } : {}),
      },
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

export async function captureLeadAction(args: CaptureLeadArgs): Promise<CaptureLeadState> {
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

  try {
    if (args.auditId) {
      await setAuditEmail(args.auditId, email);
    }

    if (args.kind === "lead") {
      // Lead capture requires a persisted audit (FK constraint on audit_leads).
      // If the audit wasn't persisted (transient Supabase failure during the
      // upstream runAuditAction), gracefully return ok-but-not-persisted so the
      // user sees the success state instead of a dead-end error. See ISSUE-004
      // in dogfood-output-2026-05-12/report.md.
      if (!args.auditId) {
        return { status: "ok", persisted: false };
      }
      await persistLead({
        audit_id: args.auditId,
        email,
        company: nullableTrim(args.company),
        role: nullableTrim(args.role),
        team_size: typeof args.teamSize === "number" ? args.teamSize : null,
      });
    } else {
      await persistNotifySignup({ email, audit_id: args.auditId });
    }
    // Best-effort confirmation email. Awaited so Vercel doesn't kill the
    // serverless function mid-send (fire-and-forget needs `waitUntil`, which
    // adds a dependency we don't otherwise need). `sendXxx` swallows Resend
    // errors internally — the user always sees `ok` regardless.
    await fireConfirmationEmail({ kind: args.kind, auditId: args.auditId, email });
    return { status: "ok", persisted: true };
  } catch {
    return { status: "ok", persisted: false };
  }
}

/**
 * Fire-and-forget transactional email after a successful lead/notify persist.
 * Pulled into its own function so the awaitless call in `captureLeadAction`
 * stays readable and the lookup-then-send sequence is testable in isolation.
 *
 * Safe to call without checking env vars — the underlying `send.ts` skips
 * gracefully when Resend isn't configured.
 */
async function fireConfirmationEmail(args: {
  kind: CaptureLeadKind;
  auditId: string | null;
  email: string;
}): Promise<void> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const shareUrl = args.auditId ? `${siteUrl}/a/${args.auditId}` : null;

    if (args.kind === "lead" && args.auditId) {
      const audit = await getPublicAudit(args.auditId);
      if (!audit) return;

      const input = audit.input as unknown as AuditInput;

      // Make sure the PDF carries the same AI summary the user saw on
      // the result page. If the cache is cold (lead captured before the
      // summary action finished), generate now and persist for future views.
      let summary = audit.ai_summary;
      if (!summary) {
        const gen = await generateSummary(input, audit.result);
        summary = gen.text;
        if (gen.source === "ai") {
          await setAuditSummary(args.auditId, gen.text).catch(() => {});
        }
      }

      const pdfBuffer = await renderAuditReportPdfBuffer({
        input,
        result: audit.result,
        summary,
        auditId: args.auditId,
        shareUrl,
        generatedAt: new Date(audit.created_at).toISOString().slice(0, 10),
      });

      await sendAuditLeadConfirmation({
        to: args.email,
        input,
        result: audit.result,
        shareUrl,
        pdfAttachment: pdfBuffer
          ? {
              filename: `snipper-audit-${args.auditId}.pdf`,
              content: pdfBuffer,
            }
          : null,
      });
    } else if (args.kind === "notify") {
      await sendNotifyConfirmation({ to: args.email, shareUrl });
    }
  } catch (err) {
    console.error("[email] confirmation failed:", err);
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
export async function getOrGenerateSummaryAction(args: SummaryArgs): Promise<SummaryActionState> {
  const persistAvailable =
    !!args.auditId && isWellFormedAuditId(args.auditId) && isPersistenceConfigured();

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
