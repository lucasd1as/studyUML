import "server-only";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { lessons, questions, skills, units, userLessonProgress, userQuestionState } from "@/db/schema";
import type { ContinueSnapshot } from "@/domain/continue-resolver";
import type { CandidateQuestion } from "@/domain/session-builder";
import type { Difficulty } from "@/domain/types";
import { toCardState } from "../cards";

export interface CurriculumSkill {
  id: string;
  slug: string;
  title: string;
  lessons: Array<{ id: string; slug: string; title: string; introMd: string | null; sortOrder: number; completed: boolean }>;
}

/**
 * Skills that actually have lessons, in curriculum order, with this user's lesson completion flags.
 * Phase 0: exactly one skill (Smart Pointers). The shape already walks the whole tree.
 */
export async function getCurriculum(tx: DbOrTx, userId: string): Promise<CurriculumSkill[]> {
  const rows = await tx
    .select({
      skillId: skills.id,
      skillSlug: skills.slug,
      skillTitle: skills.title,
      lessonId: lessons.id,
      lessonSlug: lessons.slug,
      lessonTitle: lessons.title,
      introMd: lessons.introMd,
      lessonSortOrder: lessons.sortOrder,
    })
    .from(lessons)
    .innerJoin(skills, eq(lessons.skillId, skills.id))
    .innerJoin(units, eq(skills.unitId, units.id))
    .orderBy(asc(units.sortOrder), asc(skills.sortOrder), asc(lessons.sortOrder));

  const completed = new Set(
    (
      await tx
        .select({ lessonId: userLessonProgress.lessonId })
        .from(userLessonProgress)
        .where(and(eq(userLessonProgress.userId, userId), isNotNull(userLessonProgress.completedAt)))
    ).map((r) => r.lessonId),
  );

  const bySkill = new Map<string, CurriculumSkill>();
  for (const r of rows) {
    let skill = bySkill.get(r.skillId);
    if (!skill) {
      skill = { id: r.skillId, slug: r.skillSlug, title: r.skillTitle, lessons: [] };
      bySkill.set(r.skillId, skill);
    }
    skill.lessons.push({
      id: r.lessonId,
      slug: r.lessonSlug,
      title: r.lessonTitle,
      introMd: r.introMd,
      sortOrder: r.lessonSortOrder,
      completed: completed.has(r.lessonId),
    });
  }
  return [...bySkill.values()];
}

export function toContinueSnapshot(
  curriculum: CurriculumSkill[],
  activeSession: ContinueSnapshot["activeSession"],
  now: Date,
): ContinueSnapshot {
  return {
    activeSession,
    now,
    skills: curriculum.map((s) => ({
      id: s.id,
      lessons: s.lessons.map((l) => ({ id: l.id, sortOrder: l.sortOrder, completed: l.completed })),
    })),
  };
}

export interface SkillCandidates {
  lessonQuestions: CandidateQuestion[];
  skillQuestions: CandidateQuestion[];
}

/**
 * Approved questions of a skill with this user's SM-2 state, split into "this lesson" and
 * "earlier lessons of the skill" (no spoilers from later lessons). In review mode everything is skill material.
 */
export async function getSkillCandidates(
  tx: DbOrTx,
  userId: string,
  skillId: string,
  lessonId: string | null,
): Promise<SkillCandidates> {
  const rows = await tx
    .select({
      id: questions.id,
      lessonId: questions.lessonId,
      sortOrder: questions.sortOrder,
      difficulty: questions.difficulty,
      lessonSortOrder: lessons.sortOrder,
      state: userQuestionState,
    })
    .from(questions)
    .innerJoin(lessons, eq(questions.lessonId, lessons.id))
    .leftJoin(
      userQuestionState,
      and(eq(userQuestionState.questionId, questions.id), eq(userQuestionState.userId, userId)),
    )
    .where(and(eq(questions.skillId, skillId), eq(questions.status, "approved")))
    .orderBy(asc(lessons.sortOrder), asc(questions.sortOrder));

  const currentLessonOrder = lessonId ? (rows.find((r) => r.lessonId === lessonId)?.lessonSortOrder ?? null) : null;

  const lessonQuestions: CandidateQuestion[] = [];
  const skillQuestions: CandidateQuestion[] = [];
  for (const r of rows) {
    const candidate: CandidateQuestion = {
      id: r.id,
      lessonId: r.lessonId,
      sortOrder: r.sortOrder,
      difficulty: r.difficulty as Difficulty,
      state: r.state ? toCardState(r.state) : null,
    };
    if (lessonId === null) {
      skillQuestions.push(candidate);
    } else if (r.lessonId === lessonId) {
      lessonQuestions.push(candidate);
    } else if (currentLessonOrder !== null && r.lessonSortOrder < currentLessonOrder) {
      skillQuestions.push(candidate);
    }
  }
  return { lessonQuestions, skillQuestions };
}
