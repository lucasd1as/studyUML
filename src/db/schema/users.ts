import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, tz } from "./_common";

/**
 * Shaped exactly like the Auth.js Drizzle adapter's users table (id, name, email, emailVerified, image) so
 * that adding Auth.js later is additive: new accounts/sessions/verification_tokens tables, no change here.
 * Extra columns carry defaults so the adapter's createUser keeps working.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", tz),
  image: text("image"),
  /** IANA zone; needed the day streaks arrive ("a day" is the learner's day, not UTC's). */
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: createdAt(),
});
