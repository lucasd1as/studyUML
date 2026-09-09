"use client";

import { motion, useReducedMotion } from "motion/react";
import { COMBO_CAP, comboMultiplier } from "@/domain/combo";
import { formatMultiplier } from "@/lib/copy";

export function ComboMeter({ combo }: { combo: number }) {
  const reduce = useReducedMotion();
  const filled = Math.min(combo, COMBO_CAP);
  const multiplier = comboMultiplier(combo);
  return (
    <div className="flex items-center gap-2" aria-label={`Combo ${combo}`} data-testid="combo" data-combo={combo}>
      <div className="flex items-center gap-1">
        {Array.from({ length: COMBO_CAP }, (_, i) => {
          const on = i < filled;
          return (
            <motion.span
              key={`${i}-${on ? combo : "off"}`}
              initial={reduce || !on ? false : { scale: 0.6 }}
              animate={{ scale: 1, opacity: on ? 1 : 0.35 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className={`block h-2.5 w-4 rounded-full ${on ? "bg-combo-500" : "bg-ink-600"}`}
            />
          );
        })}
      </div>
      <motion.span
        key={combo}
        initial={reduce ? false : { scale: combo > 1 ? 1.25 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={`min-w-[3.25rem] text-right text-sm font-semibold tabular-nums ${combo >= 2 ? "text-combo-300" : "text-ink-400"}`}
      >
        {combo >= 2 ? formatMultiplier(multiplier) : "Combo"}
      </motion.span>
    </div>
  );
}
