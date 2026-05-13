# Devlog

One entry per day for the duration of the assignment (2026-05-07 → 2026-05-14). Written each evening from notes taken during the day.

---

## Day 1 — 2026-05-07

**Hours worked:** 4

**What I did:** Read the brief twice, sketched seven phases (one per day), then went heads-down on the audit engine. Got the pricing registry built for all 8 tools, the rule engine and 9 tests passing, CI green, and a landing page up. Did not start the form yet — wanted the engine to be solid first since everything else depends on it.

**What I learned:** First version of the engine ranked recommendations by raw savings. A test for a Cursor Teams user with 2 seats kept telling them to switch to Copilot when the obvious answer was to downgrade to Cursor Pro — one click instead of a tool migration. Added a friction weight per recommendation kind so the easier fix wins unless the disruptive one is dramatically better. Felt good — that's the kind of thing a finance reviewer would actually push back on.

Also: Next.js 16 broke params and searchParams into promises, and Tailwind 4 moved tokens into CSS. The framework's bundled docs saved me an hour of guessing.

**Blockers / what I'm stuck on:** Pricing verification is messier than I expected — ChatGPT's pricing page returns 403 to most fetchers, Gemini's localised me to CAD. Both flagged in the pricing doc; need a manual US-browser pass before launch. Also: I need to start outreach for the 3 user interviews tonight or I won't have them by Day 7.

**Plan for tomorrow:** Build the multi-tool input form with react-hook-form and zod. Persist form state in localStorage so a refresh doesn't kill it. Wire it to the engine and render the raw result somewhere — UI polish can wait for Day 3.

---

## Day 2 — 2026-05-08

**Hours worked:** 3

**What I did:** Built the multi-tool input form (react-hook-form + zod, plan-to-tool dropdown, dynamic add/remove rows, localStorage draft persistence) and a v1 result page with the hero, per-tool list, and the Credex CTA gated on the $500/mo threshold. Then plan-health flags on the engine output for things like Claude Max rate-limit shocks, plus a plan-ladder component that projects every vendor plan at the user's seat count. Tests at 21/21.

**What I learned:** Two things. The friction-weighting from Day 1 has a sharper edge than I thought — when a high-API-spend line fires both Credex and a cross-vendor switch, the engine picks Credex even when raw switch savings are ~30% higher. Noted for tightening but it's the right default. Also: "benchmark mode" from the brief's bonus list isn't what users actually want. Vineeth's interview surfaced that founders distrust peer benchmarks they can't verify — they want the full vendor plan landscape so the recommendation isn't a black box. Plan ladder is the answer, built only from data I already have.

**Blockers / what I'm stuck on:** ChatGPT and Gemini pricing verification still carried from Day 1. User-interview #3 outreach overdue — two of three done; the brief is explicit that fewer than three is an instant reject.

**Plan for tomorrow:** Phase 4 — lead capture, Supabase persistence, public share URL with OG tags. Migrate the notify-me entries onto a real backend. Honeypot for abuse protection. And a reply on the cold DM for interview #3.

---

## Day 3 — 2026-05-09

**Hours worked:** 4

**What I did:** Phase 4 — Supabase persistence, lead capture, public share URL. Three tables: audit input/result snapshots, lead emails with optional fields, and a passive notify-me list. Identifying details only live in the lead tables, so the public share route is PII-free by schema, not by remembering to redact. Two server actions with a honeypot for abuse protection, gracefully falling back to local-only when env vars aren't set. URL-safe 12-char audit IDs, OG image for share previews. Tests now 28/28.

**What I learned:** Two bugs. First, the lead-capture action's "lead-needs-audit" check fired before the persistence-not-configured short-circuit, so locally every lead capture failed — both checks were correct, just in the wrong order. Second, `startTransition` silently swallows server-action rejections; if the action throws, the user gets a dead Submit button with no error. Wrapped it in try/catch. Also: the result hero was binary on optimal-vs-not, but the engine can return optimal while still showing small per-line wins. "Nothing to cut" above a $20/mo number reads as a contradiction — split it into three tiers.

**Blockers / what I'm stuck on:** ChatGPT (403s) and Gemini (CAD localization) pricing still need a manual US-IP verification pass — more pressing now that the public pricing-sources page makes every row a public claim.

**Plan for tomorrow:** Phase 5 — the one feature where the brief mandates AI. ~100-word personalised summary, with a templated fallback, cached on the audit row so re-renders don't re-bill. Then deploy to Vercel and run Lighthouse mobile.

