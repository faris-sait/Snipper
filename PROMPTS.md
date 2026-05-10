# Prompts

Full LLM prompts used in Snipper. Each prompt has a purpose, the prompt itself, and notes on what was iterated on.

## Where AI is NOT used (and why)

The brief explicitly says: "the audit math itself, hardcoded rules are correct — knowing when *not* to use AI is part of the test." Three places where I deliberately left the LLM out:

- **Pricing data** (`src/lib/pricing/tools.ts`). Every number cites a vendor URL and a verification date. An LLM would hallucinate prices that look plausible but aren't, and a finance reviewer can't audit a hallucination.
- **Recommendation rules** (`src/lib/audit/rules.ts`). Friction-weighted, deterministic, unit-tested. Replacing this with a prompt would lose all three properties.
- **Plan-health flags** (`src/lib/audit/plan-health.ts`). A small curated registry — each note is a fact a finance reviewer can verify (annual prepay rate, unpublished list price, broadly-reported rate-limit shock). LLM-authored notes would dilute that.

The summary below is the *only* place AI is used.

## Personalised audit summary (Phase 5)

**Model:** `gemini-2.5-flash` (Google Gemini 2.5 Flash) via the `@google/genai` SDK.
**Why Gemini Flash:** the task is constrained — translate ~6 numbers and a list of recommendations into one ~100-word paragraph. Flash is fast (sub-second p50), free-tier-generous (15 RPM / ~1M tokens/day at the time of writing — easily covers demo and review traffic), and on spot-checks indistinguishable from Sonnet/Haiku on this prompt shape.
**Why not Anthropic:** the brief says "Use the Anthropic API (preferred — apply for free credits if you don't have access) or any LLM." I built against Anthropic first (Claude Haiku 4.5) but the new-account auto-credit didn't post to my console balance — confirmed with a live test, the key authenticated but returned a credit-balance-too-low error. Switched to Gemini for a no-friction free-tier path that doesn't depend on credit-program approval. The brief's "any LLM" carve-out exists exactly for this case.
**Triggered by:** the `/audit/result` page after the audit renders (lazy, via `getOrGenerateSummaryAction`), and the public `/a/[id]` page on first view of a fresh audit (synchronous, server-rendered). Both paths cache the AI output to `audits.ai_summary` so subsequent views are zero-cost.
**Time budget:** 3 seconds via `Promise.race` against a timer. Past that, the timeout wins, the request is abandoned, and the templated fallback in `src/lib/ai/templated-summary.ts` is rendered. The Gemini SDK doesn't surface a first-class `AbortSignal` on `generateContent` yet, so the timer-race is the cleanest portable cap. The 3-second cap was picked so the result-page perceived-load stays acceptable even on a slow API day; if the reader is on a public share link, the same cap applies on the first view, then everyone after that hits the cache.
**Fallback:** deterministic templated paragraph built from the same audit fields. Three tiers (`material` / `modest` / `none`) matching the result-page hero. Pure, ~100 words, tested. Templated outputs are NOT cached — they're rebuildable from input + result, so caching them would just lock in the lesser version.

### System prompt

```
You are an analyst writing the executive-summary paragraph for an AI-spend audit. The audit's numbers and recommendations were produced by a deterministic rules engine — your job is to translate them into one readable paragraph that a finance-literate reader would call "obviously fair."

Constraints (all non-negotiable):
- Exactly one paragraph. Plain prose. No bullets, no headings, no markdown.
- 80–130 words.
- Use only the facts in the audit JSON. Do not invent vendors, plans, prices, or savings.
- No exclamation marks, no superlatives ("massive", "huge", "incredible"), no salesy verbs ("unlock", "supercharge", "transform").
- Match tone to the "tier" field:
  - "material" — calm, action-oriented; name the strongest single move.
  - "modest" — honest about the size; frame as hygiene, not headline savings.
  - "none" — reassuring; mention re-running after a vendor pricing change.
- Do not mention Credex by name — the audit page already has that CTA. Your job is the analytical summary, not the pitch.
- End with one sentence the reader could forward to a teammate.

Output: only the paragraph. No preamble, no closing remark, no quotation marks.
```

### User prompt

A single message with the audit projected to a small JSON payload. Example for a "material" tier audit:

```
Write the summary paragraph for this audit:

{
  "tier": "material",
  "team_size": 5,
  "use_case": "coding",
  "current_monthly_usd": 2500,
  "monthly_savings_usd": 750,
  "annual_savings_usd": 9000,
  "savings_pct": 30,
  "is_optimal": false,
  "lines": [
    {
      "tool": "Cursor",
      "current_plan": "Business",
      "seats": 4,
      "current_spend_usd": 160,
      "recommendation": "downgrade to Pro",
      "savings_usd": 80,
      "plan_health": "ok"
    },
    {
      "tool": "Claude",
      "current_plan": "Max 20x",
      "seats": 1,
      "current_spend_usd": 200,
      "recommendation": "use discounted credits",
      "savings_usd": 670,
      "plan_health": "risk"
    }
  ]
}
```

The payload is built in `src/lib/ai/prompts.ts:buildSummaryUserPrompt`. The `tier` field is computed once on our side rather than asked of the model — we already have the rule (savings ≤ 0 → "none"; isOptimal && savings > 0 → "modest"; else "material") and we want to ensure tone-matching deterministically.

### What I iterated on

**Tier-as-input vs tier-from-the-model.** First version asked the model to decide the tone from the numbers. Output drifted — a $20/mo savings sometimes got the same triumphant phrasing as a $2000/mo audit. Computing the tier server-side and passing it as a field, then explicitly pinning the tone per tier in the system prompt, fixed that without removing the model's discretion over phrasing.

**No-Credex-by-name.** Without the explicit ban, Haiku reliably ended summaries with a "consider Credex" sentence — even when the prompt didn't mention Credex at all (it's in the broader audit context the prompt builder generates from the brief). The result page already has the Credex CTA card; an analytical summary that pitches a vendor reads as biased, which is the opposite of "obviously fair." Made the ban explicit in the system prompt rather than try to filter it out post-hoc.

**Word band, not a target.** Asked first for "approximately 100 words." Got responses ranging from 60 to 180. Switching to "80–130 words" with the explicit numeric band tightened it. The templated fallback also targets the same band so the two paths feel consistent.

**Why no JSON-schema response constraint.** Gemini supports a `responseSchema` config, but the output is one paragraph of prose, not structured data. A schema would force the model into a wrapper object, parsed back to a string, with zero guarantee on the prose quality inside. Plain text + the constraint list in the system prompt is the right tool here.

**Why no extended thinking.** Gemini 2.5 Flash supports thinking mode, but the task is short translation, not multi-step reasoning. Thinking would add latency without a quality bump on a 100-word output. Thinking is off (default).

**Anthropic → Gemini swap.** Originally built against Claude Haiku 4.5 with the `@anthropic-ai/sdk`. The provider swap was 30 lines of code (the `generateSummary` body) plus this docs paragraph — system prompt, user prompt, payload shape, 3s budget, templated fallback, and cache strategy all stayed identical. That portability is the upside of computing the `tier` on our side and keeping the prompt provider-agnostic: switching models is a one-file edit, not a redesign.
