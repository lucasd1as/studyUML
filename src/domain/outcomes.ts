import { SM2_CONFIG } from "./config";
import type { AttemptOutcome, CardState } from "./types";

export interface ClassifiedOutcome {
  outcome: AttemptOutcome;
  /** SM-2 quality grade 0..5 derived from the outcome. */
  quality: number;
}

/**
 * first_try_correct: correct with no prior attempt on this question, ever.
 * review_correct:    correct on a question this user had already answered correctly before.
 * later_correct:     correct after only wrong attempts ("eventually correct").
 * wrong:             wrong. Still pays floor XP, resets combo.
 */
export function classifyOutcome(isCorrect: boolean, prior: CardState | null): ClassifiedOutcome {
  if (!isCorrect) return { outcome: "wrong", quality: SM2_CONFIG.QUALITY.wrong };
  if (!prior || prior.totalAttempts === 0) {
    return { outcome: "first_try_correct", quality: SM2_CONFIG.QUALITY.first_try_correct };
  }
  if (prior.everCorrect) return { outcome: "review_correct", quality: SM2_CONFIG.QUALITY.review_correct };
  return { outcome: "later_correct", quality: SM2_CONFIG.QUALITY.later_correct };
}
