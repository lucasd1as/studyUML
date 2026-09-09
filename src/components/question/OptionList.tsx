"use client";

import { motion, useReducedMotion } from "motion/react";
import { InlineMd } from "../InlineMd";
import type { ClientOption } from "@/server/types";

export function OptionList({
  options,
  selectedKey,
  correctKey,
  locked,
  onSelect,
}: {
  options: ClientOption[];
  selectedKey: string | null;
  correctKey: string | null;
  locked: boolean;
  onSelect: (key: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <ul className="flex flex-col gap-2" role="listbox" aria-label="Answer options">
      {options.map((o, i) => {
        const isSelected = selectedKey === o.key;
        const revealed = correctKey !== null;
        const isCorrect = revealed && correctKey === o.key;
        const isWrongPick = revealed && isSelected && !isCorrect;
        const cls = isCorrect
          ? "border-correct-500 bg-correct-500/15 text-ink-100"
          : isWrongPick
            ? "border-wrong-500 bg-wrong-500/15 text-ink-100"
            : isSelected
              ? "border-xp-400 bg-ink-700 text-ink-100"
              : revealed
                ? "border-ink-700 bg-ink-800 text-ink-400"
                : "border-ink-700 bg-ink-800 text-ink-100 hover:border-ink-400 hover:bg-ink-700";
        return (
          <li key={o.key}>
            <motion.button
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={locked}
              onClick={() => onSelect(o.key)}
              whileTap={reduce || locked ? undefined : { scale: 0.985 }}
              animate={isWrongPick && !reduce ? { x: [0, -4, 4, -2, 0] } : undefined}
              transition={{ duration: 0.3 }}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors disabled:cursor-default ${cls}`}
              data-testid={`option-${o.key}`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-950/50 font-mono text-xs uppercase text-ink-400">
                {o.key === "true" ? "T" : o.key === "false" ? "F" : String.fromCharCode(65 + i)}
              </span>
              <InlineMd text={o.labelMd} />
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
