# leetcode-solution-analyzer

A full-stack TypeScript app that analyzes LeetCode solution submissions with AI feedback on time/space complexity, logic flaws, and overall quality.

## Status

The backend is functional end-to-end for submission intake, LeetCode problem resolution, and cached analysis storage. The frontend is scaffolded but not yet wired to the API. AI analysis is currently mocked; Claude SDK integration is the next step.

## Structure

| Directory   | Stack                                      | Status                                      |
| ----------- | ------------------------------------------ | ------------------------------------------- |
| `backend/`  | Node.js, Express, Prisma, PostgreSQL       | API, database, and LeetCode integration     |
| `frontend/` | React 19, Vite, TypeScript, Tailwind CSS 4 | Placeholder UI only                         |

## What's implemented

### Backend API

- **`GET /api/health`** — Health check
- **`POST /api/submissions`** — Accept a code submission, resolve the problem, run analysis, and return results

Submission payload:

```json
{
  "userId": "anonymous-uuid-from-local-storage",
  "problemId": 1,
  "codeLanguage": "python3",
  "userCode": "def twoSum(nums, target): ..."
}
```

The submission pipeline:

1. Validates input with Zod (`userId`, `problemId`, `codeLanguage`, `userCode`)
2. Upserts an anonymous `User` record (UUID-based, no auth yet)
3. Resolves LeetCode problem metadata via a read-through cache
4. Returns a cached analysis if the same user has already submitted identical code for that problem
5. Otherwise persists the submission and stores analysis results in a JSONB column

### Database (Prisma + PostgreSQL)

| Model                 | Purpose                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `User`                | Anonymous sessions keyed by client-generated UUID                       |
| `LeetCodeProblem`     | Cached problem title, difficulty, statement, and constraints            |
| `LeetCodeProblemSlug` | Maps LeetCode frontend question IDs to URL slugs (avoids repeated catalog fetches) |
| `Submission`          | User code + language per problem                                        |
| `Analysis`            | AI feedback stored as flexible JSON (`AIAnalysis` table)                |

Supported languages: `python`, `python3`, `java`, `javascript`, `typescript`, `cpp`, `c`, `csharp`, `dart`, `elixir`, `erlang`, `golang`, `kotlin`, `swift`, `rust`, `ruby`, `racket`, `scala`, `php`.

### LeetCode integration

`backend/src/services/leetcodeService.ts` fetches problem data from LeetCode:

1. Resolves a numeric problem ID to a title slug via the `LeetCodeProblemSlug` cache
2. On cache miss, syncs the full problem catalog from `leetcode.com/api/problems/all/` in batches
3. Fetches full question details (title, difficulty, HTML content) via LeetCode's GraphQL API
4. Parses constraints from the problem HTML and stores everything locally

### Analysis (mocked)

New submissions currently receive a hardcoded mock analysis (time/space complexity comparison, logic flaws, score). The endpoint and persistence layer are ready for a real LLM integration.

## Development

### Prerequisites

- Node.js
- PostgreSQL database (configured for Supabase-style pooled + direct URLs)

### Environment variables

Create `backend/.env`:

```env
DATABASE_POOLED_URL=postgresql://...   # Used by the Express app at runtime
DATABASE_DIRECT_URL=postgresql://...   # Used by Prisma CLI for migrations
PORT=3001                              # Optional; defaults to 3001
```

### Backend

```bash
cd backend
npm install
npx prisma migrate deploy   # Apply migrations
npm run dev                 # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Example submission

```bash
curl -X POST http://localhost:3001/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-1",
    "problemId": 1,
    "codeLanguage": "python3",
    "userCode": "def twoSum(nums, target):\n    pass"
  }'
```

## Planned next steps

- Wire up the React frontend (problem picker, code editor, results display)
- Replace mock analysis with Claude SDK (prompt caching for cost reduction)
- LeetCode failsafe if external problem fetching becomes unavailable
