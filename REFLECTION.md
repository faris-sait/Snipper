# Reflection

Five questions, written end-of-Day-4 with a final pass scheduled for Day 7 once deploy + Lighthouse + final polish are locked. Some answers (Q1's hardest bug, Q5's ratings) may shift if Day 5–7 surfaces something worse or better — I'll mark any post-Day-7 edits inline rather than rewriting the whole thing.

## 1. The hardest bug I hit this week, and how I debugged it

The Gemini 2.5 Flash personalised summary kept returning paragraphs that truncated mid-sentence. First QA pass: a "material" tier audit ended with *"…material opportunity to optimize"* — clean cut, no error, no exception. The templated fallback didn't fire because the response wasn't empty; it was just incomplete.

Hypotheses, in the order I tested them:

1. **Prompt was malformed.** Reproduced the exact request via raw `curl` against the Gemini API. Same truncation. Ruled out my prompt builder and the SDK's request shape.
2. **`maxOutputTokens: 400` was too low for a 130-word reply.** Math: 130 words ≈ 170 tokens at the conservative end. 400 should fit with comfortable headroom. Bumped to 800 anyway as a control. Same truncation. Ruled out.
3. **My own `Promise.race` 3-second timer was killing the request before it finished writing.** Logged round-trip latency — response came back in ~900 ms, well inside the 3 s budget. Ruled out.
4. **Gemini 2.5 Flash defaults to thinking ON, and thinking tokens count against `maxOutputTokens`.** Confirmed by reading the `@google/genai` SDK source and the model card. Thinking was eating ~250 of the 400-token budget *before the model wrote a single visible word*.

Fix: `thinkingConfig: { thinkingBudget: 0 }` at `src/lib/ai/summary.ts:71`. The task is short translation, not multi-step reasoning — thinking added latency without quality gain. After the fix, the same audit produced a complete 118-word paragraph in ~700 ms.

The lesson: read the SDK, not just the API docs. The Gemini reference page didn't surface the thinking-counts-against-output-budget interaction; the SDK's TypeScript definitions did, in the `thinkingConfig` field's JSDoc. The docs page would have lied silently.

## 2. A decision I reversed mid-week

**Benchmark mode → PlanLadder.** The brief lists "Benchmark mode" — *your AI spend per developer is $X, companies your size average $Y* — as a bonus item. I started Phase 3 planning to build it. Vineeth's interview blew that up: he said founders distrust peer benchmarks they can't verify. *"We're stealth, who are you comparing me to?"* The data source for any benchmark would necessarily be a small sample of self-reported spends; defending it to a finance reviewer is hard, defending it to a stealth-mode founder is impossible.

Pivoted to a **PlanLadder** — a per-line component that projects every plan in the vendor's ladder at the user's seat count, built entirely from data already in the registry. Same job (helps the user contextualise their spend), defensible inputs (every number traces to a published vendor pricing page, dated in `PRICING_DATA.md`), zero new sources to maintain. Lives at `src/components/audit/plan-ladder.tsx`.

What made me reverse it: a single line from a single user, but the line was specific enough — *"who are you comparing me to?"* — that the failure mode was concrete. Benchmark mode would have shipped, looked impressive in screenshots, and broken the *"obviously fair to a finance reviewer"* north star the engine is calibrated against. PlanLadder ships with the same surface area and zero defensibility risk.

A second reversal worth naming: **Anthropic → Gemini** for the in-product summary, on Day 4. Forced by the Anthropic new-account credit not posting to my console balance. The reversal was bearable only because the prompt was provider-agnostic *by design* — `tier` is computed server-side rather than asked of the model, the prompt is plain text with no schema dependency, the swap was 30 lines of code. That portability was an accidental upside of an earlier architectural decision (computing tone server-side rather than letting the model infer it from numbers).

## 3. What I'd build in week 2 if I had it

Three priorities, in order, all interview-driven:

1. **Bill-projection mode** — Murali's pain. The audit answers *"should I switch?"* but not *"what will I spend next month?"* For agent-mode-dominant plans (Anthropic API direct, OpenAI API direct, Cursor in agent mode), token consumption is wildly variable run-to-run. Build a confidence-banded forecast: pull the last 30 days of usage, compute mean ± 1.5σ, surface alongside the audit. Leverages the existing plan-health `agent_usage_volatility` flag, doesn't require new pricing data.

