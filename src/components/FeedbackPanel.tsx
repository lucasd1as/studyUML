"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/Button";
import { InlineMd } from "./InlineMd";
import { XpBurst } from "./XpBurst";
import { levelHint, outcomeLabel } from "@/lib/copy";
import type { SubmitAnswerResult } from "@/server/types";

export function FeedbackPanel({
  result,
  isLast,
  onNext,
}: {
  result: SubmitAnswerResult;
  isLast: boolean;
  onNext: () => void;
}) {
  const reduce = useReducedMotion();
  const tone = result.correct
    ? "border-correct-500/50 bg-correct-500/10"
    : "border-wrong-500/40 bg-wrong-500/10";
  return (
    <motion.section
      initial={reduce ? false : { y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`rounded-xl border p-4 sm:p-5 ${tone}`}
      data-testid="feedback"
      data-correct={result.correct}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${result.correct ? "text-correct-300" : "text-wrong-300"}`}>
            {result.correct ? "Correct" : "Not quite"}
          </span>
          <span className="text-sm text-ink-400">{outcomeLabel(result.outcome)}</span>
        </div>
        <XpBurst amount={result.xp.amount} comboMultiplier={result.xp.comboMultiplier} correct={result.correct} />
      </div>

      {result.level.leveledUp ? (
        <motion.p
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.25, type: "spring", stiffness: 300, damping: 16 }}
          className="mt-3 inline-block rounded-lg bg-xp-500 px-3 py-1 text-sm font-bold text-ink-950"
          data-testid="level-up"
        >
          Level {result.level.after.level} reached
        </motion.p>
      ) : null}

      {!result.correct && result.correctAnswerText ? (
        <p className="mt-3 text-sm text-ink-200">
          Answer: <code className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-ink-100">{result.correctAnswerText}</code>
        </p>
      ) : null}

      {result.optionFeedbackMd ? (
        <p className="mt-3 text-sm text-ink-200">
          <InlineMd text={result.optionFeedbackMd} />
        </p>
      ) : null}

      <p className="mt-3 text-[15px] leading-relaxed text-ink-100">
        <InlineMd text={result.explanationMd} />
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-xp-300">{levelHint(result.level.after, result.estimate.correctAnswersToLevelUp)}</span>
        <Button onClick={onNext} autoFocus data-testid="next">
          {isLast ? "Finish" : "Next"}
          <span aria-hidden className="text-ink-950/70">
            ↵
          </span>
        </Button>
      </div>
    </motion.section>
  );
}
