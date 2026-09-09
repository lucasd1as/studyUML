import type { CardState } from "@/domain/types";
import type { userQuestionState } from "@/db/schema";

type CardRow = typeof userQuestionState.$inferSelect;

/** numeric(4,2) arrives as a string from postgres.js; the domain wants a number. */
export function toCardState(row: CardRow): CardState {
  return {
    easeFactor: Number(row.easeFactor),
    intervalDays: row.intervalDays,
    repetitions: row.repetitions,
    lapses: row.lapses,
    dueAt: row.dueAt,
    lastReviewedAt: row.lastReviewedAt,
    totalAttempts: row.totalAttempts,
    correctAttempts: row.correctAttempts,
    everCorrect: row.everCorrect,
  };
}

export function fromCardState(state: CardState, lastCorrect: boolean) {
  return {
    easeFactor: state.easeFactor.toFixed(2),
    intervalDays: state.intervalDays,
    repetitions: state.repetitions,
    lapses: state.lapses,
    dueAt: state.dueAt,
    lastReviewedAt: state.lastReviewedAt,
    totalAttempts: state.totalAttempts,
    correctAttempts: state.correctAttempts,
    everCorrect: state.everCorrect,
    lastCorrect,
  };
}
