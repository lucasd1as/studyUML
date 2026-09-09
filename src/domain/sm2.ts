import { SM2_CONFIG } from "./config";
import type { CardState } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function freshCard(now: Date): CardState {
  return {
    easeFactor: SM2_CONFIG.INITIAL_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: now,
    lastReviewedAt: null,
    totalAttempts: 0,
    correctAttempts: 0,
    everCorrect: false,
  };
}

/**
 * SuperMemo-2, as popularised by Anki, over a 0..5 quality grade.
 *   q ≥ 3 → pass: intervals run 1 day, 6 days, then previous × ease (ease *before* this update).
 *   q < 3 → lapse: repetitions reset, interval back to 1 day; counts as a lapse only if it had been learned.
 * Ease is adjusted after every review and floors at 1.3. Rounding of the ease is to 2 decimals so it
 * survives a numeric(4,2) column round-trip unchanged.
 */
export function sm2Update(prior: CardState, quality: number, now: Date): CardState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const passed = q >= SM2_CONFIG.PASS_THRESHOLD;

  let repetitions = prior.repetitions;
  let intervalDays = prior.intervalDays;
  let lapses = prior.lapses;

  if (passed) {
    if (repetitions === 0) intervalDays = SM2_CONFIG.FIRST_INTERVAL_DAYS;
    else if (repetitions === 1) intervalDays = SM2_CONFIG.SECOND_INTERVAL_DAYS;
    else intervalDays = Math.max(1, Math.round(intervalDays * prior.easeFactor));
    repetitions += 1;
  } else {
    if (repetitions > 0) lapses += 1;
    repetitions = 0;
    intervalDays = SM2_CONFIG.FIRST_INTERVAL_DAYS;
  }

  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const easeFactor = Math.max(SM2_CONFIG.MIN_EASE, Math.round((prior.easeFactor + delta) * 100) / 100);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    lastReviewedAt: now,
    totalAttempts: prior.totalAttempts + 1,
    correctAttempts: prior.correctAttempts + (passed ? 1 : 0),
    everCorrect: prior.everCorrect || passed,
  };
}
