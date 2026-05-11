import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type {
  AuditInput,
  AuditLineResult,
  AuditResult,
  Recommendation,
} from "@/lib/audit/types";
import type { ToolId } from "@/lib/pricing/types";
import { getPlan, getTool } from "@/lib/pricing/tools";
import { formatUsd } from "@/lib/utils";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Confirmation email after a lead-capture submit on a savings-bearing audit.
 * Names the headline number, the top 1–3 moves, and the Credex follow-up
 * commitment when savings clear the $500/mo threshold.
 *
 * Pure function — no env, no time, no network. Deterministic from inputs,
 * which is how the unit tests pin its output.
 */
export function renderLeadConfirmation(args: {
  input: AuditInput;
  result: AuditResult;
  shareUrl: string | null;
}): RenderedEmail {
  const { input, result, shareUrl } = args;
  const monthly = formatUsd(result.totals.monthlySavingsUsd);
  const annual = formatUsd(result.totals.annualSavingsUsd);
  const useCase = USE_CASE_PHRASES[input.primaryUseCase];
  const top = topActionableLines(result, 3);
  const willCredexFollowUp = result.surfaceCredex;

  const subject = `Your Snipper audit · ${monthly}/mo in potential savings`;

  const credexNote = willCredexFollowUp
    ? `Because your potential savings clear $500/mo, Credex will reach out within one working day with discounted-credits options that could capture more of this without a plan switch.`
    : `These are smaller, defensible wins — worth executing once and not obsessing over.`;

  const lines = top
    .map(
      (line) =>
        `${getTool(line.line.toolId).displayName} ${planName(line.line.toolId, line.line.planId)} · ${describeRec(line.recommendation, line.line.toolId)} · ${formatUsd(line.recommendation.monthlySavingsUsd)}/mo`,
    )
    .join("\n");

  const text = [
    `Hi,`,
    ``,
    `Thanks for auditing your AI stack with Snipper. Here's what we found for your ${useCase} team:`,
    ``,
    `Estimated monthly savings: ${monthly}`,
    `Annualised: ${annual}`,
    ``,
    `Top moves:`,
    lines,
    ``,
    credexNote,
    ``,
    shareUrl ? `Your audit: ${shareUrl}` : `Re-run anytime: https://snipper-alpha.vercel.app/audit`,
    `Pricing sources: https://snipper-alpha.vercel.app/pricing-sources`,
    ``,
    `— Snipper`,
  ].join("\n");

  const linesHtml = top
    .map(
      (line) => `
      <li style="margin: 0 0 8px 0;">
        <strong>${escapeHtml(getTool(line.line.toolId).displayName)} ${escapeHtml(planName(line.line.toolId, line.line.planId))}</strong>
        — ${escapeHtml(describeRec(line.recommendation, line.line.toolId))}
        <span style="color:#0d6b4f; font-weight:600;"> ${escapeHtml(formatUsd(line.recommendation.monthlySavingsUsd))}/mo</span>
      </li>`,
    )
    .join("");

  const html = `
<!doctype html>
<html lang="en"><body style="margin:0; padding:0; background:#fbfaf6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f0f0d; line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; padding:32px 24px;">
    <tr><td>
      <p style="margin:0 0 24px; font-family:'SFMono-Regular', Menlo, monospace; font-size:14px; letter-spacing:-0.01em;">snipper</p>
      <h1 style="margin:0 0 8px; font-size:28px; font-weight:600; letter-spacing:-0.02em;">Your audit is in.</h1>
      <p style="margin:0 0 24px; font-size:15px; color:#5a5a55;">For your ${escapeHtml(useCase)} team.</p>
      <p style="margin:0 0 8px; font-family:'SFMono-Regular', Menlo, monospace; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#5a5a55;">Estimated monthly savings</p>
      <p style="margin:0 0 24px; font-size:36px; font-weight:600; color:#0d6b4f;">${escapeHtml(monthly)}<span style="font-size:18px; color:#5a5a55;"> / mo</span></p>
      <p style="margin:0 0 24px; font-size:14px; color:#5a5a55;">${escapeHtml(annual)} per year.</p>
      <p style="margin:0 0 12px; font-family:'SFMono-Regular', Menlo, monospace; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#5a5a55;">Top moves</p>
      <ul style="margin:0 0 24px; padding:0 0 0 20px; font-size:14px;">${linesHtml}</ul>
      <p style="margin:0 0 24px; font-size:14px;">${escapeHtml(credexNote)}</p>
      ${
        shareUrl
          ? `<p style="margin:0 0 24px; font-size:14px;"><a href="${escapeHtml(shareUrl)}" style="color:#0d6b4f; text-decoration:underline;">View your audit</a></p>`
          : ""
      }
      <p style="margin:32px 0 0; font-size:12px; color:#5a5a55; border-top:1px solid #e7e5dd; padding-top:16px;">
        © ${new Date().getFullYear()} Snipper · Made for <a href="https://credex.rocks" style="color:#5a5a55;">credex.rocks</a> · <a href="https://snipper-alpha.vercel.app/pricing-sources" style="color:#5a5a55;">Pricing sources</a>
      </p>
    </td></tr>
  </table>
</body></html>`.trim();

  return { subject, html, text };
}

