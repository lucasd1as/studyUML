import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_common";
import { questions } from "./content";
import { xpReasonEnum } from "./enums";
import { studySessions, userQuestionHistory } from "./sessions";
import { users } from "./users";

export interface XpEventMetadata {
  base?: number;
  outcomeMultiplier?: number;
  comboMultiplier?: number;
  difficulty?: number;
  note?: string;
}

/**
 * Append-only XP ledger. Current XP is always SUM(amount) per user; nothing ever mutates a row
 * (a database trigger raises on UPDATE / DELETE, see the migration `xp_events_append_only`).
 */
export const xpEvents = pgTable(
  "xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: xpReasonEnum("reason").notNull(),
    attemptId: uuid("attempt_id").references(() => userQuestionHistory.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => studySessions.id, { onDelete: "set null" }),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<XpEventMetadata>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    check("xp_events_amount_positive", sql`${t.amount} > 0`),
    index("xp_events_user_time").on(t.userId, t.createdAt),
    uniqueIndex("xp_events_one_per_attempt")
      .on(t.attemptId)
      .where(sql`${t.attemptId} is not null`),
  ],
);
