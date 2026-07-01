import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_JSON_RETRY_PROMPT,
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  type AnalyzeSubmissionInput,
} from "../prompts/analysis/index.js";
import type { AnalysisResult } from "../schemas/analysisSchema.js";
import { AnalysisResultSchema } from "../schemas/analysisSchema.js";

export type { AnalyzeSubmissionInput };

let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export async function analyzeSubmission(
  input: AnalyzeSubmissionInput
): Promise<AnalysisResult> {
  const anthropic = getAnthropicClient();
  const userPrompt = buildAnalysisUserPrompt(input);

  const baseRequest = {
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1536,
    system: ANALYSIS_SYSTEM_PROMPT,
  } as const;

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.create({
      ...baseRequest,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic returned no text content");
    }

    const rawText = textBlock.text;

    try {
      return parseAnalysisResponse(rawText);
    } catch (error) {
      console.error(`Analysis parse failed (attempt ${attempt}):`, rawText);
      if (attempt === 1) {
        throw new Error("Claude returned invalid analysis JSON after retry");
      }
      messages = [
        { role: "user", content: userPrompt },
        { role: "assistant", content: rawText },
        { role: "user", content: ANALYSIS_JSON_RETRY_PROMPT },
      ];
    }
  }
  throw new Error("Unreachable");
}

function parseAnalysisResponse(rawText: string): AnalysisResult {
  const parsed = JSON.parse(extractJson(rawText));
  return AnalysisResultSchema.parse(parsed);
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}
