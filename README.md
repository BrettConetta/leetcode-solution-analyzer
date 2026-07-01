# leetcode-solution-analyzer

A full-stack TypeScript app that analyzes LeetCode solution submissions with AI feedback on time/space complexity, logic flaws, improvements, and overall quality.

## Status

Submit a problem ID, language, and solution in the UI (or via the API); the backend resolves the LeetCode problem, runs Claude-powered analysis, caches results, and returns structured feedback to the client.

## Structure

| Directory   | Stack                                      | Status                                      |
| ----------- | ------------------------------------------ | ------------------------------------------- |
| `backend/`  | Node.js, Express, Prisma, PostgreSQL       | API, database, and LeetCode integration     |
| `frontend/` | React 19, Vite, TypeScript, Tailwind CSS 4 | Submission form and analysis results UI     |
| `shared/`   | TypeScript, Zod                            | Shared schemas used by frontend and backend |

## What's implemented

### Frontend

- **Submission form** — LeetCode problem ID, language selector (all supported backend languages), and a resizable code textarea with client-side validation
- **API integration** — `POST /api/submissions` via `frontend/src/api/submissions.ts`, with response validation against shared Zod schemas
- **Anonymous sessions** — Client-generated UUID stored in `localStorage` (`leetcode-analyzer-user-id`) and sent as `userId` on each submission
- **Results display** — Score summary, logic flaws, time/space complexity (actual vs problem-level optimal, with optimality status), and improvement suggestions; loading skeleton while analysis runs; cached-result indicator when the backend returns a prior analysis
- **Error handling** — Form validation errors and API failure messages surfaced in the UI

The dev server runs at `http://localhost:5173` (Vite default) and calls the backend at `http://localhost:3001`.

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
4. Returns a cached analysis if an identical `(problemId, codeLanguage, userCode)` has been analyzed before (global dedup across users)
5. Otherwise calls Claude via `analysisService`, then persists the submission and analysis atomically in a JSONB column

The UI shows "Cached result" only when the current user resubmits that exact combination.

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

### AI analysis

`backend/src/services/analysisService.ts` sends the problem statement and submission to Claude (Anthropic SDK), validates the response with `shared/src/schemas/analysis.ts`, and retries once if JSON parsing fails.

Analysis response shape (`data` field):

```json
{
  "timeComplexity": { "actual": "O(n^2)", "optimal": "O(n)", "isOptimal": false },
  "spaceComplexity": { "actual": "O(1)", "optimal": "O(1)", "isOptimal": true },
  "logicFlaws": [],
  "improvements": ["Replace the nested loop with a hash map to reduce time from O(n^2) to O(n)."],
  "score": 55
}
```

| Field | Description |
| ----- | ----------- |
| `timeComplexity` / `spaceComplexity` | Each has `actual` (the submission), `optimal` (problem-level best), and `isOptimal` (whether the submission meets the optimality rules below) |
| `logicFlaws` | Correctness issues (bugs, wrong logic, missed edge cases); empty if none |
| `improvements` | Efficiency or clarity suggestions tied to non-optimal time or space; empty when both `isOptimal` flags are true |
| `score` | Overall quality from 0–100 (correctness weighted heavily) |

#### Complexity semantics

`optimal` values describe the **problem**, not the submission. They are the same for every submission to a given problem:

- **`timeComplexity.optimal`** — best achievable time across all correct approaches (may require more auxiliary space).
- **`spaceComplexity.optimal`** — best achievable auxiliary space across all correct approaches (may require worse time).

`isOptimal` describes whether the **submission** is good enough on each axis:

- **`timeComplexity.isOptimal`** — strict. `true` only when `actual` is asymptotically ≤ `timeComplexity.optimal`. No time–space tradeoff exceptions.
- **`spaceComplexity.isOptimal`** — `true` when either:
  1. `actual` ≤ `spaceComplexity.optimal` (globally minimum auxiliary space), or
  2. `timeComplexity.isOptimal` is `true` and `actual` is the minimum auxiliary space among all correct solutions at optimal time (e.g. Two Sum hash map: `O(n)` space is optimal among `O(n)`-time approaches even though global minimum space is `O(1)`).

  `false` when the submission uses more auxiliary space than another correct solution at the same optimal time (e.g. `O(n)` space when `O(log n)` space is achievable at the same `O(n)` time).

Auxiliary space excludes required output (e.g. the result linked list) unless the solution allocates extra structures beyond the answer.

#### Scoring and improvements

- Scores **90–100** are reserved for correct solutions with no `logicFlaws` where **both** `timeComplexity.isOptimal` and `spaceComplexity.isOptimal` are `true`. A time-optimal solution can score in this range even when `spaceComplexity.actual` exceeds `spaceComplexity.optimal`, as long as it uses minimum space among all time-optimal approaches.
- A correct but time-suboptimal solution (e.g. nested-loop Two Sum) may score lower despite having no logic flaws.
- `improvements` prioritizes time over space. Space suggestions appear only when time is already optimal but space is not optimal among time-optimal approaches.

## Development

This repo is an npm workspaces monorepo. Install dependencies once from the repository root; the root `package-lock.json` is the single source of truth for dependency versions.

### Prerequisites

- Node.js
- PostgreSQL database (configured for Supabase-style pooled + direct URLs)

### Setup

From the repository root:

```bash
npm install
```

This installs all workspaces (`frontend`, `backend`, `shared`) and builds the shared package.

### Environment variables

Create `backend/.env`:

```env
DATABASE_POOLED_URL=postgresql://...   # Used by the Express app at runtime
DATABASE_DIRECT_URL=postgresql://...   # Used by Prisma CLI for migrations
ANTHROPIC_API_KEY=sk-ant-...           # Required for AI analysis
ANTHROPIC_MODEL=claude-sonnet-4-6      # Optional; defaults to claude-sonnet-4-6
PORT=3001                              # Optional; defaults to 3001
```

### Running locally

Start the backend and frontend in separate terminals. The frontend expects the API at `http://localhost:3001` (CORS is enabled on the backend).

**Backend** — apply migrations once, then start the dev server:

```bash
cd backend
npx prisma migrate deploy   # Apply migrations
npm run dev                 # http://localhost:3001
```

From the repository root:

```bash
npm run dev -w leetcode-solution-analyzer-backend
```

**Frontend:**

```bash
cd frontend
npm run dev                 # http://localhost:5173
```

From the repository root:

```bash
npm run dev -w leetcode-solution-analyzer-frontend
```

Do not run `npm install` inside `frontend/` or `backend/`; use the root install so workspace dependencies (including `@leetcode-solution-analyzer/shared`) resolve correctly.

### Build

From the repository root:

```bash
npm run build
```

This builds `shared`, then `backend`, then `frontend`.

### Example submission (curl)

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

- Problem search / picker instead of manual problem ID entry
- Configurable API base URL for frontend deployments
- Prompt caching for analysis cost reduction
- LeetCode failsafe if external problem fetching becomes unavailable
