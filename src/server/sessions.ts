import "server-only";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  lessons,
  questionOptions,
  questions,
  studySessionQuestions,
  studySessions,
  userLessonProgress,
  userProgress,
  userQuestionHistory,
  userQuestionState,
  xpEvents,
} from "@/db/schema";
import { resolveContinue } from "@/domain/continue-resolver";
import { comboMultiplier, nextComboMultiplier, updateCombo } from "@/domain/combo";
import { gradeAnswer } from "@/domain/grading";
import { correctAnswersToLevelUp, progressWithinLevel } from "@/domain/levels";
import { classifyOutcome } from "@/domain/outcomes";
import { seededRng, shuffle } from "@/domain/random";
import { buildSession } from "@/domain/session-builder";
import { freshCard, sm2Update } from "@/domain/sm2";
import type { Difficulty, SubmittedAnswer } from "@/domain/types";
import { computeAnswerXp } from "@/domain/xp";
import { fromCardState, toCardState } from "./cards";
import { getCurriculum, getSkillCandidates, toContinueSnapshot } from "./queries/curriculum";
import { getTotalXp } from "./queries/xp";
import type { ClientQuestion, ClientSession, SessionSummary, SubmitAnswerResult } from "./types";

export class SessionError extends Error {
  constructor(
    message: string,
    public readonly code: "not_found" | "not_active" | "out_of_order" | "no_content",
  ) {
    super(message);
  }
}

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "23505";

/**
 * What "Continue" does: resume a fresh active session, else create the next one.
 * Returns null only when the course has no content at all.
 */
export async function startOrResumeSession(userId: string): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      const now = new Date();
      const active = await tx.query.studySessions.findFirst({
        where: and(eq(studySessions.userId, userId), eq(studySessions.status, "active")),
        columns: { id: true, lastActivityAt: true },
      });
      const curriculum = await getCurriculum(tx, userId);
      const decision = resolveContinue(toContinueSnapshot(curriculum, active ?? null, now));

      if (decision.abandonSessionId) {
        await tx
          .update(studySessions)
          .set({ status: "abandoned" })
          .where(eq(studySessions.id, decision.abandonSessionId));
      }
      const target = decision.target;
      if (target.kind === "resume") return target.sessionId;
      if (target.kind === "nothing") return null;

      const lessonId = target.kind === "lesson" ? target.lessonId : null;
      const candidates = await getSkillCandidates(tx, userId, target.skillId, lessonId);
      const built = buildSession({
        mode: target.kind === "lesson" ? "lesson" : "review",
        lessonQuestions: candidates.lessonQuestions,
        skillQuestions: candidates.skillQuestions,
        now,
        rng: seededRng(`${userId}:${now.getTime()}`),
      });
      if (built.questionIds.length === 0) throw new SessionError("no approved questions", "no_content");

      const [session] = await tx
        .insert(studySessions)
        .values({
          userId,
          mode: built.mode,
          skillId: target.skillId,
          lessonId,
          questionCount: built.questionIds.length,
        })
        .returning({ id: studySessions.id });
      if (!session) throw new Error("session insert returned nothing");
      await tx
        .insert(studySessionQuestions)
        .values(built.questionIds.map((questionId, position) => ({ sessionId: session.id, position, questionId })));
      return session.id;
    });
  } catch (e) {
    // Two concurrent "Continue" clicks: the partial unique index guarantees one active session; reuse it.
    if (isUniqueViolation(e)) {
      const active = await db.query.studySessions.findFirst({
        where: and(eq(studySessions.userId, userId), eq(studySessions.status, "active")),
        columns: { id: true },
      });
      if (active) return active.id;
    }
    throw e;
  }
}

/** The session as the client may see it: questions in order, options shuffled deterministically, no answer key. */
export async function getSessionForClient(sessionId: string, userId: string): Promise<ClientSession | null> {
  const session = await db.query.studySessions.findFirst({
    where: and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)),
    with: {
      skill: { columns: { title: true } },
      lesson: { columns: { title: true } },
      sessionQuestions: {
        orderBy: asc(studySessionQuestions.position),
        with: { question: { with: { options: { orderBy: asc(questionOptions.sortOrder) } } } },
      },
    },
  });
  if (!session) return null;

  const clientQuestions: ClientQuestion[] = session.sessionQuestions.map((sq) => {
    const q = sq.question;
    const options = q.options.map((o) => ({ key: o.key, labelMd: o.labelMd }));
    const shuffled = q.questionType === "true_false" ? options : shuffle(options, seededRng(`${session.id}:${q.id}`));
    return {
      id: q.id,
      position: sq.position,
      questionType: q.questionType,
      difficulty: q.difficulty,
      promptMd: q.promptMd,
      codeSnippet: q.codeSnippet,
      codeLanguage: q.codeLanguage,
      options: shuffled,
    };
  });

  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    skillTitle: session.skill.title,
    lessonTitle: session.lesson?.title ?? null,
    questionCount: session.questionCount,
    answeredCount: session.answeredCount,
    correctCount: session.correctCount,
    currentCombo: session.currentCombo,
    maxCombo: session.maxCombo,
    questions: clientQuestions,
  };
}

