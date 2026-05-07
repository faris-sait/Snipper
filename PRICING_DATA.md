# Pricing data sources

Every monetary value used in the audit engine traces to a row in this file. Each row cites the vendor's official pricing page and the date the figure was verified.

**Last full verification:** 2026-05-07
**Verifier:** automated `WebFetch` of the live pricing pages, with caveats noted inline. Where a page was unreachable (HTTP 403 from CDN), the row notes the secondary source and is flagged for manual confirmation.

> **Code mirror:** the same numbers live in `src/lib/pricing/tools.ts`. If you change one, change the other in the same commit.

---

## Cursor

The Cursor pricing page no longer uses a "Business" tier label — the team plan is now branded "Teams" at $40/user/month. The brief was written before this rename; we use the current vendor names.

- Hobby (Free): $0/user/month — https://cursor.com/pricing — verified 2026-05-07 — limited Agent requests, limited Tab completions, no credit card required
- Pro: $20/user/month — https://cursor.com/pricing — verified 2026-05-07 — extended Agent limits, frontier model access, MCPs/skills/hooks, cloud agents
- Pro+: $60/user/month — https://cursor.com/pricing — verified 2026-05-07 — "3× usage on all OpenAI, Claude, Gemini models" (vendor-marked "Recommended")
- Ultra: $200/user/month — https://cursor.com/pricing — verified 2026-05-07 — "20× usage" tier with priority access to new features
- Teams: $40/user/month, **min 2 seats** — https://cursor.com/pricing — verified 2026-05-07 — shared chats/commands/rules, centralized billing, analytics, RBAC, SAML/OIDC SSO
- Enterprise: custom pricing (contact sales) — https://cursor.com/pricing — verified 2026-05-07 — pooled usage, invoice/PO billing, SCIM, audit logs, priority support

## GitHub Copilot

GitHub's `/features/copilot/plans` page hides the Business price behind organisational purchase. We keep Business as a selectable input but mark it `requiresContract: true` in the engine so we never auto-recommend switching INTO it.

- Free: $0/user/month — https://github.com/features/copilot/plans — verified 2026-05-07 — 50 agent-mode/chat requests per month, 2,000 completions per month, no credit card required
- Pro: $10/user/month — https://github.com/features/copilot/plans — verified 2026-05-07 — 300 premium requests, unlimited agent mode and chats, unlimited inline suggestions
- Pro+: $39/user/month — https://github.com/features/copilot/plans — verified 2026-05-07 — 1,500 premium requests (5× Pro), unlimited agent mode and chats
- Business: price not published on the public plans page — https://github.com/features/copilot/plans — verified 2026-05-07 — IDE, CLI, GitHub Mobile features
- Enterprise: custom pricing (contact sales) — https://github.com/features/copilot/plans — verified 2026-05-07 — all Business features plus GitHub.com integration and codebase indexing

## Claude (Anthropic) — consumer plans

Anthropic redirects `anthropic.com/pricing` → `claude.com/pricing`. We use the redirected URL.

- Free: $0/month — https://claude.com/pricing — verified 2026-05-07 — basic access; specific message quotas not numerically published
- Pro: $20/month billed monthly, $17/month with annual ($200 prepaid, ~15% discount) — https://claude.com/pricing — verified 2026-05-07 — individual user, "more usage" vs Free
- Max (5×): from $100/month — https://claude.com/pricing — verified 2026-05-07 — 5× more usage than Pro, higher output limits
- Max (20×): from $200/month — https://claude.com/pricing — verified 2026-05-07 — 20× more usage than Pro
- Team Standard: $25/seat/month monthly, $20/seat/month annual (~20% discount) — https://claude.com/pricing — verified 2026-05-07 — **min 5 seats**, max 150 seats
- Team Premium: $125/seat/month monthly, $100/seat/month annual — https://claude.com/pricing — verified 2026-05-07 — **min 5 seats**, max 150 seats
- Enterprise: $20/seat base + usage at API rates; annual billing required — https://claude.com/pricing — verified 2026-05-07 — large organizations, custom seat counts

## Claude API (Anthropic) — usage-based

API pricing redirects to `platform.claude.com/docs/...`. The audit engine uses user-reported monthly spend, not per-token math, so these figures inform the Credex rule's discount calibration but not per-tool plan-fit.

