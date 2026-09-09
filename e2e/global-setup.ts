import "dotenv/config";
import postgres from "postgres";
import { migrate } from "../scripts/migrate.mjs";
import { seed } from "../src/db/seed/seed";

/** Migrates and seeds the test database, and resets the e2e user so every run starts at level 1. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TEST ?? "postgres://studyuml:studyuml@localhost:5432/studyuml_test";
  await migrate(url);
  await seed(url, "dev@studyuml.local");
  const sql = postgres(url, { max: 1 });
  try {
    await sql`delete from users where email = 'e2e@studyuml.local'`;
  } finally {
    await sql.end();
  }
}