export interface SubmitAnswerParams {
  userId: string;
  sessionId: string;
  position: number;
  answer: SubmittedAnswer;
  responseMs: number | null;
}

/**
 * THE transaction. Grades, records the attempt, appends XP, updates SM-2 state, advances the session,
 * and rolls lesson / skill progress forward. Idempotent per (session, position).
 */
export async function submitAnswer(params: SubmitAnswerParams): Promise<SubmitAnswerResult> {
  const { userId, sessionId, position, answer, responseMs } = params;
  return db.transaction(async (tx) => {
    const now = new Date();
    const [session] = await tx
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)))
      .for("update");
    if (!session) throw new SessionError("session not found", "not_found");

    const existing = await tx.query.userQuestionHistory.findFirst({
      where: and(eq(userQuestionHistory.sessionId, sessionId), eq(userQuestionHistory.position, position)),
    });
    if (existing) return replayResult(tx, session, existing);

    if (session.status !== "active") throw new SessionError("session is not active", "not_active");
    if (position !== session.answeredCount) throw new SessionError("answer out of order", "out_of_order");

    const sq = await tx.query.studySessionQuestions.findFirst({
      where: and(eq(studySessionQuestions.sessionId, sessionId), eq(studySessionQuestions.position, position)),
      with: { question: { with: { options: true } } },
    });
    if (!sq) throw new SessionError("no question at this position", "not_found");
    const question = sq.question;

    const grade = gradeAnswer(
      {
        questionType: question.questionType,
        options: question.options.map((o) => ({ key: o.key, isCorrect: o.isCorrect })),
        correctAnswer: question.correctAnswer,
        acceptedAnswers: question.acceptedAnswers,
        caseSensitive: question.caseSensitive,
      },
      answer,
    );

    const priorRow = await tx.query.userQuestionState.findFirst({
      where: and(eq(userQuestionState.userId, userId), eq(userQuestionState.questionId, question.id)),
    });
    const prior = priorRow ? toCardState(priorRow) : null;
    const { outcome, quality } = classifyOutcome(grade.correct, prior);
    const comboBefore = session.currentCombo;
    const comboAfter = updateCombo(comboBefore, grade.correct);
    const difficulty = question.difficulty as Difficulty;
    const xp = computeAnswerXp({ difficulty, outcome, comboAfter });

    const totalXpBefore = await getTotalXp(tx, userId);

    const [attempt] = await tx
      .insert(userQuestionHistory)
      .values({
        userId,
        sessionId,
        questionId: question.id,
        position,
        submittedAnswer: answer,
        isCorrect: grade.correct,
        outcome,
        comboBefore,
        comboAfter,
        xpAwarded: xp.amount,
        responseMs,
      })
      .returning({ id: userQuestionHistory.id });
    if (!attempt) throw new Error("attempt insert returned nothing");

    const nextCard = sm2Update(prior ?? freshCard(now), quality, now);
    const cardValues = fromCardState(nextCard, grade.correct);
    await tx
      .insert(userQuestionState)
      .values({ userId, questionId: question.id, ...cardValues })
      .onConflictDoUpdate({ target: [userQuestionState.userId, userQuestionState.questionId], set: cardValues });

    await tx.insert(xpEvents).values({
      userId,
      amount: xp.amount,
      reason: "answer",
      attemptId: attempt.id,
      sessionId,
      questionId: question.id,
      metadata: {
        base: xp.base,
        outcomeMultiplier: xp.outcomeMultiplier,
        comboMultiplier: xp.comboMultiplier,
        difficulty,
      },
    });

    const answered = session.answeredCount + 1;
    const completed = answered >= session.questionCount;
    await tx
      .update(studySessions)
      .set({
        answeredCount: answered,
        correctCount: session.correctCount + (grade.correct ? 1 : 0),
        currentCombo: comboAfter,
        maxCombo: Math.max(session.maxCombo, comboAfter),
        lastActivityAt: now,
        ...(completed ? { status: "completed" as const, completedAt: now } : {}),
      })
      .where(eq(studySessions.id, sessionId));

    const { lessonCompleted, skillCompleted } = await rollProgress(tx, userId, question.lessonId, question.skillId, now);

    const totalXpAfter = totalXpBefore + xp.amount;
    const before = progressWithinLevel(totalXpBefore);
    const after = progressWithinLevel(totalXpAfter);

    const upcoming = await tx
      .select({ difficulty: questions.difficulty })
      .from(studySessionQuestions)
      .innerJoin(questions, eq(studySessionQuestions.questionId, questions.id))
      .where(and(eq(studySessionQuestions.sessionId, sessionId), gt(studySessionQuestions.position, position)))
      .orderBy(asc(studySessionQuestions.position));

    const chosenOption = answer.kind === "option" ? question.options.find((o) => o.key === answer.key) : undefined;

    return {
      correct: grade.correct,
      ...(grade.correctOptionKey !== undefined ? { correctOptionKey: grade.correctOptionKey } : {}),
      ...(grade.correctAnswerText !== undefined ? { correctAnswerText: grade.correctAnswerText } : {}),
      explanationMd: question.explanationMd,
      ...(chosenOption?.feedbackMd && !grade.correct ? { optionFeedbackMd: chosenOption.feedbackMd } : {}),
      outcome,
      xp: {
        amount: xp.amount,
        base: xp.base,
        outcomeMultiplier: xp.outcomeMultiplier,
        comboMultiplier: xp.comboMultiplier,
      },
      combo: {
        before: comboBefore,
        after: comboAfter,
        multiplierAfter: comboMultiplier(comboAfter),
        nextMultiplier: nextComboMultiplier(comboAfter),
      },
      level: { before, after, leveledUp: after.level > before.level, totalXpBefore, totalXpAfter },
      estimate: {
        correctAnswersToLevelUp: correctAnswersToLevelUp({
          totalXp: totalXpAfter,
          combo: comboAfter,
          upcomingDifficulties: upcoming.map((u) => u.difficulty as Difficulty),
        }),
      },
      session: {
        answered,
        total: session.questionCount,
        correctCount: session.correctCount + (grade.correct ? 1 : 0),
        status: completed ? "completed" : "active",
      },
      lessonCompleted,
      skillCompleted,
    };
  });
}

