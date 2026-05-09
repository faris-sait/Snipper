import { z } from "zod";
import { TOOLS } from "@/lib/pricing/tools";
import type { ToolId } from "@/lib/pricing/types";

export const TOOL_IDS = [
  "cursor",
  "github_copilot",
  "claude",
  "chatgpt",
  "anthropic_api",
  "openai_api",
  "gemini",
  "v0",
] as const;

export const USE_CASES = ["coding", "writing", "data", "research", "mixed"] as const;

/** Narrative form for "for a {phrase} team" copy on result pages. Lowercase. */
export const USE_CASE_PHRASES: Record<(typeof USE_CASES)[number], string> = {
  coding: "coding",
  writing: "writing",
  data: "data analysis",
  research: "research",
  mixed: "mixed-workload",
};

const SpendLineSchema = z
  .object({
    toolId: z.enum(TOOL_IDS),
    planId: z.string().min(1, "Pick a plan"),
    seats: z.coerce.number().int().min(1, "≥1 seat").max(10_000),
    monthlySpendUsd: z.coerce
      .number()
      .min(0, "Cannot be negative")
      .max(1_000_000, "Above plausible cap"),
  })
  .superRefine((data, ctx) => {
    const tool = TOOLS[data.toolId as ToolId];
    if (!tool?.plans.some((p) => p.id === data.planId)) {
      ctx.addIssue({
        code: "custom",
        path: ["planId"],
        message: `Plan does not exist for ${tool?.displayName ?? data.toolId}`,
      });
    }
  });

export const AuditFormSchema = z.object({
  teamSize: z.coerce.number().int().min(1, "≥1 person").max(10_000),
  primaryUseCase: z.enum(USE_CASES),
  lines: z.array(SpendLineSchema).min(1, "Add at least one tool to audit"),
});

/** Form-input shape: number fields are pre-coercion (could be string from `<input>`). */
export type AuditFormInput = z.input<typeof AuditFormSchema>;
/** Validated, coerced shape — what callers of `runAudit` actually receive. */
export type AuditFormValues = z.output<typeof AuditFormSchema>;

export const DEFAULT_FORM_VALUES: AuditFormInput = {
  teamSize: 5,
  primaryUseCase: "coding",
  lines: [
    {
      toolId: "cursor",
      planId: "pro",
      seats: 1,
      monthlySpendUsd: 20,
    },
  ],
};
