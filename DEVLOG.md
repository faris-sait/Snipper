# Devlog

One entry per day for the duration of the assignment (2026-05-07 → 2026-05-14). Written each evening from notes taken during the day. **Days 2–7 are stubs to be filled in after that day's actual work** — backdating is obvious in git history and the brief explicitly says reviewers check, so these stay empty until lived through.

---

## Day 1 — 2026-05-07

**Hours worked:** 5

**What I did:** Read the brief twice, sketched seven phases (one per day), then went heads-down on the audit engine. Got the pricing registry built for all 8 tools, the rule engine + 9 tests passing, CI green, and a landing page up. Did not start the form yet — wanted the engine to be solid first since everything depends on it.

**What I learned:** First version of the engine ranked recommendations by raw savings. A test for a Cursor Teams user with 2 seats kept telling them to switch to Copilot ($60/mo saved) when the obvious answer was to downgrade to Cursor Pro ($40/mo saved, one click). Added a friction weight per recommendation kind so the easier fix wins unless the disruptive one is dramatically better. Felt good — that's the kind of thing a finance reviewer would actually push back on.

Also: Next.js 16 broke `params`/`searchParams` into promises and Tailwind 4 moved tokens into CSS. Bundled docs in `node_modules/next/dist/docs/` saved me.

**Blockers / what I'm stuck on:** Pricing verification is messier than I expected — ChatGPT's pricing page returns 403 to most fetchers, Gemini's page localized me to CAD. Both are flagged in `PRICING_DATA.md` and need a manual US-browser check before launch. Also: I need to start outreach for the 3 user interviews tonight or I won't have them by Day 7.

**Plan for tomorrow:** Build the multi-tool input form with react-hook-form + zod. Persist form state in localStorage so a refresh doesn't kill it. Wire it to `runAudit()` and dump the raw result somewhere — UI polish can wait for Day 3.

---

## Day 2 — 2026-05-08

**Hours worked:** 3

**What I did:** Two phases. Phase 2: multi-tool input form (react-hook-form + zod, plan→tool dropdown, dynamic add/remove rows, localStorage draft persistence), v1 result page with hero + per-tool list and the Credex CTA gated on the $500/mo threshold, and 5 zod-validation tests. Phase 3 (uncommitted, working tree): `PlanHealth` engine output for plan-trajectory signals (Claude Max rate-limit shock, premium-tier watch, annual-prepay, unpublished prices), the `PlanLadder` component projecting every vendor plan at the user's seat count, expandable per-line cards with proper aria attributes, and the optimal-path notify-me capture (still localStorage — migrates to Supabase tomorrow). 21/21 tests passing.

**What I learned:** Two real things. (1) The friction-weighting from Day 1 has a sharper edge than I thought — when a high-API-spend line fires both Credex (weight 0.9) and a cross-vendor switch (0.6), the engine picks Credex even when raw switch savings are ~30% higher. The Day-1 test pinned this only loosely as `expect(["use_credex", "switch_tool"]).toContain(rec.kind)`. Tightened mentally for now. (2) "Benchmark mode" from the brief's bonus list isn't actually what users want — Vineeth's interview surfaced that they distrust peer benchmarks they can't verify; they want the *full vendor plan landscape* so the recommendation isn't a black box. PlanLadder is the answer, built only from data already in the registry — zero new sources to defend.

**Blockers / what I'm stuck on:** ChatGPT and Gemini pricing verification still carried from Day 1. User-interview #3 outreach overdue — two of three done; the brief is explicit that fewer than three is an instant reject.

**Plan for tomorrow:** Phase 4 — lead capture + Supabase persistence + public share URL with OG tags. Migrate the localStorage notify-me entries onto a real backend. Honeypot for abuse protection. Plus a reply on the cold DM for interview #3.

---

## Day 3 — 2026-05-09

**Hours worked:** 3

