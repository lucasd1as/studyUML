"use client";

import { useState } from "react";
import { Button } from "../ui/Button";

export function FillBlank({
  locked,
  correct,
  onSubmit,
}: {
  locked: boolean;
  correct: boolean | null;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const tone =
    correct === null ? "border-ink-700 focus:border-xp-400" : correct ? "border-correct-500" : "border-wrong-500";
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!locked && text.trim()) onSubmit(text);
      }}
    >
      <input
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={locked}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="type the missing code"
        aria-label="Your answer"
        className={`min-h-12 flex-1 rounded-xl border bg-ink-900 px-4 font-mono text-[15px] text-ink-100 outline-none placeholder:text-ink-600 disabled:opacity-80 ${tone}`}
        data-testid="blank-input"
      />
      <Button type="submit" variant="secondary" disabled={locked || !text.trim()} data-testid="blank-submit">
        Check
      </Button>
    </form>
  );
}
