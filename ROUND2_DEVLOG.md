## 2026-05-20 12:30 - Start

Brief released at 10:00 this morning. Sat down with it after lunch. Plan first, build second.

## 2026-05-20 13:00 - Reading the brief

Round 2 is 36 hours, builds on Round 1, evaluated mostly on shipping + PR description quality. Four required features: persistent audit storage with pricing snapshot, pricing-change detection, consolidated notification emails, diff view on re-run.

## 2026-05-20 14:00 - Mapping the gaps

Three parallel codebase passes. `audits` has no `pricing_snapshot` column (required). Engine takes pricing via module-level import not parameter — refactor blocker for clean re-audit.

## 2026-05-20 15:00 - Stress-testing the architecture

Considered AsyncLocalStorage for pricing injection but rejected it — silent fallthrough risk. Going with an explicit `tools` parameter on `runAudit`, backward-compat default to `TOOLS` so the 10 existing engine tests stay green.

## 2026-05-20 16:00 - Plan locked, Phase 0 done

13-phase plan, bonuses gated on Phase 7 deploy passing. Created `round-2-reaudit` off `main`, scaffolded `ROUND2_PR.md`, this DEVLOG, `ROUND2_REFLECTION.md`.

## 2026-05-20 18:00 - Snapshot scope decided

`pricing_snapshot` will store only the plans for tools referenced in the audit's input — ~1-2 KB per row, not the entire registry. Existing rows get NULL; `detect-changes` filters them.

## 2026-05-20 19:00 - Verification recipe drafted

Mapped the curl flow end-to-end: submit audit → `POST /api/admin/pricing` → `POST /api/detect-changes` → inbox → click re-run → diff at `/a/[id]/rerun`. Goes verbatim in ROUND2_PR.md.

## 2026-05-20 20:00 - Phase 1 sequencing

Phase 1 ships a vertical slice first: schema + engine refactor + minimal `detect-changes` that just returns a count. Email and UI go on top of a proven engine, not in parallel.

## 2026-05-20 22:00 - Phase 1 vertical slice landed

Migration 0003 written. Engine refactored with explicit `tools` parameter — 10 existing engine tests pass unchanged, plus a new proof-of-mechanism test (same input + different pricing → different recommendation target). `getEffectiveTools()` overlays `TOOLS` with `pricing_overrides`; `buildPerAuditSnapshot()` captures per-audit plans. Snapshot capture wired into `runAuditAction`. Minimal `POST /api/detect-changes` (bearer-auth) returns `{ scanned, affected, pricingVersion }`. 52/52 tests, typecheck clean, no new lint warnings.

## 2026-05-20 22:30 - Phase 2: admin pricing endpoint

POST + DELETE `/api/admin/pricing` with bearer-auth + Zod validation. Upserts and deletes `pricing_overrides` rows; rejects unknown `toolId`/`planId` pairs against the in-code TOOLS registry. Typecheck flagged a null-vs-undefined mismatch on the Zod schema for optional Plan fields — tightened to undefined-only (DELETE clears the whole row, so "set field to null" was ambiguous).

## 2026-05-20 23:30 - Phase 3: diffing + re-audit orchestration

Committed `feat(round-2): add audit diffing and reaudit orchestration`. Added pure diff helpers plus `reaudit.ts` so snapshot-backed audits re-run against current pricing, skip already-notified `(audit_id, pricing_version)` pairs, and group by earliest non-unsubscribed lead email. First fixtures were wrong — Cursor kept flipping cross-vendor — so I rebuilt them around Claude Team Standard. 5 new diff tests; full suite 57/57, typecheck clean, targeted lint clean.

## 2026-05-21 00:30 - Phase 4: re-audit email template

Added the consolidated re-audit email renderer plus sender wrapper. One email now carries 1..N affected audits, each with a short "was X, now Y" summary and a direct `/a/[id]/rerun` link; unsubscribe URL is threaded through as an optional arg for the later bonus path instead of hard-wiring it now. 2 new email-template tests added. Full suite 59/59, typecheck clean, targeted lint clean.

