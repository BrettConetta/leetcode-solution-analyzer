import { z } from "zod";

const ComplexityAnalysisSchema = z.object({
  actual: z.string().min(1),
  optimal: z.string().min(1),
  isOptimal: z.boolean(),
});

export const AnalysisResultSchema = z.object({
  timeComplexity: ComplexityAnalysisSchema,
  spaceComplexity: ComplexityAnalysisSchema,
  logicFlaws: z.array(z.string()),
  improvements: z.array(z.string()),
  score: z.number().int().min(0).max(100),
});

export const SubmissionSuccessResponseSchema = z.object({
  message: z.string(),
  data: AnalysisResultSchema,
  isRepeatSubmission: z.boolean(),
});

export type ComplexityAnalysis = z.infer<typeof ComplexityAnalysisSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type SubmissionSuccessResponse = z.infer<
  typeof SubmissionSuccessResponseSchema
>;
