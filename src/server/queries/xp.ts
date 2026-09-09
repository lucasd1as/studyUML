import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { xpEvents } from "@/db/schema";
import { progressWithinLevel } from "@/domain/levels";
import type { UserXpSnapshot } from "../types";

/** The one and only way to know a user's XP: sum the append-only ledger. */
export async function getTotalXp(tx: DbOrTx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)::int` })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId));
  return row?.total ?? 0;
}

export async function getUserXpSnapshot(tx: DbOrTx, userId: string): Promise<UserXpSnapshot> {
  const totalXp = await getTotalXp(tx, userId);
  return { totalXp, progress: progressWithinLevel(totalXp) };
}
