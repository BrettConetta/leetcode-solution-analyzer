import { z } from "zod";

const ComplexityAnalysisSchema = z.object({
  actual: z.string().min(1),      // e.g. "O(N^2)"
  optimal: z.string().min(1),     // e.g. "O(N)"
  isOptimal: z.boolean(),
});

export const AnalysisResultSchema = z.object({
  timeComplexity: ComplexityAnalysisSchema,
  spaceComplexity: ComplexityAnalysisSchema,
  logicFlaws: z.array(z.string()),  // empty array = no flaws found
  improvements: z.array(z.string()), // empty array = no improvements found
  score: z.number().int().min(0).max(100),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;