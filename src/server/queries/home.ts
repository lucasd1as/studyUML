import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, studySessions, userQuestionState } from "@/db/schema";
import { SESSION_SIZE } from "@/domain/config";
import { resolveContinue } from "@/domain/continue-resolver";
import type { ContinuePreview } from "../types";
import { getCurriculum, toContinueSnapshot } from "./curriculum";

/** What the Continue button will do, without doing it. Read-only: a stale session is only abandoned on click. */
export async function getContinuePreview(userId: string): Promise<ContinuePreview> {
  const now = new Date();
  const active = await db.query.studySessions.findFirst({
    where: and(eq(studySessions.userId, userId), eq(studySessions.status, "active")),
    with: { skill: { columns: { title: true } }, lesson: { columns: { title: true } } },
  });
  const curriculum = await getCurriculum(db, userId);
  const decision = resolveContinue(
    toContinueSnapshot(curriculum, active ? { id: active.id, lastActivityAt: active.lastActivityAt } : null, now),
  );
  const target = decision.target;

  if (target.kind === "resume" && active) {
    return {
      kind: "resume",
      sessionId: active.id,
      answered: active.answeredCount,
      total: active.questionCount,
      lessonTitle: active.lesson?.title ?? null,
      skillTitle: active.skill.title,
    };
  }
  if (target.kind === "lesson") {
    const skill = curriculum.find((s) => s.id === target.skillId);
    const lesson = skill?.lessons.find((l) => l.id === target.lessonId);
    if (!skill || !lesson) return { kind: "nothing" };
    const unseen = await db
      .select({ difficulty: questions.difficulty })
      .from(questions)
      .leftJoin(
        userQuestionState,
        and(eq(userQuestionState.questionId, questions.id), eq(userQuestionState.userId, userId)),
      )
      .where(and(eq(questions.lessonId, lesson.id), eq(questions.status, "approved")))
      .orderBy(asc(questions.sortOrder));
    const difficulties = unseen.slice(0, SESSION_SIZE).map((q) => q.difficulty);
    return {
      kind: "lesson",
      lessonTitle: lesson.title,
      skillTitle: skill.title,
      introMd: lesson.introMd,
      questionCount: Math.min(SESSION_SIZE, unseen.length),
      estimateDifficulties: difficulties,
    };
  }
  if (target.kind === "review") {
    const skill = curriculum.find((s) => s.id === target.skillId);
    if (!skill) return { kind: "nothing" };
    return {
      kind: "review",
      skillTitle: skill.title,
      questionCount: SESSION_SIZE,
      estimateDifficulties: Array.from({ length: SESSION_SIZE }, () => 3),
    };
  }
  return { kind: "nothing" };
}
