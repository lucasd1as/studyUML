import { pgEnum } from "drizzle-orm/pg-core";

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "true_false",
  "fill_blank",
  "code_diagnosis",
]);

/** Review pipeline: only `approved` questions are ever served. Generated questions arrive as `draft`. */
export const questionStatusEnum = pgEnum("question_status", ["draft", "approved", "rejected", "archived"]);

export const questionSourceEnum = pgEnum("question_source", ["hand_written", "generated"]);

/** `boss` will join this list with minibosses. */
export const sessionModeEnum = pgEnum("session_mode", ["lesson", "review", "practice"]);

export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "abandoned"]);

export const attemptOutcomeEnum = pgEnum("attempt_outcome", [
  "first_try_correct",
  "later_correct",
  "review_correct",
  "wrong",
]);

/** Phase 0 only ever writes `answer`. The rest are reserved so later phases add rows, not migrations. */
export const xpReasonEnum = pgEnum("xp_reason", [
  "answer",
  "lesson_complete",
  "skill_complete",
  "streak_bonus",
  "achievement",
  "boss",
  "admin_adjustment",
]);

export const skillStatusEnum = pgEnum("skill_status", ["locked", "available", "in_progress", "completed", "mastered"]);
