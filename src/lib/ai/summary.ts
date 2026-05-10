import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { AuditInput, AuditResult } from "@/lib/audit/types";

import { buildSummaryUserPrompt, SUMMARY_SYSTEM_PROMPT } from "./prompts";
import { buildTemplatedSummary } from "./templated-summary";

/**
 * Hard 3-second budget on the Gemini call. The brief mandates AI for the
 * summary but also mandates graceful failure — three seconds keeps the
 * result-page perceived-load tolerable, after which we render the templated
 * fallback. Budget tuned together with the result-page skeleton; if you raise
 * this, raise the skeleton's intentional minimum hold too.
 */
const SUMMARY_TIMEOUT_MS = 3000;

/** Model choice rationale lives in PROMPTS.md — Gemini 2.5 Flash is fast,
 *  free-tier-generous, and more than adequate for a 100-word summary. */
const SUMMARY_MODEL = "gemini-2.5-flash";

export interface SummaryGenResult {
  text: string;
  source: "ai" | "templated";
  /** Populated when source === "templated" — recorded so we can spot patterns
   *  (always-timeout vs always-rate-limited) without exposing internals to the user. */
  fallbackReason?: string;
}

/**
 * Generate the personalised audit summary. Always returns a usable string —
 * any error or timeout transparently falls back to the deterministic
 * templated paragraph in `templated-summary.ts`. Caller decides whether to
 * persist `text` for re-use.
 *
 * The Gemini SDK doesn't surface a first-class AbortSignal on
 * generateContent yet, so we cap latency with a Promise.race against a
 * timer. Whichever wins, the templated fallback covers the rest.
 */
export async function generateSummary(
  input: AuditInput,
  result: AuditResult,
): Promise<SummaryGenResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      text: buildTemplatedSummary(input, result),
      source: "templated",
      fallbackReason: "GEMINI_API_KEY not set",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: SUMMARY_MODEL,
        contents: buildSummaryUserPrompt(input, result),
        config: {
          systemInstruction: SUMMARY_SYSTEM_PROMPT,
          // Bound runaway responses; ~150 tokens covers a 130-word reply
          // with plenty of headroom.
          maxOutputTokens: 400,
          // Gemini 2.5 Flash defaults to thinking ON, and thinking tokens
          // count against maxOutputTokens. For a 100-word translation task
          // the model doesn't need to think — and without this, thinking
          // ate most of the budget and the actual paragraph got truncated
          // mid-sentence (caught in QA: "...material opportunity to optimize").
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(SUMMARY_TIMEOUT_MS)),
          SUMMARY_TIMEOUT_MS,
        ),
      ),
    ]);

    const text = (response.text ?? "").trim();

    if (!text) {
      return {
        text: buildTemplatedSummary(input, result),
        source: "templated",
        fallbackReason: "empty response",
      };
    }

    return { text, source: "ai" };
  } catch (err) {
    return {
      text: buildTemplatedSummary(input, result),
      source: "templated",
      fallbackReason: classifyError(err),
    };
  }
}

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

function classifyError(err: unknown): string {
  if (err instanceof TimeoutError) {
    return err.message;
  }
  if (err instanceof Error) {
    // Gemini SDK throws errors with descriptive messages — surface the first
    // line so the fallback reason is readable in logs without leaking a stack.
    return err.message.split("\n")[0] ?? err.message;
  }
  return "unknown error";
}
