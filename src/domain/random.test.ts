import { describe, expect, it } from "vitest";
import { seededRng, shuffle } from "./random";

describe("seededRng", () => {
  it("is deterministic per seed and in [0, 1)", () => {
    const a = seededRng("abc");
    const b = seededRng("abc");
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(Array.from({ length: 5 }, seededRng("xyz"))).not.toEqual(seqA.slice(0, 5));
  });
});

describe("shuffle", () => {
  it("permutes without mutating and keeps every element", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, seededRng("s"));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });
});
