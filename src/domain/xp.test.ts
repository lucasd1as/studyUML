import { describe, expect, it } from "vitest";
import { baseXp, computeAnswerXp, wrongAnswerXp } from "./xp";
import type { AttemptOutcome, Difficulty } from "./types";

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];

describe("baseXp", () => {
  it("is 8 + 4d", () => {
    expect(DIFFICULTIES.map(baseXp)).toEqual([12, 16, 20, 24, 28]);
  });
});

describe("wrongAnswerXp", () => {
  it("is 15% of base with a floor of 2, never zero", () => {
    expect(DIFFICULTIES.map(wrongAnswerXp)).toEqual([2, 2, 3, 4, 4]);
  });
});

describe("computeAnswerXp", () => {
  it("first-try correct at combo 1 is the base", () => {
    expect(computeAnswerXp({ difficulty: 3, outcome: "first_try_correct", comboAfter: 1 })).toEqual({
      amount: 20,
      base: 20,
      outcomeMultiplier: 1,
      comboMultiplier: 1,
    });
  });

  it("applies the combo multiplier to correct answers", () => {
    expect(computeAnswerXp({ difficulty: 3, outcome: "first_try_correct", comboAfter: 3 }).amount).toBe(24);
    expect(computeAnswerXp({ difficulty: 3, outcome: "first_try_correct", comboAfter: 5 }).amount).toBe(30);
    expect(computeAnswerXp({ difficulty: 3, outcome: "first_try_correct", comboAfter: 9 }).amount).toBe(30);
  });

  it("scales by outcome tier and rounds once at the end", () => {
    // 28 × 0.6 × 1.5 = 25.2 → 25
    expect(computeAnswerXp({ difficulty: 5, outcome: "later_correct", comboAfter: 5 }).amount).toBe(25);
    // 24 × 0.8 × 1.35 = 25.92 → 26
    expect(computeAnswerXp({ difficulty: 4, outcome: "review_correct", comboAfter: 4 }).amount).toBe(26);
  });

  it("wrong answers get the floor and ignore combo", () => {
    const r = computeAnswerXp({ difficulty: 5, outcome: "wrong", comboAfter: 5 });
    expect(r.amount).toBe(4);
    expect(r.comboMultiplier).toBe(1);
    expect(computeAnswerXp({ difficulty: 1, outcome: "wrong", comboAfter: 0 }).amount).toBe(2);
  });

  it("never awards less than 1 XP for any combination", () => {
    const outcomes: AttemptOutcome[] = ["first_try_correct", "later_correct", "review_correct", "wrong"];
    for (const difficulty of DIFFICULTIES) {
      for (const outcome of outcomes) {
        for (let combo = 0; combo <= 8; combo++) {
          expect(computeAnswerXp({ difficulty, outcome, comboAfter: combo }).amount).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("a perfect 5×d3 first session is worth 123 XP", () => {
    let total = 0;
    for (let combo = 1; combo <= 5; combo++) {
      total += computeAnswerXp({ difficulty: 3, outcome: "first_try_correct", comboAfter: combo }).amount;
    }
    expect(total).toBe(123);
  });
});
