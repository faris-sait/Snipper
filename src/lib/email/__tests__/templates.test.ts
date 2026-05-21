import { describe, expect, it } from "vitest";

import { diffAuditResults } from "@/lib/audit/diff";
import { runAudit } from "@/lib/audit/engine";
import type { AuditInput } from "@/lib/audit/types";
import { TOOLS } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";

import {
  renderLeadConfirmation,
  renderNotifyConfirmation,
  renderReauditNotification,
} from "../templates";

const HIGH_SAVINGS_INPUT: AuditInput = {
  teamSize: 5,
  primaryUseCase: "coding",
  lines: [
    { toolId: "cursor", planId: "teams", seats: 5, monthlySpendUsd: 200 },
    {
      toolId: "anthropic_api",
      planId: "usage",
      seats: 1,
      monthlySpendUsd: 2400,
    },
  ],
};

const MODEST_SAVINGS_INPUT: AuditInput = {
  teamSize: 1,
  primaryUseCase: "coding",
  lines: [{ toolId: "cursor", planId: "pro", seats: 1, monthlySpendUsd: 20 }],
};

function withSeatPrice(
  base: Record<ToolId, Tool>,
  toolId: ToolId,
  planId: string,
  pricePerSeatMonthly: number,
): Record<ToolId, Tool> {
  return {
    ...base,
    [toolId]: {
      ...base[toolId],
      plans: base[toolId].plans.map((plan) =>
        plan.id === planId ? { ...plan, pricePerSeatMonthly } : plan,
      ),
    },
  };
}

describe("renderLeadConfirmation", () => {
  it("puts the formatted monthly savings in the subject line", () => {
    const result = runAudit(HIGH_SAVINGS_INPUT);
    const email = renderLeadConfirmation({
      input: HIGH_SAVINGS_INPUT,
      result,
      shareUrl: null,
    });
    expect(email.subject).toMatch(/\$\d+/);
    expect(email.subject).toContain("/mo");
  });

  it("mentions Credex follow-up when surfaceCredex is true (≥$500/mo savings)", () => {
    const result = runAudit(HIGH_SAVINGS_INPUT);
    expect(result.surfaceCredex).toBe(true);
    const email = renderLeadConfirmation({
      input: HIGH_SAVINGS_INPUT,
      result,
      shareUrl: null,
    });
    expect(email.text).toContain("Credex will reach out");
    expect(email.html).toContain("Credex will reach out");
  });

  it("omits the Credex-follow-up sentence when surfaceCredex is false", () => {
    const result = runAudit(MODEST_SAVINGS_INPUT);
    expect(result.surfaceCredex).toBe(false);
    const email = renderLeadConfirmation({
      input: MODEST_SAVINGS_INPUT,
      result,
      shareUrl: null,
    });
    expect(email.text).not.toContain("Credex will reach out");
    expect(email.html).not.toContain("Credex will reach out");
  });

  it("includes the share URL when provided, omits when null", () => {
    const result = runAudit(HIGH_SAVINGS_INPUT);
    const withShare = renderLeadConfirmation({
      input: HIGH_SAVINGS_INPUT,
      result,
      shareUrl: "https://snipper.example.com/a/abc12345xyzz",
    });
    expect(withShare.text).toContain("https://snipper.example.com/a/abc12345xyzz");

    const noShare = renderLeadConfirmation({
      input: HIGH_SAVINGS_INPUT,
      result,
      shareUrl: null,
    });
    expect(noShare.text).not.toContain("/a/");
  });

  it("escapes HTML-significant characters in the rendered HTML", () => {
    // Future-proof: if a tool's display name ever contained "<", we'd want it
    // safely escaped. Check the escape helper is wired by looking for the
    // hand-coded entities in the html (e.g. nothing leaks raw `<` from the
    // recommendation text).
    const result = runAudit(HIGH_SAVINGS_INPUT);
    const email = renderLeadConfirmation({
      input: HIGH_SAVINGS_INPUT,
      result,
      shareUrl: null,
    });
    expect(email.html).toContain("<!doctype html>");
    // Recommendation strings come from the engine and don't contain raw HTML.
    // Sanity-check: every "<" in the body either opens an HTML tag or is escaped.
    const bodyMatch = email.html.match(/<body[\s\S]*<\/body>/)?.[0] ?? "";
    expect(bodyMatch).not.toMatch(/<[^a-z!/]/i); // no `<X` where X isn't a tag/entity start
  });
});

