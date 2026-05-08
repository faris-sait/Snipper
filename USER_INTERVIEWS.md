# User interviews

Notes from three real conversations with potential users, ~15 minutes each. Filled in after each call while the conversation was still fresh — never reconstructed from memory days later.

> **Filling instructions for me (delete before submitting):** for each interviewee, capture name + role + stage + 3+ direct quotes + the most surprising thing they said + what that changed about the design. Per the brief, this section is one of the strongest signals reviewers read — specificity beats polish.

---

## Interview 1 — Muralidhar Goparaju, CEO @ Amberflux EdgeAI

**Date:** _to be filled_
**Format:** _call / coffee / WhatsApp / etc_
**Length:** _to be filled_
**Company stage:** _to be filled — seed / Series A / bootstrapped / etc_

### What we talked about

_2-3 sentences setting context: what you opened with, where the conversation went._

### Direct quotes

> "_quote 1 — verbatim_"

> "_quote 2 — verbatim_"

> "_quote 3 — verbatim_"

### The most surprising thing they said

_The thing that didn't fit your assumption. The contradiction. The detail that wasn't on your interview sheet._

### What it changed about my design

_Concrete change to Snipper — a feature added, removed, deprioritised, or re-framed because of this conversation. If nothing changed, say so honestly: "Validated [X assumption], no design change."_

---

## Interview 2 — Gooduru Vineeth, Tech Lead @ Everything About AI (pre-launch)

**Date:** 2026-05-07
**Format:** WhatsApp (async, with one follow-up)
**Length:** ~10 min wall-clock across the thread
**Company stage:** pre-launch / stealth

### What we talked about

Sent 5 questions about Everything About AI's AI tool subscriptions — which tools the team pays for, rough monthly spend, who picks new tools, last time the bill was reviewed, and the single biggest frustration. Vineeth replied in one short message: specific but terse. Sent two follow-ups — one asking why only Claude (which surfaced the inertia line), and one on which Claude plan, which surfaced that the team is on Claude Max 20x ($200/mo).

### Direct quotes

> "Claude" — entire answer to "which AI tools does the team pay for?"

> "Claude Max 20x" — the specific plan, after follow-up

> "engineers try it out with free or personal accounts then management decides"

> "it is expensive, it is increasingly expensive"

> "Claude was the first one we tried, never bothered exploring"

### The most surprising thing they said

I went in assuming someone building an AI startup literally called "Everything About AI" would have a sprawling tool stack — Cursor for code, Claude for writing, ChatGPT for data, maybe v0 or Copilot layered on top. Reality: just Claude Max 20x at $200/mo, nothing else. The pain isn't sprawl across multiple tools — it's that one specific plan, on the one specific vendor, getting more expensive every month. And the reason it's a single tool isn't strategy, it's pure inertia: *"Claude was the first one we tried, never bothered exploring."* That's the inverse of the problem Snipper was originally scoped around (multi-tool sprawl). Even more interesting: Claude Max 20x is *the* plan that's been generating the loudest public rate-limit-shock complaints in the last 60 days (Anthropic tightened limits post-v2.1.89). So Vineeth's "increasingly expensive" complaint isn't subjective — it's a documented pattern.

### What it changed about my design

Three concrete changes.

**Single-tool audits.** The form has to handle "I only pay for one tool" without friction — no nudging the user to add more tools before they can run an audit. The rules engine also has to produce useful output even when there's nothing to switch *down* to.

**Plan-specific risk flags.** For users on heavily-discussed plans like Claude Max 20x, the audit should surface the recent rate-limit-shock pattern by name, not just say "your plan looks fine." This is plan-trajectory intel, distinct from the cheapest-alternative recommendation. Adding a "Plan health" output field to the rules engine in Phase 3.

**Procurement-handoff in the share page** (GTM angle for ECONOMICS.md and GTM.md). The "engineers test on free or personal accounts, then management decides" pattern means the buyer running the audit might not be the one feeling the pain day-to-day. The share-page should make forwarding an audit to a teammate trivial — that handoff *is* the actual procurement workflow.

---

## Interview 3 — Sahejad Thariya, Founder & CEO @ AddamCo

**Date:** 2026-05-08
**Format:** Async messages (same 5-question script as Vineeth, terse replies)
**Length:** ~15 min
**Company stage:** _to confirm with Sahejad — answers are consistent with a small/early team_

### What we talked about

Sent the same 5-question script I used with Vineeth: which AI tools they pay for, rough monthly spend, who decides what to add, last time they reviewed the bill, single biggest frustration. Sahejad's a non-engineer founder, so I expected the buying side to look different — and the very first answer surfaced an entire subscription category Snipper currently doesn't model.

### Direct quotes

> "Gemini, ChatGPT, and we do use Kling and Seedance but all in one platform called Freepik"

> "I do. But it's like whoever gets the better tool in hand"

> "I do not remember" — answer to "last time you compared plans or looked at the bill?"

> "Limited tokens. And an expensive amount of extra tokens"

### The most surprising thing they said

The Freepik bundling. Snipper's pricing registry treats each vendor as a discrete subscription line — a user inputs "ChatGPT, Plus, $20/mo" and the engine looks up ChatGPT's plans. But Sahejad pays *none* of Gemini, ChatGPT, Kling, or Seedance directly — he pays Freepik, which bundles them. There's a whole subscription category I haven't modelled: aggregator platforms (Freepik AI Suite, OpenRouter, Together AI, Genspark, Poe). If aggregators are how under-$500/mo teams normally buy AI — and they probably are, since bundling reduces friction — Snipper's MVP can't honestly audit them. Secondary surprise: he claims he picks tools, then immediately admits "whoever gets the better tool in hand" wins. Same procurement-by-inertia pattern Vineeth described, even more chaotic — there isn't even a "management decides" step.

### What it changed about my design

Three concrete changes.

**Aggregator / bundle tool category.** Phase-4 backlog item: add "Freepik AI Suite" to the pricing registry as a tool with a single bundled plan and an `aggregator: true` tag, so the rules engine doesn't try to recommend a single-vendor downgrade against a bundled total. Trust the user-reported spend; surface the bundle's component vendors so the user can verify what's covered. Same shape later for OpenRouter / Together AI / Poe if interview 4+ confirms this is a real category and not a one-off.

**Token-overage as a first-class Plan Health signal.** Today's plan-health module flags Claude Max 20x for rate-limit shock. Sahejad's pain is the same shape in different vocabulary — "limited tokens, expensive extra tokens." Generalise the registry into a "token-economics" flag for any plan where the *marginal* cost is the real risk, not the base subscription price. The audit reasoning text should call this out explicitly: "your $X base plan looks fine, but overage at $Y/1M tokens is what's making the bill grow."

**Procurement chaos goes into landing copy.** "Whoever gets the better tool in hand" is exactly the buying behaviour the Mint-for-AI-spend pitch needs to name. Pull into LANDING_COPY.md and GTM.md when those land — it's better social proof than a fabricated testimonial.
