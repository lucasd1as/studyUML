import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, tz } from "./_common";
import { lessons, questions, skills } from "./content";
import { attemptOutcomeEnum, sessionModeEnum, sessionStatusEnum } from "./enums";
import { users } from "./users";
import type { SubmittedAnswer } from "@/domain/types";

/** One fixed-size study session (5 questions). Combo lives here; it is per session by design. */
export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: sessionModeEnum("mode").notNull(),
    status: sessionStatusEnum("status").notNull().default("active"),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    /** null for review / practice sessions. */
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    questionCount: smallint("question_count").notNull(),
    answeredCount: smallint("answered_count").notNull().default(0),
    correctCount: smallint("correct_count").notNull().default(0),
    currentCombo: smallint("current_combo").notNull().default(0),
    maxCombo: smallint("max_combo").notNull().default(0),
    startedAt: timestamp("started_at", tz).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", tz).notNull().defaultNow(),
    completedAt: timestamp("completed_at", tz),
  },
  (t) => [
    index("study_sessions_user_status").on(t.userId, t.status, t.startedAt),
    uniqueIndex("study_sessions_one_active")
      .on(t.userId)
      .where(sql`${t.status} = 'active'`),
  ],
);

/** The ordered questions of a session, persisted so a reload or second tab resumes the identical session. */
export const studySessionQuestions = pgTable(
  "study_session_questions",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.position] }),
    unique("study_session_questions_unique_question").on(t.sessionId, t.questionId),
  ],
);

/** Append-only log of every answer. Feeds analytics and the review pipeline; never updated. */
export const userQuestionHistory = pgTable(
  "user_question_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    submittedAnswer: jsonb("submitted_answer").$type<SubmittedAnswer>().notNull(),
    isCorrect: boolean("is_correct").notNull(),
    outcome: attemptOutcomeEnum("outcome").notNull(),
    comboBefore: smallint("combo_before").notNull(),
    comboAfter: smallint("combo_after").notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    /** Client-measured think time. Recorded now, used by SM-2 later. */
    responseMs: integer("response_ms"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("user_question_history_session_position").on(t.sessionId, t.position),
    index("user_question_history_user_question").on(t.userId, t.questionId, t.createdAt),
    index("user_question_history_user_time").on(t.userId, t.createdAt),
  ],
);
