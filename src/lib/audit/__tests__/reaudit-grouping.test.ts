import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { diffAuditResults } from "@/lib/audit/diff";
import { runAudit } from "@/lib/audit/engine";
import { TOOLS } from "@/lib/pricing/tools";
import type { Tool, ToolId } from "@/lib/pricing/types";

import { groupAffectedAuditsByEmail, type AffectedAudit } from "../reaudit";
import type { AuditInput } from "../types";

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

function makeAffectedAudit(auditId: string, email: string | null): AffectedAudit {
  const input: AuditInput = {
    teamSize: 2,
    primaryUseCase: "coding",
    lines: [{ toolId: "cursor", planId: "teams", seats: 2, monthlySpendUsd: 80 }],
  };
  const oldResult = runAudit(input);
  const newResult = runAudit(input, undefined, withSeatPrice(TOOLS, "cursor", "pro", 60));

  return {
    auditId,
    email,
    priceChanges: ["Cursor Pro moved from $20/seat to $60/seat."],
    input,
    oldResult,
    newResult,
    diff: diffAuditResults(oldResult, newResult),
  };
}

describe("groupAffectedAuditsByEmail", () => {
  it("groups multiple audits under the canonical stored email", () => {
    const grouped = groupAffectedAuditsByEmail(
      [
        makeAffectedAudit("abc12345xyzz", "one@example.com"),
        makeAffectedAudit("def67890lmno", "one@example.com"),
        makeAffectedAudit("ghi24680pqrs", "two@example.com"),
      ],
      new Set(),
    );

    expect(Array.from(grouped.keys())).toEqual(["one@example.com", "two@example.com"]);
    expect(grouped.get("one@example.com")?.map((audit) => audit.auditId)).toEqual([
      "abc12345xyzz",
      "def67890lmno",
    ]);
  });

  it("skips every audit belonging to an unsubscribed email and audits with no stored email", () => {
    const grouped = groupAffectedAuditsByEmail(
      [
        makeAffectedAudit("abc12345xyzz", "one@example.com"),
        makeAffectedAudit("def67890lmno", null),
        makeAffectedAudit("ghi24680pqrs", "two@example.com"),
        // Same unsubscribed email on a different audit id must also be muted.
        makeAffectedAudit("jkl13579tuvw", "two@example.com"),
      ],
      new Set(["two@example.com"]),
    );

    expect(Array.from(grouped.keys())).toEqual(["one@example.com"]);
    expect(grouped.get("one@example.com")?.map((audit) => audit.auditId)).toEqual(["abc12345xyzz"]);
  });
});