describe("renderNotifyConfirmation", () => {
  it("has a stable subject and non-empty text and html", () => {
    const email = renderNotifyConfirmation({ shareUrl: null });
    expect(email.subject).toBe("You're on the watchlist · Snipper");
    expect(email.text.length).toBeGreaterThan(50);
    expect(email.html.length).toBeGreaterThan(100);
  });

  it("never mentions Credex by name (notify path is the no-pitch path)", () => {
    const email = renderNotifyConfirmation({
      shareUrl: "https://snipper.example.com/a/abc12345xyzz",
    });
    // Footer mentions "Made for credex.rocks" — that's allowed (attribution,
    // not a pitch). What we forbid is the active-voice "Credex will reach
    // out" / "talk to Credex" copy that belongs only on the lead path.
    expect(email.text).not.toMatch(/credex will|talk to credex/i);
    expect(email.html).not.toMatch(/credex will|talk to credex/i);
  });
});

describe("renderReauditNotification", () => {
  it("renders a single affected audit with a rerun link and old/new recommendation copy", () => {
    const auditInput: AuditInput = {
      teamSize: 2,
      primaryUseCase: "coding",
      lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
    };
    const oldResult = runAudit(auditInput);
    const newResult = runAudit(auditInput, undefined, withSeatPrice(TOOLS, "cursor", "pro", 60));

    const email = renderReauditNotification({
      siteUrl: "https://snipper.example.com/",
      items: [
        {
          auditId: "abc12345xyzz",
          diff: diffAuditResults(oldResult, newResult),
          priceChanges: ["Cursor Pro moved from $20/seat to $60/seat."],
        },
      ],
    });

    expect(email.subject).toBe("Pricing changed on 1 of your audits");
    expect(email.text).toContain("https://snipper.example.com/a/abc12345xyzz/rerun");
    expect(email.text).toContain("Vendor price moves:");
    expect(email.text).toContain("Cursor Pro moved from $20/seat to $60/seat.");
    expect(email.text).toContain("was downgrade to Pro");
    expect(email.text).toContain("now switch to GitHub Copilot Pro");
    expect(email.html).toContain("https://snipper.example.com/a/abc12345xyzz/rerun");
    expect(email.html).toContain("Cursor Pro moved from $20/seat to $60/seat.");
  });

  it("renders multiple audits in one email and includes the unsubscribe link when provided", () => {
    const recChangeInput: AuditInput = {
      teamSize: 2,
      primaryUseCase: "coding",
      lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
    };
    const savingsOnlyInput: AuditInput = {
      teamSize: 5,
      primaryUseCase: "writing",
      lines: [
        {
          toolId: "claude",
          planId: "team_standard",
          seats: 5,
          monthlySpendUsd: 125,
        },
      ],
    };

    const email = renderReauditNotification({
      siteUrl: "https://snipper.example.com",
      items: [
        {
          auditId: "abc12345xyzz",
          diff: diffAuditResults(
            runAudit(recChangeInput),
            runAudit(recChangeInput, undefined, withSeatPrice(TOOLS, "cursor", "pro", 60)),
          ),
          priceChanges: ["Cursor Pro moved from $20/seat to $60/seat."],
        },
        {
          auditId: "def67890lmno",
          diff: diffAuditResults(
            runAudit(savingsOnlyInput),
            runAudit(savingsOnlyInput, undefined, withSeatPrice(TOOLS, "claude", "pro", 22)),
          ),
          priceChanges: ["Claude Pro moved from $20/seat to $22/seat."],
        },
      ],
      unsubscribeUrl: "https://snipper.example.com/unsubscribe?token=abc",
    });

    expect(email.subject).toBe("Pricing changed on 2 of your audits");
    expect(email.text).toContain("Audit abc12345xyzz");
    expect(email.text).toContain("Audit def67890lmno");
    expect(email.text).toContain("Claude Pro moved from $20/seat to $22/seat.");
    expect(email.text).toContain("https://snipper.example.com/unsubscribe?token=abc");
    expect(email.html).toContain("https://snipper.example.com/unsubscribe?token=abc");
  });

  it("annotates rerun URLs with ?v=<pricingVersion> for click attribution", () => {
    const auditInput: AuditInput = {
      teamSize: 2,
      primaryUseCase: "coding",
      lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
    };
    const oldResult = runAudit(auditInput);
    const newResult = runAudit(auditInput, undefined, withSeatPrice(TOOLS, "cursor", "pro", 60));

    const email = renderReauditNotification({
      siteUrl: "https://snipper.example.com",
      items: [
        {
          auditId: "abc12345xyzz",
          diff: diffAuditResults(oldResult, newResult),
          priceChanges: ["Cursor Pro moved from $20/seat to $60/seat."],
          pricingVersion: "70ff75ede007c931",
        },
      ],
    });

    const expected = "https://snipper.example.com/a/abc12345xyzz/rerun?v=70ff75ede007c931";
    expect(email.text).toContain(expected);
    expect(email.html).toContain(expected);
  });
});
