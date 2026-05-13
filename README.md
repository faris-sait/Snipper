# Snipper

A free 60-second AI spend audit. Built for startup founders and engineering managers who pay full retail across five different AI tools and have no benchmark.

> **Project status:** in active development as part of the Credex Round 1 take-home (2026-05-07 → 2026-05-13). See [DEVLOG.md](./DEVLOG.md) for daily progress.

**Live URL:** https://snipper-alpha.vercel.app/

**Walkthrough (≈60s):** https://www.loom.com/share/7bc79734f09549a29db69e653946f92a

The recording covers: landing page → audit form (8 tools, smart-fill on plan/seat change) → three-tier results hero → AI-generated summary → per-tool breakdown with sourced recommendations → benchmark card vs same-size teams → Credex prominence at the $500/mo threshold → email capture with PDF attached → public share link with referral attribution.

If the link is unreachable for any reason, the static end-state is rendered at `public/hero-audit-poster.webp` (also the animated hero on the landing page itself — visit `/`).

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in credentials as you reach Phases 4 & 5
pnpm dev                      # http://localhost:3000
```

### Scripts

| Command            | What it does                         |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Local dev server (Turbopack).        |
| `pnpm build`       | Production build.                    |
| `pnpm test`        | Run the audit-engine unit tests.     |
| `pnpm test:watch`  | Re-run tests on change.              |
| `pnpm typecheck`   | `tsc --noEmit` — strict mode.        |
| `pnpm lint`        | ESLint with Next.js + TS rules.      |
| `pnpm format`      | Prettier across the whole tree.      |

### Deploy

```bash
vercel link            # one-time: connect repo → Vercel project
vercel env pull        # mirror Vercel env vars into .env.local
vercel deploy --prod   # ships to https://snipper-alpha.vercel.app/
```

`.env.example` lists every required var (Supabase, Resend, Anthropic, `NEXT_PUBLIC_SITE_URL`). The same vars must be set in the Vercel dashboard before the first production deploy. CI (`.github/workflows/ci.yml`) runs lint + typecheck + tests on every push to `main`.

## Decisions

Five trade-offs taken so far. The list grows as the project does — see DEVLOG
for the day-by-day reasoning.

1. **Next.js 16 (App Router) + Tailwind 4 over Vite + React Router.** I wanted server-rendered OG tags for the shareable URL, server actions for form submits without a client-side fetch wrapper, and a single `vercel deploy` for the full app. Vite would have meant maintaining a separate API server.
2. **Supabase over a self-hosted Postgres.** RLS, Postgres functions, and the typed JS client get me storage + auth + edge functions in one SDK. The downside is platform lock-in — but for a Round-1 take-home, "ships in a day" wins over "perfectly portable."
3. **Rules-based audit engine, not an LLM.** The brief explicitly says: hardcoded rules are the right call for the math; AI is for the personalised summary. Rules are testable, explainable, and a finance reviewer can read them. Each rule is a pure function — see `src/lib/audit/rules.ts`.
4. **Friction-weighted ranking instead of pure-savings ranking.** The first iteration of the engine kept recommending "switch to Copilot" over "downgrade your plan" because raw savings were higher. Real users won't migrate tools for a $20/mo win. I added a `FRICTION_WEIGHT` table so a one-click downgrade beats a tool migration unless the migration is dramatically better.
5. **Trust user-reported spend over list price.** A line's baseline is whatever the user typed, not `seats × pricePerSeatMonthly`. People have annual discounts, grandfathered rates, or hand-negotiated deals — recomputing from list price would over-recommend savings the user can't actually realise.

## Repo layout

```
src/
  app/                     # Next.js 16 App Router
  lib/
    audit/                 # pure-function audit engine
      engine.ts            # runAudit() — entry point
      rules.ts             # individual rules + FRICTION_WEIGHT
      types.ts
      __tests__/           # vitest unit tests
    pricing/
      tools.ts             # vendor pricing registry (mirrored in PRICING_DATA.md)
      alternatives.ts      # curated cross-vendor swap rules
      types.ts
    utils.ts               # cn() + formatUsd() helpers
.github/workflows/ci.yml   # lint · typecheck · test · build on every push
PRICING_DATA.md            # every number cites a vendor pricing-page URL
ARCHITECTURE.md            # system diagram + 10k-audits/day notes
DEVLOG.md                  # daily progress, written each evening
REFLECTION.md              # 5 reflection questions (filled at end of week)
TESTS.md                   # what each test covers + how to run it
PROMPTS.md                 # full LLM prompts (Phase 5)
GTM.md / ECONOMICS.md / METRICS.md / LANDING_COPY.md / USER_INTERVIEWS.md
```

## What you're evaluating

This README is paired with [ARCHITECTURE.md](./ARCHITECTURE.md), [DEVLOG.md](./DEVLOG.md), [REFLECTION.md](./REFLECTION.md), [PRICING_DATA.md](./PRICING_DATA.md), and [TESTS.md](./TESTS.md). Each file has its own purpose; together they show the trade-offs and the work, not just the result.
