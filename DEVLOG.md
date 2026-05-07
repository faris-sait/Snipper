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

**Hours worked:** _to be filled_

**What I did:** _to be filled_

**What I learned:** _to be filled_

**Blockers / what I'm stuck on:** _to be filled_

**Plan for tomorrow:** _to be filled_

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
