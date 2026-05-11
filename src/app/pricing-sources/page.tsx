import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { SiteLogo } from "@/components/site-logo";
import { ALL_TOOLS } from "@/lib/pricing/tools";
import type { Plan } from "@/lib/pricing/types";
import { formatUsd } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing sources",
  description:
    "Every monetary value in a Snipper audit traces to a vendor pricing page. This is the index — vendor URLs and verification dates for each plan we score.",
};

export default function PricingSourcesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10">
        <SiteLogo size="sm" />
        <h1 className="balance mt-4 text-4xl font-medium tracking-tight md:text-5xl">
          Pricing sources.
        </h1>
        <p className="text-muted-fg pretty mt-3 max-w-xl text-base leading-relaxed">
          Every dollar in a Snipper recommendation traces back to a vendor
          pricing page. Below is the registry the audit engine reads — one
          source URL and verification date per plan.
        </p>
      </header>

      <ol role="list" className="space-y-10">
        {ALL_TOOLS.map((tool) => (
          <li key={tool.id} className="border-border/60 border-t pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-xl font-medium tracking-tight">
                {tool.displayName}
              </h2>
              <a
                href={tool.plans[0]?.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-fg hover:text-fg inline-flex items-center gap-1 font-mono text-xs tracking-tight transition-colors"
              >
                {hostname(tool.plans[0]?.sourceUrl)}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
            <p className="text-muted-fg mt-1 font-mono text-[11px] tracking-tight uppercase">
              {tool.vendor} · {tool.category.replace(/_/g, " ")}
            </p>
            <ul className="mt-4 space-y-2">
              {tool.plans.map((p) => (
                <li
                  key={p.id}
                  className="border-border/60 bg-card/50 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{p.vendorPlanName}</p>
                    <p className="text-muted-fg text-xs">{describePlan(p)}</p>
                  </div>
                  <p className="text-muted-fg font-mono text-[11px] tracking-tight">
                    verified {p.verifiedDate}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="text-muted-fg mt-12 font-mono text-xs">
        For the long-form notes (rebrandings, hidden tiers, contract caveats),
        see <code>PRICING_DATA.md</code> in the repository.
      </p>
    </main>
  );
}

function describePlan(p: Plan): string {
  const parts: string[] = [];
  if (p.kind === "free") {
    parts.push("Free");
  } else if (p.kind === "usage") {
    parts.push("Usage-priced");
  } else {
    parts.push(`${formatUsd(p.pricePerSeatMonthly)}/seat/mo`);
  }
  if (p.minSeats && p.minSeats > 1) parts.push(`min ${p.minSeats} seats`);
  if (p.requiresContract) parts.push("contract only");
  if (p.allowance) parts.push(p.allowance);
  return parts.join(" · ");
}

function hostname(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
