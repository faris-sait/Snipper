import Link from "next/link";

/**
 * Surfaced on `/a/[id]?via=<referrerAuditId>` to acknowledge a referral
 * and pitch the recipient on running their own audit (carrying the `via`
 * forward so attribution survives the click). The "perk" lives in the
 * Credex relationship — Snipper itself is free, so the loop is pinned
 * upstream.
 */
export function ReferralBanner({ via }: { via: string }) {
  return (
    <div className="border-accent/40 bg-accent/5 mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">
          Referred by a Snipper user
        </p>
        <p className="text-fg mt-1 text-sm leading-relaxed">
          Run your own audit — if either of you clears $500/mo in savings,
          Credex prioritises both sides of the referral. See{" "}
          <Link href="/" className="underline underline-offset-4">
            how it works
          </Link>
          .
        </p>
      </div>
      <Link
        href={`/audit?via=${encodeURIComponent(via)}`}
        className="bg-accent text-accent-fg inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-medium tracking-tight"
      >
        Audit my stack
      </Link>
    </div>
  );
}
