import type { AnalysisResult } from "@leetcode-solution-analyzer/shared/schemas/analysis";
import { ScoreSummary } from "./ScoreSummary";
import { FeedbackSection } from "./FeedbackSection";
import { ComplexitySection } from "./ComplexitySection";
type AnalysisResultsProps = {
  results: AnalysisResult;
  isRepeatSubmission?: boolean;
  isStale?: boolean;
};
export function AnalysisResults({
  results,
  isRepeatSubmission = false,
  isStale = false,
}: AnalysisResultsProps) {
  return (
    <div className="relative overflow-hidden rounded-md border-2 border-zinc-700 bg-zinc-800/50 p-6">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-zinc-200">
            Analysis Results
          </h2>
          {isRepeatSubmission && (
            <p className="text-sm text-zinc-500">Cached result</p>
          )}
        </div>
        <ScoreSummary score={results.score} />
        <FeedbackSection
          feedback={results.logicFlaws}
          title="Logic Flaws"
          includeColoredText
          emptyMessage="No logic flaws found"
        />
        <ComplexitySection
          time={results.timeComplexity}
          space={results.spaceComplexity}
        />
        <FeedbackSection
          feedback={results.improvements}
          title="Improvements"
          emptyMessage="No improvements suggested"
        />
      </div>
      {isStale && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/50"
          aria-busy="true"
        >
          <span
            className="rounded-md bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
            role="status"
          >
            Updating…
          </span>
        </div>
      )}
    </div>
  );
}