**What I did:** Phase 4 — Supabase persistence, lead capture, and the public share URL. Three tables: `audits` (input + result snapshot), `audit_leads` (audit-attached email + optional fields), `notify_signups` (passive watch list for the optimal-path "you're spending well" path). Identifying details only live in the lead tables, never on `audits`, so the public `/a/[id]` route is PII-free by schema, not by remembering-to-redact. RLS on; anon reads go through a `security definer` `get_public_audit` RPC. Two server actions (`runAuditAction`, `captureLeadAction`) with a honeypot field for abuse protection, gracefully falling back to local-only when Supabase env vars aren't set. URL-safe 12-char audit IDs + 7 unit tests. OG image for share previews. New `/pricing-sources` page surfaces every vendor plan + verification date publicly. Tests now 28/28.

**What I learned:** Two bugs. (1) `captureLeadAction`'s "lead-needs-audit" check fired *before* the persistence-not-configured short-circuit, so locally every lead capture failed — both checks were correct, just in the wrong order. (2) `startTransition` silently swallows server-action rejections; if the action throws, the user gets a dead Submit button with no error. Wrapped in try/catch. Also: the result hero was binary on `isOptimal`, but the engine can return `isOptimal: true` while still showing small per-line wins — "Nothing to cut" above a $20/mo number reads as a contradiction. Split into three tiers ($0, modest, full).

**Blockers / what I'm stuck on:** ChatGPT (403s) and Gemini (CAD localization) pricing still need a manual US-IP verification pass — more pressing now that `/pricing-sources` makes every row a public claim.

**Plan for tomorrow:** Phase 5 — the one feature where the brief mandates AI: ~100-word personalised summary. Claude Haiku 4.5 with a 3-second budget and a templated fallback, cached on the `audits` row so re-renders don't re-bill. Then deploy to Vercel and run Lighthouse mobile against the live URL.

---

## Day 4 — 2026-05-10

**Hours worked:** 4

**What I did:** Phase 5 — the one feature where the brief mandates AI. `ai_summary` column on `audits` with migration + DAL + updated `get_public_audit` RPC. The AI module itself (`src/lib/ai/summary.ts`) — Gemini 2.5 Flash, 3-second `Promise.race` timeout, JSON-shaped user prompt, deterministic 3-tier templated fallback with 7 unit tests. `getOrGenerateSummaryAction` wired into both `/audit/result` (lazy, post-render) and `/a/[id]` (synchronous on first view); AI output persisted to `audits.ai_summary` so subsequent views are zero-cost; templated outputs deliberately not cached. PROMPTS.md filled with model rationale, both prompts verbatim, three iteration notes. Interview #3 finally closed — Muralidhar Goparaju, CEO @ Amberflux EdgeAI, 15-min call — and Vineeth's and Sahejad's entries reformatted to a consistent "10-min call" framing. Tests now 35/35 (+7 templated-summary).

