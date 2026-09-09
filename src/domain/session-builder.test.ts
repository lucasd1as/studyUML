import { describe, expect, it } from "vitest";
import { buildSession, type CandidateQuestion } from "./session-builder";
import { seededRng } from "./random";
import { freshCard } from "./sm2";
import type { CardState } from "./types";

const now = new Date("2026-03-01T12:00:00Z");
const hour = 60 * 60 * 1000;
const day = 24 * hour;

function q(id: string, lessonId: string, sortOrder: number, state: Partial<CardState> | null = null): CandidateQuestion {
  return {
    id,
    lessonId,
    sortOrder,
    difficulty: 3,
    state: state === null ? null : { ...freshCard(now), totalAttempts: 1, ...state },
  };
}

const rng = () => seededRng("test");

describe("buildSession — lesson mode", () => {
  it("takes unseen questions first, in author order", () => {
    const lesson = [q("c", "L1", 3), q("a", "L1", 1), q("b", "L1", 2), q("d", "L1", 4), q("e", "L1", 5), q("f", "L1", 6)];
    const s = buildSession({ mode: "lesson", lessonQuestions: lesson, skillQuestions: [], now, rng: rng() });
    expect(s.questionIds).toEqual(["a", "b", "c", "d", "e"]);
    expect(s.mode).toBe("lesson");
    expect(s.size).toBe(5);
  });

  it("brings back never-correct questions before due ones, then due ones, then earlier-lesson due ones", () => {
    const lesson = [
      q("new", "L2", 1),
      q("wrong-old", "L2", 2, { everCorrect: false, lastReviewedAt: new Date(now.getTime() - 3 * day), dueAt: new Date(now.getTime() + day) }),
      q("wrong-recent", "L2", 3, { everCorrect: false, lastReviewedAt: new Date(now.getTime() - day), dueAt: new Date(now.getTime() + day) }),
      q("due", "L2", 4, { everCorrect: true, dueAt: new Date(now.getTime() - hour), lastReviewedAt: new Date(now.getTime() - 5 * day) }),
      q("not-due", "L2", 5, { everCorrect: true, dueAt: new Date(now.getTime() + 5 * day), lastReviewedAt: new Date(now.getTime() - 2 * day) }),
    ];
    const skill = [
      q("earlier-due", "L1", 1, { everCorrect: true, dueAt: new Date(now.getTime() - 2 * day), lastReviewedAt: new Date(now.getTime() - 9 * day) }),
      q("earlier-fine", "L1", 2, { everCorrect: true, dueAt: new Date(now.getTime() + 20 * day), lastReviewedAt: new Date(now.getTime() - 4 * day) }),
    ];
    const s = buildSession({ mode: "lesson", lessonQuestions: lesson, skillQuestions: skill, now, rng: rng() });
    expect(s.questionIds).toEqual(["new", "wrong-old", "wrong-recent", "due", "earlier-due"]);
  });

  it("backfills with the weakest cards and never duplicates", () => {
    const lesson = [q("only-new", "L2", 1)];
    const skill = [
      q("strong", "L1", 1, { everCorrect: true, easeFactor: 2.8, lastReviewedAt: new Date(now.getTime() - day), dueAt: new Date(now.getTime() + 30 * day) }),
      q("weak", "L1", 2, { everCorrect: true, easeFactor: 1.4, lapses: 2, lastReviewedAt: new Date(now.getTime() - day), dueAt: new Date(now.getTime() + day) }),
      q("weaker", "L1", 3, { everCorrect: true, easeFactor: 1.3, lapses: 3, lastReviewedAt: new Date(now.getTime() - day), dueAt: new Date(now.getTime() + day) }),
      q("just-reviewed", "L1", 4, { everCorrect: true, easeFactor: 1.3, lastReviewedAt: new Date(now.getTime() - 2 * 60 * 1000), dueAt: new Date(now.getTime() + day) }),
    ];
    const s = buildSession({ mode: "lesson", lessonQuestions: lesson, skillQuestions: skill, now, rng: rng() });
    expect(s.questionIds.slice(0, 4)).toEqual(["only-new", "weaker", "weak", "strong"]);
    expect(s.questionIds.at(-1)).toBe("just-reviewed");
    expect(new Set(s.questionIds).size).toBe(5);
  });

  it("shrinks only when there are fewer candidates than the session size", () => {
    const s = buildSession({ mode: "lesson", lessonQuestions: [q("a", "L1", 1), q("b", "L1", 2)], skillQuestions: [], now, rng: rng() });
    expect(s.questionIds).toEqual(["a", "b"]);
    expect(s.size).toBe(2);
    expect(buildSession({ mode: "lesson", lessonQuestions: [], skillQuestions: [], now, rng: rng() }).questionIds).toEqual([]);
  });

  it("is deterministic for a given rng seed", () => {
    // Every card was reviewed minutes ago and nothing is due, so only the shuffled last bucket applies.
    const skill = Array.from({ length: 12 }, (_, i) =>
      q(`s${i}`, "L1", i, { everCorrect: true, easeFactor: 2.5, lastReviewedAt: new Date(now.getTime() - 60 * 1000), dueAt: new Date(now.getTime() + day) }),
    );
    const a = buildSession({ mode: "review", lessonQuestions: [], skillQuestions: skill, now, rng: seededRng("seed-1") });
    const b = buildSession({ mode: "review", lessonQuestions: [], skillQuestions: skill, now, rng: seededRng("seed-1") });
    const c = buildSession({ mode: "review", lessonQuestions: [], skillQuestions: skill, now, rng: seededRng("seed-2") });
    expect(a.questionIds).toEqual(b.questionIds);
    expect(a.questionIds).not.toEqual(c.questionIds);
  });
});

describe("buildSession — review mode", () => {
  it("is 'review' when something is due, ordered by due date", () => {
    const skill = [
      q("later", "L1", 1, { everCorrect: true, dueAt: new Date(now.getTime() - hour) }),
      q("sooner", "L1", 2, { everCorrect: true, dueAt: new Date(now.getTime() - day) }),
      q("future", "L1", 3, { everCorrect: true, dueAt: new Date(now.getTime() + day) }),
    ];
    const s = buildSession({ mode: "review", lessonQuestions: [], skillQuestions: skill, now, rng: rng() });
    expect(s.mode).toBe("review");
    expect(s.questionIds.slice(0, 2)).toEqual(["sooner", "later"]);
    expect(s.questionIds).toContain("future");
  });

  it("is 'practice' when nothing is due", () => {
    const skill = [q("a", "L1", 1, { everCorrect: true, dueAt: new Date(now.getTime() + day) })];
    const s = buildSession({ mode: "review", lessonQuestions: [], skillQuestions: skill, now, rng: rng() });
    expect(s.mode).toBe("practice");
    expect(s.questionIds).toEqual(["a"]);
  });
});
