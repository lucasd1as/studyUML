import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { migrate } from "../../scripts/migrate.mjs";
import { seed } from "@/db/seed/seed";
import type { SubmitAnswerResult } from "./types";

const url = process.env.DATABASE_URL_TEST;
const EMAIL = "itest@studyuml.local";
const run = url ? describe : describe.skip;
if (url) process.env.DATABASE_URL = url;

run("submitAnswer (against Postgres)", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let sessions: typeof import("./sessions");
  let userId: string;

  /** The answer key, read straight from the database, so the test does not embed content. */
  async function correctAnswer(questionId: string) {
    const q = await db.query.questions.findFirst({
      where: eq(schema.questions.id, questionId),
      with: { options: true },
    });
    if (!q) throw new Error("question missing");
    if (q.questionType === "fill_blank") return { kind: "text" as const, text: q.correctAnswer ?? "" };
    return { kind: "option" as const, key: q.options.find((o) => o.isCorrect)!.key };
  }
  async function wrongAnswer(questionId: string) {
    const q = await db.query.questions.findFirst({
      where: eq(schema.questions.id, questionId),
      with: { options: true },
    });
    if (!q) throw new Error("question missing");
    if (q.questionType === "fill_blank") return { kind: "text" as const, text: "definitely not it" };
    return { kind: "option" as const, key: q.options.find((o) => !o.isCorrect)!.key };
  }
  async function totalXp() {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.xpEvents.amount}), 0)::int` })
      .from(schema.xpEvents)
      .where(eq(schema.xpEvents.userId, userId));
    return row?.total ?? 0;
  }

  beforeAll(async () => {
    await migrate(url!);
    await seed(url!, "dev@studyuml.local");
    db = (await import("@/db")).db;
    schema = await import("@/db/schema");
    sessions = await import("./sessions");
    await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
    const [u] = await db.insert(schema.users).values({ email: EMAIL, name: "itest" }).returning({ id: schema.users.id });
    userId = u!.id;
  });

  afterAll(async () => {
    if (db) await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
  });

  it("builds a 5-question lesson session from the first lesson, in author order", async () => {
    const id = await sessions.startOrResumeSession(userId);
    expect(id).toBeTruthy();
    const s = await sessions.getSessionForClient(id!, userId);
    expect(s?.mode).toBe("lesson");
    expect(s?.lessonTitle).toBe("The Problem with Ownership");
    expect(s?.questions.map((q) => q.position)).toEqual([0, 1, 2, 3, 4]);
    // Continue again resumes the same active session.
    expect(await sessions.startOrResumeSession(userId)).toBe(id);
  });

  it("grades, awards XP, updates combo and SM-2, and is idempotent on double submit", async () => {
    const id = (await sessions.startOrResumeSession(userId))!;
    const s = (await sessions.getSessionForClient(id, userId))!;
    const q0 = s.questions[0]!;

    const first = await sessions.submitAnswer({
      userId,
      sessionId: id,
      position: 0,
      answer: await correctAnswer(q0.id),
      responseMs: 4000,
    });
    expect(first.correct).toBe(true);
    expect(first.outcome).toBe("first_try_correct");
    expect(first.xp.amount).toBe(8 + 4 * q0.difficulty);
    expect(first.combo).toMatchObject({ before: 0, after: 1 });
    expect(first.level.totalXpBefore).toBe(0);
    expect(first.level.totalXpAfter).toBe(first.xp.amount);
    expect(first.session).toMatchObject({ answered: 1, total: 5, status: "active" });

    const replay = await sessions.submitAnswer({
      userId,
      sessionId: id,
      position: 0,
      answer: await wrongAnswer(q0.id),
      responseMs: 1,
    });
    expect(replay.correct).toBe(true);
    expect(replay.xp.amount).toBe(first.xp.amount);
    expect(await totalXp()).toBe(first.xp.amount);

    const card = await db.query.userQuestionState.findFirst({
      where: sql`${schema.userQuestionState.userId} = ${userId} and ${schema.userQuestionState.questionId} = ${q0.id}`,
    });
    expect(card).toMatchObject({ repetitions: 1, intervalDays: 1, everCorrect: true, easeFactor: "2.60" });
  });

  it("rejects answers out of order", async () => {
    const id = (await sessions.startOrResumeSession(userId))!;
    await expect(
      sessions.submitAnswer({ userId, sessionId: id, position: 3, answer: { kind: "option", key: "a" }, responseMs: null }),
    ).rejects.toMatchObject({ code: "out_of_order" });
  });

  it("wrong answers pay floor XP, reset the combo, and the ledger matches the summary", async () => {
    const id = (await sessions.startOrResumeSession(userId))!;
    const s = (await sessions.getSessionForClient(id, userId))!;
    const results: SubmitAnswerResult[] = [];
    for (let position = 1; position < 5; position++) {
      const q = s.questions[position]!;
      const answer = position === 2 ? await wrongAnswer(q.id) : await correctAnswer(q.id);
      results.push(await sessions.submitAnswer({ userId, sessionId: id, position, answer, responseMs: 2500 }));
    }
    const wrong = results[1]!;
    expect(wrong.correct).toBe(false);
    expect(wrong.outcome).toBe("wrong");
    expect(wrong.xp.amount).toBeGreaterThanOrEqual(2);
    expect(wrong.combo.after).toBe(0);
    expect(results[2]!.combo.after).toBe(1);
    expect(results[3]!.combo.after).toBe(2);
    expect(results[3]!.xp.comboMultiplier).toBe(1.1);
    expect(results.at(-1)!.session.status).toBe("completed");

    const summary = (await sessions.getSessionSummary(id, userId))!;
    expect(summary.status).toBe("completed");
    expect(summary.correctCount).toBe(4);
    expect(summary.maxCombo).toBe(2);
    expect(summary.xpEarned).toBe(await totalXp());
    expect(summary.lessonCompleted).toBe(false);

    const events = await db.select().from(schema.xpEvents).where(eq(schema.xpEvents.userId, userId));
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.amount > 0 && e.reason === "answer" && e.attemptId)).toBe(true);
    const mutation = db.update(schema.xpEvents).set({ amount: 1 }).where(eq(schema.xpEvents.userId, userId));
    await expect(mutation).rejects.toSatisfy((e: unknown) =>
      /append-only/.test(String((e as { cause?: unknown }).cause ?? e)),
    );
  });

  it("the next session finishes the lesson: the unseen question first, then the missed one", async () => {
    const id = (await sessions.startOrResumeSession(userId))!;
    const s = (await sessions.getSessionForClient(id, userId))!;
    expect(s.lessonTitle).toBe("The Problem with Ownership");
    const lessonQuestions = await db.query.questions.findMany({
      where: eq(schema.questions.lessonId, (await db.query.lessons.findFirst({ where: eq(schema.lessons.slug, "problem-with-ownership") }))!.id),
      orderBy: (q, { asc }) => asc(q.sortOrder),
    });
    expect(s.questions[0]!.id).toBe(lessonQuestions[5]!.id);
    expect(s.questions[1]!.id).toBe(lessonQuestions[2]!.id);

    for (let position = 0; position < s.questions.length; position++) {
      const q = s.questions[position]!;
      const r = await sessions.submitAnswer({ userId, sessionId: id, position, answer: await correctAnswer(q.id), responseMs: 100 });
      if (position === 0) expect(r.outcome).toBe("first_try_correct");
      if (position === 1) expect(r.outcome).toBe("later_correct");
      if (position === 1) expect(r.lessonCompleted).toBe(true);
      if (position >= 2) expect(r.outcome).toBe("review_correct");
    }
    const summary = (await sessions.getSessionSummary(id, userId))!;
    expect(summary.lessonCompleted).toBe(true);
    const nextId = (await sessions.startOrResumeSession(userId))!;
    expect((await sessions.getSessionForClient(nextId, userId))!.lessonTitle).toBe("Reference Counting");
  });
});
