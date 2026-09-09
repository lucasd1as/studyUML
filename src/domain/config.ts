/**
 * Every gameplay tunable lives here. Nothing in src/domain reads process.env or the database.
 * Changing a number here changes the rules everywhere; the README documents these values.
 */

export const SESSION_SIZE = 5;

/** An active session untouched for this long is abandoned by the next "Continue". */
export const STALE_SESSION_MS = 6 * 60 * 60 * 1000;

/** Skip cards reviewed within this window when back-filling a session with review material. */
export const RECENTLY_REVIEWED_MS = 10 * 60 * 1000;

export const XP_CONFIG = {
  /** base(d) = BASE_INTERCEPT + BASE_SLOPE * difficulty  → d1 12, d2 16, d3 20, d4 24, d5 28 */
  BASE_INTERCEPT: 8,
  BASE_SLOPE: 4,
  /** Multiplier by how the correct answer was reached. */
  OUTCOME_MULTIPLIER: {
    first_try_correct: 1.0,
    review_correct: 0.8,
    later_correct: 0.6,
  },
  /** Wrong answers still pay: max(WRONG_FLOOR, round(base * WRONG_FRACTION)). Never zero. */
  WRONG_FRACTION: 0.15,
  WRONG_FLOOR: 2,
  /** Combo multiplier indexed by consecutive correct answers *including* the current one. Last entry is the cap. */
  COMBO_MULTIPLIERS: [1.0, 1.0, 1.1, 1.2, 1.35, 1.5],
} as const;

export const LEVEL_CONFIG = {
  /** xpNeeded(level) = round(COEFFICIENT * level ** EXPONENT): XP to go from `level` to `level + 1`. */
  COEFFICIENT: 50,
  EXPONENT: 1.5,
  /** Precomputed threshold table size; nobody reaches this. */
  MAX_LEVEL: 500,
} as const;

export const SM2_CONFIG = {
  INITIAL_EASE: 2.5,
  MIN_EASE: 1.3,
  FIRST_INTERVAL_DAYS: 1,
  SECOND_INTERVAL_DAYS: 6,
  /** Quality below this is a lapse. */
  PASS_THRESHOLD: 3,
  /** Attempt outcome → SM-2 quality (0..5). */
  QUALITY: {
    first_try_correct: 5,
    review_correct: 4,
    later_correct: 3,
    wrong: 1,
  },
} as const;
