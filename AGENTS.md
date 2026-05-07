<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Snipper — agent / contributor notes

This repo is the Round-1 take-home for [credex.rocks](https://credex.rocks). It's a free AI spend audit tool — see [`README.md`](./README.md) for the user-facing summary.

## Architecture in one paragraph

The audit engine in `src/lib/audit/` is a pure function. It consumes an `AuditInput` (list of spend lines + team size + use case), runs each spend line through every rule in `rules.ts`, and ranks candidate recommendations by friction-adjusted savings (see `FRICTION_WEIGHT`). Pricing data lives in `src/lib/pricing/tools.ts` and is mirrored row-for-row in `PRICING_DATA.md` — every number cites a vendor URL and a verification date. The Next.js app layer (`src/app/`) is a thin wrapper: server actions call `runAudit()`, persist to Supabase, and render results.

## Conventions

- **Pure engine.** Nothing in `src/lib/audit/` may read `process.env`, `Date.now()`, network, or storage. Tests rely on this.
- **Pricing changes are paired commits.** If you change a price in `tools.ts`, update the matching row in `PRICING_DATA.md` in the same commit, including the new verification date.
- **Never recommend dropping to a free plan or to a `requiresContract: true` plan.** The rule pipeline is calibrated against this — preserve the invariant.
- **Trust user-reported spend.** A line's baseline is `monthlySpendUsd` from the form, not `seats × pricePerSeatMonthly`. Users have annual discounts, grandfathered rates, etc.

## When in doubt

Read `DEVLOG.md` — every non-obvious decision has a paragraph explaining why. If you're about to undo a friction-weighting or rule guardrail, that's where the test that broke and the fix that landed are documented.
