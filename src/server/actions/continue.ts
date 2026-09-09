"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../current-user";
import { startOrResumeSession } from "../sessions";

/** The one button. Resolves what to do next, creates the session if needed, and goes there. */
export async function continueAction(): Promise<void> {
  const user = await getCurrentUser();
  const sessionId = await startOrResumeSession(user.id);
  if (!sessionId) redirect("/?empty=1");
  redirect(`/session/${sessionId}`);
}
