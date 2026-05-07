import type { Plan, Tool, ToolId } from "./types";

const VENDOR_SOURCE: Record<ToolId, string> = {
  cursor: "https://cursor.com/pricing",
  github_copilot: "https://github.com/features/copilot/plans",
  claude: "https://claude.com/pricing",
  chatgpt: "https://chatgpt.com/pricing/",
  anthropic_api: "https://platform.claude.com/docs/en/docs/about-claude/pricing",
  openai_api: "https://developers.openai.com/api/docs/pricing",
  gemini: "https://gemini.google/subscriptions/",
  v0: "https://v0.app/pricing",
};

const VERIFIED_DATE = "2026-05-07";

function plan(
  toolId: ToolId,
  id: string,
  vendorPlanName: string,
  kind: Plan["kind"],
  pricePerSeatMonthly: number,
  opts: Partial<Pick<Plan, "minSeats" | "requiresContract" | "allowance">> = {},
): Plan {
  return {
    id,
    toolId,
    vendorPlanName,
    kind,
    pricePerSeatMonthly,
    minSeats: opts.minSeats,
    requiresContract: opts.requiresContract,
    allowance: opts.allowance,
    sourceUrl: VENDOR_SOURCE[toolId],
    verifiedDate: VERIFIED_DATE,
  };
}

/**
 * Master pricing registry. Every `pricePerSeatMonthly` and `sourceUrl` here is
 * mirrored in `PRICING_DATA.md` at the repo root, with the verification date.
 *
 * Conventions:
 *  - `kind: "free"`     → strictly $0, used as the "free tier" anchor.
 *  - `kind: "seat"`     → a per-seat monthly subscription.
 *  - `kind: "usage"`    → consumption-priced (API). `pricePerSeatMonthly` is 0;
 *                          callers should rely on user-reported monthly spend.
 *  - `requiresContract` → contact-sales tier; we never auto-recommend switching
 *                          INTO these.
 *
 * Where vendors have rebranded since the assignment brief was written
 * (e.g. Cursor "Business" → "Teams"), we use the CURRENT vendor naming and
 * note the rename in PRICING_DATA.md.
 */
