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

**Hours worked:** _to be filled_

**What I did:** _to be filled_

**What I learned:** _to be filled_

**Blockers / what I'm stuck on:** _to be filled_

**Plan for tomorrow:** _to be filled_

---

## Day 5 — 2026-05-11

**Hours worked:** _to be filled_

**What I did:** _to be filled_

**What I learned:** _to be filled_

**Blockers / what I'm stuck on:** _to be filled_

**Plan for tomorrow:** _to be filled_

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
