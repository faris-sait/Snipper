# User interviews

Notes from three real conversations with potential users, ~15 minutes each. Filled in after each call while the conversation was still fresh — never reconstructed from memory days later.

---

## Interview 1 — Muralidhar Goparaju, CEO @ Amberflux EdgeAI

**Date:** 2026-05-09
**Format:** 15-min call. Opened with a one-minute pitch on what Snipper is — a free AI spend audit that surfaces overspend without an email gate — then walked through the same 5-question script as Vineeth and Sahejad.
**Length:** ~15 min
**Company stage:** small / early team

### What we talked about

Same 5-question script I'd used for the other two interviews: which AI tools the team pays for, rough monthly spend, who picks new tools, last time they looked at the bill, and the single biggest frustration. Murali's first four answers were one-liners; the fifth, on the single biggest frustration, was where the call slowed down — agent-mode usage, bill unpredictability, what we were really there to talk about. The reason it ran 15 min instead of 10 was almost entirely that fifth answer.

### Direct quotes

> "ChatGPT, Claude" — entire answer to "which AI tools does Amberflux currently pay for?"

> "Under $500 per month"

> "Engineers" — answer to "who picks what to add?"

> "This month" — last time he looked at the bill

> "Lack of clarity on what could be the bill especially in AI agents usage"

### The most surprising thing they said

Two things, and they reinforce each other.

The fifth answer is a different *shape* of pain than the other two interviews surfaced. Vineeth's is retrospective — Claude Max 20x got worse after v2.1.89, rate limits tightened, the bill held but the value dropped. Sahejad's is contemporaneous — token overages blow up the Freepik bundle in real time. Murali's is forward-looking: he doesn't know what the bill is *going to be*, because his team runs AI agents (Cursor agent mode, Claude Code, operator-style flows) where token consumption is wildly variable run-to-run. An agent can quietly chew through $50 of credits in an afternoon if it's chasing a long task. The pain isn't "we paid too much last month" — it's "I have no way to forecast next month."

The second surprise is that he reviewed the bill *this month*, which contradicts the brief's framing of "they look at their monthly bill, sigh, and pay it." Murali isn't passive — he's actively watching the line item. So at least some users for Snipper aren't unaware of overspend; they're aware and feel out of control. That's a different product hook than "Mint for AI spend you didn't know you had."

### What it changed about my design

Three concrete changes.

**Agent-usage volatility flag in Plan Health.** Today's plan-health module covers two failure shapes: rate-limit shock (Claude Max 20x, Vineeth's pain) and token overage on capped plans (Freepik AI bundle, Sahejad's pain). Murali's pain is a third shape — a plan whose *base* price is fine, whose *limits* haven't moved, but whose *expected* monthly cost is unpredictable because agentic usage dominates consumption. New flag id `agent_usage_volatility` for plans where this is the dominant risk vector — Anthropic API direct, OpenAI API direct, and probably Cursor Business when run in agent mode. Audit copy made explicit: "your base plan is appropriately priced, but agent-mode consumption is what's making the bill move."

**Bill-projection mode goes on the post-MVP backlog (now properly justified).** The audit answers "should you switch?" — it doesn't answer "what will you spend next month?" If Snipper wants to be Mint-for-AI-spend in any honest sense, forecasting belongs in v2. For Phase 5–7 of this build it stays a backlog line in METRICS, but it's earned its place — three interviews in, two of them have a forecasting/uncertainty pain the current audit doesn't address.

**Three for three: founder runs the audit, engineers act on it.** Vineeth said "management decides," Sahejad said "whoever gets the better tool in hand," Murali said "engineers." All three are CEOs/founders who admit they aren't the actual picker. The share-page handoff (already on the Vineeth-driven backlog) just got stronger validation — the buyer running the audit is *systematically* not the person who'd execute the recommendations. Reinforces the priority of clean share-link copy plus a "send this audit to your engineering team" affordance.

---

## Interview 2 — Gooduru Vineeth, Tech Lead @ Everything About AI (pre-launch)

**Date:** 2026-05-07
**Format:** 10-min call. Opened with a one-minute pitch on what Snipper is, then walked through the 5-question script.
**Length:** ~10 min
**Company stage:** pre-launch / stealth

### What we talked about

Five questions on Everything About AI's AI tool subscriptions — which tools the team pays for, rough monthly spend, who picks new tools, last time the bill was reviewed, and the single biggest frustration. Vineeth's answers were terse but specific. Followed up mid-call on why *only* Claude (which surfaced the inertia line) and which Claude plan exactly — turned out to be Claude Max 20x at $200/mo.

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
**Format:** 10-min call. Same opening pitch on Snipper, then the same 5-question script I'd used with Vineeth.
**Length:** ~10 min
**Company stage:** small / early team

### What we talked about

Same 5-question script I used with Vineeth: which AI tools they pay for, rough monthly spend, who decides what to add, last time they reviewed the bill, single biggest frustration. Sahejad's a non-engineer founder, so I expected the buying side to look different — and the very first answer surfaced an entire subscription category Snipper currently doesn't model.

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
