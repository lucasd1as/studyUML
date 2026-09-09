import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * postgres.js keeps a pool per client; in `next dev` every HMR reload would open a new one,
 * so the client is cached on globalThis outside production.
 */
const globalForDb = globalThis as unknown as { __studyumlSql?: ReturnType<typeof postgres> };

function createClient() {
  return postgres(env().DATABASE_URL, { max: 10 });
}

const sql = globalForDb.__studyumlSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.__studyumlSql = sql;

export const db = drizzle(sql, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
