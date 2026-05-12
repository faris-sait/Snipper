import { describe, expect, it } from "vitest";

import { runAudit } from "@/lib/audit/engine";
import type { AuditInput } from "@/lib/audit/types";

import { compareToBenchmark } from "../compute";

function inputAtSize(teamSize: number, monthlyPerDev: number): AuditInput {
  // Pad the result with a single line that exactly matches the target spend
  // per dev. The engine doesn't read team size for line spend, so this gives
  // a clean `currentMonthlyUsd = teamSize * monthlyPerDev` baseline.
  return {
    teamSize,
    primaryUseCase: "coding",
    lines: [
      {
        toolId: "cursor",
        planId: "pro",
        seats: teamSize,
        monthlySpendUsd: teamSize * monthlyPerDev,
      },
    ],
  };
}

describe("compareToBenchmark", () => {
  it("returns null for an audit with zero current spend (no signal to compare)", () => {
    const input: AuditInput = {
      teamSize: 5,
      primaryUseCase: "coding",
      lines: [
        { toolId: "cursor", planId: "hobby", seats: 1, monthlySpendUsd: 0 },
      ],
    };
    const r = runAudit(input);
    expect(compareToBenchmark(input, r)).toBeNull();
  });

  it("places a frugal small team in the 'lean' position", () => {
    const input = inputAtSize(5, 25); // baseline 80/dev for 1-10 bucket; 25 is below p10 (30)
    const cmp = compareToBenchmark(input, runAudit(input));
    expect(cmp).not.toBeNull();
    expect(cmp!.position).toBe("lean");
    expect(cmp!.observedPerDevMonthly).toBe(25);
    expect(cmp!.bucket.label).toBe("1–10 people");
  });

  it("places a mid-team within the typical range when spend matches the baseline", () => {
    const input = inputAtSize(25, 160); // baseline for 11-50 bucket
    const cmp = compareToBenchmark(input, runAudit(input))!;
    expect(cmp.position).toBe("in_range");
    expect(cmp.expectedPerDevMonthly).toBe(160);
    expect(cmp.deltaPct).toBe(0);
  });

  it("flags an elevated spend at +30% above the bucket baseline", () => {
    const input = inputAtSize(25, 220); // 160 * 1.375 → 37.5% above
    const cmp = compareToBenchmark(input, runAudit(input))!;
    expect(cmp.position).toBe("elevated");
    expect(cmp.deltaPct).toBeGreaterThan(0.3);
  });

  it("flags a heavy team at p90 or above", () => {
    const input = inputAtSize(75, 400); // 51-200 bucket; p90 is 380 — observed 400 > p90
    const cmp = compareToBenchmark(input, runAudit(input))!;
    expect(cmp.position).toBe("heavy");
    expect(cmp.bucket.label).toBe("51–200 people");
  });

  it("scales the expected average down for writing-primary teams", () => {
    const coding = compareToBenchmark(
      { teamSize: 10, primaryUseCase: "coding", lines: [{ toolId: "cursor", planId: "pro", seats: 10, monthlySpendUsd: 800 }] },
      runAudit({ teamSize: 10, primaryUseCase: "coding", lines: [{ toolId: "cursor", planId: "pro", seats: 10, monthlySpendUsd: 800 }] }),
    )!;
    const writing = compareToBenchmark(
      { teamSize: 10, primaryUseCase: "writing", lines: [{ toolId: "cursor", planId: "pro", seats: 10, monthlySpendUsd: 800 }] },
      runAudit({ teamSize: 10, primaryUseCase: "writing", lines: [{ toolId: "cursor", planId: "pro", seats: 10, monthlySpendUsd: 800 }] }),
    )!;
    expect(writing.expectedPerDevMonthly).toBeLessThan(coding.expectedPerDevMonthly);
  });

  it("uses the largest bucket for enterprise team sizes (201+)", () => {
    const input = inputAtSize(500, 300);
    const cmp = compareToBenchmark(input, runAudit(input))!;
    expect(cmp.bucket.label).toBe("201+ people");
  });
});
