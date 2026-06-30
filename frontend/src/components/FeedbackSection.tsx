type FeedbackSectionProps = {
    feedback: string[];
    title: string;
    includeColoredText?: boolean;
    emptyMessage: string;
};
export function FeedbackSection({ feedback, title, includeColoredText=false, emptyMessage }: FeedbackSectionProps) {
    const textColor = includeColoredText ? {
        good: "text-emerald-400/80",
        bad: "text-red-300",
    } : {
        good: "text-zinc-400",
        bad: "text-zinc-300",
    }
    return (
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-4 space-y-6">
            <h3 className="text-xl font-semibold text-zinc-200">{title} ({feedback.length})</h3>
            {feedback.length === 0 ? (
                <p className={textColor.good}>{emptyMessage}</p>
            ) : (
            <ul className={`list-disc list-inside ${textColor.bad}`}>
                {feedback.map((item, index: number) => (
                    <li key={`${item}-${index}`}>{item}</li>
                ))}
            </ul>
            )}
        </div>
    )
}