import { ImageResponse } from "next/og";

import { isWellFormedAuditId } from "@/lib/audit/id";
import { getPublicAudit } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { formatUsd } from "@/lib/utils";

export const alt = "Snipper — AI spend audit result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Run-time generated; OG previews need fresh data per audit.
export const dynamic = "force-dynamic";

const COLORS = {
  bg: "#fbfaf6",
  fg: "#1a1a1a",
  mutedFg: "#5a5a52",
  border: "#e3dfd2",
  accent: "#0d4f3c",
  accentFg: "#fbfaf6",
} as const;

interface ImageProps {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { id } = await params;
  const audit =
    isWellFormedAuditId(id) && isPersistenceConfigured()
      ? await getPublicAudit(id).catch(() => null)
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: COLORS.bg,
          color: COLORS.fg,
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            color: COLORS.mutedFg,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: COLORS.fg, fontFamily: "system-ui, sans-serif", letterSpacing: "-0.02em" }}>
            Snipper
          </span>
          <span>AI spend audit</span>
        </div>

        {audit ? <SavingsHero audit={audit} /> : <FallbackHero />}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: 22,
            color: COLORS.mutedFg,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <span>defensible reasoning · cited sources</span>
          <span>credex.rocks</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

function SavingsHero({
  audit,
}: {
  audit: NonNullable<Awaited<ReturnType<typeof getPublicAudit>>>;
}) {
  const { totals, isOptimal } = audit.result;
  if (isOptimal) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: COLORS.mutedFg }}>
          You&#39;re spending well
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 600,
            marginTop: 12,
            color: COLORS.fg,
          }}
        >
          Nothing obvious to cut.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            marginTop: 16,
            color: COLORS.mutedFg,
          }}
        >
          Already on the cheapest defensible plans for the use case.
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: COLORS.mutedFg }}>
        Estimated monthly savings
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          marginTop: 16,
        }}
      >
        <div style={{ fontSize: 168, fontWeight: 700, color: COLORS.accent, lineHeight: 1 }}>
          {formatUsd(totals.monthlySavingsUsd)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 48,
            color: COLORS.mutedFg,
            marginLeft: 18,
          }}
        >
          /mo
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 28, marginTop: 18, color: COLORS.mutedFg }}>
        {formatUsd(totals.annualSavingsUsd)} per year · {Math.round(totals.savingsPct)}% off the
        current {formatUsd(totals.currentMonthlyUsd)}/mo
      </div>
    </div>
  );
}

function FallbackHero() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 88,
          fontWeight: 600,
          color: COLORS.fg,
        }}
      >
        Snip overspend from your AI stack.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: COLORS.mutedFg,
          marginTop: 18,
          maxWidth: 800,
        }}
      >
        A free 60-second audit of your AI tools — plan-fit, alternatives, and
        credit discounts with sources for every number.
      </div>
    </div>
  );
}