- Claude Opus 4.7: $5 / 1M input tokens, $25 / 1M output tokens (cache write 5m: $6.25, cache write 1h: $10, cache hits: $0.50 / 1M) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Opus 4.6: $5 / 1M input, $25 / 1M output (cache: $6.25 / $10 / $0.50) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Opus 4.5: $5 / 1M input, $25 / 1M output (cache: $6.25 / $10 / $0.50) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Opus 4.1: $15 / 1M input, $75 / 1M output (cache: $18.75 / $30 / $1.50) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Opus 4: $15 / 1M input, $75 / 1M output (cache: $18.75 / $30 / $1.50) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Sonnet 4.6: $3 / 1M input, $15 / 1M output (cache: $3.75 / $6 / $0.30) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Sonnet 4.5: $3 / 1M input, $15 / 1M output — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Sonnet 4: $3 / 1M input, $15 / 1M output — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Haiku 4.5: $1 / 1M input, $5 / 1M output (cache: $1.25 / $2 / $0.10) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Haiku 3.5: $0.80 / 1M input, $4 / 1M output — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Claude Haiku 3: $0.25 / 1M input, $1.25 / 1M output — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Batch API: 50% discount on input and output across all models — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07
- Web search tool: $10 per 1,000 searches (plus token costs) — https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07

## ChatGPT — consumer plans

> ⚠️ Direct fetch of `chatgpt.com/pricing/` and `openai.com/business/chatgpt-pricing/` returned HTTP 403 on 2026-05-07. Numbers below come from OpenAI's official Help Center articles surfaced via web search. Recommended action before quoting to a customer: confirm in a US-located browser session.

- Free: $0/month — https://chatgpt.com/pricing/ — search-verified 2026-05-07 (direct fetch blocked) — basic access, may include ads
- Go: $8/month — https://chatgpt.com/pricing/ — search-verified 2026-05-07 (direct fetch blocked) — went global January 2026, may include ads in US
- Plus: $20/month — https://chatgpt.com/pricing/ — search-verified 2026-05-07 (direct fetch blocked) — no annual discount stated
- Pro (lower tier launched Apr 9, 2026): $100/month — https://chatgpt.com/pricing/ — search-verified 2026-05-07 (direct fetch blocked) — ~5× Plus usage
- Pro: $200/month — https://chatgpt.com/pricing/ — search-verified 2026-05-07 (direct fetch blocked) — ~20× Plus usage, 1M token context, GPT-5.5 access
- Business: $25/user/month monthly, $20/user/month annual (~20% discount) — https://help.openai.com/en/articles/8792828 — verified 2026-05-07 — **min 2 seats**
- Enterprise: custom pricing (contact sales), annual commitment required — https://help.openai.com/en/articles/11487671 — verified 2026-05-07

## OpenAI API — usage-based

> ⚠️ `openai.com/api/pricing/` returned HTTP 403. Pricing below comes from `developers.openai.com/api/docs/pricing`, which is OpenAI's official developer docs site. The current flagship line is `gpt-5.4` / `gpt-5.5` — legacy GPT-5, GPT-4.1, GPT-4o and o-series models are not present on the current snapshot.

- gpt-5.5: $5.00 / 1M input, $0.50 / 1M cached input, $30.00 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- gpt-5.5-pro: $30.00 / 1M input, $180.00 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- gpt-5.4: $2.50 / 1M input, $0.25 / 1M cached input, $15.00 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- gpt-5.4-mini: $0.75 / 1M input, $0.075 / 1M cached input, $4.50 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- gpt-5.4-nano: $0.20 / 1M input, $0.02 / 1M cached input, $1.25 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- gpt-5.4-pro: $30.00 / 1M input, $180.00 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- chat-latest (powers ChatGPT consumer): $5.00 / 1M input, $30.00 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- gpt-5.3-codex: $1.75 / 1M input, $14.00 / 1M output — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- o3-deep-research: $5.00 / 1M input, $20.00 / 1M output (batch only) — https://developers.openai.com/api/docs/pricing — verified 2026-05-07
- Batch API: 50% discount across all models — https://developers.openai.com/api/docs/pricing — verified 2026-05-07

## Anthropic API direct

This is functionally identical to the Claude API rows above. The audit form lets users add either entry depending on how they think about their usage.

- Source: https://platform.claude.com/docs/en/docs/about-claude/pricing — verified 2026-05-07

## Gemini — consumer plans

