import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type { AuditDiff, LineDiff } from "@/lib/audit/diff";
import type { AuditInput, AuditLineResult, AuditResult, Recommendation } from "@/lib/audit/types";
import type { ToolId } from "@/lib/pricing/types";
import { getPlan, getTool } from "@/lib/pricing/tools";
import { formatUsd } from "@/lib/utils";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface ReauditNotificationItem {
  auditId: string;
  diff: AuditDiff;
  priceChanges: string[];
  /**
   * The pricing_version this notification was sent against. Threaded through
   * to the rerun URL as `?v=<version>` so a click on the email link can be
   * attributed to the exact `reaudit_notifications` row that produced it.
   * Optional — older callers that don't track version send a link without it.
   */
  pricingVersion?: string;
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
    `A PDF copy of the full audit is attached — every recommendation cites a vendor source.`,
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
      <p style="margin:0 0 16px; font-size:14px;">${escapeHtml(credexNote)}</p>
      <p style="margin:0 0 24px; font-size:13px; color:#5a5a55;">A PDF copy of the full audit is attached — every recommendation cites a vendor source.</p>
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
export function renderNotifyConfirmation(args: { shareUrl: string | null }): RenderedEmail {
  const subject = `You're on the watchlist · Snipper`;

  const text = [
    `Hi,`,
    ``,
    `You're on the Snipper watchlist. We'll email if a vendor pricing change, plan-mix shift, or new credit option opens a meaningful optimization against your stack.`,
    ``,
    `That's it. No newsletter, no drip campaign.`,
    ``,
    args.shareUrl
      ? `Your audit: ${args.shareUrl}`
      : `Re-run anytime: https://snipper-alpha.vercel.app/audit`,
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

/**
 * Consolidated pricing-change email: one recipient may have multiple stored
 * audits affected by the same pricing version, so we send one message with a
 * short summary per audit and a direct link to the rerun diff view.
 */
export function renderReauditNotification(args: {
  siteUrl: string;
  items: ReauditNotificationItem[];
  unsubscribeUrl?: string | null;
}): RenderedEmail {
  const count = args.items.length;
  const baseUrl = normaliseSiteUrl(args.siteUrl);
  const subject = `Pricing changed on ${count} of your audits`;

  const textItems = args.items.map((item) => renderReauditItemText(item, baseUrl)).join("\n\n");

  const text = [
    `Hi,`,
    ``,
    count === 1
      ? `Pricing changed on one of the audits you're tracking with Snipper.`
      : `Pricing changed on ${count} of the audits you're tracking with Snipper.`,
    `We re-ran each saved stack against current pricing and found these changes:`,
    ``,
    textItems,
    ``,
    args.unsubscribeUrl
      ? `Stop these alerts: ${args.unsubscribeUrl}`
      : `You're receiving this because you asked Snipper to watch these audits for pricing changes.`,
    ``,
    `— Snipper`,
  ].join("\n");

  const htmlItems = args.items.map((item) => renderReauditItemHtml(item, baseUrl)).join("");

  const html = `
<!doctype html>
<html lang="en"><body style="margin:0; padding:0; background:#fbfaf6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f0f0d; line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; padding:32px 24px;">
    <tr><td>
      <p style="margin:0 0 24px; font-family:'SFMono-Regular', Menlo, monospace; font-size:14px; letter-spacing:-0.01em;">snipper</p>
      <h1 style="margin:0 0 12px; font-size:28px; font-weight:600; letter-spacing:-0.02em;">Pricing moved on your saved audits.</h1>
      <p style="margin:0 0 24px; font-size:15px; color:#5a5a55;">${escapeHtml(
        count === 1
          ? `We re-ran one saved audit against current pricing.`
          : `We re-ran ${count} saved audits against current pricing.`,
      )}</p>
      ${htmlItems}
      ${
        args.unsubscribeUrl
          ? `<p style="margin:24px 0 0; font-size:13px; color:#0f0f0d; line-height:1.5;">
        Don&rsquo;t want these alerts? <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#0d6b4f; text-decoration:underline;">Unsubscribe instantly</a> — we won&rsquo;t email this address again about pricing changes.
      </p>`
          : ""
      }
      <p style="margin:32px 0 0; font-size:12px; color:#5a5a55; border-top:1px solid #e7e5dd; padding-top:16px;">
        ${
          args.unsubscribeUrl
            ? `<a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#5a5a55;">Unsubscribe</a> · `
            : ""
        }Made for <a href="https://credex.rocks" style="color:#5a5a55;">credex.rocks</a>
      </p>
    </td></tr>
  </table>
</body></html>`.trim();

  return { subject, html, text };
}

function topActionableLines(result: AuditResult, n: number): AuditLineResult[] {
  return result.results
    .filter((r) => r.recommendation.kind !== "optimal")
    .sort((a, b) => b.recommendation.monthlySavingsUsd - a.recommendation.monthlySavingsUsd)
    .slice(0, n);
}

/**
 * Public rerun URL with optional `?v=<pricing_version>` for click attribution.
 * Pure — pricing_version is opaque to this helper; falsy values skip the query.
 */
export function buildRerunUrl(
  siteUrl: string,
  auditId: string,
  pricingVersion: string | null | undefined,
): string {
  const base = `${siteUrl}/a/${auditId}/rerun`;
  if (!pricingVersion) return base;
  return `${base}?v=${encodeURIComponent(pricingVersion)}`;
}

function renderReauditItemText(item: ReauditNotificationItem, siteUrl: string): string {
  const rerunUrl = buildRerunUrl(siteUrl, item.auditId, item.pricingVersion);
  const changedLines = changedLineSummaries(item.diff)
    .map((line) => `- ${line}`)
    .join("\n");
  const priceMoves = item.priceChanges.map((line) => `- ${line}`).join("\n");

  return [
    `Audit ${item.auditId}`,
    formatTotalsSummary(item.diff),
    ...(item.priceChanges.length > 0 ? [`Vendor price moves:`, priceMoves] : []),
    `What changed:`,
    changedLines,
    `Compare: ${rerunUrl}`,
  ].join("\n");
}

function renderReauditItemHtml(item: ReauditNotificationItem, siteUrl: string): string {
  const rerunUrl = buildRerunUrl(siteUrl, item.auditId, item.pricingVersion);
  const changedLines = changedLineSummaries(item.diff)
    .map((line) => `<li style="margin:0 0 8px 0;">${escapeHtml(line)}</li>`)
    .join("");
  const priceMoves = item.priceChanges
    .map((line) => `<li style="margin:0 0 8px 0;">${escapeHtml(line)}</li>`)
    .join("");

  return `
      <div style="margin:0 0 20px; padding:20px; border:1px solid #e7e5dd; border-radius:16px; background:#fffdf8;">
        <p style="margin:0 0 6px; font-family:'SFMono-Regular', Menlo, monospace; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#5a5a55;">Audit ${escapeHtml(item.auditId)}</p>
        <p style="margin:0 0 12px; font-size:15px; font-weight:600;">${escapeHtml(formatTotalsSummary(item.diff))}</p>
        ${
          item.priceChanges.length > 0
            ? `<p style="margin:0 0 8px; font-size:13px; font-weight:600; color:#5a5a55;">Vendor price moves</p><ul style="margin:0 0 16px; padding:0 0 0 20px; font-size:14px; color:#0f0f0d;">${priceMoves}</ul>`
            : ""
        }
        <ul style="margin:0 0 16px; padding:0 0 0 20px; font-size:14px; color:#0f0f0d;">${changedLines}</ul>
        <p style="margin:0;"><a href="${escapeHtml(rerunUrl)}" style="color:#0d6b4f; text-decoration:underline; font-size:14px;">Compare old vs new audit</a></p>
      </div>`;
}

function changedLineSummaries(diff: AuditDiff): string[] {
  return diff.lines
    .filter((line) => line.kind !== "unchanged")
    .slice(0, 3)
    .map((line) => summariseLineDiff(line));
}

function summariseLineDiff(line: LineDiff): string {
  const current = line.oldLineResult ?? line.newLineResult;
  if (!current) {
    return "A recommendation changed.";
  }

  const label = `${getTool(current.line.toolId).displayName} ${planName(
    current.line.toolId,
    current.line.planId,
  )}`;

  if (line.kind === "recommendation_changed") {
    return `${label}: was ${describeLineRecommendation(line.oldLineResult)}, now ${describeLineRecommendation(line.newLineResult)}.`;
  }

  return `${label}: still ${describeLineRecommendation(line.newLineResult)}, but savings moved from ${formatSavings(line.oldLineResult)} to ${formatSavings(line.newLineResult)}.`;
}

function describeLineRecommendation(line: AuditLineResult | null): string {
  if (!line) return "no recommendation";
  return describeRecDetailed(line.recommendation, line.line.toolId);
}

function formatTotalsSummary(diff: AuditDiff): string {
  const oldSavings = `${formatUsd(diff.totals.oldSavings)}/mo`;
  const newSavings = `${formatUsd(diff.totals.newSavings)}/mo`;
  const delta = diff.totals.deltaSavings;

  if (diff.totals.signal === "same") {
    return `Estimated savings stayed at ${newSavings}, but the recommendation changed.`;
  }

  return `Estimated savings ${delta > 0 ? "increased" : "decreased"} from ${oldSavings} to ${newSavings} (${formatSignedUsd(delta)}/mo).`;
}

function formatSavings(line: AuditLineResult | null): string {
  return line ? `${formatUsd(line.recommendation.monthlySavingsUsd)}/mo` : "$0/mo";
}

function formatSignedUsd(amount: number): string {
  return `${amount > 0 ? "+" : ""}${formatUsd(amount)}`;
}

function normaliseSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "");
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

function describeRecDetailed(rec: Recommendation, fromToolId: ToolId): string {
  switch (rec.kind) {
    case "downgrade_plan": {
      const target = rec.toPlanId ? planName(fromToolId, rec.toPlanId) : null;
      return target ? `downgrade to ${target}` : "downgrade plan";
    }
    case "switch_tool": {
      const tool = rec.toToolId ? getTool(rec.toToolId).displayName : null;
      const plan = rec.toToolId && rec.toPlanId ? planName(rec.toToolId, rec.toPlanId) : null;
      if (tool && plan) return `switch to ${tool} ${plan}`;
      if (tool) return `switch to ${tool}`;
      return "switch tool";
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
