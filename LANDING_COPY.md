# Landing copy

The actual ship-able copy a marketer would deploy to `snipper-alpha.vercel.app/`. Where the live page diverges from this doc, this doc is the canonical reference — the live page evolves, this doc is the source of truth for tone, claims, and FAQ answers.

## Hero headline (≤10 words)

> **See what your AI tools actually cost.**

(7 words.) Two alternatives considered:

- *"Your AI subscriptions, audited in 60 seconds."* (7 words) — leans on time-to-value but loses the "actually" pivot, which is the emotional hook for someone who suspects but can't yet prove they're overspending.
- *"Find the overspend in your AI tool stack."* (8 words) — accurate, but presupposes the user already uses the word "overspend" mentally. Most don't; they think "the bill keeps going up."

Picked the first because it earns the click without naming the verdict. The verdict is what the audit is for.

## Subheadline (≤25 words)

> Free instant audit. Tells you which subscriptions to downgrade, switch, or replace — with reasoning a finance person can verify. No signup required.

(22 words.) The "no signup required" is load-bearing. All three interviews surfaced founder skepticism of email-gated tools — the gate reads as evidence of low confidence in the product. Putting it in the subhead is a credibility play, not just a feature claim.

## Primary CTA

> **Button:** *Run my audit*
>
> **Microcopy under it:** *60 seconds. We'll show you the numbers before asking for anything.*

The button verb pairs with the route (`/audit`); the microcopy resolves the unstated *"is there a catch?"* anxiety in one line and pre-commits Snipper to the post-value lead-capture the brief mandates.

## Social proof block

> **(All quotes mocked — to be replaced with real audit testimonials once volume accumulates. Stat strip likewise mocked, labelled below.)**

Three quote cards, attributed by role and stage only — the real interviewees haven't agreed to public attribution:

> *"I went in expecting to switch tools. The audit told me to downgrade my plan. One click, $40/mo back."*
> — Tech Lead, pre-launch AI startup

> *"I'd been ignoring my Anthropic bill for three months. The audit said it'd save $660/mo via discounted credits. I wasn't ignoring it after that."*
> — CEO, 8-person AI infrastructure startup

> *"Honest enough to say my Freepik bundle isn't auditable yet. That's the only audit tool I'd trust."*
> — Founder, 4-person creative tools team

**Stat strip — `(mocked — replace once real)`:**

> $X audited so far · Y audits run this week · avg savings $Z/mo

## FAQ — 5 real Q&As

**Do I need to upload an invoice or screenshot?**

No. You enter the plans you're on; we do the math from each vendor's published pricing. Every number traces to a vendor URL with a verification date — see [`PRICING_DATA.md`](./PRICING_DATA.md) if you want to verify the math before running the audit.

**Does this work for API usage, not just seats?**

Yes — Anthropic API direct, OpenAI API direct, plus seat plans for Cursor / GitHub Copilot / ChatGPT / Claude / Gemini / Windsurf. Aggregator platforms (Freepik AI Suite, OpenRouter, Together AI, Poe) are on the roadmap; today they're flagged as not-yet-modelled rather than silently miscounted.

**Will you spam me?**

No. Email capture happens *after* you see your audit, never before. We send one transactional email confirming the result, plus an opt-in re-run reminder if your stack changes (e.g. you asked to be notified when a vendor's pricing or plan structure shifts in your favour). Unsubscribe is one click.

**Are you affiliated with the vendors you recommend?**

No. Recommendations are friction-weighted toward the easiest correct fix, not the largest commission. The high-savings audits surface Credex (the company funding this tool) as one option — never the only one. The audit reasoning is open in [`src/lib/audit/rules.ts`](./src/lib/audit/rules.ts); read it before trusting it.

**What if my stack is already optimised?**

Then we'll say so, honestly. Below ~$100/mo of defensible savings the audit tells you "you're spending well" rather than manufacturing recommendations to justify the page. There's a "notify me when something changes" option to re-run the audit when a vendor pricing shift or a team-size change might re-open optimization room.