## 2026-05-21 01:30 - Phase 5: detect-changes send path

`POST /api/detect-changes` now groups affected audits by recipient, sends one consolidated re-audit email per user, and writes `reaudit_notifications` only for successful sends. Pulled the send/log loop into a pure `reaudit-delivery.ts` helper so it can be unit-tested without Supabase. 2 new orchestration tests added. Full suite 61/61, typecheck clean, targeted lint clean.

## 2026-05-21 02:00 - Sleep

Slept 02:00–09:30. Phases 1–5 cover the four required features end-to-end with passing tests, so the floor is locked in. Bonuses (7.5–7.8) and the rerun UI live on the other side of sleep — better to ship them with a clear head than to push through a fifth phase at 03:00.

## 2026-05-21 10:06 - Phase 6: rerun diff page

`/a/[id]/rerun` is now a server-rendered side-by-side diff on the same public audit id, with an explicit "predates pricing snapshots" state for pre-Round-2 rows instead of inventing a counterfactual. First draft had the page hand-rolling the compare path; pulled that into `reaudit.ts` so detect-changes and the UI share the same rerun logic, then added a focused test proving the original side stays snapshot-backed while the rerun uses current effective pricing. Typecheck clean, full suite 62/62; repo-root `pnpm lint` is still red because this workspace also lints pre-existing `hyperframes/` files (106 errors, 41 warnings), but targeted eslint on the touched Phase 6 files is clean.

## 2026-05-21 11:14 - Phase 7: prod deploy + live E2E

Did the deploy from `round-2-reaudit` directly via `vercel deploy --prod` instead of merging — brief says keep the PR open, and preview envs on the `snipper` project were empty while production already had the Supabase/Resend secrets. Added `ADMIN_TOKEN` in Vercel, redeployed, then ran the full live loop on `https://snipper-alpha.vercel.app`: fresh audit `wOMIgVsrb5Ab`, confirmed the row had `email` + non-NULL `pricing_snapshot`, bumped `cursor/pro` to `$60`, hit `POST /api/detect-changes`, got `{"scanned":1,"affected":1,"recipients":1,"notifiedRecipients":1,"skippedRecipients":0,"failedRecipients":0,"loggedAudits":1,"logErrors":0,"pricingVersion":"70ff75ede007c931"}`. Disposable inbox received `Pricing changed on 1 of your audits`; email body included the new raw vendor copy (`Cursor Pro moved from $20/seat to $60/seat.`) and linked to `/a/wOMIgVsrb5Ab/rerun`, which rendered `+$20/mo` and flipped `Cursor Teams` from `Downgrade to Pro` to `Switch to GitHub Copilot Pro`. Reset the override immediately after and rechecked the rerun page back on baseline (`CHANGED TOOLS 0`). Screenshots saved under `dogfood-output-phase7/`.

## 2026-05-21 12:01 - Phase 7.5: scheduled detect-changes

Added `.github/workflows/detect-changes.yml` with the planned `0 14 * * *` daily cron plus `workflow_dispatch`, keeping the job intentionally thin: no checkout, just a bearer-authenticated `curl` to the live `/api/detect-changes` endpoint with `--fail` so GitHub marks bad runs red instead of swallowing them. Only repo-side caveat left is external: `ADMIN_TOKEN` now also needs to be added in GitHub repo secrets to match the Vercel production token.

## 2026-05-21 13:20 - Phase 7.6: unsubscribe link

