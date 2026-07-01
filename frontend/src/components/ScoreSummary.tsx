function getScoreColor(score: number) {
  if (score < 50) return "text-red-400";
  if (score < 80) return "text-amber-400";
  return "text-emerald-400";
}

export function ScoreSummary({ score }: { score: number }) {
  return (
    <p className="text-zinc-200">
      Score:{" "}
      <span className={`font-semibold ${getScoreColor(score)}`}>{score}</span>
      <span className="text-zinc-400"> / 100</span>
    </p>
  );
}
