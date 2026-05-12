# Referral codes

Snipper is free — no plan to upgrade, no paywall to discount, no
"premium audit" to gate. So the referral perk lives where Snipper
already creates value: **the upstream Credex relationship.**

## How the loop works

1. A user runs an audit and views `/audit/result`. The Share section gives them a referral URL of the form:

   ```
   https://snipper-alpha.vercel.app/a/<auditId>?via=<auditId>
   ```

   The audit id doubles as the referral code — no separate codes to generate, no extra table to write to.

2. They send the link to a friend who's likely paying full retail for AI tools.

3. The friend lands on `/a/<auditId>?via=<auditId>`. They see the audit (real numbers, real recommendations) plus a small banner — *"Referred by a Snipper user — audit your own stack, Credex prioritises both sides of the referral."*

4. They click through to `/audit?via=<referrerAuditId>`. The form preserves the `via` query param through the submit.

5. When the audit persists, `request_meta.referred_by` records the referrer's audit id. No schema migration required — `request_meta` is already `jsonb` and existed for IP/UA/Referer capture.

6. **The perk fires when the referee clears the $500/mo Credex threshold:**
   - The **referee** gets bumped to the top of the Credex consult queue.
   - The **referrer** gets credit on the same Credex relationship — currency of "your friend brought a real lead" attribution. If the referee buys credits, the referrer gets one of two things (operationally up to Credex): a discount on their next purchase, or a public attribution in the Credex partner network.

## Why this design (vs alternatives)

- **No separate `referrals` table.** The referrer's audit id is already a unique 12-char URL-safe handle. Adding a `referrals` table would mean a Supabase migration, two extra writes per signup, and one more thing to back up. `request_meta.referred_by` is the simplest possible representation.
- **No referee-facing perk on Snipper itself.** Snipper is free; there's nothing to discount. The perk has to be in Credex, because that's where money changes hands.
- **No tracking pixel or cookie.** Attribution is in the URL — when the URL is gone, attribution is gone. That's intentional: no PII leak, no cross-site tracking, no consent banner needed.
- **No self-referral.** The `/a/[id]` page only renders the referral banner when `via` is well-formed AND points at a *different* audit. Otherwise users sharing their own URL would get the banner, which is incoherent.

## Reporting the loop

Today, attribution is queryable via Supabase:

```sql
select
  a.id              as referee_audit_id,
  a.request_meta ->> 'referred_by'  as referrer_audit_id,
  a.monthly_savings_usd,
  a.created_at
from public.audits a
where a.request_meta ->> 'referred_by' is not null
order by a.created_at desc;
```

Tomorrow, a dedicated `/admin/referrals` page could surface this with stats. For Round-1 take-home scope, the SQL above is the source of truth.

## Anti-abuse

- The `via` value is validated as a canonical 12-character audit id (the length and alphabet `generateAuditId` produces) before either the banner is shown or the value persists into `request_meta`. Short or malformed inputs like `?via=hahaha` are dropped at the page boundary — no banner, no record.
- Self-referral is guarded too: the banner only renders when `via` points at a *different* audit than the one being viewed, so someone sharing their own URL doesn't see "Referred by a Snipper user" on their own page.
- Honeypot still gates form submission, so a referral spam loop (bot opens shared URL, submits 1000 empty audits crediting the referrer) is bounced by the same anti-abuse layer.
- The Credex perk only fires when the *audit's savings clear $500/mo*, so the only profitable abuse path is "manufacture a fake $500+ audit" — which the engine catches because the recommendations have to match the spend lines.
- A 12-char id that's well-formed but doesn't actually exist in Supabase still records into `request_meta.referred_by`. That's harmless cosmetic data — Credex can't resolve a non-existent referrer audit, so no perk fires on the upstream side either.

## What this isn't

- This is not a Web3-style ref system with claim transactions on-chain.
- This is not a viral coefficient experiment with conversion tracking.
- It's a thin attribution layer on a free product, designed for the take-home brief's bonus item — *"share the tool, both parties get a perk"* — without sneaking in features the brief didn't ask for.
