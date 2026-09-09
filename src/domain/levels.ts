import { LEVEL_CONFIG } from "./config";
import { computeAnswerXp } from "./xp";
import type { CorrectOutcome, Difficulty, LevelProgress } from "./types";

/** XP required to go from `level` to `level + 1`. Level 1 → 2 costs 50, 2 → 3 costs 141, ... */
export function xpNeeded(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return Math.round(LEVEL_CONFIG.COEFFICIENT * safe ** LEVEL_CONFIG.EXPONENT);
}

let cachedThresholds: number[] | null = null;

/** thresholds[L] = total XP required to *reach* level L. thresholds[1] = 0. Index 0 is unused (0). */
export function levelThresholds(): readonly number[] {
  if (cachedThresholds) return cachedThresholds;
  const t: number[] = [0, 0];
  for (let level = 1; level < LEVEL_CONFIG.MAX_LEVEL; level++) {
    t[level + 1] = (t[level] ?? 0) + xpNeeded(level);
  }
  cachedThresholds = t;
  return t;
}

/** Largest level whose threshold is ≤ total. Never below 1. */
export function levelFromTotalXp(totalXp: number): number {
  const total = Number.isFinite(totalXp) && totalXp > 0 ? Math.floor(totalXp) : 0;
  const t = levelThresholds();
  let lo = 1;
  let hi = LEVEL_CONFIG.MAX_LEVEL;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((t[mid] ?? Infinity) <= total) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function progressWithinLevel(totalXp: number): LevelProgress {
  const total = Number.isFinite(totalXp) && totalXp > 0 ? Math.floor(totalXp) : 0;
  const level = levelFromTotalXp(total);
  const start = levelThresholds()[level] ?? 0;
  const xpForLevel = xpNeeded(level);
  const xpIntoLevel = total - start;
  const xpToNext = Math.max(0, xpForLevel - xpIntoLevel);
  return {
    level,
    xpIntoLevel,
    xpForLevel,
    xpToNext,
    fraction: Math.min(0.999999, xpIntoLevel / xpForLevel),
  };
}

export interface LevelUpEstimateInput {
  totalXp: number;
  /** Current combo (before the next answer). */
  combo: number;
  /** Difficulties of the questions still to come in this session, in order. */
  upcomingDifficulties: Difficulty[];
  outcome?: CorrectOutcome;
}

/**
 * Simulates answering the remaining questions correctly (combo growing) and returns how many correct
 * answers reach the next level, or null when the next level is not reachable within this session.
 * Feeds the "2 more correct → level up" line, which must always be honest.
 */
export function correctAnswersToLevelUp({
  totalXp,
  combo,
  upcomingDifficulties,
  outcome = "first_try_correct",
}: LevelUpEstimateInput): number | null {
  const level = levelFromTotalXp(totalXp);
  const target = levelThresholds()[level + 1];
  if (target === undefined) return null;
  let running = Math.max(0, Math.floor(totalXp));
  let currentCombo = Math.max(0, combo);
  for (let i = 0; i < upcomingDifficulties.length; i++) {
    currentCombo += 1;
    const difficulty = upcomingDifficulties[i];
    if (difficulty === undefined) break;
    running += computeAnswerXp({ difficulty, outcome, comboAfter: currentCombo }).amount;
    if (running >= target) return i + 1;
  }
  return null;
}
