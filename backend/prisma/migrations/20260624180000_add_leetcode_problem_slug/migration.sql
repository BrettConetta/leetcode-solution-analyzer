-- CreateTable
CREATE TABLE "LeetCodeProblemSlug" (
    "id" INTEGER NOT NULL,
    "titleSlug" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeetCodeProblemSlug_pkey" PRIMARY KEY ("id")
);
