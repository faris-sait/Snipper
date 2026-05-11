# Metrics

## North Star: qualified audits per week

A "qualified audit" is one that completes with at least $500/mo in projected savings — the same threshold the engine uses to surface the Credex CTA (`src/lib/audit/engine.ts`, `surfaceCredex`). Everything else is upstream of this.

Why not DAU: Snipper isn't a daily-engagement product. Founders look at AI bills monthly at most; most users will run this once, forward the result, and return only when something material changes (vendor pricing shift, team-size shift, or a surprise bill). A weekly cohort of qualifying audits is the right grain — long enough that channel changes show signal, short enough that a stale rule list or a broken funnel surfaces fast.

Why qualifying audits and not "audits completed" outright: the engine deliberately returns "you're spending well" for stacks under ~$100/mo of defensible savings. Counting those rewards traffic without rewarding the revenue motion. The qualifying threshold is the throttle — it refuses to inflate on noise.

## Three input metrics that drive the North Star

1. **Audit completion rate** — `(audits completed) / (audit form-starts)`. Target ≥60%. Below 50%, the form is too long, the plan dropdown is confusing, or the localStorage draft persistence is failing on the user's browser. Owns the form layer.
2. **Qualifying-savings rate** — `(qualifying audits) / (audits completed)`. Target 25–40%. Below 10% for two consecutive weeks means either pricing data has drifted from reality or the audience isn't the brief's "founders unaware they're overspending." Owns the engine + targeting layer.
3. **Post-value email capture rate** — `(emails captured) / (qualifying audits)`. Target ≥30%. The audit is free; the contact is the only currency the user spends. Below 20% means the result-page copy isn't earning the contact. Owns the result-page layer.

The North Star is the *product* of these three rates against weekly visitors.

## What I'd instrument first

Server-side only. Every `runAuditAction`, `captureLeadAction`, and `getOrGenerateSummaryAction` call already lands in Supabase — adding weekly cohort views and CTA-click events is a query change, not a new dependency. The `audits` / `audit_leads` / `notify_signups` tables already hold every event needed to compute the rates above. No client-side analytics SDK in the MVP; Plausible later for traffic-source resolution if traffic warrants it.

Explicitly *not* in the MVP: heatmaps, session replays, scroll depth. Each costs more in privacy review and bundle size than it pays back when the funnel still has room to fix in copy alone.

## Pivot triggers

- **Qualifying-savings rate < 10%** for two consecutive weeks → re-pull pricing first (probably stale), then revisit targeting. Likely failure mode: audience skewed to sub-$200/mo single-tool stacks the engine can't help.
- **Email capture rate < 8%** on qualifying audits → result-page copy is failing, not the engine. Rewrite the CTA before touching the funnel.
- **Credex consultation rate < 2%** of qualifying-with-email → the bridge between audit and Credex is broken. Cheapest fix: shorten the path from email-confirmation to a calendar link.

A pivot trigger isn't an alarm — it's a pre-committed reason to look at one specific layer instead of debugging the whole funnel at once.
