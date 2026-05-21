import type { Metadata } from "next";

import { SiteLogo } from "@/components/site-logo";
import { listRecentPricingOverrides } from "@/lib/db/pricing-overrides";
import { resolveOverrideRow } from "@/lib/pricing/change-history";
import { TOOLS } from "@/lib/pricing/tools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "What changed this week",
  description:
    "A rolling 7-day feed of every pricing change applied to the Snipper audit engine, sourced directly from pricing_overrides.",
};

const WINDOW_DAYS = 7;

export default async function ChangesPage() {
  const rawRows = await safelyListRecentOverrides();
  const rows = rawRows.map((row) =>
    resolveOverrideRow({
      toolId: row.tool_id,
      planId: row.plan_id,
      overrides: row.overrides,
      updatedAt: row.updated_at,
      tools: TOOLS,
    }),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10">
        <SiteLogo size="sm" />
        <h1 className="balance mt-4 text-4xl font-medium tracking-tight md:text-5xl">
          What changed this week.
        </h1>
        <p className="text-muted-fg pretty mt-3 max-w-xl text-base leading-relaxed">
          Every vendor-pricing change applied to the Snipper audit engine in the
          last {WINDOW_DAYS} days. Sourced directly from <code>pricing_overrides</code>,
          newest first.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted-fg border-border/60 bg-card/50 rounded-md border px-4 py-6 text-sm">
          No pricing changes in the last {WINDOW_DAYS} days. The in-code{" "}
          <code>TOOLS</code> registry is the source of truth right now — see{" "}
          <a className="underline-offset-4 hover:underline" href="/pricing-sources">
            pricing sources
          </a>{" "}
          for the verified baselines.
        </p>
      ) : (
        <ol role="list" className="space-y-6">
          {rows.map((row) => (
            <li
              key={`${row.toolId}:${row.planId}:${row.updatedAt}`}
              className="border-border/60 bg-card/50 rounded-md border px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-lg font-medium tracking-tight">
                  {row.toolDisplayName}{" "}
                  <span className="text-muted-fg font-normal">
                    · {row.planName}
                  </span>
                </h2>
                <time
                  dateTime={row.updatedAt}
                  className="text-muted-fg font-mono text-[11px] tracking-tight uppercase"
                >
                  {formatTimestamp(row.updatedAt)}
                </time>
              </div>

              {row.orphaned ? (
                <p className="text-muted-fg mt-2 text-sm">
                  Override targets <code>{row.toolId}</code> /{" "}
                  <code>{row.planId}</code>, which is no longer in the in-code
                  registry.
                </p>
              ) : row.changes.length === 0 ? (
                <p className="text-muted-fg mt-2 text-sm">
                  Override touched, but no values diverge from the in-code
                  baseline.
                </p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {row.changes.map((change) => (
                    <li
                      key={change.field}
                      className="text-fg font-mono text-xs tracking-tight"
                    >
                      <span className="text-muted-fg">{change.label}:</span>{" "}
                      <span className="text-muted-fg line-through">
                        {change.was}
                      </span>{" "}
                      → <span>{change.now}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-muted-fg mt-12 font-mono text-xs">
        Pricing changes are applied by an operator via{" "}
        <code>POST /api/admin/pricing</code>. Affected audits are re-scored and
        owners are emailed via <code>POST /api/detect-changes</code>.
      </p>
    </main>
  );
}

async function safelyListRecentOverrides() {
  try {
    return await listRecentPricingOverrides(WINDOW_DAYS);
  } catch (error) {
    console.error("[changes] failed to list overrides:", error);
    return [];
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
}
