import type { ComplexityAnalysis } from "@leetcode-solution-analyzer/shared/schemas/analysis";
import { ComplexityRow } from "./ComplexityRow";

type ComplexitySectionProps = {
  time: ComplexityAnalysis;
  space: ComplexityAnalysis;
};

const GRID =
  "grid grid-cols-[4rem_1fr_1fr_5.5rem] gap-x-4 gap-y-3 items-baseline";

export function ComplexitySection({ time, space }: ComplexitySectionProps) {
  const showSpaceTradeoffNote =
    time.isOptimal && space.isOptimal && space.actual !== space.optimal;
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="mb-4 text-xl font-semibold text-zinc-200">Complexity</h3>

      <div className={GRID}>
        {/* header */}
        <span /> {/* empty corner over row labels */}
        <span className="text-sm font-medium text-zinc-500">Actual</span>
        <span className="text-sm font-medium text-zinc-500">Optimal</span>
        <span className="text-sm font-medium text-zinc-500">Status</span>
        <ComplexityRow label="Time" {...time} />
        <ComplexityRow label="Space" {...space} />
      </div>
      {showSpaceTradeoffNote && (
        <p className="mt-3 text-sm text-zinc-500">
          Space is optimal for this time complexity. A lower-space solution
          exists with worse time.
        </p>
      )}
    </div>
  );
}
