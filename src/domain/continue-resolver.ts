import { STALE_SESSION_MS } from "./config";

export interface ContinueSnapshot {
  activeSession: { id: string; lastActivityAt: Date } | null;
  now: Date;
  /** Skills in curriculum order, each with lessons and this user's completion flags. */
  skills: Array<{
    id: string;
    lessons: Array<{ id: string; sortOrder: number; completed: boolean }>;
  }>;
}

export type ContinueTarget =
  | { kind: "resume"; sessionId: string }
  | { kind: "lesson"; skillId: string; lessonId: string }
  | { kind: "review"; skillId: string }
  | { kind: "nothing" };

export interface ContinueDecision {
  target: ContinueTarget;
  /** An active session that went stale and should be marked abandoned before creating a new one. */
  abandonSessionId: string | null;
}

/**
 * "Continue" is one button that never asks the learner to decide:
 *   resume a fresh active session → next incomplete lesson (skill order, then lesson order) → review the last skill.
 */
export function resolveContinue(s: ContinueSnapshot): ContinueDecision {
  let abandonSessionId: string | null = null;
  if (s.activeSession) {
    const age = s.now.getTime() - s.activeSession.lastActivityAt.getTime();
    if (age < STALE_SESSION_MS) {
      return { target: { kind: "resume", sessionId: s.activeSession.id }, abandonSessionId: null };
    }
    abandonSessionId = s.activeSession.id;
  }

  for (const skill of s.skills) {
    const next = [...skill.lessons].sort((a, b) => a.sortOrder - b.sortOrder).find((l) => !l.completed);
    if (next) return { target: { kind: "lesson", skillId: skill.id, lessonId: next.id }, abandonSessionId };
  }

  const last = s.skills.at(-1);
  if (last) return { target: { kind: "review", skillId: last.id }, abandonSessionId };
  return { target: { kind: "nothing" }, abandonSessionId };
}
