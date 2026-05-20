# Tests

Run them all with:

```bash
pnpm test          # one-shot
pnpm test:watch    # re-runs on change
```

Tests run in CI on every push to `main` (`.github/workflows/ci.yml`), gated alongside lint, typecheck, and the production build.

**Current count: 59 tests across 8 files, all passing.** The audit engine alone has 11, well above the 5-test minimum the brief requires.

## src/lib/audit/**tests**/engine.test.ts (11 tests)

Unit tests for the audit engine. The engine is a pure function, so tests run without any mocking.

| #   | Suite · test name                                                                 | What it covers                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | totals · returns zeroed totals and isOptimal for an empty input                   | The empty case — no spend lines should produce zero totals, `isOptimal: true`, and never trigger the Credex CTA.                                                                                                |
| 2   | totals · annualises monthly savings (×12) and computes savings percentage         | Aggregation math — `annualSavings = monthlySavings × 12` and `savingsPct` is computed from current-vs-recommended spend.                                                                                        |
| 3   | totals · flips surfaceCredex on once monthly savings reach $500                   | The `>$500/mo → surface Credex` threshold from the brief. Uses a high-spend Anthropic API line.                                                                                                                 |
| 4   | totals · treats audits saving less than $100/mo as optimal                        | The `<$100/mo → "you're spending well"` rule from the brief — never manufacture savings.                                                                                                                        |
| 5   | rules · recommends downgrading from Cursor Teams to Cursor Pro when seats are low | Same-vendor downgrade rule fires correctly when a Team-tier plan is bought for too few seats. Asserts the friction weighting picks the easier downgrade over a cross-vendor swap that would save slightly more. |
| 6   | rules · recommends switching ChatGPT Plus to Cursor Pro for a coding-primary user | The cross-vendor alternatives rule. Asserts the engine doesn't fabricate a swap when no entry in `alternatives.ts` matches.                                                                                     |
| 7   | rules · recommends Credex for high direct-API spend at retail                     | The Credex rule — kicks in for vendors in `CREDEX_VENDORS` at ≥$200/mo.                                                                                                                                         |
| 8   | rules · never recommends switching INTO a contract-only plan                      | Engineering-quality test. Plans with `requiresContract: true` (Enterprise tiers) must never appear as a `toPlanId` in any recommendation.                                                                       |
| 9   | rules · attaches a planHealth signal to every result line                         | Plan-health module integration — every line returned from `runAudit` has a `planHealth` field (added Day 3 when the plan-health flag system was introduced).                                                    |
| 10  | rules · respects a custom pricing registry passed as the third argument           | Round 2 proof-of-mechanism — same audit + different pricing registry produces different recommendations / totals.                                                                                               |
| 11  | rules · aggregates per-line recommendations into a coherent total                 | End-to-end shape of a multi-line audit — totals match the sum of line-level savings, and all three rule kinds can co-exist in one audit.                                                                        |

## src/lib/audit/**tests**/diff.test.ts (5 tests)

Pure diffing for Round 2's re-audit feature.

| #   | Test name                                                         | What it covers                                                                                                |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | returns unchanged lines and a same signal when nothing moved      | Baseline case — identical old/new audit results should not trigger a notification.                            |
| 2   | flags recommendation_changed when the recommendation kind changes | Detects a real recommendation swap even when the same input line still exists.                                |
| 3   | flags recommendation_changed when the target plan changes         | Detects same-kind changes where the actual recommended destination plan moved.                                |
| 4   | flags savings_changed when only the savings amount moves          | Distinguishes “same recommendation, different math” from a true target change.                                |
| 5   | handles multi-line mixed diffs                                    | Round 2's real shape — unchanged, recommendation-changed, and savings-changed lines can coexist in one audit. |

## src/lib/audit/**tests**/schema.test.ts (7 tests)

Zod-validation tests for the form input shape — the boundary between the form and `runAudit()`.

