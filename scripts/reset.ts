import "dotenv/config";
import postgres from "postgres";

/** Development only: drops everything so `pnpm db:reset` starts from a clean database. */
if (process.env.NODE_ENV === "production") throw new Error("refusing to reset a production database");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = postgres(url, { max: 1 });
try {
  await sql.unsafe("drop schema if exists drizzle cascade");
  await sql.unsafe("drop schema public cascade");
  await sql.unsafe("create schema public");
  console.log("database reset");
} finally {
  await sql.end();
}
