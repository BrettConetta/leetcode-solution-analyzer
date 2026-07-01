type ComplexityRowProps = {
    label: string;
    actual: string;
    optimal: string;
    isOptimal: boolean;
}
export function ComplexityRow({ label, actual, optimal, isOptimal }: ComplexityRowProps) {
    const actualColor = isOptimal ? "text-emerald-400" : "text-amber-400";
    const statusColor = isOptimal ? "text-emerald-400" : "text-amber-400";
    return (
        <>
        <span className="text-sm font-medium text-zinc-400">{label}</span>
        <span className={`font-mono text-sm ${actualColor}`}>{actual}</span>
        <span className="font-mono text-sm text-zinc-300">{optimal}</span>
        <span className={`text-sm ${statusColor}`}>
            {isOptimal ? "Optimal" : "Suboptimal"}
        </span>
        </>
    );
}