/**
 * Confirmation email for the optimal-stack notify-me path. Lighter copy:
 * acknowledges the signup, states the policy ("we email only when something
 * materially changes"), and never pitches Credex — that's the whole point of
 * the notify path being separate from the lead path.
 */
export function renderNotifyConfirmation(args: {
  shareUrl: string | null;
}): RenderedEmail {
  const subject = `You're on the watchlist · Snipper`;

  const text = [
    `Hi,`,
    ``,
    `You're on the Snipper watchlist. We'll email if a vendor pricing change, plan-mix shift, or new credit option opens a meaningful optimization against your stack.`,
    ``,
    `That's it. No newsletter, no drip campaign.`,
    ``,
    args.shareUrl ? `Your audit: ${args.shareUrl}` : `Re-run anytime: https://snipper-alpha.vercel.app/audit`,
    ``,
    `— Snipper`,
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en"><body style="margin:0; padding:0; background:#fbfaf6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f0f0d; line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; padding:32px 24px;">
    <tr><td>
      <p style="margin:0 0 24px; font-family:'SFMono-Regular', Menlo, monospace; font-size:14px; letter-spacing:-0.01em;">snipper</p>
      <h1 style="margin:0 0 16px; font-size:24px; font-weight:600; letter-spacing:-0.02em;">You're on the watchlist.</h1>
      <p style="margin:0 0 16px; font-size:15px;">We'll email if a vendor pricing change, plan-mix shift, or new credit option opens a meaningful optimization against your stack.</p>
      <p style="margin:0 0 24px; font-size:15px; color:#5a5a55;">That's it. No newsletter, no drip campaign.</p>
      ${
        args.shareUrl
          ? `<p style="margin:0 0 24px; font-size:14px;"><a href="${escapeHtml(args.shareUrl)}" style="color:#0d6b4f; text-decoration:underline;">View your audit</a></p>`
          : ""
      }
      <p style="margin:32px 0 0; font-size:12px; color:#5a5a55; border-top:1px solid #e7e5dd; padding-top:16px;">
        © ${new Date().getFullYear()} Snipper · Made for <a href="https://credex.rocks" style="color:#5a5a55;">credex.rocks</a>
      </p>
    </td></tr>
  </table>
</body></html>`.trim();

  return { subject, html, text };
}

function topActionableLines(
  result: AuditResult,
  n: number,
): AuditLineResult[] {
  return result.results
    .filter((r) => r.recommendation.kind !== "optimal")
    .sort(
      (a, b) =>
        b.recommendation.monthlySavingsUsd - a.recommendation.monthlySavingsUsd,
    )
    .slice(0, n);
}

function describeRec(rec: Recommendation, fromToolId: ToolId): string {
  switch (rec.kind) {
    case "downgrade_plan": {
      const target = rec.toPlanId ? planName(fromToolId, rec.toPlanId) : null;
      return target ? `downgrade to ${target}` : "downgrade plan";
    }
    case "switch_tool": {
      const target = rec.toToolId ? getTool(rec.toToolId).displayName : null;
      return target ? `switch to ${target}` : "switch tool";
    }
    case "consolidate":
      return "consolidate into existing stack";
    case "use_credex":
      return "via discounted Credex credits";
    case "optimal":
      return "no change";
  }
}

function planName(toolId: ToolId, planId: string): string {
  try {
    return getPlan(toolId, planId).vendorPlanName;
  } catch {
    return planId;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
