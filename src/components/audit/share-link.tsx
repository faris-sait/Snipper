"use client";

import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareLinkProps {
  auditId: string;
  className?: string;
  /**
   * When true, the copied URL carries `?via=<auditId>` so the referrer
   * can be credited if the recipient runs their own audit. See
   * [REFERRALS.md](../../../REFERRALS.md).
   */
  asReferral?: boolean;
}

/**
 * Public share affordance — surfaced only when the audit was persisted (the
 * caller passes `auditId`). Builds the URL on the client so we don't need
 * NEXT_PUBLIC_SITE_URL at render time, which keeps the deployment portable.
 */
export function ShareLink({ auditId, className, asReferral = false }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const base =
    typeof window !== "undefined" ? `${window.location.origin}/a/${auditId}` : `/a/${auditId}`;
  const url = asReferral ? `${base}?via=${auditId}` : base;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard fails outside secure contexts; surface a sensible
      // fallback by selecting the text in the displayed input instead.
      const input = document.getElementById(`share-${auditId}`) as HTMLInputElement | null;
      input?.select();
    }
  };

  return (
    <div
      className={cn(
        "border-border/60 bg-card/60 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <LinkIcon className="text-muted-fg h-4 w-4 shrink-0" aria-hidden />
        <input
          id={`share-${auditId}`}
          readOnly
          value={url}
          aria-label="Public share link"
          className="text-muted-fg w-full min-w-0 truncate bg-transparent font-mono text-xs outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onCopy}
        className="sm:shrink-0"
        aria-label={copied ? "Link copied" : "Copy share link"}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copy link
          </>
        )}
      </Button>
    </div>
  );
}
