import { NextResponse } from "next/server";

import { runAudit } from "@/lib/audit/engine";
import { listAuditsWithSnapshot } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { getEffectiveTools } from "@/lib/pricing/effective";

// Reads pricing_overrides + audits from Supabase and runs the engine — Node
// runtime keeps this consistent with the rest of the server-action surface.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/detect-changes
 *
 * Bearer-authenticated. Re-runs the audit engine for every stored audit that
 * has a captured pricing_snapshot, against the current effective tools (TOOLS
 * overlaid with pricing_overrides). Returns a count of audits whose total
 * recommendation math would now differ.
 *
 * Phase 1: returns only counts. Phase 5 wires this into consolidated email
 * notifications + the reaudit_notifications idempotency log.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPersistenceConfigured()) {
    return NextResponse.json(
      { error: "Persistence not configured" },
      { status: 503 },
    );
  }

  const effective = await getEffectiveTools();
  const audits = await listAuditsWithSnapshot();

  let affected = 0;
  for (const audit of audits) {
    const newResult = runAudit(audit.input, undefined, effective.tools);
    if (
      Math.abs(newResult.totals.monthlySavingsUsd - audit.result.totals.monthlySavingsUsd) >
      1
    ) {
      affected++;
      continue;
    }
    // Catch line-level recommendation changes that don't move the total — e.g.
    // a swap target changes but the projected spend stays equal.
    const changed = newResult.results.some((nr, i) => {
      const or = audit.result.results[i];
      if (!or) return true;
      return (
        nr.recommendation.kind !== or.recommendation.kind ||
        nr.recommendation.toToolId !== or.recommendation.toToolId ||
        nr.recommendation.toPlanId !== or.recommendation.toPlanId
      );
    });
    if (changed) affected++;
  }

  return NextResponse.json({
    scanned: audits.length,
    affected,
    pricingVersion: effective.version,
  });
}