Finished the half-built unsubscribe path. HMAC token util, template support, and the `audit_leads.unsubscribed_at` column already existed from earlier phases, but `markEmailUnsubscribed` had been duplicated in `src/lib/db/audits.ts` (TS2393 — compile blocker, masked because no caller existed yet); deleted the second copy. Added `GET/POST /api/unsubscribe`: verifies `HMAC(email, UNSUBSCRIBE_SECRET)`, flips `unsubscribed_at`, returns a plain HTML "you're unsubscribed" page on GET and a 204 on POST so RFC 8058 one-click works. Wired `buildUnsubscribeUrl` into the detect-changes send adapter so each recipient gets a per-email token, and attached `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers on the reaudit email so Gmail/Apple Mail surface the native unsubscribe button. 6 new token tests; full suite 70/70, typecheck clean, targeted eslint clean. Repo-wide lint still red on the same pre-existing `hyperframes/` and `src/app/audit/page.tsx` baseline noted in Phase 6.

## 2026-05-21 13:55 - Phase 7.6 fix: email-scoped suppression + HTML escape

Code-review caught two real bugs. (1) `groupAffectedByEmail` was querying `audit_leads` by `audit_id` while delivery keyed off `audits.email`, so a user who clicked "unsubscribe" would still receive mail for any other existing audit under the same email and any future audit they ran. Rewrote the query to be email-scoped: collect candidate emails from the affected set, ask Supabase which of those have any `audit_leads` row with `unsubscribed_at IS NOT NULL`, skip those emails in grouping. Updated `groupAffectedAuditsByEmail`'s pure signature from `unsubscribedAuditIds: Set<string>` to `unsubscribedEmails: Set<string>` and tightened the existing skip test to prove a second audit under the same unsubscribed email is also muted. (2) The unsubscribe success page interpolated the raw `email` query param into HTML — added a small `escapeHtml` helper and applied it to both the success body and the error message. 70/70, typecheck clean, targeted lint clean.

## 2026-05-21 14:25 - Phase 7.7: "what changed this week" page

Public `/changes` server-component page rendering the rolling 7-day pricing-override feed. Added `listRecentPricingOverrides(sinceDays)` to `db/pricing-overrides.ts` (newest-first, last 7d) and a pure `resolveOverrideRow` helper in `lib/pricing/change-history.ts` that takes a raw row + the in-code `TOOLS` registry and produces a labelled "was X, now Y" change list. Helper handles three real cases: real price/field diff (rendered), no-op override that matches baseline (filtered out), and orphaned tool/plan no longer in the registry (rendered with an explicit "no longer in registry" note instead of crashing). Page falls back to an empty state when Supabase isn't configured or there are no recent rows. Linked from the home-page footer next to `sources`. 3 new tests; full suite 73/73, typecheck clean, targeted eslint clean.

## 2026-05-21 15:10 - Phase 7.8: admin dashboard + CTR signal

Final bonus. New tables, new route, full click-attribution loop. Migration `0005_reaudit_clicks.sql` adds `reaudit_clicks (notification_audit_id, notification_pricing_version, clicked_at)` with the composite PK including `clicked_at` so duplicate visits in the same ms collapse at the DB while the dashboard reduces to `count(distinct (audit_id, pricing_version))` — one click = one engaged notification, more is fine. Threaded `pricingVersion` through `ReauditNotificationItem` → `AddressableAffectedAudit` → the detect-changes adapter, and a new `buildRerunUrl(siteUrl, auditId, version?)` template helper appends `?v=<v>` (URL-encoded) when present. Rerun page now reads `searchParams.v`, validates against `^[a-f0-9]{1,32}$` to keep stray params from polluting the table, and fires `recordReauditClick` as a void-promise after the audit row is confirmed real — render is never gated on the insert. Admin auth is a tiny HMAC-free cookie exchange: `GET /admin/login?token=X` constant-time-compares against `ADMIN_TOKEN`, sets an HttpOnly Secure SameSite=Lax `__admin` cookie (12h), redirects to `/admin`; a bad token redirects to `/admin?denied=1` with no detail leak. `/admin` is a server component that reads the cookie via `cookies()`, validates again with `verifyAdminToken`, then issues three parallel Supabase calls (head-count audits, head-count notifications, select clicks) and renders three counters with the source query for each spelled out below the grid. Local-only mode renders zeros instead of erroring. 12 new tests across `verifyAdminToken`, `computeCtr`, `buildRerunUrl`, and the template ?v= path. Full suite 85/85, typecheck clean, targeted lint clean.

## 2026-05-21 16:00 - Live E2E verification via agent-browser

Drove every Round 2 surface live on `https://snipper-alpha.vercel.app` via the agent-browser CLI. `/changes` empty-state, `/changes` populated after a $20→$30 cursor/pro override, `/admin` unauth state, `/admin/login?token=wrong` redirecting to `?denied=1`, `/admin/login?token=<real>` setting the cookie and showing 26 audits / 1 notification / 0% CTR, `POST /api/admin/pricing` happy + auth-reject + unknown-tool paths, `POST /api/detect-changes` happy + idempotent paths, `/a/<id>/rerun?v=...` rendering the diff and ticking CTR up to 50% on a refresh of `/admin`, `/api/unsubscribe` happy + bad-token + XSS-payload (HTML-escape proven on the success body), then reset cursor/pro to baseline so prod is clean. All 14 verification points green.