> ⚠️ The `gemini.google/subscriptions` scrape returned localised CAD prices and `one.google.com/about/google-ai-plans` returned no $ amounts. USD figures below come from Google-domain search aggregation; recommend US-session confirmation before billing.

- Google AI Plus: $7.99/month US — https://gemini.google/subscriptions/ — search-verified 2026-05-07 — individual subscription, family sharing up to 5 people, 200 GB storage
- Google AI Pro: $19.99/month US — https://gemini.google/subscriptions/ — search-verified 2026-05-07 — individual (18+), family sharing up to 5 people, 5 TB storage, 1M token context window in Gemini, Veo 3.1 video generation
- Google AI Ultra: $249.99/month US — https://gemini.google/subscriptions/ — search-verified 2026-05-07 — individual (18+), family sharing up to 5 people, 30 TB storage, highest model limits, Deep Think, Gemini Agent (US/English only), YouTube Premium included

## Gemini API — usage-based

- Gemini 3.1 Pro Preview (≤200k prompt): $2.00 / 1M input, $12.00 / 1M output — https://ai.google.dev/pricing — verified 2026-05-07 — cache: $0.20/$0.40 per 1M + $4.50/hour storage; no free tier
- Gemini 3.1 Pro Preview (>200k prompt): $4.00 / 1M input, $18.00 / 1M output — https://ai.google.dev/pricing — verified 2026-05-07
- Gemini 3.1 Flash-Lite Preview: $0.25 / 1M input (text/image/video), $0.50 / 1M input (audio), $1.50 / 1M output — https://ai.google.dev/pricing — verified 2026-05-07 — Free tier "Free of charge"
- Gemini 2.5 Pro (≤200k prompt): $1.25 / 1M input, $10.00 / 1M output — https://ai.google.dev/pricing — verified 2026-05-07 — Free tier available
- Gemini 2.5 Flash: $0.30 / 1M input (text/image/video), $1.00 / 1M input (audio), $2.50 / 1M output — https://ai.google.dev/pricing — verified 2026-05-07 — Free tier available
- Batch API: 50% discount — https://ai.google.dev/pricing — verified 2026-05-07

## v0 by Vercel

The `v0.app/pricing` page no longer shows a "Premium" individual tier as a top-level card — it now jumps from Free → Team → Business → Enterprise. The $20 Premium SKU appears only on Vercel's blog post; we keep it in the engine for grandfathered users but verify before quoting.

- Free: $0/month — https://v0.app/pricing — verified 2026-05-07 — $5 of included monthly credits, 7 messages/day limit
- Premium: $20/month — https://vercel.com/blog/updated-v0-pricing — verified 2026-05-07 — individual usage-based credits (no longer shown as a card on `v0.app/pricing`)
- Team: $30/user/month — https://v0.app/pricing — verified 2026-05-07 — $30 of included monthly credits per user + $2 free daily login credits per user; chat sharing and team collaboration; purchased credits expire after 1 year and can be shared across team
- Business: $100/user/month — https://v0.app/pricing — verified 2026-05-07 — $30 of included monthly credits per user + $2 daily login credits; "Training opt-out by default"
- Enterprise: custom pricing — https://v0.app/pricing — verified 2026-05-07 — no credit allowance listed, "Your data is never used for training", SAML SSO

---

## Caveats & open items

| Item | Status | Action |
|------|--------|--------|
| ChatGPT consumer prices (Free/Go/Plus/Pro/$100 Pro) | search-aggregated, page returns 403 | Re-verify in US browser session before launch |
| OpenAI API legacy models (GPT-4.1, GPT-4o, o-series) | not on current pricing snapshot | Check OpenAI's deprecation page if a user reports paying for them |
| Gemini consumer USD prices | search-aggregated, scrape returned CAD | Re-verify in US session |
| Cursor "Business" tier (per the brief) | renamed to "Teams" | Form labels both names so users searching for "Business" find it |
| GitHub Copilot Business price | hidden behind sales contact | Engine does not auto-recommend switching INTO this tier |

## Verification process

Each cell above was produced by an automated `WebFetch` of the listed URL on 2026-05-07. Where a page returned HTTP 403 (Cloudflare / WAF blocking), the row uses a secondary official source and is flagged. Going forward, the plan is a weekly GitHub Action that re-fetches each pricing page, diffs against `src/lib/pricing/tools.ts`, and opens a PR for human review — see ARCHITECTURE.md (10k audits/day section) for context.
