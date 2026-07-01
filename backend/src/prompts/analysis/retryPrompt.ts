export const ANALYSIS_JSON_RETRY_PROMPT =
  "Your previous response was not valid JSON matching the required schema. " +
  "Return ONLY a single JSON object with keys timeComplexity, spaceComplexity, logicFlaws, improvements, and score. " +
  "No markdown, no code fences, no extra text.";