| #   | Test name                                                     | What it covers                                                                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | accepts a single-tool well-formed payload                     | The happy path — minimal valid AuditInput passes.                                                       |
| 2   | coerces stringified numbers (form inputs always send strings) | `z.coerce.number()` correctly turns `"5"` into `5`.                                                     |
| 3   | rejects an empty lines array — must audit at least one tool   | `lines.min(1)` enforces the "no empty audit" rule.                                                      |
| 4   | rejects a planId that does not exist on the chosen tool       | The `superRefine` cross-validation catches mismatched tool/plan combos.                                 |
| 5   | rejects negative spend and zero seats                         | Per-line numeric constraints fire.                                                                      |
| 6   | rejects an audit where every line has $0 monthly spend        | Whole-audit refinement requires at least one line with real spend — the audit needs something to audit. |
| 7   | accepts an audit when at least one line has non-zero spend    | Inverse of #6 — mixing one zero-spend line with one real-spend line is valid.                           |

## src/lib/audit/**tests**/id.test.ts (7 tests)

URL-safe audit ID generation and validation (12-char nanoid-style ids used in `/a/[id]`).

| #   | Suite · test name                                                               | What it covers                                                      |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | generateAuditId · produces an id of the requested length (default 12)           | Default length and explicit length both honored.                    |
| 2   | generateAuditId · only emits characters from the URL-safe alphabet              | No `+`, `/`, `=`, or other characters that would need URL-encoding. |
| 3   | generateAuditId · produces distinct ids on repeated calls (no obvious sequence) | Collision resistance — 1000 calls produce 1000 distinct ids.        |
| 4   | generateAuditId · rejects non-positive lengths defensively                      | Throws on `length <= 0`.                                            |
| 5   | isWellFormedAuditId · accepts a freshly-generated id                            | Round-trip validation.                                              |
| 6   | isWellFormedAuditId · rejects ids with disallowed characters or shapes          | Defends against `../`, very long ids, etc.                          |
| 7   | isWellFormedAuditId · rejects non-string inputs without throwing                | Returns `false` instead of crashing on `null`, `undefined`, `42`.   |

## src/lib/audit/**tests**/plan-health.test.ts (6 tests)

Plan-health flag registry — risk/watch/ok signals attached to specific plans.

| #   | Test name                                                         | What it covers                                                                               |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | flags Claude Max 20x as a risk plan with a rate-limit note        | The Vineeth-interview-driven flag. Verifies the public rate-limit shock is surfaced.         |
| 2   | flags premium consumer tiers as watch (Cursor Ultra, ChatGPT Pro) | High-priced plans get a "make sure you're using the headroom" note.                          |
| 3   | flags Claude Pro for the annual prepay opportunity                | $17 annual vs $20 monthly — surfaces a defensible savings the engine doesn't auto-recommend. |
| 4   | flags plans with non-public list pricing for invoice verification | Copilot Business and v0 Premium — sales-only or grandfathered.                               |
| 5   | returns ok with no note for plans not in the registry             | The default — absence of flag is OK, not an oversight.                                       |
| 6   | returns ok rather than throwing on unknown tool/plan combinations | Defensive — never crash on an unexpected key.                                                |

## src/lib/benchmark/**tests**/compute.test.ts (7 tests)

Benchmark positioning — the “how this stack compares to similar teams” card.

| #   | Test name                                                                  | What it covers                                                           |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | returns null for an audit with zero current spend (no signal to compare)   | Avoids fabricating a percentile for a no-spend audit.                    |
| 2   | places a frugal small team in the 'lean' position                          | Low-spend teams should land below the benchmark band.                    |
| 3   | places a mid-team within the typical range when spend matches the baseline | Baseline spend should classify as typical, not elevated.                 |
| 4   | flags an elevated spend at +30% above the bucket baseline                  | The elevated tier threshold fires at the intended distance from average. |
| 5   | flags a heavy team at p90 or above                                         | High-spend outliers get the strongest benchmark warning.                 |
| 6   | scales the expected average down for writing-primary teams                 | Use-case weighting changes the expected spend, not just team size.       |
| 7   | uses the largest bucket for enterprise team sizes (201+)                   | Large teams clamp to the final benchmark bucket instead of overflowing.  |