/** Lesson complete = every approved question answered correctly at least once; skill complete = every lesson complete. */
async function rollProgress(tx: Tx, userId: string, lessonId: string, skillId: string, now: Date) {
  const [lessonCounts] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      everCorrect: sql<number>`count(${userQuestionState.questionId})::int`,
    })
    .from(questions)
    .leftJoin(
      userQuestionState,
      and(
        eq(userQuestionState.questionId, questions.id),
        eq(userQuestionState.userId, userId),
        eq(userQuestionState.everCorrect, true),
      ),
    )
    .where(and(eq(questions.lessonId, lessonId), eq(questions.status, "approved")));
  const total = lessonCounts?.total ?? 0;
  const everCorrect = lessonCounts?.everCorrect ?? 0;
  const lessonDone = total > 0 && everCorrect >= total;

  const [lessonRow] = await tx
    .insert(userLessonProgress)
    .values({
      userId,
      lessonId,
      questionsTotal: total,
      questionsEverCorrect: everCorrect,
      firstStartedAt: now,
      lastActivityAt: now,
      completedAt: lessonDone ? now : null,
    })
    .onConflictDoUpdate({
      target: [userLessonProgress.userId, userLessonProgress.lessonId],
      set: {
        questionsTotal: total,
        questionsEverCorrect: everCorrect,
        lastActivityAt: now,
        completedAt: lessonDone
          ? sql`coalesce(${userLessonProgress.completedAt}, ${now.toISOString()}::timestamptz)`
          : userLessonProgress.completedAt,
      },
    })
    .returning({ completedAt: userLessonProgress.completedAt });
  const lessonCompleted = lessonDone && lessonRow?.completedAt?.getTime() === now.getTime();

  const skillLessonIds = (
    await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.skillId, skillId))
  ).map((l) => l.id);
  const [skillCounts] = await tx
    .select({ completed: sql<number>`count(*)::int` })
    .from(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.userId, userId),
        skillLessonIds.length ? inArray(userLessonProgress.lessonId, skillLessonIds) : sql`false`,
        sql`${userLessonProgress.completedAt} is not null`,
      ),
    );
  const lessonsTotal = skillLessonIds.length;
  const lessonsCompleted = skillCounts?.completed ?? 0;
  const skillDone = lessonsTotal > 0 && lessonsCompleted >= lessonsTotal;
  const status = skillDone ? ("completed" as const) : ("in_progress" as const);

  const [skillRow] = await tx
    .insert(userProgress)
    .values({
      userId,
      skillId,
      status,
      lessonsTotal,
      lessonsCompleted,
      mastery: lessonsTotal ? lessonsCompleted / lessonsTotal : 0,
      firstStartedAt: now,
      lastActivityAt: now,
      completedAt: skillDone ? now : null,
    })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.skillId],
      set: {
        status,
        lessonsTotal,
        lessonsCompleted,
        mastery: lessonsTotal ? lessonsCompleted / lessonsTotal : 0,
        lastActivityAt: now,
        completedAt: skillDone
          ? sql`coalesce(${userProgress.completedAt}, ${now.toISOString()}::timestamptz)`
          : userProgress.completedAt,
      },
    })
    .returning({ completedAt: userProgress.completedAt });
  const skillCompleted = skillDone && skillRow?.completedAt?.getTime() === now.getTime();

  return { lessonCompleted, skillCompleted };
}

