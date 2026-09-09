export type PipState = "correct" | "wrong" | "current" | "pending";

export function ProgressPips({ index, total, states }: { index: number; total: number; states: PipState[] }) {
  const shown = Math.min(index + 1, total);
  return (
    <div className="flex items-center gap-3" data-testid="progress">
      <span className="text-sm font-semibold tabular-nums text-ink-200" data-testid="progress-counter">
        {shown} of {total}
      </span>
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => {
          const s = states[i] ?? (i === index ? "current" : "pending");
          const cls =
            s === "correct"
              ? "bg-correct-500"
              : s === "wrong"
                ? "bg-wrong-500"
                : s === "current"
                  ? "bg-ink-200 ring-2 ring-ink-400/60"
                  : "bg-ink-600";
          return <span key={i} className={`block h-2.5 w-2.5 rounded-full ${cls}`} />;
        })}
      </div>
    </div>
  );
}
