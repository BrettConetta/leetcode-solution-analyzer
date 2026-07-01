import type { CodeLanguage } from "@leetcode-solution-analyzer/shared/constants/codeLanguages";
import type { LeetCodeProblemData } from "../../services/leetcodeService.js";

export interface AnalyzeSubmissionInput {
  problem: LeetCodeProblemData & { id: number };
  userCode: string;
  codeLanguage: CodeLanguage;
}