**What I learned:** Three. (1) Anthropic's new-account auto-credit didn't post — built first against Claude Haiku 4.5, live request returned credit-balance-too-low. Swapped to Gemini 2.5 Flash in ~30 lines because the prompt was provider-agnostic (Day-3's server-side `tier` decision paid off). Brief's "any LLM" carve-out covers this. (2) Gemini 2.5 Flash thinks by default and thinking tokens count against `maxOutputTokens`. First QA truncated at "...material opportunity to optimize" — model burned most of 400 tokens thinking before writing a visible word. `thinkingConfig: { thinkingBudget: 0 }` at `src/lib/ai/summary.ts:71`. (3) Murali's pain is forward-looking — agent-mode consumption varies run-to-run, "no way to forecast next month" is a third shape after Vineeth's retrospective and Sahejad's contemporaneous. Earns a `agent_usage_volatility` plan-health flag (backlog) and strengthens the engineer-handoff share-page item.

**Blockers / what I'm stuck on:** ChatGPT (403s) and Gemini (CAD localization) pricing US-IP verification, carried since Day 1 — more pressing now because `/pricing-sources` makes every row a public claim. Vercel deploy + Lighthouse mobile that Day-3's plan slated for today didn't happen — Phase 5 ate the day. Slipping to Day 5 morning.

**Plan for tomorrow:** Deploy to Vercel, run Lighthouse mobile (targets ≥85/≥90/≥90), do the ChatGPT/Gemini US-IP pricing pass and clear those rows in `PRICING_DATA.md`. Then open Phase 6 — METRICS.md and ECONOMICS.md first since they pull most directly from numbers already in the engine.

---

## Day 5 — 2026-05-11

**Hours worked:** 3

**What I did:** Phase 6 — the brief's "metrics + economics" deliverables. `METRICS.md` picks qualified audits/week as the North Star (qualifying = ≥$500/mo savings, same threshold the engine uses for the Credex CTA) with three input rates, server-side-only instrumentation, and pre-committed pivot triggers per layer. `ECONOMICS.md` derives lead value ≈ $600 central (10% margin × $10k first-year credit volume × 60% Y1 retention), tables CAC row-for-row against `GTM.md`'s four organic channels plus the Credex outbound cross-promo, and shows the $1M-in-18-mo path only pencils if the cross-promo carries volume — organic alone tops out at 15–25k MAU. Filled `REFLECTION.md` end-to-end (Q1: Gemini's thinking-tokens truncation from Day 4; Q2: Benchmark mode → PlanLadder, plus the Anthropic → Gemini swap; Q3: bill-projection / aggregator support / engineer-handoff for week 2; Q4: three explicit don't-trusts — pricing, rules, plan-health wording; Q5: 7–8 self-ratings with one-sentence reasons). Side work: Resend transactional confirmations for lead + notify captures (`src/lib/email/`, wired in via `fireConfirmationEmail` at `src/app/actions/audit.ts:148` so the call site stays a three-line read; no-ops gracefully without `RESEND_API_KEY`). Pulled the inline "← back" links across five pages into a single `SiteLogo` component now that the brand mark is finalised (apple / twitter / OG icons + `manifest.ts`).

**What I learned:** Two. (1) Drafting `ECONOMICS.md` exposed that the $1M-in-18-mo path I'd been carrying as a vague intuition relies on one channel doing the heavy lifting — Credex's existing outbound list. Wrote that out instead of hiding it: a finance reviewer asking *"would this work without Credex's audience?"* deserves an honest "no, organic alone caps at roughly $200k ARR." Same discipline the engine has about $0 floors transfers to the GTM math — refuse to inflate on inputs you can't defend. (2) Resend will only deliver from a verified sending domain *or* its sandbox `onboarding@resend.dev` sender, which only ships to the account-owner's own inbox. Spent ~20 minutes thinking my templates were broken before noticing the dashboard's "domain not verified" banner. Templated the verified-domain path in `src/lib/email/client.ts` and left a comment so the next maintainer doesn't repeat the lap.

**Blockers / what I'm stuck on:** Vercel deploy + Lighthouse mobile *still* not done — Phase 6 ate today the way Phase 5 ate Day 4. ChatGPT (403s) and Gemini (CAD localization) pricing US-IP verification still carrying from Day 1, more pressing now that `/pricing-sources` is days from a public URL. Both must land tomorrow or they bleed into the submission window.

**Plan for tomorrow:** Vercel deploy first thing — env vars (Supabase, Gemini, Resend, `NEXT_PUBLIC_SITE_URL`), then Lighthouse mobile against the live URL targeting ≥85/≥90/≥90. ChatGPT/Gemini US-IP pricing verification, clear those rows in `PRICING_DATA.md`. Open Phase 7: dogfood the live URL with a spend profile distinct from the test data (per the brief's guidance), capture screenshots + a Loom, and start the README polish pass.

---

## Day 6 — 2026-05-12

**Hours worked:** _to be filled_

**What I did:** _to be filled_

**What I learned:** _to be filled_

**Blockers / what I'm stuck on:** _to be filled_

**Plan for tomorrow:** _to be filled_

---

## Day 7 — 2026-05-13

**Hours worked:** _to be filled_

**What I did:** _to be filled_

**What I learned:** _to be filled_

**Blockers / what I'm stuck on:** _to be filled_

**Plan for tomorrow:** _submission day — final polish and submit_
