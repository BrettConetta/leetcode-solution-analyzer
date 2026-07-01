import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client/client.js";
import { CODE_LANGUAGES } from "@leetcode-solution-analyzer/shared/constants/codeLanguages";
import { z } from "zod";
import { fetchLeetCodeProblem } from "./services/leetcodeService.js";
import { analyzeSubmission } from "./services/analysisService.js";

dotenv.config();

// Create a raw PostgreSQL database pool using DATABASE_POOLED_URL from .env
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_POOLED_URL 
});

// Instantiate the explicit driver adapter layer
const adapter = new PrismaPg(pool);

// Inject the adapter directly into the client
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT ?? 3001;

// Enable Cross-Origin requests so the frontend React app can speak to this port
app.use(cors());
app.use(express.json());

// Enforce strict JSON shapes on incoming LeetCode submissions via Zod
const SubmissionSchema = z.object({
  userId: z.string().min(1, "Anonymous user session identifier missing"),
  problemId: z.number().int().positive("Invalid LeetCode problem identifier"),
  codeLanguage: z.enum(CODE_LANGUAGES),
  userCode: z.string().min(1, "Code content block cannot be empty"),
});

// Health Check Route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Core Submission & Analysis Processing Route
app.post("/api/submissions", async (req: Request, res: Response): Promise<any> => {
  try {
    // Validate incoming payload parameters
    const validation = SubmissionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const { userId, problemId, codeLanguage, userCode } = validation.data;

    // Anonymous User Session Auto-Upsert
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Read-Through Cache: Check if LeetCode problem metadata exists locally
    let problem = await prisma.leetCodeProblem.findUnique({
      where: { id: problemId },
    });

    // Cache Miss: Fetch from LeetCode GraphQL gateway and store natively in Supabase
    if (!problem) {
      try {
        const externalData = await fetchLeetCodeProblem(problemId, prisma);
        problem = await prisma.leetCodeProblem.create({
          data: {
            id: problemId,
            title: externalData.title,
            difficulty: externalData.difficulty,
            problemStatement: externalData.problemStatement,
            constraints: externalData.constraints,
          },
        });
      } catch (err) {
        console.error(`Failed to scrape LeetCode problem #${problemId}:`, err);
        return res.status(404).json({ error: `Could not resolve or scrape LeetCode problem #${problemId}` });
      }
    }

    const priorUserSubmission = await prisma.submission.findFirst({
      where: { userId, problemId, codeLanguage, userCode },
    });

    const cachedSubmission = await prisma.submission.findFirst({
      where: { problemId, codeLanguage, userCode },
      include: { analysis: true },
    });

    if (cachedSubmission?.analysis) {
      return res.json({
        message: "Analysis processed successfully",
        data: cachedSubmission.analysis.analysisData,
        isRepeatSubmission: priorUserSubmission !== null,
      });
    }
    
    const analysisResult = await analyzeSubmission({
      problem,
      userCode,
      codeLanguage,
    });
    
    const savedAnalysis = await prisma.$transaction(async (tx) => {
      const newSubmission = await tx.submission.create({
        data: {
          userId,
          problemId: problem.id,
          codeLanguage,
          userCode,
        },
      });

      return tx.analysis.create({
        data: {
          submissionId: newSubmission.id,
          analysisData: analysisResult,
        },
      });
    });

    return res.status(201).json({
      message: "Analysis processed successfully",
      data: savedAnalysis.analysisData,
      isRepeatSubmission: false,
    });

  } catch (error) {
    console.error("Critical System Pipeline Error:", error);
    return res.status(500).json({ error: "Internal server architecture breakdown" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running smoothly on http://localhost:${PORT}`);
});
