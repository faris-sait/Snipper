import {
  Document,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { USE_CASE_PHRASES } from "@/lib/audit/schema";
import type { AuditInput, AuditResult } from "@/lib/audit/types";
import {
  SNIPPER_ACCENT,
  SNIPPER_LOGO_PATH,
  SNIPPER_LOGO_VIEWBOX,
} from "@/lib/brand";
import { TOOLS } from "@/lib/pricing/tools";
import { formatUsd } from "@/lib/utils";

const TIER_LABEL = {
  none: "You're spending well",
  modest: "Modest savings",
  material: "Estimated monthly savings",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingHorizontal: 48,
    paddingBottom: 64,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e3dfd2",
  },
  headerRight: { alignItems: "flex-end" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8, color: "#5a5a52" },
  heroLabel: {
    fontSize: 8,
    color: "#5a5a52",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroNumber: {
    fontSize: 28,
    color: "#0d4f3c",
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
  },
  heroNumberMuted: {
    fontSize: 24,
    color: "#1a1a1a",
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
  },
  heroSub: { fontSize: 10, color: "#5a5a52", marginTop: 6 },
  credexBanner: {
    backgroundColor: "#0d4f3c",
    color: "#fbfaf6",
    padding: 12,
    borderRadius: 4,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  credexLabel: {
    fontSize: 7,
    color: "#fbfaf6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.85,
  },
  credexCopy: {
    fontSize: 11,
    color: "#fbfaf6",
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
  },
  credexLink: {
    fontSize: 9,
    color: "#fbfaf6",
    textDecoration: "underline",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 22,
    marginBottom: 8,
  },
  paragraph: { fontSize: 10, lineHeight: 1.55 },
  flagLine: {
    fontSize: 8,
    color: "#5a5a52",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 12,
  },
  row: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#e3dfd2",
    paddingVertical: 12,
  },
  rowInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rowMain: { flex: 1, paddingRight: 16 },
  rowTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  rowSub: { fontSize: 9, color: "#5a5a52", marginTop: 2 },
  rowAction: { fontSize: 10, marginTop: 6, lineHeight: 1.45 },
  rowReason: {
    fontSize: 9,
    color: "#3a3a36",
    marginTop: 4,
    lineHeight: 1.45,
  },
  rowFlag: { fontSize: 8, color: "#5a5a52", marginTop: 5 },
  source: {
    fontSize: 8,
    color: "#5a5a52",
    textDecoration: "underline",
    marginTop: 6,
  },
  rowSide: { minWidth: 90, alignItems: "flex-end" },
  rowSavings: {
    fontSize: 12,
    color: "#0d4f3c",
    fontFamily: "Helvetica-Bold",
  },
  rowSavingsZero: {
    fontSize: 12,
    color: "#5a5a52",
    fontFamily: "Helvetica-Bold",
  },
  rowConfidence: { fontSize: 8, color: "#5a5a52", marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e3dfd2",
    fontSize: 8,
    color: "#5a5a52",
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
});

interface Props {
  input: AuditInput;
  result: AuditResult;
  summary?: string | null;
  auditId?: string | null;
  shareUrl?: string | null;
  /** ISO date for the report header; defaults to today. */
  generatedAt?: string;
}

export function AuditReportPdf({
  input,
  result,
  summary,
  auditId,
  shareUrl,
  generatedAt,
}: Props) {
  const tier: "none" | "modest" | "material" =
    result.totals.monthlySavingsUsd <= 0
      ? "none"
      : result.isOptimal
        ? "modest"
        : "material";
  const date = generatedAt ?? new Date().toISOString().slice(0, 10);

  return (
    <Document
      title={`Snipper AI spend audit · ${date}`}
      author="Snipper"
      creator="Snipper"
      producer="Snipper"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Svg width={28} height={28} viewBox={SNIPPER_LOGO_VIEWBOX}>
              <Path
                d={SNIPPER_LOGO_PATH}
                fill={SNIPPER_ACCENT}
                fillRule="evenodd"
              />
            </Svg>
            <View>
              <Text style={styles.brand}>Snipper</Text>
              <Text style={styles.meta}>
                AI spend audit · for a {USE_CASE_PHRASES[input.primaryUseCase]} team of{" "}
                {input.teamSize}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.meta}>{date}</Text>
            {auditId ? <Text style={styles.meta}>id · {auditId}</Text> : null}
          </View>
        </View>

        <Text style={styles.heroLabel}>{TIER_LABEL[tier]}</Text>
        {tier === "none" ? (
          <>
            <Text style={styles.heroNumberMuted}>Nothing obvious to cut.</Text>
            <Text style={styles.heroSub}>
              Already on the cheapest defensible plans for a{" "}
              {USE_CASE_PHRASES[input.primaryUseCase]} team.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.heroNumber}>
              {formatUsd(result.totals.monthlySavingsUsd)}
              <Text style={{ fontSize: 14, color: "#5a5a52" }}> /mo</Text>
            </Text>
            <Text style={styles.heroSub}>
              {formatUsd(result.totals.annualSavingsUsd)} per year · across{" "}
              {result.results.length} tool
              {result.results.length === 1 ? "" : "s"}
              {tier === "material"
                ? ` · ${result.totals.savingsPct.toFixed(0)}% off the current ${formatUsd(result.totals.currentMonthlyUsd)}/mo`
                : " — small but real wins on the per-tool list below"}
            </Text>
          </>
        )}

        {result.surfaceCredex ? (
          <View style={styles.credexBanner}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.credexLabel}>Highest-leverage move</Text>
              <Text style={styles.credexCopy}>
                Credex sources discounted credits for{" "}
                {formatUsd(result.totals.monthlySavingsUsd)}/mo of this spend.
              </Text>
            </View>
            <Link src="https://credex.rocks" style={styles.credexLink}>
              credex.rocks
            </Link>
          </View>
        ) : null}

        {summary ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.paragraph}>{summary}</Text>
          </>
        ) : null}

        {(() => {
          const flagText = summariseFlags(result);
          return flagText ? <Text style={styles.flagLine}>{flagText}</Text> : null;
        })()}

        <Text style={styles.sectionTitle}>Per-tool breakdown</Text>
        {result.results.map((r, i) => {
          const tool = TOOLS[r.line.toolId];
          const currentPlan = tool?.plans.find((p) => p.id === r.line.planId);
          const recTool = r.recommendation.toToolId
            ? TOOLS[r.recommendation.toToolId]
            : null;
          const recPlan = recTool?.plans.find(
            (p) => p.id === r.recommendation.toPlanId,
          );

          const title = `${tool?.displayName ?? r.line.toolId} · ${currentPlan?.vendorPlanName ?? r.line.planId}`;
          const subBits = [
            `${r.line.seats} seat${r.line.seats === 1 ? "" : "s"}`,
            `${formatUsd(r.line.monthlySpendUsd)}/mo today`,
          ];

          const action = recommendationLine({
            kind: r.recommendation.kind,
            toolDisplayName: tool?.displayName,
            recToolDisplayName: recTool?.displayName,
            recPlanName: recPlan?.vendorPlanName,
          });

          const monthly = r.recommendation.monthlySavingsUsd;
          const sourceUrl = recPlan?.sourceUrl ?? currentPlan?.sourceUrl;
          const sourceLabel = recPlan
            ? `${recTool?.displayName} pricing`
            : currentPlan
              ? `${tool?.displayName} pricing`
              : null;

          return (
            <View key={`${r.line.toolId}-${i}`} style={styles.row} wrap={false}>
              <View style={styles.rowInner}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  <Text style={styles.rowSub}>{subBits.join(" · ")}</Text>
                  <Text style={styles.rowAction}>{action}</Text>
                  <Text style={styles.rowReason}>{r.recommendation.reason}</Text>
                  {r.planHealth.status !== "ok" && r.planHealth.note ? (
                    <Text style={styles.rowFlag}>
                      {r.planHealth.status === "risk" ? "Risk · " : "Watch · "}
                      {r.planHealth.note}
                    </Text>
                  ) : null}
                  {sourceUrl && sourceLabel ? (
                    <Link src={sourceUrl} style={styles.source}>
                      Source · {sourceLabel}
                    </Link>
                  ) : null}
                </View>
                <View style={styles.rowSide}>
                  <Text
                    style={
                      monthly > 0 ? styles.rowSavings : styles.rowSavingsZero
                    }
                  >
                    {monthly > 0 ? `${formatUsd(monthly)}/mo` : "—"}
                  </Text>
                  <Text style={styles.rowConfidence}>
                    {confidenceLabel(r.recommendation.confidence)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text>Generated by Snipper · every number cites a vendor source.</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
          {shareUrl ? (
            <Link src={shareUrl} style={{ ...styles.source, marginTop: 4 }}>
              {shareUrl}
            </Link>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

function confidenceLabel(c: "high" | "medium" | "low"): string {
  if (c === "high") return "high confidence";
  if (c === "medium") return "medium confidence";
  return "low confidence";
}

function recommendationLine(args: {
  kind: AuditResult["results"][number]["recommendation"]["kind"];
  toolDisplayName?: string;
  recToolDisplayName?: string;
  recPlanName?: string;
}): string {
  const { kind, toolDisplayName, recToolDisplayName, recPlanName } = args;
  switch (kind) {
    case "optimal":
      return "Already a fit — no change recommended.";
    case "downgrade_plan":
      return recPlanName
        ? `Downgrade to ${toolDisplayName ?? ""} ${recPlanName}.`.trim()
        : "Downgrade to a smaller plan on the same vendor.";
    case "switch_tool":
      return recToolDisplayName && recPlanName
        ? `Switch to ${recToolDisplayName} ${recPlanName}.`
        : "Switch to a cheaper tool for this use case.";
    case "use_credex":
      return "Source equivalent usage through Credex at a discount.";
    case "consolidate":
      return "Consolidate with another tool already in your stack.";
    default:
      return "";
  }
}

function summariseFlags(result: AuditResult): string | null {
  let risk = 0;
  let watch = 0;
  for (const r of result.results) {
    if (r.planHealth.status === "risk") risk += 1;
    else if (r.planHealth.status === "watch") watch += 1;
  }
  if (risk === 0 && watch === 0) return null;
  const parts: string[] = [];
  if (risk > 0)
    parts.push(`${risk} plan${risk === 1 ? "" : "s"} flagged as risk`);
  if (watch > 0) parts.push(`${watch} to watch`);
  return parts.join(" · ");
}
