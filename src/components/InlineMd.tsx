import { Fragment } from "react";

/** Renders the two bits of markdown the content uses: `code` and **bold**. No HTML injection surface. */
export function InlineMd({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code key={i} className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[0.92em] text-ink-100">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}
