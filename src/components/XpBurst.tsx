"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatMultiplier } from "@/lib/copy";

export function XpBurst({ amount, comboMultiplier, correct }: { amount: number; comboMultiplier: number; correct: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { y: 12, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
        correct ? "bg-xp-500/15 text-xp-300 ring-1 ring-xp-500/50" : "bg-ink-700 text-ink-200"
      }`}
      data-testid="xp-delta"
    >
      +{amount} XP
      {correct && comboMultiplier > 1 ? <span className="text-combo-300">{formatMultiplier(comboMultiplier)}</span> : null}
    </motion.div>
  );
}
