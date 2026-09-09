import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, tz, updatedAt } from "./_common";
import { questionSourceEnum, questionStatusEnum, questionTypeEnum } from "./enums";
import { users } from "./users";

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** "World": a major grouping of related skills. */
export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique("units_course_slug").on(t.courseId, t.slug), index("units_course_order").on(t.courseId, t.sortOrder)],
);

/** "Level": one topic / chapter. */
export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique("skills_unit_slug").on(t.unitId, t.slug), index("skills_unit_order").on(t.unitId, t.sortOrder)],
);

/** "Quest": one section within a topic, 4–8 questions. */
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** Short markdown intro shown on the Continue card. */
    introMd: text("intro_md"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique("lessons_skill_slug").on(t.skillId, t.slug), index("lessons_skill_order").on(t.skillId, t.sortOrder)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable human key for seeding and the content pipeline, e.g. "smart-pointers.unique-ptr.q03". */
    slug: text("slug").notNull().unique(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    /** Denormalised on purpose: review queries are per skill. */
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    questionType: questionTypeEnum("question_type").notNull(),
    difficulty: smallint("difficulty").notNull(),
    promptMd: text("prompt_md").notNull(),
    codeSnippet: text("code_snippet"),
    codeLanguage: text("code_language").notNull().default("cpp"),
    /** fill_blank only: the canonical answer shown after grading. */
    correctAnswer: text("correct_answer"),
    /** fill_blank only: additional accepted spellings. */
    acceptedAnswers: jsonb("accepted_answers").$type<string[]>().notNull().default([]),
    caseSensitive: boolean("case_sensitive").notNull().default(true),
    explanationMd: text("explanation_md").notNull(),
    source: questionSourceEnum("source").notNull().default("hand_written"),
    status: questionStatusEnum("status").notNull().default("draft"),
    /** Textbook chapter / section this question was written from. */
    sourceSection: text("source_section"),
    reviewNotes: text("review_notes"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", tz),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("questions_difficulty_range", sql`${t.difficulty} between 1 and 5`),
    index("questions_lesson_status_order").on(t.lessonId, t.status, t.sortOrder),
    index("questions_skill_status").on(t.skillId, t.status),
  ],
);

/** Options for multiple_choice / true_false / code_diagnosis. Distractors are the rows with is_correct = false. */
export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    /** 'a'..'d', or 'true' / 'false'. Attempts store this key, never the row id, so reseeding is safe. */
    key: text("key").notNull(),
    labelMd: text("label_md").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    /** Why this particular distractor is tempting and wrong. Shown when it is picked. */
    feedbackMd: text("feedback_md"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    unique("question_options_question_key").on(t.questionId, t.key),
    uniqueIndex("question_options_one_correct")
      .on(t.questionId)
      .where(sql`${t.isCorrect}`),
  ],
);
