import { describe, expect, it } from "vitest";
import {
  correctAnswersToLevelUp,
  levelFromTotalXp,
  levelThresholds,
  progressWithinLevel,
  xpNeeded,
} from "./levels";

describe("xpNeeded", () => {
  it("is round(50 × level^1.5)", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(xpNeeded)).toEqual([50, 141, 260, 400, 559, 735, 926, 1131, 1350, 1581]);
  });
  it("treats nonsense levels as level 1", () => {
    expect(xpNeeded(0)).toBe(50);
    expect(xpNeeded(-4)).toBe(50);
  });
});

describe("levelThresholds", () => {
  it("accumulates the XP needed per level", () => {
    const t = levelThresholds();
    expect(t[1]).toBe(0);
    expect(t[2]).toBe(50);
    expect(t[3]).toBe(191);
    expect(t[4]).toBe(451);
    expect(t[5]).toBe(851);
    expect(t[6]).toBe(1410);
    expect(t[10]).toBe(5552);
    expect(t[11]).toBe(7133);
  });
  it("is strictly increasing", () => {
    const t = levelThresholds();
    for (let i = 2; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1] as number);
  });
});

describe("levelFromTotalXp", () => {
  it("inverts the thresholds exactly at the boundaries", () => {
    expect(levelFromTotalXp(0)).toBe(1);
    expect(levelFromTotalXp(49)).toBe(1);
    expect(levelFromTotalXp(50)).toBe(2);
    expect(levelFromTotalXp(51)).toBe(2);
    expect(levelFromTotalXp(190)).toBe(2);
    expect(levelFromTotalXp(191)).toBe(3);
    expect(levelFromTotalXp(5552)).toBe(10);
    expect(levelFromTotalXp(7132)).toBe(10);
  });
  it("round-trips every threshold", () => {
    const t = levelThresholds();
    for (let level = 1; level < 60; level++) {
      expect(levelFromTotalXp(t[level] as number)).toBe(level);
      expect(levelFromTotalXp((t[level] as number) - 1)).toBe(Math.max(1, level - 1));
    }
  });
  it("never drops below level 1", () => {
    expect(levelFromTotalXp(-100)).toBe(1);
    expect(levelFromTotalXp(Number.NaN)).toBe(1);
  });
});

describe("progressWithinLevel", () => {
  it("reports xp into, for, and to next", () => {
    expect(progressWithinLevel(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForLevel: 50, xpToNext: 50, fraction: 0 });
    expect(progressWithinLevel(60)).toEqual({ level: 2, xpIntoLevel: 10, xpForLevel: 141, xpToNext: 131, fraction: 10 / 141 });
  });
  it("keeps fraction in [0, 1)", () => {
    for (let xp = 0; xp < 3000; xp += 7) {
      const p = progressWithinLevel(xp);
      expect(p.fraction).toBeGreaterThanOrEqual(0);
      expect(p.fraction).toBeLessThan(1);
      expect(p.xpIntoLevel + p.xpToNext).toBe(p.xpForLevel);
    }
  });
});

describe("correctAnswersToLevelUp", () => {
  it("counts the correct answers needed with combo growth", () => {
    // at 40 XP, level 1, need 10 more; one d3 first-try at combo 1 = 20
    expect(correctAnswersToLevelUp({ totalXp: 40, combo: 0, upcomingDifficulties: [3, 3, 3] })).toBe(1);
    // at 0 XP: 12 (c1) + 13 (c2: 12×1.1=13.2) + 14 (c3: 14.4) + 16 (c4: 16.2) = 55 ≥ 50 → 4 answers
    expect(correctAnswersToLevelUp({ totalXp: 0, combo: 0, upcomingDifficulties: [1, 1, 1, 1, 1] })).toBe(4);
  });
  it("returns null when not reachable this session", () => {
    expect(correctAnswersToLevelUp({ totalXp: 0, combo: 0, upcomingDifficulties: [1, 1] })).toBeNull();
    expect(correctAnswersToLevelUp({ totalXp: 0, combo: 0, upcomingDifficulties: [] })).toBeNull();
  });
  it("takes the existing combo into account", () => {
    // at combo 4, the next answer is combo 5 → ×1.5: 20×1.5 = 30 ≥ 30 remaining
    expect(correctAnswersToLevelUp({ totalXp: 20, combo: 4, upcomingDifficulties: [3] })).toBe(1);
    expect(correctAnswersToLevelUp({ totalXp: 20, combo: 0, upcomingDifficulties: [3] })).toBeNull();
  });
});
