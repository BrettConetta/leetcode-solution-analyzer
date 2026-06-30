import { Header } from "./components/Header";
import { LeetcodeSolutionForm } from "./components/LeetcodeSolutionForm";
import { AnalysisResults } from "./components/AnalysisResults";
import { useEffect, useRef, useState } from "react";
import type { SubmissionSuccessResponse } from "@leetcode-solution-analyzer/shared/schemas/analysis";
import { AnalysisResultsSkeleton } from "./components/AnalysisResultsSkeleton";
import { submitSubmission } from "./api/submissions";

type LastResults = SubmissionSuccessResponse;

  
  function App() {
    const [lastResults, setLastResults] = useState<LastResults | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!lastResults || isSubmitting) return;

      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }, [lastResults, isSubmitting]);

    function getOrCreateUserId(): string {
      const key = "leetcode-analyzer-user-id";
      let id = localStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
      }
      return id;
    }
    
    async function handleSubmit(payload: {
      problemId: number;
      codeLanguage: string;
      userCode: string;
    }) {
      setIsSubmitting(true);
      setError(null);
      try {
        const userId = getOrCreateUserId();
        const result = await submitSubmission({ userId, ...payload });
        setLastResults(result);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsSubmitting(false);
      }
    }
  
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Header />
        <LeetcodeSolutionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitError={error} />
        {(isSubmitting || lastResults) && (
          <div ref={resultsRef} className="mt-8">
            {isSubmitting && !lastResults && <AnalysisResultsSkeleton />}

            {lastResults && (
              <AnalysisResults
                results={lastResults.data}
                message={lastResults.message}
                isStale={isSubmitting}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