## 2026-05-21 16:30 - Admin UX: cookie-authed pricing controls

`/admin` now has real controls — pricing-override form (plan dropdown × price input × Apply), "Run detect-changes now" button, active-overrides list with per-row Clear. All three use Server Actions that re-verify the `__admin` cookie via `verifyAdminToken` before mutating; the actions call `upsertPricingOverride` / `deletePricingOverride` / the full detect-changes pipeline directly, no bearer-token hop. Reason for the U-turn from "console-only is fine for the brief": the reviewer is *also* the evaluator, and the brief explicitly says they'll trigger a price change themselves. Console + curl works but adds friction; a cookie-authed form is the same security model with zero ceremony. ~30 min of pure UI plumbing on top of the existing endpoints. Typecheck clean, 85/85 tests still green, targeted lint clean.

## 2026-05-21 17:00 - Cursor pricing email debugging

Reviewer-flow dogfood. Submitted a Cursor audit with `farissait@gmail.com` while a cursor/pro override at $60 was still active from earlier testing — then bumped to $90 and ran detect-changes expecting an email to my real inbox. Got `affected: 1, notifiedRecipients: 1` but nothing landed. Pulled the Resend send log via the API (`GET https://api.resend.com/emails?limit=10`) and found the send: it went to `snipper1779341563@wshu.net` — a disposable inbox from the Phase 7 E2E run, not to my own. The snapshot of *my* audit was already at $60 (override active at submit time), so going from $60→$90 didn't flip the recommendation — only the old wshu.net audit (snapshot at $20 baseline) actually changed bottom line. This is the engine working correctly: the brief defines "changed" as "your audit logic would now produce a different recommendation," not "any price moved." Lesson for the PR: my "How to test" recipe needed to *start* with clearing existing overrides before submitting the test audit. Updated `ROUND2_PR.md` accordingly.

## 2026-05-21 18:00 - Phase 8: PR + REFLECTION + final push

`ROUND2_PR.md` polished to the brief's exact section structure (What this PR does / Why / How it works / What I cut / How to test it manually / What's tested / Open questions). Magic-link `/admin/login?token=...` dropped into "How to test" so the reviewer never has to copy/paste a bearer. `ROUND2_REFLECTION.md` rewritten in Round 1's voice — file paths with line numbers, alternatives considered + rejected with reasons, closing line that names the broader lesson. Q1: skipped automated integration tests for the three route handlers and the Resend send (~3h cost vs ~4h of bonus features that closed Phases 7.5–7.8). Q2: one focused PR — Vitest harness with in-memory Supabase + Resend mock, four specific assertions. Q3: Round 1 `runAudit` consumed the in-code `TOOLS` registry via module-level import; Round 2 me spent ~2h refactoring to a `tools` parameter before any feature work could start. Final commit + push next.
