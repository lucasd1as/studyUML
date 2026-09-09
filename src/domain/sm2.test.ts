import { describe, expect, it } from "vitest";
import { freshCard, sm2Update } from "./sm2";

const t0 = new Date("2026-01-01T00:00:00Z");
const day = 24 * 60 * 60 * 1000;

function run(qualities: number[]) {
  let card = freshCard(t0);
  const intervals: number[] = [];
  let now = t0;
  for (const q of qualities) {
    card = sm2Update(card, q, now);
    intervals.push(card.intervalDays);
    now = new Date(now.getTime() + card.intervalDays * day);
  }
  return { card, intervals };
}

describe("sm2Update", () => {
  it("runs 1, 6, then ×ease on steady 4s (ease unchanged at 2.5)", () => {
    expect(run([4, 4, 4, 4]).intervals).toEqual([1, 6, 15, 38]);
  });

  it("grows ease on 5s and uses the ease from before the current review", () => {
    const { card, intervals } = run([5, 5, 5, 5]);
    expect(intervals).toEqual([1, 6, 16, 45]);
    expect(card.easeFactor).toBe(2.9);
    expect(card.repetitions).toBe(4);
    expect(card.everCorrect).toBe(true);
    expect(card.correctAttempts).toBe(4);
    expect(card.totalAttempts).toBe(4);
  });

  it("a wrong answer resets repetitions and interval, and lowers ease", () => {
    const { card } = run([5, 5, 1]);
    expect(card.repetitions).toBe(0);
    expect(card.intervalDays).toBe(1);
    expect(card.lapses).toBe(1);
    expect(card.easeFactor).toBe(2.16); // 2.7 - 0.54
    expect(card.everCorrect).toBe(true);
  });

  it("a first-ever wrong answer is not a lapse", () => {
    const { card } = run([1]);
    expect(card.lapses).toBe(0);
    expect(card.repetitions).toBe(0);
    expect(card.everCorrect).toBe(false);
    expect(card.totalAttempts).toBe(1);
  });

  it("ease never drops below 1.3", () => {
    const { card } = run([1, 1, 1, 1, 1, 1]);
    expect(card.easeFactor).toBe(1.3);
  });

  it("later_correct (3) passes but lowers ease", () => {
    const { card } = run([1, 3]);
    expect(card.repetitions).toBe(1);
    expect(card.intervalDays).toBe(1);
    expect(card.everCorrect).toBe(true);
    expect(card.easeFactor).toBe(1.82); // 2.5 - 0.54 - 0.14
  });

  it("schedules due_at = now + interval days and records the review time", () => {
    const card = sm2Update(freshCard(t0), 5, t0);
    expect(card.dueAt.getTime()).toBe(t0.getTime() + day);
    expect(card.lastReviewedAt?.getTime()).toBe(t0.getTime());
  });

  it("clamps quality into 0..5", () => {
    expect(sm2Update(freshCard(t0), 42, t0).easeFactor).toBe(2.6);
    expect(sm2Update(freshCard(t0), -7, t0).easeFactor).toBe(1.7);
  });
});