## src/lib/ai/**tests**/templated-summary.test.ts (7 tests)

Deterministic fallback paragraph used when the Gemini API call fails or isn't configured.

| #   | Suite · test name                                                                   | What it covers                                                          |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | tone tiers · produces the 'no savings' tier copy when monthlySavings <= 0           | The "you're spending well" tone.                                        |
| 2   | tone tiers · produces the 'modest savings' tier copy when isOptimal but savings > 0 | The hygiene-only tier.                                                  |
| 3   | tone tiers · produces the 'material savings' tier copy with a top-move clause       | The action-oriented tier.                                               |
| 4   | copy quality · never uses exclamation marks or banned superlatives                  | Mirrors the constraints in `PROMPTS.md`.                                |
| 5   | copy quality · lands in the 80–130 word band across all three tiers                 | Length target for visual parity with the AI output.                     |
| 6   | copy quality · is deterministic — same input produces identical output              | The point of a templated fallback — reproducible.                       |
| 7   | copy quality · renders as a single paragraph (no newlines, no markdown)             | No bullets, no headings, matching the prompt's "exactly one paragraph". |

## src/lib/email/**tests**/templates.test.ts (9 tests)

Resend transactional email templates — pure rendering, no Resend call.

| #   | Suite · test name                                                                                                | What it covers                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | renderLeadConfirmation · puts the formatted monthly savings in the subject line                                  | Subject builds correctly.                                                                                                                     |
| 2   | renderLeadConfirmation · mentions Credex follow-up when surfaceCredex is true (≥$500/mo savings)                 | The brief's "transactional email noting Credex will reach out for high-savings cases" line.                                                   |
| 3   | renderLeadConfirmation · omits the Credex-follow-up sentence when surfaceCredex is false                         | Below-threshold audits don't sell.                                                                                                            |
| 4   | renderLeadConfirmation · includes the share URL when provided, omits when null                                   | Local-only fallback doesn't link to a 404.                                                                                                    |
| 5   | renderLeadConfirmation · escapes HTML-significant characters in the rendered HTML                                | XSS guard — `<`, `>`, `&`, quotes all escaped.                                                                                                |
| 6   | renderNotifyConfirmation · has a stable subject and non-empty text and html                                      | Both wire formats render.                                                                                                                     |
| 7   | renderNotifyConfirmation · never mentions Credex by name (notify path is the no-pitch path)                      | Opt-in watch list doesn't pitch a vendor.                                                                                                     |
| 8   | renderReauditNotification · renders a single affected audit with a rerun link and old/new recommendation copy    | Phase 4's main path — one changed audit produces one rerun link and a useful summary of what moved.                                           |
| 9   | renderReauditNotification · renders multiple audits in one email and includes the unsubscribe link when provided | Consolidation logic at the template level — multiple changed audits share one email, and the later unsubscribe hook is present when supplied. |

## What is **not** tested today

- **Server actions** — `runAuditAction`, `captureLeadAction`, `getOrGenerateSummaryAction`. They're thin wrappers around the engine + DAL, both of which are covered above. The integration test would require a live Supabase, which CI doesn't have.
- **The Gemini summary HTTP path** — `generateSummary` mocks would test almost nothing of value. The templated fallback (which is the production code path on any failure) IS fully tested.
- **UI components** — the visual layer is exercised by Lighthouse + manual cross-browser checks + the QA pass under `dogfood-output-2026-05-12/`, rather than React Testing Library, since none of it is interactive enough to need a snapshot.

If the engine, schema, plan-health, summary, and email modules all pass, the actual product is one server action away from working — and those server actions are 30 lines each, hard to break without the type system noticing.
