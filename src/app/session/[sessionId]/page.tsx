import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentUser } from "@/server/current-user";
import { getUserXpSnapshot } from "@/server/queries/xp";
import { getSessionForClient } from "@/server/sessions";
import { SessionRunner } from "./SessionRunner";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: PageProps<"/session/[sessionId]">) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  const session = await getSessionForClient(sessionId, user.id);
  if (!session) notFound();
  if (session.status !== "active") redirect(`/session/${session.id}/summary`);
  const xp = await getUserXpSnapshot(db, user.id);
  return (
    <main className="flex flex-1 flex-col">
      <SessionRunner session={session} xp={xp} />
    </main>
  );
}
