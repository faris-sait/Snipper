import { NextResponse } from "next/server";

import { generateSummary } from "@/lib/ai/summary";
import { isWellFormedAuditId } from "@/lib/audit/id";
import type { AuditInput } from "@/lib/audit/types";
import { getPublicAudit, setAuditSummary } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { renderAuditReportPdfBuffer } from "@/lib/pdf/render";

// @react-pdf/renderer relies on Node APIs (Buffer, font caches, streams) that
// aren't available on the Edge runtime.
export const runtime = "nodejs";

// The audit row exists at request time; we don't want the static optimiser to
// try to prerender this route at build.
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!isWellFormedAuditId(id)) {
    return NextResponse.json({ error: "Invalid audit id" }, { status: 400 });
  }
  if (!isPersistenceConfigured()) {
    return NextResponse.json(
      { error: "PDF export requires a persisted audit." },
      { status: 503 },
    );
  }

  const audit = await getPublicAudit(id).catch(() => null);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const input = audit.input as unknown as AuditInput;

  // Backfill the AI summary on cold cache so the downloaded PDF carries the
  // same paragraph the user reads on the share page.
  let summary = audit.ai_summary;
  if (!summary) {
    const gen = await generateSummary(input, audit.result);
    summary = gen.text;
    if (gen.source === "ai") {
      await setAuditSummary(id, gen.text).catch(() => {});
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const shareUrl = `${siteUrl}/a/${id}`;
  const generatedAt = new Date(audit.created_at).toISOString().slice(0, 10);

  const pdf = await renderAuditReportPdfBuffer({
    input,
    result: audit.result,
    summary,
    auditId: id,
    shareUrl,
    generatedAt,
  });
  if (!pdf) {
    return NextResponse.json(
      { error: "Failed to render PDF." },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="snipper-audit-${id}.pdf"`,
      // The audit row is immutable; summary backfill only changes the first
      // response. A short cache window absorbs reloads without staleness.
      "Cache-Control": "public, max-age=600, must-revalidate",
    },
  });
}
