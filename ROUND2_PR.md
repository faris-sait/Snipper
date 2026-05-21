# feat: add re-audit on pricing change with email notifications

## What this PR does

Persists each audit with the pricing it was scored against, lets an operator mutate live pricing via UI or API, detects which stored audits would now produce a different recommendation, sends one consolidated email per affected user, and renders a side-by-side diff at the same `/a/<id>` URL Round 1 already exposed.

## Why

A static audit ages badly — Cursor raised prices, Claude added tiers, Copilot restructured. If Snipper told a team "switch to Cursor Pro at $20" and Pro is now $60, the recommendation is the reason for the wrong call. Assumption: a user who handed over their stack once is asking to be told when our advice would change. One email per real recommendation flip, never per price tick.

## How it works

- **`pricing_overrides (tool_id, plan_id, overrides, updated_at)`** sits on top of the in-code `TOOLS` registry. `getEffectiveTools()` overlays both and emits a 16-char `pricing_version` (sha256 of canonical JSON) — that hash is the idempotency key for everything downstream.
- **On audit submit:** capture a per-input `pricing_snapshot` JSON of just the tools referenced and their alternative-targets (~1-2 KB).
- **`POST /api/detect-changes`** (or `/admin`'s button): re-run the engine on each stored audit. If the recommendation kind or target flips, group affected audits by recipient, send one consolidated email per recipient, write a `reaudit_notifications (audit_id, pricing_version)` row per successful send so re-runs against the same pricing are no-ops.
- **The email** links to `/a/<id>/rerun?v=<pricing_version>` — that page renders the diff (savings delta as headline) and logs to `reaudit_clicks` for the admin CTR counter.
- **Engine refactor:** `runAudit` now takes an explicit `tools` parameter (default = `TOOLS`); existing engine tests pass unchanged.

## What I cut

- **Live vendor scraping.** Brief evaluates with manual price moves; admin override is faster and doesn't risk false positives from a scraper bug.
- **Per-audit notification preferences.** Unsubscribe is email-scoped — simpler, future audits under that email are also muted.
- **Vercel Cron.** Wired GitHub Actions instead; non-default-branch caveat in risks below.
- **Resend webhook for click tracking.** CTR tracked first-party via the `?v=` query param — survives Resend tier limits, data stays in our DB.

## How to test it manually

The admin dashboard is gated behind an `ADMIN_TOKEN` cookie. I'm including a one-click `/admin/login?token=...` magic link in the Google Form submission rather than checking the token into this PR — it sets a 12h HttpOnly cookie and lands you on `/admin`. From there:

1. Submit a fresh audit at `/audit` — **Cursor / Teams plan, 2 seats, $80/mo, your real email**. Wait for the confirmation email.
2. On `/admin` → "Set or update a pricing override" → pick **Cursor · Pro · $20 baseline** → enter `60` → Apply.
3. Click "Run detect-changes now".
4. Inbox lands "Pricing changed on N of your audits" within ~10s. Verify: vendor move Cursor Pro $20→$60; recommendation flipped from "downgrade to Pro" to "switch to GitHub Copilot Pro"; Unsubscribe block under the audit items.
5. Click "Compare old vs new audit" → side-by-side diff with savings delta headline.
6. Reload `/admin` → CTR ticks up.
7. (Bonus) Click "Unsubscribe" → re-trigger detect-changes → no second email.
8. (Cleanup) "Active overrides" → "Clear".

**Prefer curl?** Hit `POST /api/admin/pricing` and `POST /api/detect-changes` with `Authorization: Bearer <ADMIN_TOKEN>` — same code path, same token (also in the Google Form submission).

## What's tested

- **85/85 vitest, typecheck clean, targeted eslint clean on the diff.**
- Engine: same input + moved pricing → different recommendation; original engine tests pass unchanged.
- Diff library: no-change, kind-change, target-change, savings-only, multi-line.
- Orchestration: per-recipient grouping, **email-scoped unsubscribe across audits**, idempotency log.
- Templates: single + multi-audit consolidated email, unsubscribe URL, `?v=` rerun-URL annotation.
- Admin: constant-time HMAC token verify, pure CTR computation, override-resolver helper (real diff / no-op / orphaned tool).
- **Not automated:** Supabase round-trips, Resend send path, route handlers. The flow above is the manual integration test.

## Open questions / risks

- **GitHub Actions cron is dormant until merge.** `.github/workflows/detect-changes.yml` has both `schedule` and `workflow_dispatch`, but GitHub only activates scheduled workflows from the **default branch**. PR is intentionally unmerged, so the Actions UI shows "this workflow does not exist" and the cron won't fire during evaluation. The endpoint it calls is the same one `/admin`'s button hits. The workflow goes live the moment this PR merges.
- **Emails fire only on non-trivial diffs.** Small price moves where the same alternative stays optimal don't trigger an email — matches the brief's "audit logic would produce a different recommendation" wording. A stricter "any move" interpretation would email more. `/changes` surfaces every price move regardless.
- **Pre-Round-2 audits have `pricing_snapshot = NULL`** and are filtered out of detect-changes — can't honestly diff against today's pricing without a snapshot. Their `/a/<id>/rerun` page renders an explicit "predates pricing snapshots" state instead of a counterfactual.