export const TOOLS: Record<ToolId, Tool> = {
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    vendor: "Anysphere",
    category: "ide_assistant",
    capabilities: ["code_completion", "code_chat", "agent_tasks"],
    primaryUseCases: ["coding"],
    plans: [
      plan("cursor", "hobby", "Hobby (Free)", "free", 0),
      plan("cursor", "pro", "Pro", "seat", 20),
      plan("cursor", "pro_plus", "Pro+", "seat", 60),
      plan("cursor", "ultra", "Ultra", "seat", 200),
      plan("cursor", "teams", "Teams", "seat", 40, { minSeats: 2 }),
      plan("cursor", "enterprise", "Enterprise", "seat", 0, { requiresContract: true }),
    ],
  },
  github_copilot: {
    id: "github_copilot",
    displayName: "GitHub Copilot",
    vendor: "GitHub",
    category: "ide_assistant",
    capabilities: ["code_completion", "code_chat", "agent_tasks"],
    primaryUseCases: ["coding"],
    plans: [
      plan("github_copilot", "free", "Free", "free", 0),
      plan("github_copilot", "pro", "Pro", "seat", 10),
      plan("github_copilot", "pro_plus", "Pro+", "seat", 39),
      // Business price is no longer published on the public plans page; we keep
      // the plan as a selectable input for users who already pay for it but
      // never auto-recommend switching INTO it (requiresContract).
      plan("github_copilot", "business", "Business", "seat", 0, { requiresContract: true }),
      plan("github_copilot", "enterprise", "Enterprise", "seat", 0, { requiresContract: true }),
    ],
  },
  claude: {
    id: "claude",
    displayName: "Claude",
    vendor: "Anthropic",
    category: "chat_consumer",
    capabilities: ["general_chat", "writing", "research", "code_chat"],
    primaryUseCases: ["writing", "research", "mixed", "coding"],
    plans: [
      plan("claude", "free", "Free", "free", 0),
      // Pro is $20 monthly, $17 with annual prepay — we use the monthly rate
      // as the default since most users who self-serve pay monthly.
      plan("claude", "pro", "Pro", "seat", 20),
      plan("claude", "max_5x", "Max (5x)", "seat", 100),
      plan("claude", "max_20x", "Max (20x)", "seat", 200),
      plan("claude", "team_standard", "Team Standard", "seat", 25, { minSeats: 5 }),
      plan("claude", "team_premium", "Team Premium", "seat", 125, { minSeats: 5 }),
      plan("claude", "enterprise", "Enterprise", "seat", 0, { requiresContract: true }),
    ],
  },
  chatgpt: {
    id: "chatgpt",
    displayName: "ChatGPT",
    vendor: "OpenAI",
    category: "chat_consumer",
    capabilities: ["general_chat", "writing", "research", "data_analysis", "code_chat"],
    primaryUseCases: ["writing", "research", "data", "mixed"],
    plans: [
      plan("chatgpt", "free", "Free", "free", 0),
      plan("chatgpt", "go", "Go", "seat", 8),
      plan("chatgpt", "plus", "Plus", "seat", 20),
      plan("chatgpt", "pro_lower", "Pro (Lower)", "seat", 100),
      plan("chatgpt", "pro", "Pro", "seat", 200),
      plan("chatgpt", "business", "Business", "seat", 25, { minSeats: 2 }),
      plan("chatgpt", "enterprise", "Enterprise", "seat", 0, { requiresContract: true }),
    ],
  },
  anthropic_api: {
    id: "anthropic_api",
    displayName: "Anthropic API",
    vendor: "Anthropic",
    category: "api_direct",
    capabilities: ["raw_api", "writing", "code_chat", "research"],
    primaryUseCases: ["coding", "writing", "research", "data", "mixed"],
    plans: [plan("anthropic_api", "usage", "Usage-based", "usage", 0)],
  },
  openai_api: {
    id: "openai_api",
    displayName: "OpenAI API",
    vendor: "OpenAI",
    category: "api_direct",
    capabilities: ["raw_api", "writing", "code_chat", "data_analysis", "research"],
    primaryUseCases: ["coding", "writing", "research", "data", "mixed"],
    plans: [plan("openai_api", "usage", "Usage-based", "usage", 0)],
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    vendor: "Google",
    category: "chat_consumer",
    capabilities: ["general_chat", "writing", "research", "data_analysis"],
    primaryUseCases: ["writing", "research", "data", "mixed"],
    plans: [
      plan("gemini", "free", "Free", "free", 0),
      plan("gemini", "ai_plus", "AI Plus", "seat", 7.99),
      plan("gemini", "ai_pro", "AI Pro", "seat", 19.99),
      plan("gemini", "ai_ultra", "AI Ultra", "seat", 249.99),
      plan("gemini", "api_direct", "API direct", "usage", 0),
    ],
  },
  v0: {
    id: "v0",
    displayName: "v0",
    vendor: "Vercel",
    category: "design_to_code",
    capabilities: ["ui_generation", "code_chat"],
    primaryUseCases: ["coding"],
    plans: [
      plan("v0", "free", "Free", "free", 0),
      // Premium tier is documented in Vercel's pricing blog post but no longer
      // appears as a card on v0.app/pricing — we keep it for users who are
      // grandfathered onto it.
      plan("v0", "premium", "Premium", "seat", 20),
      plan("v0", "team", "Team", "seat", 30),
      plan("v0", "business", "Business", "seat", 100),
      plan("v0", "enterprise", "Enterprise", "seat", 0, { requiresContract: true }),
    ],
  },
};

export function getTool(id: ToolId): Tool {
  const t = TOOLS[id];
  if (!t) throw new Error(`Unknown tool id: ${id}`);
  return t;
}

export function getPlan(toolId: ToolId, planId: string): Plan {
  const tool = getTool(toolId);
  const p = tool.plans.find((p) => p.id === planId);
  if (!p) throw new Error(`Unknown plan: ${toolId}/${planId}`);
  return p;
}

export const ALL_TOOLS: Tool[] = Object.values(TOOLS);
