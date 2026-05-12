"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { AuditInput, AuditResult } from "@/lib/audit/types";

interface Props {
  input: AuditInput;
  result: AuditResult;
  summary?: string | null;
  auditId?: string | null;
  shareUrl?: string | null;
  /** ISO date — passed through so server-rendered share pages can pin the audit date. */
  generatedAt?: string;
}

export function PdfDownloadButton(props: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setBusy(true);
    try {
      // Lazy-load both the renderer and our document component so the @react-pdf
      // bundle (~600 KB) is only paid by users who actually click Download.
      const [{ pdf }, { AuditReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/audit-report"),
      ]);
      const blob = await pdf(<AuditReportPdf {...props} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = props.auditId
        ? `snipper-audit-${props.auditId}.pdf`
        : "snipper-audit.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't build PDF. Try again or use Print → Save as PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="md"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
      >
        <Download className="h-4 w-4" aria-hidden />
        {busy ? "Preparing PDF…" : "Download PDF"}
      </Button>
      {error ? (
        <p role="alert" className="text-warning text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