2. **Aggregator/bundle vendor support** — Sahejad's pain. Add Freepik AI Suite, OpenRouter, Together AI, and Poe to the pricing registry with `aggregator: true`. The rules engine treats them as opaque-by-design (no single-vendor downgrade recommendations against bundled totals) and surfaces the bundle's component vendors so the user can verify what's covered. Trust the user-reported spend per the existing convention.

3. **Engineer-handoff on the share page** — three-for-three from interviews. The buyer running the audit is *systematically* not the picker. Make the share-link forwarding affordance first-class: pre-filled email body, copy-link microcopy, Slack-friendly OG card with the per-tool list rendered as a preview thumbnail.

After those, the brief's bonus list catches up: PDF export (real value, low risk), embeddable widget (high blogpost-distribution value), referral codes (only after the funnel has volume worth amplifying).

What I'd *not* build: a benchmark dashboard (see Q2), a pricing-change-tracker that emails when vendors raise prices (Plan Health already covers the highest-signal cases), or a Chrome extension. Each was tempting at some point this week; each fails the *"defensible to a finance reviewer"* test or splits attention from the audit's core value.

## 4. How I used AI tools this week

**Claude Code (Opus 4.7, 1M context)** was the primary IDE/agent for almost all code and docs — the rules engine, schema, server actions, tests, devlog drafts, this file. Strong fit because the codebase is small enough to fit comfortably in context and the work is mostly composable typed functions. I worked in standard Claude Code mode, no auto-accept; every edit was reviewed.

**Gemini 2.5 Flash** is in-product, only for the personalised summary (`src/lib/ai/summary.ts`). Not used during development.

**What I deliberately did not trust AI with:**

- **Pricing data** (`src/lib/pricing/tools.ts`, mirrored in `PRICING_DATA.md`). Every row was hand-verified against the vendor's pricing page with the date pulled. An LLM would hallucinate plausible-looking prices that aren't, and a finance reviewer can't audit a hallucination.
- **Recommendation rules** (`src/lib/audit/rules.ts`). Friction-weighted, deterministic, unit-tested. Replacing this with a prompt would lose all three properties and break the engine's *"obviously fair"* north star.
- **Plan-health flag wording** (`src/lib/audit/plan-health.ts`). Each note must be a fact a reviewer can verify (Anthropic v2.1.89 rate-limit tightening, Claude Pro annual prepay rate, Cursor Ultra's premium-tier watch). LLM-authored notes drift toward generic risk-language and dilute the signal.

**One specific time AI was wrong and I caught it:** the first version of the audit engine ranked recommendations by raw monthly savings. Claude Code's default suggestion for a Cursor Teams 2-seat user was *"switch to GitHub Copilot — saves $60/mo."* The real answer was *"downgrade to Cursor Pro — saves $40/mo, takes one click, no tool migration."* The model picked the largest number on the table. I added the `FRICTION_WEIGHT` table at `src/lib/audit/rules.ts:158` (downgrade_plan: 1.0, use_credex: 0.9, switch_tool: 0.6) and pinned the right behaviour with a test in `src/lib/audit/__tests__/engine.test.ts`. I caught it because I'd already interviewed Vineeth and seen how reluctant founders are to migrate tools — the test failure forced the calibration the interview had already suggested.

## 5. Self-rating (1–10) for each: discipline, code quality, design sense, problem-solving, entrepreneurial thinking

| Dimension | Rating | One-sentence reason |
|---|---|---|
| Discipline | 8 | Daily devlog written same day; commits across 4 distinct calendar days by end of Day 4 (≥5 by submission); no skipped phases. |
| Code quality | 8 | Pure-function audit engine, strict TypeScript, 35 tests, comments only on the WHY where it isn't obvious from the names. |
| Design sense | 7 | PlanLadder + tier-aware result hero feel right; visual polish gets a final Day-6 pass after Lighthouse runs against the deployed URL. |
| Problem-solving | 8 | Caught friction-weighting before tests stabilised, caught Gemini's thinking-tokens truncation, caught the lead-action ordering bug — each before it shipped. |
| Entrepreneurial thinking | 8 | Three real interviews drove three real product changes (PlanLadder, plan-health flags, agent-volatility); honest about the $0 / "you're spending well" cases instead of manufacturing savings. |

> **Day-7 final pass:** revise Q1 if a worse bug surfaces during deploy / Lighthouse / pricing-verify; sharpen Q5 reasons after the deployed URL is locked and the screenshots / Loom are in.
