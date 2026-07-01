import { stripHtml } from "../../services/leetcodeService.js";
import type { AnalyzeSubmissionInput } from "./types.js";

export function buildAnalysisUserPrompt(input: AnalyzeSubmissionInput): string {
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
