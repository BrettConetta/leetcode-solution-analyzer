import Anthropic from "@anthropic-ai/sdk";
import type { CodeLanguage } from "@leetcode-solution-analyzer/shared/constants/codeLanguages";
import { LeetCodeProblemData, stripHtml } from "./leetcodeService.js";
import type { AnalysisResult } from "../schemas/analysisSchema.js";
import { AnalysisResultSchema } from "../schemas/analysisSchema.js";

export interface AnalyzeSubmissionInput {
  problem: LeetCodeProblemData & { id: number };
  userCode: string;
  codeLanguage: CodeLanguage;
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
    max_tokens: 1536,
    system: systemPrompt,
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
      // Set up retry: show model its bad output and ask again
      messages = [
        { role: "user", content: userPrompt },
        { role: "assistant", content: rawText },
        {
          role: "user",
          content:
            "Your previous response was not valid JSON matching the required schema. " +
            "Return ONLY a single JSON object with keys timeComplexity, spaceComplexity, logicFlaws, improvements, and score. " +
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
     - improvements
     - overall quality

    Complexity tradeoffs (apply to both timeComplexity.optimal and spaceComplexity.optimal):
     - timeComplexity.optimal = best achievable time across all correct approaches (may require more space).
     - spaceComplexity.optimal = best achievable auxiliary space across all correct approaches (may require worse time).
     - These are independent: do not set spaceComplexity.optimal to the space used by the time-optimal approach unless that approach also uses the minimum possible auxiliary space.

    Respond only with a valid JSON object. Do not include markdown, code fences, or any text outside the JSON.
    The JSON must have exactly the following keys:
    timeComplexity (object)
     - actual (string): Big-O time complexity of the submitted solution (e.g. "O(n)", "O(n^2)").
     - optimal (string): Big-O of the minimum auxiliary space among all correct solutions for this problem, regardless of time. When a time–space tradeoff exists, use that minimum even if it requires worse time (e.g. Two Sum: optimal space is O(1) via nested loops, not O(n) from the hash-map approach). WRONG: setting optimal to O(n) because the submitted or time-optimal solution uses a hash map.
     - isOptimal (boolean): true if actual ≤ optimal (same or lower Big-O order), OR if actual is the minimum space achievable without worsening the submission's own time complexity (time–space tradeoff: e.g. O(n) time + O(n) space when global minimum space is O(1)). false only when actual uses more auxiliary space than both optimal and the minimum for the submission's time class.
    spaceComplexity (object)
     - actual (string): Big-O space complexity of the submitted solution (e.g. "O(n)", "O(n^2)").
     - optimal (string): Big-O of the best reasonable auxiliary space among correct solutions. When a time–space tradeoff exists, use the best achievable space even if that approach has worse time (e.g. Two Sum can use O(1) space with O(n²) time). Do not set this to the space cost of the time-optimal approach unless that is also the best possible space.
     - isOptimal (boolean): true if actual is asymptotically as good as or better than optimal (same or lower Big-O order), or if the submission's space is the minimum auxiliary space achievable without worsening its time complexity order (you cannot use less space without accepting worse time). false only when actual is worse than optimal.
    logicFlaws (array of strings): A list of concrete bugs, wrong logic, or missed edge cases. Use [] if the solution appears correct (don't omit the key or use null). Each item should be one clear sentence.
    improvements (array of strings): A list of concrete improvements to the solution. One item per improvement; each item should be one clear sentence. Rules:
        1. Tie each item to the gap between actual and optimal time/space complexity; prioritize time over space.
        2. Address efficiency or clarity on a sound core approach; may be non-empty even when logicFlaws lists minor correctness issues.
        3. Do not suggest optimizing a fundamentally wrong algorithm.
        4. Do not repeat items from logicFlaws.
        5. Name the techniques used to achieve the improvement (e.g. hash map, two pointers).
        6. Use [] when both timeComplexity.isOptimal and spaceComplexity.isOptimal are true, unless there is a strong clarity or readability win.
        7. Only suggest approaches that fit the constraints of the stated problem.
        8. Include at least one improvement when time is not optimal (and the core approach is sound). Suggest space improvements only when time is already optimal and auxiliary space can be reduced without worsening time.
    score (integer): Overall quality from 0 to 100 (correctness weighted heavily; efficiency and clarity matter too). Reserve 90 through 100 for correct solutions with no logicFlaws and asymptotically optimal time and space.

    For the Big-O format use standard Big-O notation (e.g. O(n), O(n log n), O(n^2)).
    Report auxiliary/extra space, not space used to store the input unless the solution copies it.
    Reflect correctness in logicFlaws and score; do not add extra keys.

    Example outputs (values are illustrative):

    FORBIDDEN (Two Sum hash map — do not return this.) Wrong because spaceComplexity.optimal is O(n) (the hash map's auxiliary space); the global minimum is O(1) via nested loops:
    {
        "timeComplexity": { "actual": "O(n)", "optimal": "O(n)", "isOptimal": true },
        "spaceComplexity": { "actual": "O(n)", "optimal": "O(n)", "isOptimal": true }
    }

    Correct Examples:
    Example A:
    {
        "timeComplexity": { "actual": "O(n^2)", "optimal": "O(n)", "isOptimal": false },
        "spaceComplexity": { "actual": "O(1)", "optimal": "O(1)", "isOptimal": true },
        "logicFlaws": ["Fails when the input array is empty."],
        "improvements": ["Replace the inner loop with a hash map keyed by target - nums[i] for O(1) complement lookup, reducing time from O(n^2) to O(n)."],
        "score": 62
    }

    Example B:
    {
        "timeComplexity": { "actual": "O(n)", "optimal": "O(n)", "isOptimal": true },
        "spaceComplexity": { "actual": "O(n)", "optimal": "O(1)", "isOptimal": true },
        "logicFlaws": [],
        "improvements": [],
        "score": 100
    }

    Before returning, verify: spaceComplexity.optimal is the global minimum auxiliary space for the problem, not the space of the time-optimal or submitted approach. Return exactly one JSON object matching the schema above (like Example A or Example B), not an array and not both examples.
    `;
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
    \`\`\``;
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
