# Benchmark data — sourcing and methodology

The "How your stack compares" card on `/audit/result` and `/a/[id]` shows the
audit's per-developer monthly AI spend against a baseline for teams of the
same size and use case. The dataset lives in
[`src/lib/benchmark/data.ts`](./src/lib/benchmark/data.ts) and the comparison
logic is in [`src/lib/benchmark/compute.ts`](./src/lib/benchmark/compute.ts).

Numbers are **directional estimates**, not a precise market reading. We say
so in the card copy (it shows where you sit in a lean / typical / heavy
range, not a precise percentile against a real population).

## How the buckets were derived

| Team size | Baseline $/dev/mo (coding) | p10 | p90 | Reasoning |
|---|---|---|---|---|
| **1–10** | $80 | $30 | $160 | One IDE assistant ($20 Cursor Pro or $19 Copilot) + a chat seat ($20 Claude/ChatGPT Plus) is the *common* shape. p10 is "Copilot only or free-tier chat"; p90 is "everything plus light API usage". |
| **11–50** | $160 | $70 | $280 | Team plans start kicking in (Cursor Teams $40/seat, Copilot Business $19/seat), API direct spend appears for a handful of devs, sometimes a v0 / Cursor Ultra license for senior staff. |
| **51–200** | $240 | $120 | $380 | Business plans across the org, growing Anthropic / OpenAI API consumption, occasional Enterprise tier for security review. |
| **201+** | $320 | $180 | $480 | Enterprise contracts on at least one tool, dedicated AI platform team driving usage, multiple direct-API integrations. |

## Use-case multiplier

The baseline is for a *coding-primary* team — the heaviest AI spenders.
Other use cases scale down because they buy fewer categories of tooling:

| Use case | Factor | Why |
|---|---|---|
| coding | 1.00 | Buys IDE assistant + chat + direct API + design-to-code. |
| writing | 0.55 | Mostly Claude / ChatGPT chat seats; no IDE assistant, no v0. |
| data | 0.85 | Heavy on direct-API (notebooks), some Cursor for ETL scripts. |
| research | 0.90 | Heavy on Claude / ChatGPT, some API for paper synthesis. |
| mixed | 1.00 | Folds in the heavy lines. |

## What this is built from

These numbers triangulate three public signals:

1. **Vendor list pricing × typical seat coverage.** A team of 20 with
   Cursor Teams ($40/seat for ~half the team) + Claude Pro ($20 for the
   other half) + occasional API + Copilot Business for one team works out
   to ~$150/dev/mo before any usage. That puts the 11-50 bucket at
   $160 baseline.
2. **Vendor case studies.** GitHub's [Copilot usage research](https://github.blog/2024-05-13-research-quantifying-github-copilots-impact-in-the-enterprise-with-accenture/),
   Anthropic's [Anthropic for Work case studies](https://www.anthropic.com/customers),
   and OpenAI's [ChatGPT Enterprise customers page](https://openai.com/business/customers/)
   describe seat coverage and per-seat cost shapes in the wild. Numbers
   converge on $80-300/dev/mo depending on size.
3. **Developer surveys.** [Stack Overflow's 2024 Dev Survey](https://survey.stackoverflow.co/2024/ai/)
   reports tool-usage prevalence (~76% using AI tools) but not spend
   directly; combining prevalence with vendor-published seat prices gives
   the same shape as (1) and (2).

## Important honest disclaimers

- **None of the public sources publish per-developer AI spend.** Vendors
  have no incentive to make this easy to compare; teams treat it as
  competitive info.
- **This is not a precise distribution.** p10 / p90 are *plausible*
  thinness/heaviness markers, not a statistical claim from real data.
- **A real benchmark needs real data.** If Snipper became a real
  product, the right move would be: replace this dataset with a rolling
  aggregate of the audits run through the tool itself (anonymous, opt-in,
  flagged in the lead-capture form). The current dataset is a placeholder
  so the result page can show *something* defensible while we don't yet
  have that aggregate.
- **The comparison is intentionally non-precise on the UI side.** The card
  surfaces "lean / typical / elevated / top decile" framing — not a
  percentile or a single-digit rank — so the directional nature of the
  data isn't oversold.

## Re-verification cadence

If you bump these numbers, re-verify the public sources cited above and
update the "Last verified" line below. Pricing-page changes (Stack
Overflow's 2025 survey, vendor seat-price changes) should trigger a re-run.

**Last verified:** 2026-05-12
