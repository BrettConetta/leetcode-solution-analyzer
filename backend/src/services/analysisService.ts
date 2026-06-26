import Anthropic from "@anthropic-ai/sdk";
import { CodeLanguage } from "../generated/client/enums.js";
import { LeetCodeProblemData, stripHtml } from "./leetcodeService.js";
import type { AnalysisResult } from "../schemas/analysisSchema.js";
import { AnalysisResultSchema } from "../schemas/analysisSchema.js";

export interface AnalyzeSubmissionInput {
    problem: LeetCodeProblemData & { id: number };
    userCode: string;
    codeLanguage: CodeLanguage;           // e.g. "python3"
  }

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
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    const baseRequest = {
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
    } as const;

    let messages: Anthropic.MessageParam[] = [
        { role: "user", content: userPrompt },
    ];

    for(let attempt = 0; attempt < 2; attempt++) {
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
            // Set up retry: show model its bad output and ask again
            messages = [
                { role: "user", content: userPrompt },
                { role: "assistant", content: rawText },
                {
                    role: "user",
                    content:
                    "Your previous response was not valid JSON matching the required schema. " +
                    "Return ONLY a single JSON object with keys timeComplexity, spaceComplexity, logicFlaws, and score. " +
                    "No markdown, no code fences, no extra text.",
                },
            ];
        }
    }
    throw new Error("Unreachable");
  }

  function buildSystemPrompt(): string {
    return `You are a LeetCode Solution Analyzer that analyzes LeetCode solutions against the given problem.
    
    You should evaluate the 
     - correctness
     - time complexity
     - space complexity
     - logic flaws
     - overall quality
    
    Respond only with a valid JSON object. Do not include markdown, code fences, or any text outside the JSON.
    The JSON must have exactly the following keys:
    timeComplexity (object)
     - actual (string): Big-O time complexity of the submitted solution (e.g. "O(n)", "O(n^2)").
     - optimal (string): Big-O of the best reasonable time complexity for this problem.
     - isOptimal (boolean): true if actual is asymptotically optimal (same order as optimal); otherwise false.
    spaceComplexity (object)
     - actual (string): Big-O space complexity of the submitted solution (e.g. "O(n)", "O(n^2)").
     - optimal (string): Big-O of the best reasonable space complexity for this problem.
     - isOptimal (boolean): true if actual is asymptotically optimal (same order as optimal); otherwise false.
    logicFlaws (array of strings): A list of concrete bugs, wrong algorithms, or missed edge cases. Use [] if the solution appears correct (don’t omit the key or use null). Each item should be one clear sentence.
    score (integer): Overall quality from 0 to 100 (correctness weighted heavily; efficiency and clarity matter too).
    
    For the Big-O format use standard Big-O notation (e.g. O(n), O(n log n), O(n^2)).
    Report auxiliary/extra space, not space used to store the input unless the solution copies it.
    Reflect correctness in logicFlaws and score; do not add extra keys.
    
    Example output (values are illustrative):
    {
        "timeComplexity": { "actual": "O(n^2)", "optimal": "O(n)", "isOptimal": false },
        "spaceComplexity": { "actual": "O(n)", "optimal": "O(n)", "isOptimal": true },
        "logicFlaws": ["Fails when the input array is empty."],
        "score": 62
    }`
  }

  function buildUserPrompt(input: AnalyzeSubmissionInput): string {
    const { problem, userCode, codeLanguage } = input;
    return `Problem: #${problem.id} ${problem.title} (${problem.difficulty})
    
    Statement: 

    ${stripHtml(problem.problemStatement)}

    Language: ${codeLanguage}
    Submission: 

    \`\`\`${codeLanguage}
    ${userCode}
    \`\`\``
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