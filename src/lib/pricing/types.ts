export type ToolId =
  | "cursor"
  | "github_copilot"
  | "claude"
  | "chatgpt"
  | "anthropic_api"
  | "openai_api"
  | "gemini"
  | "v0";

export type Category = "ide_assistant" | "chat_consumer" | "api_direct" | "design_to_code";

export type UseCase = "coding" | "writing" | "data" | "research" | "mixed";

export type Capability =
  | "code_completion"
  | "code_chat"
  | "agent_tasks"
  | "general_chat"
  | "writing"
  | "research"
  | "data_analysis"
  | "ui_generation"
  | "raw_api";

/**
 * A single billable plan offered by a vendor. Prices are USD per seat per month
 * unless `kind === "usage"`, in which case the seat price is 0 and consumption
 * is metered separately.
 */
export interface Plan {
  id: string;
  toolId: ToolId;
  vendorPlanName: string;
  kind: "free" | "seat" | "usage";
  pricePerSeatMonthly: number;
  /** Plans that require a minimum seat count (e.g. Team plans). */
  minSeats?: number;
  /** True when the plan only makes sense for organisations (gated annual contracts). */
  requiresContract?: boolean;
  /** Short, human-readable usage allowance. */
  allowance?: string;
  /** URL on the vendor's pricing page where this row was verified. */
  sourceUrl: string;
  /** ISO date the price was verified. */
  verifiedDate: string;
}

export interface Tool {
  id: ToolId;
  displayName: string;
  vendor: string;
  category: Category;
  capabilities: Capability[];
  /** Use cases this tool is genuinely good at, in priority order. */
  primaryUseCases: UseCase[];
  plans: Plan[];
}

export interface Alternative {
  /** When the user has `fromTool`, consider switching to `toTool` if the use case matches. */
  fromToolId: ToolId;
  toToolId: ToolId;
  /** Use cases for which this swap is defensible. */
  validForUseCases: UseCase[];
  /** Plain-English reason a finance person would accept. */
  rationale: string;
}
