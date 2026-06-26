import { z } from "zod";
import { CodeLanguage } from "../generated/client/enums.js";

export const SubmissionSchema = z.object({
  userId: z.string().min(1, "Anonymous user session identifier missing"),
  problemId: z.number().int().positive("Invalid LeetCode problem identifier"),
  codeLanguage: z.enum(CodeLanguage),
  userCode: z.string().min(1, "Code content block cannot be empty"),
});

export type SubmissionInput = z.infer<typeof SubmissionSchema>;