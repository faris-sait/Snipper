import type { ToolId } from "@/lib/pricing/types";

export type PlanHealthStatus = "ok" | "watch" | "risk";

/**
 * A signal about the plan itself, distinct from the rule-driven recommendation.
 * Rules answer "is there a cheaper option?"; plan health answers "is this plan
 * itself behaving well?" — annual prepay opportunities, plans whose list price
 * isn't published, plans that have generated public rate-limit-shock chatter.
 *
 * Notes are deliberately understated. A finance reviewer should read each one
 * and agree without needing extra context — that's what keeps the audit
 * defensible. We never claim a plan is "bad", we surface the thing the user
 * should re-verify.
 */
export interface PlanHealth {
  status: PlanHealthStatus;
  note?: string;
}

/**
 * Per-plan registry. Keyed by `${toolId}:${planId}`. Anything not in the
 * registry defaults to `{ status: "ok" }` — the absence of a flag is an OK,
 * not an oversight.
 */
const PLAN_HEALTH_REGISTRY: Record<string, PlanHealth> = {
  // The plan that prompted the user-interview pain. Rate-limit tightening on
  // Claude Max 20x has been broadly reported on r/ClaudeAI and HN since the
  // v2.1.89 update — we surface this so users re-check usage caps before they
  // renew at $200/mo.
  "claude:max_20x": {
    status: "risk",
    note: "Rate-limit tightening on this plan has been broadly reported since the v2.1.89 update — re-check your usage caps before renewal.",
  },
  // Premium consumer tiers — defensible to keep, but worth flagging so the
  // user confirms they're using the headroom.
  "cursor:ultra": {
    status: "watch",
    note: "Premium $200/mo tier — only worthwhile if you regularly hit Pro+ ($60/mo) limits.",
  },
  "chatgpt:pro": {
    status: "watch",
    note: "Premium $200/mo tier — most teams get the same value from Plus at $20/mo unless o1-pro / Operator usage is core to the workflow.",
  },
  // Annual prepay opportunity. Anthropic publishes the annual rate ($17/seat/mo
  // vs $20 monthly) on the same pricing page we cite for the monthly figure.
  "claude:pro": {
    status: "watch",
    note: "Annual prepay drops Pro to $17/seat/mo (vs $20 monthly) — saves $36/yr per seat for committed teams.",
  },
  // Plans with no public list price — flag so the user verifies their invoice.
  "github_copilot:business": {
    status: "watch",
    note: "GitHub no longer lists Business pricing publicly — verify your invoice matches the rate you signed up for.",
  },
  "v0:premium": {
    status: "watch",
    note: "Premium tier no longer appears on v0.app/pricing — you may be grandfathered. Confirm the renewal price with Vercel.",
  },
};

export function classifyPlanHealth(toolId: ToolId | string, planId: string): PlanHealth {
  return PLAN_HEALTH_REGISTRY[`${toolId}:${planId}`] ?? { status: "ok" };
}
