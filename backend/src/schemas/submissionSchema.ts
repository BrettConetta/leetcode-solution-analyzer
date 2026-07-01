import { CODE_LANGUAGES } from "@leetcode-solution-analyzer/shared/constants/codeLanguages";
import { z } from "zod";

export const SubmissionSchema = z.object({
  userId: z.string().min(1, "Anonymous user session identifier missing"),
  problemId: z.number().int().positive("Invalid LeetCode problem identifier"),
  codeLanguage: z.enum(CODE_LANGUAGES),
  userCode: z.string().min(1, "Code content block cannot be empty"),
});

export type SubmissionInput = z.infer<typeof SubmissionSchema>;