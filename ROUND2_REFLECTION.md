# ROUND 2 — Reflection

## 1. What was the most uncomfortable trade-off I made because of the time pressure?

Skipped automated integration tests for the Next.js route handlers and the Resend send path. Every layer *below* the handler has unit tests — engine output stability, the five diff cases at `src/lib/audit/__tests__/diff.test.ts`, the grouping + cross-audit unsubscribe suppression at `src/lib/audit/__tests__/reaudit-grouping.test.ts`, HMAC token verify (constant-time, length-leak safe) at `src/lib/email/__tests__/unsubscribe.test.ts`, pure CTR computation, override-resolver (real diff / no-op / orphaned tool). 85/85 green. But the three route handlers — `/api/detect-changes`, `/api/admin/pricing`, `/api/unsubscribe` — and the actual Resend SDK call are exercised only by the curl recipe in `ROUND2_PR.md`.

The math: writing a Vitest harness with an in-memory Supabase fake and a Resend mock would have cost ~3 hours. Phase 7.5–7.8 (GH Actions cron, unsubscribe, `/changes`, admin dashboard with CTR) cost ~4. The bonuses are worth more rubric points (and the brief gates them on the required-4 working, which they do). I made the call. It's still uncomfortable because the layer with the highest blast radius — the one that touches real user inboxes — has the thinnest safety net. A regression that breaks `groupAffectedByEmail`'s Supabase query without breaking the pure helpers won't fail any test. It will fail in someone's inbox.

## 2. If we extended the deadline by another 24 hours right now, what's the *first* thing I'd do?

Close the gap from question 1. One focused PR, ~3–4 hours.

Add `src/app/api/**/__tests__/route.test.ts` files that:
1. Mock `getSupabaseService()` to return a fake client backed by `Map<table, Row[]>` with the same `.from().select()/.insert()/.upsert()/.delete()` surface the real handlers use.
2. Mock the Resend SDK at `src/lib/email/client.ts` to capture sends into an array instead of hitting the network.

Then assert: `POST /api/detect-changes` against three fixture audits with mixed snapshots produces the expected grouped sends and the right `reaudit_notifications` rows; a second call with the same `pricing_version` writes zero new rows and sends zero emails (idempotency); `POST /api/admin/pricing` with an unknown `(toolId, planId)` returns 400 and writes nothing; `GET /api/unsubscribe` with a tampered token returns 403 and leaves `audit_leads.unsubscribed_at` NULL.

I picked this over building a vendor-pricing scraper (higher product value, much more risk on the 24h clock) and over moving the GH Actions workflow to main (would need a separate PR outside `round-2-reaudit`, awkward git story). The route-handler tests are the highest-leverage *defensive* thing — they make every future change safe, including the changes I'd make in week 3 onward.

## 3. Looking back at my Round 1 codebase as a now-experienced user of it: what's one thing my Round 1 self made harder for my Round 2 self?

`runAudit()` at `src/lib/audit/engine.ts` consumed the in-code `TOOLS` registry via a module-level import rather than taking a `tools` parameter. Round 1 me wasn't wrong — it was convenient, kept the call site clean, and there was no second pricing source to consider.

Round 2 me had to refactor the engine signature, thread `tools` through every rule helper in `src/lib/audit/rules.ts`, update `getPlanFrom` and `getToolFrom` to take a registry, and keep the 10 existing engine tests passing unchanged. About two hours of careful surgery on the first day of a 36-hour clock, *before* any actual feature work could start. The alternative I considered — `AsyncLocalStorage` for pricing context — would have been faster but introduced silent-fallthrough risk (engine sees `undefined`, falls back to module `TOOLS`, snapshot semantics quietly break). Rejected it.

The generalisable lesson isn't "always inject dependencies" — that's premature flexibility, and Round 1 me was right to skip it. It's narrower: anything that represents *the world's state at audit time* — pricing, current date, user identity — is worth taking as a parameter from day one even when there's only one caller. The cost is one extra argument. The savings are an extension story that doesn't start with a refactor.
