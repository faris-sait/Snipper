import { describe, expect, it } from "vitest";

import { resolveOverrideRow } from "../change-history";
import { TOOLS } from "../tools";

describe("resolveOverrideRow", () => {
  it("emits a labelled, formatted diff line when price moves", () => {
    const baselinePrice = TOOLS.cursor.plans.find((p) => p.id === "pro")
      ?.pricePerSeatMonthly;
    expect(baselinePrice).toBeDefined();

    const resolved = resolveOverrideRow({
      toolId: "cursor",
      planId: "pro",
      overrides: { pricePerSeatMonthly: 60 },
      updatedAt: "2026-05-21T13:00:00.000Z",
      tools: TOOLS,
    });

    expect(resolved.orphaned).toBe(false);
    expect(resolved.toolDisplayName).toBe(TOOLS.cursor.displayName);
    expect(resolved.changes).toHaveLength(1);
    expect(resolved.changes[0]).toMatchObject({
      field: "pricePerSeatMonthly",
      label: "Price / seat / mo",
      now: "$60/seat",
    });
    expect(resolved.changes[0].was).toMatch(/\$\d+\/seat/);
  });

  it("skips fields that match the in-code baseline (no-op override)", () => {
    const baselinePrice = TOOLS.cursor.plans.find((p) => p.id === "pro")
      ?.pricePerSeatMonthly as number;

    const resolved = resolveOverrideRow({
      toolId: "cursor",
      planId: "pro",
      overrides: { pricePerSeatMonthly: baselinePrice },
      updatedAt: "2026-05-21T13:00:00.000Z",
      tools: TOOLS,
    });

    expect(resolved.changes).toHaveLength(0);
    expect(resolved.orphaned).toBe(false);
  });

  it("marks rows as orphaned when the tool/plan no longer exists", () => {
    const resolved = resolveOverrideRow({
      toolId: "deleted-tool",
      planId: "deleted-plan",
      overrides: { pricePerSeatMonthly: 99 },
      updatedAt: "2026-05-21T13:00:00.000Z",
      tools: TOOLS,
    });

    expect(resolved.orphaned).toBe(true);
    expect(resolved.changes).toHaveLength(0);
  });
});
