import { XP_CONFIG } from "./config";
import { comboMultiplier } from "./combo";
import type { AttemptOutcome, Difficulty, XpBreakdown } from "./types";

export function baseXp(difficulty: Difficulty): number {
  return XP_CONFIG.BASE_INTERCEPT + XP_CONFIG.BASE_SLOPE * difficulty;
}

/** Wrong answers still pay a little. Effort is never worth zero. */
export function wrongAnswerXp(difficulty: Difficulty): number {
  return Math.max(XP_CONFIG.WRONG_FLOOR, Math.round(baseXp(difficulty) * XP_CONFIG.WRONG_FRACTION));
}

export interface ComputeXpInput {
  difficulty: Difficulty;
  outcome: AttemptOutcome;
  /** Combo *after* this answer (so a first correct answer is combo 1). Ignored for wrong answers. */
  comboAfter: number;
}

/**
 * amount = round(base(difficulty) × outcomeMultiplier × comboMultiplier), minimum 1.
 * Wrong answers bypass the multipliers and receive the flat floor amount.
 */
export function computeAnswerXp({ difficulty, outcome, comboAfter }: ComputeXpInput): XpBreakdown {
  const base = baseXp(difficulty);
  if (outcome === "wrong") {
    return {
      amount: wrongAnswerXp(difficulty),
      base,
      outcomeMultiplier: XP_CONFIG.WRONG_FRACTION,
      comboMultiplier: 1,
    };
  }
  const outcomeMultiplier = XP_CONFIG.OUTCOME_MULTIPLIER[outcome];
  const combo = comboMultiplier(comboAfter);
  const amount = Math.max(1, Math.round(base * outcomeMultiplier * combo));
  return { amount, base, outcomeMultiplier, comboMultiplier: combo };
}
