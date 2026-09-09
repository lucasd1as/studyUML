/** Monospace code with the fill-in blank (____) highlighted. Scrolls horizontally instead of wrapping. */
export function CodeBlock({ code, language = "cpp" }: { code: string; language?: string }) {
  const lines = code.split("\n");
  return (
    <pre
      data-language={language}
      className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 p-4 font-mono text-[13.5px] leading-relaxed text-ink-100"
    >
      {lines.map((line, i) => {
        const segments = line.split(/(____)/g);
        return (
          <span key={i} className="block">
            {segments.map((seg, j) =>
              seg === "____" ? (
                <span key={j} className="rounded bg-xp-500/20 px-1 text-xp-300 ring-1 ring-xp-500/60">
                  ____
                </span>
              ) : (
                <span key={j}>{seg}</span>
              ),
            )}
          </span>
        );
      })}
    </pre>
  );
}
