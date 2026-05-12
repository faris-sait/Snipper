import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import type { AuditInput, AuditResult } from "@/lib/audit/types";

import { AuditReportPdf } from "./audit-report";

interface RenderArgs {
  input: AuditInput;
  result: AuditResult;
  summary?: string | null;
  auditId?: string | null;
  shareUrl?: string | null;
  generatedAt?: string;
}

/**
 * Render an audit report to a PDF Buffer on the server. Returns null on any
 * failure — callers (e.g. the email path) fall back to sending the
 * confirmation without an attachment rather than failing the user-visible
 * flow.
 */
export async function renderAuditReportPdfBuffer(
  args: RenderArgs,
): Promise<Buffer | null> {
  try {
    return await renderToBuffer(<AuditReportPdf {...args} />);
  } catch (err) {
    console.error("[pdf] server render failed:", err);
    return null;
  }
}