---

## Day 4 — 2026-05-10

**Hours worked:** 4

**What I did:** Phase 5 — the AI summary. Added an `ai_summary` column with migration. Wrote the AI module: Gemini 2.5 Flash, 3-second timeout, JSON-shaped user prompt, deterministic 3-tier templated fallback with 7 unit tests. Output cached on the row so subsequent views are zero-cost; templated outputs deliberately not cached. Filled the prompts doc with model rationale, both prompts verbatim, three iteration notes. Interview #3 finally closed — Muralidhar Goparaju, CEO at Amberflux EdgeAI, 15-min call. Tests at 35/35.

**What I learned:** Three things. First, Anthropic's new-account auto-credit didn't post — built first against Claude Haiku 4.5, live request returned credit-balance-too-low. Swapped to Gemini 2.5 Flash in about 30 lines because the prompt was provider-agnostic. The brief's "any LLM" carve-out covers this. Second, Gemini 2.5 Flash thinks by default and thinking tokens count against the output budget. First QA truncated at "…material opportunity to optimize" — the model burned most of 400 tokens thinking before writing a visible word. Set the thinking budget to zero. Third, Murali's pain is forward-looking — agent-mode consumption varies run-to-run, "no way to forecast next month" is a third shape after the other two interviews. Earns a new plan-health flag on the backlog.

**Blockers / what I'm stuck on:** ChatGPT and Gemini pricing US-IP verification, carried since Day 1. Vercel deploy + Lighthouse mobile that Day 3's plan slated for today didn't happen — Phase 5 ate the day. Slipping to Day 5 morning.

**Plan for tomorrow:** Deploy to Vercel, run Lighthouse mobile (targets ≥85/≥90/≥90), do the ChatGPT/Gemini US-IP pricing pass. Then open Phase 6 — metrics and economics docs first since they pull most directly from numbers already in the engine.

---

## Day 5 — 2026-05-11

**Hours worked:** 3

**What I did:** Phase 6 — the brief's metrics and economics deliverables. Metrics doc picks qualified audits/week as the North Star (qualifying = ≥$500/mo savings, same threshold the engine uses for the Credex CTA), three input rates, server-side-only instrumentation, pre-committed pivot triggers per layer. Economics doc derives lead value ≈ $600 central (10% margin × $10k first-year credit volume × 60% Y1 retention), tables CAC against the four organic channels plus the Credex outbound cross-promo, and shows the $1M-in-18-mo path only pencils if the cross-promo carries volume — organic alone tops out at 15–25k MAU. Filled the reflection doc end-to-end. Side work: Resend transactional confirmations for lead and notify captures; no-ops gracefully without an API key.

**What I learned:** Two. Drafting the economics doc exposed that the $1M path I'd been carrying as a vague intuition relies on one channel doing the heavy lifting — Credex's existing outbound list. Wrote that out instead of hiding it: a finance reviewer asking "would this work without Credex's audience?" deserves an honest "no, organic alone caps at roughly $200k ARR." Same discipline the engine has about $0 floors should transfer to the GTM math. Also: Resend will only deliver from a verified sending domain or its sandbox sender, which only ships to the account-owner's own inbox. Spent ~20 minutes thinking my templates were broken before noticing the dashboard's "domain not verified" banner.

**Blockers / what I'm stuck on:** Vercel deploy + Lighthouse mobile *still* not done — Phase 6 ate today the way Phase 5 ate Day 4. ChatGPT and Gemini pricing US-IP verification still carrying from Day 1. Both must land tomorrow or they bleed into the submission window.

**Plan for tomorrow:** Vercel deploy first thing — env vars, then Lighthouse mobile. ChatGPT/Gemini US-IP pricing pass. Open Phase 7: dogfood the live URL, capture screenshots and a Loom, and start the README polish.

---

## Day 6 — 2026-05-12

**Hours worked:** 4

