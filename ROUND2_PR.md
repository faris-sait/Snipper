# feat: add re-audit on pricing change with email notifications

> Scaffold — body filled in during Phase 8. Section headings frozen to match the brief's required structure exactly. Filenames matter, structure matters.

## What this PR does

_2-3 sentences. The feature in plain language._

## Why

_2-3 sentences. Why this matters, who benefits, what assumption I made about the user._

## How it works

_Short walkthrough: where the new code lives, how the data flows, what triggers what. ASCII diagram if it clarifies; prose only is fine if it doesn't._

## What I cut

_3-5 bullets. What I decided NOT to build, and why. Honest about value/effort ratio in 36h. "I ran out of time" is acceptable as long as I'm specific about what was next._

## How to test it manually

_Step-by-step instructions so the reviewer can verify the feature works. Copy-pasteable curl recipe end to end: submit audit → mutate pricing → trigger detect-changes → confirm email → click re-run link → see diff._

## What's tested

- `src/lib/audit/__tests__/engine.test.ts` proves the engine output changes when the same audit is run against a moved pricing registry.
- `src/lib/audit/__tests__/diff.test.ts` covers no-change, recommendation-kind change, target-plan change, savings-only change, and mixed multi-line diffs.
- `src/lib/email/__tests__/templates.test.ts` covers the existing confirmation templates plus the new consolidated re-audit email for single-audit and multi-audit cases.
- Full suite currently passes at 59/59. Typecheck clean. Route-handler integration tests are still manual for now; the curl recipe will go in `## How to test it manually`.

## Open questions / risks

_2-3 bullets. What would worry me if this shipped to production tomorrow._
