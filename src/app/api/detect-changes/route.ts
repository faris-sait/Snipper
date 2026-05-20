import { NextResponse } from "next/server";

import { findAffectedAudits } from "@/lib/audit/reaudit";
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
 * Phase 3: uses the shared re-audit orchestration so the diffing, idempotency,
 * and eventual email flow all agree on what counts as "affected". Phase 5
 * wires the same helpers into consolidated email notifications.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPersistenceConfigured()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }

  const effective = await getEffectiveTools();
  const { scanned, affectedAudits } = await findAffectedAudits(effective.tools, effective.version);

  return NextResponse.json({
    scanned,
    affected: affectedAudits.length,
    pricingVersion: effective.version,
  });
}
