import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deletePricingOverride,
  upsertPricingOverride,
} from "@/lib/db/pricing-overrides";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { TOOLS } from "@/lib/pricing/tools";
import type { ToolId } from "@/lib/pricing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OverridesSchema = z
  .object({
    pricePerSeatMonthly: z.number().nonnegative().optional(),
    vendorPlanName: z.string().min(1).optional(),
    kind: z.enum(["free", "seat", "usage"]).optional(),
    minSeats: z.number().int().positive().optional(),
    requiresContract: z.boolean().optional(),
    allowance: z.string().optional(),
  })
  .refine(
    (o) => Object.keys(o).length > 0,
    "At least one override field is required",
  );

const UpsertSchema = z.object({
  toolId: z.string().min(1),
  planId: z.string().min(1),
  overrides: OverridesSchema,
});

const DeleteSchema = z.object({
  toolId: z.string().min(1),
  planId: z.string().min(1),
});

function isAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === expected;
}

function validateToolPlan(toolId: string, planId: string): string | null {
  if (!(toolId in TOOLS)) return `Unknown toolId: ${toolId}`;
  const tool = TOOLS[toolId as ToolId];
  if (!tool.plans.find((p) => p.id === planId)) {
    return `Unknown planId for ${toolId}: ${planId}`;
  }
  return null;
}

/**
 * POST /api/admin/pricing
 *
 * Bearer-authenticated. Upserts a per-(tool, plan) override into
 * `pricing_overrides`. Subsequent audits + detect-changes runs read TOOLS
 * overlaid with these rows. The evaluator uses this to mutate pricing during
 * E2E testing without git access.
 *
 * Body: { toolId, planId, overrides: { pricePerSeatMonthly?, vendorPlanName?,
 * kind?, minSeats?, requiresContract?, allowance? } }
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPersistenceConfigured()) {
    return NextResponse.json(
      { error: "Persistence not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const reason = validateToolPlan(parsed.data.toolId, parsed.data.planId);
  if (reason) {
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  try {
    await upsertPricingOverride({
      tool_id: parsed.data.toolId,
      plan_id: parsed.data.planId,
      overrides: parsed.data.overrides,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upsert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    toolId: parsed.data.toolId,
    planId: parsed.data.planId,
    overrides: parsed.data.overrides,
  });
}

/**
 * DELETE /api/admin/pricing
 *
 * Bearer-authenticated. Clears the override for one (tool, plan) pair. After
 * deletion, that plan reverts to the in-code TOOLS value. Used by the evaluator
 * to reset state between test runs.
 *
 * Body: { toolId, planId }
 */
export async function DELETE(req: Request): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPersistenceConfigured()) {
    return NextResponse.json(
      { error: "Persistence not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const reason = validateToolPlan(parsed.data.toolId, parsed.data.planId);
  if (reason) {
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  try {
    await deletePricingOverride(parsed.data.toolId, parsed.data.planId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    toolId: parsed.data.toolId,
    planId: parsed.data.planId,
  });
}
