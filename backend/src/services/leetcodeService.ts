import { z } from "zod";
import type { PrismaClient } from "../generated/client/client.js";
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

const SLUG_SYNC_BATCH_SIZE = 1000;

let slugCatalogSyncInFlight: Promise<void> | null = null;

async function fetchProblemCatalog() {
  const response = await fetch(LEETCODE_PROBLEMS_ALL_URL, {
    headers: DEFAULT_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`LeetCode catalog request failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  return ProblemCatalogSchema.parse(json);
}

async function syncProblemSlugCatalog(prisma: PrismaClient): Promise<void> {
  const catalog = await fetchProblemCatalog();
  const syncedAt = new Date();

  const entries = catalog.stat_status_pairs.map((entry) => ({
    id: entry.stat.frontend_question_id,
    titleSlug: entry.stat.question__title_slug,
    syncedAt,
  }));

  for (let i = 0; i < entries.length; i += SLUG_SYNC_BATCH_SIZE) {
    const batch = entries.slice(i, i + SLUG_SYNC_BATCH_SIZE);
    await prisma.leetCodeProblemSlug.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function ensureProblemSlugCatalog(prisma: PrismaClient): Promise<void> {
  if (!slugCatalogSyncInFlight) {
    slugCatalogSyncInFlight = syncProblemSlugCatalog(prisma).finally(() => {
      slugCatalogSyncInFlight = null;
    });
  }

  await slugCatalogSyncInFlight;
}

async function resolveTitleSlug(
  problemId: number,
  prisma: PrismaClient
): Promise<string> {
  const cached = await prisma.leetCodeProblemSlug.findUnique({
    where: { id: problemId },
  });

  if (cached) {
    return cached.titleSlug;
  }

  await ensureProblemSlugCatalog(prisma);

  const synced = await prisma.leetCodeProblemSlug.findUnique({
    where: { id: problemId },
  });

  if (!synced) {
    throw new Error(`No LeetCode problem found for id ${problemId}`);
  }

  return synced.titleSlug;
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

export function stripHtml(html: string): string {
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
  problemId: number,
  prisma: PrismaClient
): Promise<LeetCodeProblemData> {
  const titleSlug = await resolveTitleSlug(problemId, prisma);
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