/** A double submit returns what the first one returned, rebuilt from the stored attempt. */
async function replayResult(
  tx: Tx,
  session: typeof studySessions.$inferSelect,
  attempt: typeof userQuestionHistory.$inferSelect,
): Promise<SubmitAnswerResult> {
  const question = await tx.query.questions.findFirst({
    where: eq(questions.id, attempt.questionId),
    with: { options: true },
  });
  if (!question) throw new SessionError("question missing", "not_found");
  const correctOption = question.options.find((o) => o.isCorrect);
  const totalXpAfter = await getTotalXp(tx, session.userId);
  const totalXpBefore = Math.max(0, totalXpAfter - attempt.xpAwarded);
  const before = progressWithinLevel(totalXpBefore);
  const after = progressWithinLevel(totalXpAfter);
  const xp = computeAnswerXp({
    difficulty: question.difficulty as Difficulty,
    outcome: attempt.outcome,
    comboAfter: attempt.comboAfter,
  });
  return {
    correct: attempt.isCorrect,
    ...(question.questionType === "fill_blank"
      ? { correctAnswerText: question.correctAnswer ?? question.acceptedAnswers[0] ?? "" }
      : { correctOptionKey: correctOption?.key ?? "" }),
    explanationMd: question.explanationMd,
    outcome: attempt.outcome,
    xp: { amount: attempt.xpAwarded, base: xp.base, outcomeMultiplier: xp.outcomeMultiplier, comboMultiplier: xp.comboMultiplier },
    combo: {
      before: attempt.comboBefore,
      after: attempt.comboAfter,
      multiplierAfter: comboMultiplier(attempt.comboAfter),
      nextMultiplier: nextComboMultiplier(attempt.comboAfter),
    },
    level: { before, after, leveledUp: after.level > before.level, totalXpBefore, totalXpAfter },
    estimate: { correctAnswersToLevelUp: null },
    session: {
      answered: session.answeredCount,
      total: session.questionCount,
      correctCount: session.correctCount,
      status: session.status === "completed" ? "completed" : "active",
    },
    lessonCompleted: false,
    skillCompleted: false,
  };
}

export async function getSessionSummary(sessionId: string, userId: string): Promise<SessionSummary | null> {
  const session = await db.query.studySessions.findFirst({
    where: and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)),
    with: { skill: { columns: { id: true, title: true } }, lesson: { columns: { id: true, title: true } } },
  });
  if (!session) return null;

  const [earned] = await db
    .select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)::int` })
    .from(xpEvents)
    .where(and(eq(xpEvents.sessionId, sessionId), eq(xpEvents.userId, userId)));
  const xpEarned = earned?.total ?? 0;
  const totalXpAfter = await getTotalXp(db, userId);
  const totalXpBefore = Math.max(0, totalXpAfter - xpEarned);
  const progressBefore = progressWithinLevel(totalXpBefore);
  const progressAfter = progressWithinLevel(totalXpAfter);

  const lessonProgress = session.lesson
    ? await db.query.userLessonProgress.findFirst({
        where: and(eq(userLessonProgress.userId, userId), eq(userLessonProgress.lessonId, session.lesson.id)),
        columns: { completedAt: true },
      })
    : null;
  const skillProgress = await db.query.userProgress.findFirst({
    where: and(eq(userProgress.userId, userId), eq(userProgress.skillId, session.skill.id)),
    columns: { completedAt: true },
  });
  const within = (d: Date | null | undefined) =>
    !!d && !!session.completedAt && d.getTime() >= session.startedAt.getTime() && d.getTime() <= session.completedAt.getTime();

  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    skillTitle: session.skill.title,
    lessonTitle: session.lesson?.title ?? null,
    questionCount: session.questionCount,
    correctCount: session.correctCount,
    maxCombo: session.maxCombo,
    xpEarned,
    totalXpBefore,
    totalXpAfter,
    progressBefore,
    progressAfter,
    levelsGained: progressAfter.level - progressBefore.level,
    lessonCompleted: within(lessonProgress?.completedAt),
    skillCompleted: within(skillProgress?.completedAt),
  };
}

