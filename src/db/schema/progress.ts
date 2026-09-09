import { boolean, index, integer, numeric, pgTable, primaryKey, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { tz, updatedAt } from "./_common";
import { lessons, questions, skills } from "./content";
import { skillStatusEnum } from "./enums";
import { users } from "./users";

/** The SM-2 card: one row per user × question. Drives the review queue. */
export const userQuestionState = pgTable(
  "user_question_state",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    easeFactor: numeric("ease_factor", { precision: 4, scale: 2 }).notNull().default("2.50"),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at", tz).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", tz),
    totalAttempts: integer("total_attempts").notNull().default(0),
    correctAttempts: integer("correct_attempts").notNull().default(0),
    everCorrect: boolean("ever_correct").notNull().default(false),
    lastCorrect: boolean("last_correct"),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.questionId] }),
    index("user_question_state_due").on(t.userId, t.dueAt),
    index("user_question_state_ever_correct").on(t.userId, t.everCorrect),
  ],
);

export const userLessonProgress = pgTable(
  "user_lesson_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    questionsTotal: integer("questions_total").notNull().default(0),
    /** A lesson is complete when this equals questions_total. */
    questionsEverCorrect: integer("questions_ever_correct").notNull().default(0),
    firstStartedAt: timestamp("first_started_at", tz).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", tz).notNull().defaultNow(),
    completedAt: timestamp("completed_at", tz),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index("user_lesson_progress_completed").on(t.userId, t.completedAt)],
);

/** Per-skill mastery (the brief's `user_progress`). */
export const userProgress = pgTable(
  "user_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    status: skillStatusEnum("status").notNull().default("available"),
    lessonsTotal: integer("lessons_total").notNull().default(0),
    lessonsCompleted: integer("lessons_completed").notNull().default(0),
    /** 0..1. Phase 0: lessons_completed / lessons_total. Later: decays with SM-2 ease. */
    mastery: real("mastery").notNull().default(0),
    firstStartedAt: timestamp("first_started_at", tz).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", tz).notNull().defaultNow(),
    completedAt: timestamp("completed_at", tz),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);
