# Tests

Run them all with:

```bash
pnpm test          # one-shot
pnpm test:watch    # re-runs on change
```

Tests run in CI on every push to `main` (`.github/workflows/ci.yml`), gated alongside lint, typecheck, and the production build.

## src/lib/audit/__tests__/engine.test.ts

Unit tests for the audit engine. The engine is a pure function, so tests run without any mocking.

| # | Suite · test name | What it covers |
|---|---|---|
| 1 | totals · returns zeroed totals and isOptimal for an empty input | The empty case — no spend lines should produce zero totals, `isOptimal: true`, and never trigger the Credex CTA. |
| 2 | totals · annualises monthly savings (×12) and computes savings percentage | Aggregation math — `annualSavings = monthlySavings × 12` and `savingsPct` is computed from current-vs-recommended spend. |
| 3 | totals · flips surfaceCredex on once monthly savings reach $500 | The `>$500/mo → surface Credex` threshold from the brief. Uses a high-spend Anthropic API line. |
| 4 | totals · treats audits saving less than $100/mo as optimal | The `<$100/mo → "you're spending well"` rule from the brief — never manufacture savings. |
| 5 | rules · recommends downgrading from Cursor Teams to Cursor Pro when seats are low | Same-vendor downgrade rule fires correctly when a Team-tier plan is bought for too few seats. Asserts the friction weighting picks the easier downgrade over a cross-vendor swap that would save slightly more. |
| 6 | rules · recommends switching ChatGPT Plus to Cursor Pro for a coding-primary user | The cross-vendor alternatives rule. Asserts the engine doesn't fabricate a swap when no entry in `alternatives.ts` matches. |
| 7 | rules · recommends Credex for high direct-API spend at retail | The Credex rule — kicks in for vendors in `CREDEX_VENDORS` at ≥$200/mo. |
| 8 | rules · never recommends switching INTO a contract-only plan | Engineering-quality test. Plans with `requiresContract: true` (Enterprise tiers) must never appear as a `toPlanId` in any recommendation. |
| 9 | rules · aggregates per-line recommendations into a coherent total | End-to-end shape of a multi-line audit — totals match the sum of line-level savings, and all three rule kinds can co-exist in one audit. |

That's 9 tests today, well above the 5-test minimum the brief requires for the audit engine. The list will grow as Phases 4 and 5 add server actions and the Anthropic summary fallback path.

## What is **not** tested today

- **Server actions** — no `/audit` form exists yet. Phase 2 adds the form; Phase 2 will add an integration test for the action calling into `runAudit`.
- **Supabase persistence** — Phase 4 adds an integration test that hits a local Supabase via `supabase start`.
- **The Anthropic summary fallback** — Phase 5 adds a test that mocks a 429 from the API and asserts the templated fallback is used.
- **UI components** — visual layer is exercised by Lighthouse + manual cross-browser checks rather than React Testing Library, since none of it is interactive enough to need a snapshot.

Any of those will be added in their own phase commit.
