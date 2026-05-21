import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { diffAuditResults } from "@/lib/audit/diff";
import { runAudit } from "@/lib/audit/engine";
import type { AuditInput } from "@/lib/audit/types";
import { TOOLS } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";

import {
  deliverGroupedReauditNotifications,
  type AddressableAffectedAudit,
} from "../reaudit-delivery";
import { summariseAuditPriceChanges } from "../reaudit";

type SendEmail = NonNullable<Parameters<typeof deliverGroupedReauditNotifications>[0]["sendEmail"]>;

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

function makeAffectedAudit(
  auditId: string,
  input: AuditInput,
  tools: Record<ToolId, Tool>,
): AddressableAffectedAudit {
  const oldResult = runAudit(input);
  const newResult = runAudit(input, undefined, tools);
  const diff = diffAuditResults(oldResult, newResult);

  return {
    auditId,
    diff,
    priceChanges: summariseAuditPriceChanges(diff, TOOLS, tools),
  };
}

describe("deliverGroupedReauditNotifications", () => {
  it("sends one consolidated email per recipient and logs successful audits", async () => {
    const first = makeAffectedAudit(
      "abc12345xyzz",
      {
        teamSize: 2,
        primaryUseCase: "coding",
        lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
      },
      withSeatPrice(TOOLS, "cursor", "pro", 60),
    );
    const second = makeAffectedAudit(
      "def67890lmno",
      {
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
      },
      withSeatPrice(TOOLS, "claude", "pro", 22),
    );
    const third = makeAffectedAudit(
      "ghi24680pqrs",
      {
        teamSize: 1,
        primaryUseCase: "coding",
        lines: [{ toolId: "chatgpt", planId: "plus", seats: 1, monthlySpendUsd: 50 }],
      },
      withSeatPrice(TOOLS, "cursor", "pro", 10),
    );

    const sendEmail: SendEmail = vi.fn(async () => ({
      status: "sent" as const,
      messageId: "msg_123",
    }));
    const persistNotifications = vi.fn(async () => {});

    const result = await deliverGroupedReauditNotifications({
      grouped: new Map([
        ["one@example.com", [first, second]],
        ["two@example.com", [third]],
      ]),
      pricingVersion: "abcd1234efgh5678",
      siteUrl: "https://snipper.example.com",
      sendEmail,
      persistNotifications,
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenNthCalledWith(1, {
      to: "one@example.com",
      siteUrl: "https://snipper.example.com",
      items: [
        {
          auditId: "abc12345xyzz",
          diff: first.diff,
          priceChanges: first.priceChanges,
        },
        {
          auditId: "def67890lmno",
          diff: second.diff,
          priceChanges: second.priceChanges,
        },
      ],
    });
    expect(sendEmail).toHaveBeenNthCalledWith(2, {
      to: "two@example.com",
      siteUrl: "https://snipper.example.com",
      items: [
        {
          auditId: "ghi24680pqrs",
          diff: third.diff,
          priceChanges: third.priceChanges,
        },
      ],
    });

    expect(persistNotifications).toHaveBeenCalledTimes(2);
    expect(persistNotifications).toHaveBeenNthCalledWith(1, [
      {
        audit_id: "abc12345xyzz",
        pricing_version: "abcd1234efgh5678",
        email: "one@example.com",
      },
      {
        audit_id: "def67890lmno",
        pricing_version: "abcd1234efgh5678",
        email: "one@example.com",
      },
    ]);
    expect(persistNotifications).toHaveBeenNthCalledWith(2, [
      {
        audit_id: "ghi24680pqrs",
        pricing_version: "abcd1234efgh5678",
        email: "two@example.com",
      },
    ]);

    expect(result).toEqual({
      recipientCount: 2,
      notifiedRecipients: 2,
      skippedRecipients: 0,
      failedRecipients: 0,
      loggedAudits: 3,
      logErrors: 0,
    });
  });

  it("does not log skipped or failed sends", async () => {
    const skipped = makeAffectedAudit(
      "abc12345xyzz",
      {
        teamSize: 2,
        primaryUseCase: "coding",
        lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
      },
      withSeatPrice(TOOLS, "cursor", "pro", 60),
    );
    const failed = makeAffectedAudit(
      "def67890lmno",
      {
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
      },
      withSeatPrice(TOOLS, "claude", "pro", 22),
    );

    const sendEmail: SendEmail = vi
      .fn()
      .mockResolvedValueOnce({
        status: "skipped" as const,
        reason: "RESEND env vars not set",
      })
      .mockResolvedValueOnce({ status: "error" as const, reason: "provider error" });
    const persistNotifications = vi.fn(async () => {});

    const result = await deliverGroupedReauditNotifications({
      grouped: new Map([
        ["one@example.com", [skipped]],
        ["two@example.com", [failed]],
      ]),
      pricingVersion: "abcd1234efgh5678",
      siteUrl: "https://snipper.example.com",
      sendEmail,
      persistNotifications,
    });

    expect(persistNotifications).not.toHaveBeenCalled();
    expect(result).toEqual({
      recipientCount: 2,
      notifiedRecipients: 0,
      skippedRecipients: 1,
      failedRecipients: 1,
      loggedAudits: 0,
      logErrors: 0,
    });
  });
});
