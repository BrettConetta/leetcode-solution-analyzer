import { z } from "zod";
import { Difficulty } from "../generated/client/enums.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const LEETCODE_PROBLEMS_ALL_URL = "https://leetcode.com/api/problems/all/";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; LeetCodeSolutionAnalyzer/1.0)",
};

const ProblemCatalogSchema = z.object({
  stat_status_pairs: z.array(
    z.object({
      stat: z.object({
        frontend_question_id: z.number(),
        question__title_slug: z.string().min(1),
      }),
    })
  ),
});

const QuestionGraphQLSchema = z.object({
  data: z.object({
    question: z
      .object({
        questionFrontendId: z.string(),
        title: z.string().min(1),
        difficulty: z.enum(Difficulty),
        content: z.string().min(1),
      })
      .nullable(),
  }),
});

export interface LeetCodeProblemData {
  title: string;
  difficulty: Difficulty;
  problemStatement: string;
  constraints: string[];
}

const QUESTION_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      title
      difficulty
      content
    }
  }
`;

async function resolveTitleSlug(problemId: number): Promise<string> {
  const response = await fetch(LEETCODE_PROBLEMS_ALL_URL, {
    headers: DEFAULT_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`LeetCode catalog request failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  const catalog = ProblemCatalogSchema.parse(json);

  const match = catalog.stat_status_pairs.find(
    (entry) => entry.stat.frontend_question_id === problemId
  );

  if (!match) {
    throw new Error(`No LeetCode problem found for id ${problemId}`);
  }

  return match.stat.question__title_slug;
}

async function fetchQuestionBySlug(titleSlug: string) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({
      operationName: "questionData",
      variables: { titleSlug },
      query: QUESTION_QUERY,
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL request failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = QuestionGraphQLSchema.parse(json);

  if (!parsed.data.question) {
    throw new Error(`LeetCode returned no question for slug "${titleSlug}"`);
  }

  return parsed.data.question;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
      .replace(/<sub>(.*?)<\/sub>/gi, "_$1")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

function parseConstraints(content: string): string[] {
  const constraintsSection = content.match(
    /<strong>Constraints:<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i
  );

  if (!constraintsSection) {
    return [];
  }

  return Array.from(
    constraintsSection[1].matchAll(/<li>([\s\S]*?)<\/li>/gi),
    (match) => stripHtml(match[1])
  ).filter(Boolean);
}

export async function fetchLeetCodeProblem(
  problemId: number
): Promise<LeetCodeProblemData> {
  const titleSlug = await resolveTitleSlug(problemId);
  const question = await fetchQuestionBySlug(titleSlug);

  if (Number(question.questionFrontendId) !== problemId) {
    throw new Error(
      `LeetCode slug "${titleSlug}" resolved to id ${question.questionFrontendId}, expected ${problemId}`
    );
  }

  return {
    title: question.title,
    difficulty: question.difficulty,
    problemStatement: question.content,
    constraints: parseConstraints(question.content),
  };
}
