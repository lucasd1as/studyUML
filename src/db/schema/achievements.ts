import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, tz } from "./_common";
import { users } from "./users";

/** Schema only in Phase 0. No achievement is awarded yet. */
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  xpReward: integer("xp_reward").notNull().default(0),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", tz).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })],
);
