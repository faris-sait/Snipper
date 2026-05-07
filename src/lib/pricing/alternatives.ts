import type { Alternative } from "./types";

/**
 * Curated cross-vendor swap rules. Each row is the answer to: "if a user is
 * paying for X and their primary use case is Y, is there a Z that does the
 * same job for less?"
 *
 * We deliberately keep this list small and defensible. A finance reviewer
 * should read each `rationale` and agree without needing extra context.
 */
export const ALTERNATIVES: Alternative[] = [
  {
    fromToolId: "cursor",
    toToolId: "github_copilot",
    validForUseCases: ["coding"],
    rationale:
      "GitHub Copilot Business covers the same daily coding workflow (in-IDE completion + chat) at a lower per-seat price.",
  },
  {
    fromToolId: "github_copilot",
    toToolId: "cursor",
    validForUseCases: ["coding"],
    rationale:
      "Cursor Pro bundles agent + multi-file edits that Copilot only ships in higher tiers.",
  },
  {
    fromToolId: "chatgpt",
    toToolId: "claude",
    validForUseCases: ["writing", "research", "mixed"],
    rationale:
      "Claude Pro matches ChatGPT Plus on price but tends to outperform on long-form writing and document analysis.",
  },
  {
    fromToolId: "claude",
    toToolId: "chatgpt",
    validForUseCases: ["data", "research"],
    rationale:
      "ChatGPT Plus includes Advanced Data Analysis and code execution that Claude consumer plans don't cover.",
  },
  {
    fromToolId: "openai_api",
    toToolId: "anthropic_api",
    validForUseCases: ["writing", "research"],
    rationale:
      "Anthropic's mid-tier models (Sonnet) are competitive with GPT-4-class on writing tasks at lower per-token cost.",
  },
];
