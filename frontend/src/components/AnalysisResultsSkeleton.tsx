function SkeletonBar({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-zinc-700 ${className}`} />;
  }
  
  function SkeletonSection({ titleWidth = "w-40" }: { titleWidth?: string }) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-4 space-y-4">
        <SkeletonBar className={`h-6 ${titleWidth}`} />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-5/6" />
        <SkeletonBar className="h-4 w-4/6" />
      </div>
    );
  }
  
  export function AnalysisResultsSkeleton() {
    return (
      <div
        className="rounded-md border-2 border-zinc-700 bg-zinc-800/50 p-6 space-y-6"
        aria-busy="true"
        aria-label="Loading analysis results"
      >
        <div className="space-y-2">
          <SkeletonBar className="h-7 w-48" />        {/* "Analysis Results" */}
          <SkeletonBar className="h-4 w-24" />         {/* optional subtitle */}
        </div>
  
        <SkeletonBar className="h-5 w-32" />           {/* score line */}
  
        <SkeletonSection titleWidth="w-36" />          {/* Logic Flaws */}
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-4 space-y-4">
            <SkeletonBar className="h-6 w-28" />
            <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBar key={i} className="h-4" />
            ))}
            </div>
        </div>
        <SkeletonSection titleWidth="w-36" />          {/* Improvements */}
      </div>
    );
  }