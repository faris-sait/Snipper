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

`pricing_snapshot` stores only plans for tools in the audit's input (~1-2 KB), not the full registry. Pre-Round-2 rows get NULL and are filtered out — no fake counterfactuals.

## 2026-05-20 19:00 - Verification recipe drafted

Mapped the curl flow: submit audit → `POST /api/admin/pricing` → `POST /api/detect-changes` → inbox → click re-run → diff at `/a/[id]/rerun`. Goes verbatim in ROUND2_PR.md.

## 2026-05-20 20:00 - Phase 1 sequencing

Vertical slice first: schema + engine refactor + minimal `detect-changes` returning a count. Email and UI go on top of a proven engine, not in parallel.

## 2026-05-20 22:00 - Phase 1 vertical slice landed

Migration 0003, engine refactored with explicit `tools` param. 10 existing engine tests still pass + new proof test (same input, different pricing → different rec). 52/52, typecheck clean.

## 2026-05-20 22:30 - Phase 2: admin pricing endpoint

POST + DELETE `/api/admin/pricing`, bearer-auth, Zod-validated. Rejects unknown `(toolId, planId)`. Tightened schema to undefined-only after a null-vs-undefined typecheck hit.

## 2026-05-20 23:30 - Phase 3: diffing + re-audit orchestration

Pure diff helpers + `reaudit.ts` orchestrator. Skips already-notified `(audit_id, pricing_version)` pairs, groups by lead email. First fixtures were wrong — rebuilt around Claude Team Standard. 57/57.

## 2026-05-21 00:30 - Phase 4: re-audit email template

Consolidated email: one message carries 1..N affected audits with was/now summaries and direct rerun links. Unsubscribe URL threaded through as optional. 59/59.

## 2026-05-21 01:30 - Phase 5: detect-changes send path

`POST /api/detect-changes` groups affected audits by recipient, sends one email per user, writes `reaudit_notifications` only on success. Send/log loop pulled into pure `reaudit-delivery.ts`. 61/61.

## 2026-05-21 02:00 - Sleep

Slept 02:00–09:30. Required 4 features are shipped end-to-end with passing tests, so the floor is locked. Bonuses on the other side of sleep.

## 2026-05-21 10:06 - Phase 6: rerun diff page

`/a/[id]/rerun` server-renders side-by-side diff. Pre-Round-2 NULL-snapshot rows get an honest "predates pricing snapshots" state instead of fabricating a diff. 62/62.

## 2026-05-21 11:14 - Phase 7: prod deploy + live E2E

Deployed via `vercel deploy --prod` from `round-2-reaudit` (PR stays open). Live loop: bump cursor/pro $20→$60, detect-changes returned `affected:1`, email arrived, rerun page flipped from "Downgrade to Pro" to "Switch to Copilot Pro". Reset override after.

## 2026-05-21 12:01 - Phase 7.5: scheduled detect-changes

`.github/workflows/detect-changes.yml` — `0 14 * * *` cron + `workflow_dispatch`, no checkout, single `curl --fail`. Caveat: cron only fires from default branch; PR unmerged means dormant until merge. Documented in PR risks.

## 2026-05-21 13:20 - Phase 7.6: unsubscribe link

HMAC token util existed but `GET/POST /api/unsubscribe` was missing and `markEmailUnsubscribed` was duplicated (compile blocker). Wired `buildUnsubscribeUrl` into the send adapter and added `List-Unsubscribe` headers for Gmail one-click. 70/70.

## 2026-05-21 13:55 - Phase 7.6 fix: email-scoped suppression + HTML escape

Code-review caught two bugs. Suppression was audit-id-scoped while delivery keyed off email — rewrote to email-scoped so future audits under the same email are also muted. Also escaped the raw email param on the unsubscribe success page. 70/70.

## 2026-05-21 14:25 - Phase 7.7: "what changed this week" page

Public `/changes` page, 7-day rolling override feed. Pure `resolveOverrideRow` handles real diff / no-op / orphaned-tool cases. Linked from footer next to "sources". 73/73.

## 2026-05-21 15:10 - Phase 7.8: admin dashboard + CTR signal

Migration 0005 adds `reaudit_clicks`. Threaded `pricingVersion` through to rerun URLs as `?v=<v>`; rerun page logs clicks fire-and-forget. `/admin` cookie-gated via `/admin/login?token=...` constant-time compare, shows audits / emails / CTR. 85/85.

## 2026-05-21 15:30 - Live E2E verification via agent-browser

Drove every Round 2 surface on prod via agent-browser CLI: `/changes`, `/admin` auth states, pricing override happy + reject paths, detect-changes happy + idempotent, rerun diff, CTR tick-up, unsubscribe happy + bad-token + XSS-escape. All 14 points green.

## 2026-05-21 15:45 - Admin UX: cookie-authed pricing controls

`/admin` now has a pricing-override form, "Run detect-changes now" button, and active-overrides list with per-row Clear. All Server Actions re-verify the cookie. Removes the curl/console friction for the reviewer.

## 2026-05-21 16:00 - Cursor pricing email debugging

Dogfood: bumped cursor/pro to $90, got `notifiedRecipients:1`, no inbox. Pulled Resend API log — send went to a wshu.net disposable inbox from Phase 7, not mine. My audit's snapshot was already at $60, so $60→$90 didn't flip the recommendation. Engine working correctly. Updated PR test recipe to clear overrides first.

## 2026-05-21 16:15 - Email template polish: visible unsubscribe

Reviewer flagged: unsubscribe was buried in the small grey footer where Gmail can collapse it. Added a dedicated body-text "Don't want these alerts? Unsubscribe instantly" block right under the audit items, dropped the duplicate from the footer.

## 2026-05-21 16:30 - Phase 8: PR opened, ready to submit

`ROUND2_PR.md` polished to brief's structure. `ROUND2_REFLECTION.md` rewritten in Round 1's voice — file paths, rejected alternatives, broader lesson per answer. DEVLOG entries trimmed to match opening cadence. PR #1 opened against `main`, not merged. Admin token delivered via Google Form, not PR. Submitting next.
