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

**Hours worked:** 6

**What I did:** Two phases landed today. Phase 2 (committed in three small commits this morning): the multi-tool input form with `react-hook-form` + `zod`, plan→tool dropdown linkage, dynamic add/remove rows, `localStorage` draft persistence, the v1 result page (hero with monthly/annual savings, Credex CTA gated on the $500/mo threshold, per-tool flat list), the form-input UI primitives (`Button`, `Card`, `Input`, `Label`, `Select`), and 5 zod-validation tests covering coercion, planId mismatches, and reject-paths. Phase 3 (uncommitted, sitting in working tree): added the `PlanHealth` engine output for plan-trajectory signals (Claude Max 20x rate-limit-shock, Cursor Ultra / ChatGPT Pro premium-tier watch, Claude Pro annual-prepay, GitHub Copilot Business / v0 Premium for unpublished prices), the `PlanLadder` component which shows every plan a vendor offers projected at the user's seat count with current and recommended highlighted, the `AuditLineCard` expandable per-line component with proper `aria-expanded`/`aria-controls`/`role="region"`, the optimal-path `NotifyMeForm` lead capture (localStorage now, migrates to Supabase in Phase 5), a flagged-plan summary line above the breakdown, and a real loading skeleton. Tests: 21/21 passing (added 6 plan-health cases + 1 engine assertion that `planHealth` rides on every line). Lint clean except a pre-existing react-hook-form warning from Phase 2 that I left alone.

**What I learned:** Three real things. (1) The friction-weighting heuristic from Day 1 has a sharper edge than I thought: when a high-API-spend line fires both Credex (`use_credex`, weight 0.9) and a cross-vendor switch (`switch_tool`, weight 0.6), the engine picks Credex even when the raw switch savings are ~30% higher. The Day-1 test at `engine.test.ts:111` already pinned this as `expect(["use_credex", "switch_tool"]).toContain(rec.kind)` — looser than I'd like. Tightened mentally for now; if a real user hits the edge case I'll re-weight rather than re-rank. (2) "Benchmark mode" in the brief is in the Bonus list but the user-felt need that surfaced in Vineeth's interview was different — they don't want peer benchmarks they can't verify, they want to see the *full vendor plan landscape* so the recommendation isn't a black box. The PlanLadder component is the answer to that, built only from data already in the pricing registry (zero new sources to defend). (3) The spiciest claim in the entire audit is the Claude Max 20x rate-limit-shock flag. Softened the wording to "broadly reported since v2.1.89" so a finance reviewer can verify the public discussion themselves rather than trust my read of it.

**Blockers / what I'm stuck on:** Nothing new today. Pricing verification for ChatGPT (403 to most fetchers) and Gemini (CAD localization) is still carried over from Day 1 and needs a manual US-browser check before deploy. User-interview #3 outreach is overdue — two of three are done; if I don't lock the third by Day 4 I'm in trouble (the brief is explicit that fewer than three is an instant reject).

**Plan for tomorrow:** Phase 4 — lead capture + Supabase persistence + shareable public result URL with OG tags. The `notify-me` localStorage entries from today are the migration target. Likely shape: Supabase project + `audits` and `email_signups` tables, server action for `runAudit` that returns a signed audit id, `/audit/[id]` public route that strips identifying details, OG image generation. Honeypot-only abuse protection to start; can layer hCaptcha if the deployed URL gets any real traffic. Plus a reply on the cold DM I sent yesterday for interview #3.

---

## Day 3 — 2026-05-09

**Hours worked:** _to be filled_

**What I did:** _to be filled_

**What I learned:** _to be filled_

**Blockers / what I'm stuck on:** _to be filled_

**Plan for tomorrow:** _to be filled_

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
