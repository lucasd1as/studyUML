import { describe, expect, it } from "vitest";
import { classifyOutcome } from "./outcomes";
import { freshCard } from "./sm2";

const now = new Date("2026-01-01T00:00:00Z");

describe("classifyOutcome", () => {
  it("wrong is wrong regardless of history", () => {
    expect(classifyOutcome(false, null)).toEqual({ outcome: "wrong", quality: 1 });
    expect(classifyOutcome(false, { ...freshCard(now), totalAttempts: 3, everCorrect: true })).toEqual({
      outcome: "wrong",
      quality: 1,
    });
  });
  it("first attempt ever → first_try_correct / 5", () => {
    expect(classifyOutcome(true, null)).toEqual({ outcome: "first_try_correct", quality: 5 });
    expect(classifyOutcome(true, freshCard(now))).toEqual({ outcome: "first_try_correct", quality: 5 });
  });
  it("previously wrong only → later_correct / 3", () => {
    expect(classifyOutcome(true, { ...freshCard(now), totalAttempts: 2, everCorrect: false })).toEqual({
      outcome: "later_correct",
      quality: 3,
    });
  });
  it("previously correct → review_correct / 4", () => {
    expect(classifyOutcome(true, { ...freshCard(now), totalAttempts: 1, everCorrect: true })).toEqual({
      outcome: "review_correct",
      quality: 4,
    });
  });
});