**What I did:** Dogfood plus the four remaining bonuses. Live-URL dogfood via agent-browser caught six issues — a three-tier OG / share-page mismatch on the modest tier, lead capture erroring when the audit ID was null in local-only mode, the schema accepting all-zero audits, native browser validation fighting Zod, an unreachable error message, and the tests doc mismatching the actual count. All six landed in one fix commit. Then Phase 7: a hero video for the landing card (1080×1080, GSAP timeline, ~10s loop), with the SSR'd card fading out once the video can play so the page works fine if the asset 404s. PDF export shipped three ways: a client download button with lazy-loaded react-pdf, a server route, and the same PDF attached to the lead-capture email. Four more bonuses on top: benchmark mode (+7 tests), embed widget (one-script-tag iframe), referral codes, and the launch post (blog + 9-tweet thread). Form now auto-fills $/mo from list price × seats on plan/seat change. Tests 44 → 51.

**What I learned:** Three. react-pdf has two surfaces — a client-side blob path and a server-side buffer path. The server helper had to be a `.tsx` because of the JSX; mismatching the extension blew up the typechecker with cryptic ">"-expected errors before I clocked it. Also: auto-filling $/mo on plan change was tempting as a hard override, but the "trust user-reported spend" invariant exists for a reason — annual prepay discounts, grandfathered rates. Shipped it as a *suggestion* with a "pre-filled from list price · edit if your actual differs" helper line; the engine still consumes whatever's in the field on submit. Third, the referral guard was too loose — the audit-ID validator permitted 1–32 chars, so `?via=hahaha` rendered the "referred by a Snipper user" banner. Tightened to require exactly 12 chars, mirrored server-side. URL-param edge cases don't get caught by typechecks or unit tests; only the dogfood pass would have surfaced this.

**Blockers / what I'm stuck on:** Lighthouse mobile *still* not run — three-day slip. ChatGPT/Gemini US-IP pricing verification carrying since Day 1. Loom walkthrough not yet recorded.

**Plan for tomorrow:** Record the Loom, paste the URL, run Lighthouse mobile clearing ≥85/≥90/≥90 on the live URL, and the ChatGPT/Gemini pricing pass. Then final polish and submit.

---

## Day 7 — 2026-05-13

**Hours worked:** 4

**What I did:** Submission polish. Snipper mark added next to the wordmark in the PDF report header — used react-pdf's Svg/Path primitives so the logo stays crisp at any zoom and reads from the same path constant as the on-site logo. README's deploy section turned from prose into runnable `vercel link / env pull / deploy --prod`. Pulled five non-brief docs (AGENTS, CLAUDE, BENCHMARK_DATA, EMBED, REFERRALS) so the repo matches the brief's required-file list exactly; left the launch post in since it's an explicit bonus deliverable. Loom walkthrough recorded and wired into the README as a clickable thumbnail — Loom's `-with-play.gif` URL scheme is gone, the working one is the session-id-suffixed `-full-play.gif`. Rewrote Days 1-6 of this devlog into shorter prose without inline file paths. Deleted a leftover "delete before submitting" template note at the top of USER_INTERVIEWS that I'd somehow missed. Ran a full brief-vs-repo audit — 51/51 tests green, 7 distinct commit days, deploy URL responds 200 on every route.

**What I learned:** Two. Lighthouse mobile on the deployed URL came back 77/100/100 — performance fell short of the brief's 85 floor. The killer was modern-image-formats: `hero-audit-poster.png` was 207KB, the largest single payload. Converted it to WebP via `ffmpeg -c:v libwebp` and the file dropped to 30KB — 86% smaller. Local prod build with the swap scored 84, so we're one Lighthouse point off the floor; live should clear once the swap deploys behind Vercel's edge cache. Worth knowing that the Lighthouse CLI flag is `--form-factor=mobile`, not `--preset=mobile` (which expects perf/experimental/desktop and silently no-ops your form-factor intent). Also: every official ChatGPT pricing page sits behind a Cloudflare challenge from this network — `chatgpt.com/pricing/`, `openai.com/chatgpt/pricing/`, and even the OpenAI Help Center articles. The Gemini page IP-localises to Canada and serves CAD; converting CA prices at 0.72–0.74 reconstructs the US figures within $1, which is enough to defend the search-aggregated numbers. Documented both in the pricing doc rather than pretending it was fully verified.

**Blockers / what I'm stuck on:** Performance score is one point short on the local prod run; live URL needs the WebP fix deployed before a final Lighthouse pass. ChatGPT consumer pricing still needs a real US-browser confirmation pass — the doc now flags this explicitly with the network limitation.

**Plan for tomorrow:** Deploy the WebP fix to prod, re-run Lighthouse against the live URL, and if performance is still under 85, defer the hero video mount via a `useEffect` so it loads after first paint instead of competing for the initial render budget. Then submit.
