// Plain-JS migration runner, byte-compatible with `drizzle-kit migrate` (same drizzle.__drizzle_migrations
// table, same hashing), so production containers need only the `postgres` driver and no TypeScript toolchain.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

export async function migrate(databaseUrl, folder = "drizzle") {
  const journal = JSON.parse(await readFile(path.join(folder, "meta", "_journal.json"), "utf8"));
  const migrations = [];
  for (const entry of journal.entries) {
    const content = await readFile(path.join(folder, `${entry.tag}.sql`), "utf8");
    migrations.push({
      tag: entry.tag,
      folderMillis: entry.when,
      hash: createHash("sha256").update(content).digest("hex"),
      statements: content.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean),
    });
  }

  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  const applied = [];
  try {
    await sql.unsafe('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await sql.unsafe(
      'CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
    );
    const [last] = await sql.unsafe(
      'SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1',
    );
    const lastMillis = last ? Number(last.created_at) : -1;
    await sql.begin(async (tx) => {
      for (const m of migrations) {
        if (m.folderMillis <= lastMillis) continue;
        for (const statement of m.statements) await tx.unsafe(statement);
        await tx.unsafe('INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [
          m.hash,
          m.folderMillis,
        ]);
        applied.push(m.tag);
      }
    });
  } finally {
    await sql.end();
  }
  return applied;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { config } = await import("dotenv");
  config();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const applied = await migrate(url);
  console.log(applied.length ? `applied: ${applied.join(", ")}` : "migrations up to date");
}
