import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Phase 0 has no authentication: every request acts as the seeded dev user.
 * This is the single seam for Auth.js later: replace the body with `auth()` and nothing else changes.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const email = env().DEV_USER_EMAIL;
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, name: true, email: true },
  });
  if (existing) return existing;
  const [created] = await db
    .insert(users)
    .values({ email, name: "Dev" })
    .onConflictDoUpdate({ target: users.email, set: { name: "Dev" } })
    .returning({ id: users.id, name: users.name, email: users.email });
  if (!created) throw new Error("could not create the dev user");
  return created;
});
