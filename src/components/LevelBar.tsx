"use client";

import { motion, useReducedMotion } from "motion/react";
import type { LevelProgress } from "@/domain/types";

export function LevelBar({
  progress,
  totalXp,
  hint,
  compact = false,
}: {
  progress: LevelProgress;
  totalXp: number;
  hint?: string;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(2, Math.round(progress.fraction * 100));
  return (
    <div className="flex items-center gap-3" data-testid="level-bar">
      <motion.div
        key={progress.level}
        initial={reduce ? false : { scale: 0.7, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-xp-500 px-2 font-bold text-ink-950"
        aria-label={`Level ${progress.level}`}
        data-testid="level"
      >
        {progress.level}
      </motion.div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline justify-between text-xs text-ink-400">
          <span>
            Level {progress.level}
            {compact ? "" : ` · ${totalXp} XP total`}
          </span>
          <span className="tabular-nums">
            {progress.xpIntoLevel} / {progress.xpForLevel} XP
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-ink-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <motion.div
            key={progress.level}
            className="h-full rounded-full bg-gradient-to-r from-xp-500 to-xp-300"
            initial={reduce ? { width: `${pct}%` } : { width: "2%" }}
            animate={{ width: `${pct}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        {hint ? (
          <p className="mt-1 text-sm text-xp-300" data-testid="level-hint">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
