# Prompts

Full LLM prompts used in Snipper. Each prompt has a purpose, the prompt itself, and notes on what was iterated on.

> The Phase-5 personalised summary prompt lands here when the AI summary feature ships. The placeholder below is a stub.

## Where AI is NOT used (and why)

The brief explicitly says: "the audit math itself, hardcoded rules are correct — knowing when *not* to use AI is part of the test." Three places where I deliberately left the LLM out:

- **Pricing data** (`src/lib/pricing/tools.ts`). Every number cites a vendor URL and a verification date. An LLM would hallucinate prices that look plausible but aren't, and a finance reviewer can't audit a hallucination.
- **Recommendation rules** (`src/lib/audit/rules.ts`). Friction-weighted, deterministic, unit-tested. Replacing this with a prompt would lose all three properties.
- **Plan-health flags** (`src/lib/audit/plan-health.ts`). A small curated registry — each note is a fact a finance reviewer can verify (annual prepay rate, unpublished list price, broadly-reported rate-limit shock). LLM-authored notes would dilute that.

The summary below is the *only* place AI is used.

## Personalised audit summary (Phase 5)

**Model:** Claude Haiku 4.5 (fast, cheap, sufficient for a 100-word summary).
**Triggered by:** the result page, after the audit has been computed and persisted.
**Fallback:** templated string built from the same audit fields, served if the API call errors or exceeds 3 seconds.

**Prompt:** _to be added in Phase 5._

**What I iterated on:** _to be filled in._
