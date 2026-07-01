import {
  SubmissionSuccessResponseSchema,
  type SubmissionSuccessResponse,
} from "@leetcode-solution-analyzer/shared/schemas/analysis";

const API_BASE_URL = "http://localhost:3001";

export type SubmitSubmissionPayload = {
  userId: string;
  problemId: number;
  codeLanguage: string;
  userCode: string;
};

export async function submitSubmission(
  payload: SubmitSubmissionPayload
): Promise<SubmissionSuccessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json();

  if (!response.ok) {
    const errorBody = body as { error?: unknown };
    const message =
      typeof errorBody.error === "string" && errorBody.error.trim()
        ? errorBody.error
        : "Failed to submit analysis";
    throw new Error(message);
  }

  const parsed = SubmissionSuccessResponseSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Invalid analysis response:", parsed.error.flatten());
    throw new Error("Received invalid analysis data from the server");
  }

  return parsed.data;
}
