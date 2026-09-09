import { SESSION_SIZE } from "@/domain/config";
import type { LevelProgress } from "@/domain/types";

/** The short-horizon line under the level bar. Always exists, always honest. */
export function levelHint(progress: LevelProgress, correctAnswersToLevelUp: number | null): string {
  if (correctAnswersToLevelUp !== null && correctAnswersToLevelUp <= SESSION_SIZE) {
    return `${correctAnswersToLevelUp} more correct → level up`;
  }
  return `${progress.xpToNext} XP to level ${progress.level + 1}`;
}

export function outcomeLabel(outcome: "first_try_correct" | "later_correct" | "review_correct" | "wrong"): string {
  switch (outcome) {
    case "first_try_correct":
      return "First try";
    case "later_correct":
      return "Got it this time";
    case "review_correct":
      return "Still got it";
    case "wrong":
      return "Effort still counts";
  }
}

export function formatMultiplier(m: number): string {
  return `×${m.toFixed(2).replace(/\.?0+$/, "")}`;
}
