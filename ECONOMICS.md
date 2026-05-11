# Economics

If Credex deployed Snipper tomorrow, here's the unit math. Every input is an estimate with the reasoning shown so a Credex finance reviewer can swap in better inputs and re-run the calculation. Approximate numbers > no numbers; the order of magnitude is what matters at this stage.

## Lead value (LV)

Credex's revenue is margin on discounted credits. Reseller margin on commodified compute typically lands 8–12%; I'll use **10% central**. Average first-year credit purchase from a converted customer in the founder/early-stage cohort: $5k–$25k. Use **$10k expected first-year volume**. Renewal probability ~60% at month 12 (reseller norm — see "Where I'm uncertain").

```
LV first-year margin                  = $10,000 × 10%       = $1,000
× probability still active at month 12  ≈ 60%               = $600
≈ Expected lead value (central)                              = $600
Range, conservative – generous: $400 – $1,200
```

Sanity check: same range as a B2B SaaS lead at $60–$80 ARPU with a 12-month avg lifetime. Order of magnitude is right.

## CAC by channel

Pairs row-for-row with the channels in `GTM.md`.

| Channel                                       | Time / wk | Cash / wk | Audits / wk @ steady state | $ / qualifying audit |
|-----------------------------------------------|-----------|-----------|----------------------------|----------------------|
| Personal X drops                              | 2 h       | $0        | 30 – 80                    | ~$0                  |
| Reddit r/cursor + r/ClaudeAI organic          | 3 h       | $0        | 20 – 50                    | ~$0                  |
| Indie Hackers writeup + HN Show HN (one-off)  | 2 h       | $0        | 10 – 30                    | ~$0                  |
| Credex outbound cross-promo                   | < 1 h     | $0¹       | 50 – 200                   | ~$0                  |
| Reddit ads (cold)                             | 0 h       | $300      | 100 – 250 audit-completes   | $1.20 – $3.00        |

¹ Credex already pays to run that outbound regardless of whether Snipper exists; layering Snipper onto it is zero marginal cost.

The four organic channels are time-only. The unfair-channel item from GTM (Credex outbound cross-promo) is the only one with real volume *and* zero marginal cost. Reddit cold ads at $1–3 per audit completion *don't pencil cold* given the visitor-economics below; they only work as targeted retention on Credex's existing list.

## Funnel for profitability

```
Visitor                                100.0%
→ Audit form-start                      30%       =  30 of 100 visitors
→ Audit completed                       60%       =  18 of 100
→ Qualifying ($500+/mo savings)         30%       =  5.4 of 100
→ Email captured                        30%       =  1.6 of 100
→ Credex consultation booked            12%       =  0.20 of 100
→ First credit purchase                 30%       =  0.06 of 100
```

Compound: **0.06% visitor → paying customer**, or ~1 in 1,700 visitors. At LV = $600, value-per-visitor ≈ **$0.36** — any channel with CAC under that pencils. The conversion rates are interview-informed, not measured; the 30% qualifying rate is what the engine produces across the spread of plausible inputs the three interviews suggested.

## What needs to be true for $1M ARR in 18 months

```
$1M ARR @ 10% margin            →  $10M of credit volume moved through the funnel
$10M / $10k avg first-year       →  ~1,000 customers in pipeline by month 18
Net new customers / month        →  S-curve: ~5 in month 3, ~90 in month 18, avg ~55
At 0.06% visitor → buy           →  ~92,000 visitors / month at steady state
```

The only path to ~92k monthly visitors at this CAC is the **Credex outbound cross-promo** doing the heavy lifting. Pure organic Reddit + X tops out at 15k–25k/mo on a generous read. Without the cross-promo lever, $1M in 18 months is implausible from this product alone. With it, the math works because the cross-promo doesn't add Credex CAC — it raises click-through on outbound Credex is already sending.

## Where I'm uncertain

- **Lead value is the most fragile input.** If Credex's effective margin is closer to 5%, halve every output; the timeline doubles. Below LV = $300, paid Reddit ads become a money-loser at any scale.
- **Y1 retention assumed at 60%** — a reseller norm, not validated against Credex's book. A 40% rate pushes the visitor target above 130k/mo.
- **Conversion rates are interview-informed, not measured.** The 12% qualifying-email → consultation rate is bullish; below 6% the bottom of the funnel needs a redesign (probably a Calendly link in the confirmation email instead of a manual outbound step).
