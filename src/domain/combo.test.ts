import { describe, expect, it } from "vitest";
import { COMBO_CAP, comboMultiplier, nextComboMultiplier, updateCombo } from "./combo";

describe("updateCombo", () => {
  it("increments on correct, resets on wrong", () => {
    expect(updateCombo(0, true)).toBe(1);
    expect(updateCombo(4, true)).toBe(5);
    expect(updateCombo(4, false)).toBe(0);
    expect(updateCombo(0, false)).toBe(0);
  });
  it("guards against garbage input", () => {
    expect(updateCombo(-3, true)).toBe(1);
    expect(updateCombo(Number.NaN, true)).toBe(1);
    expect(updateCombo(2.7, true)).toBe(3);
  });
});

describe("comboMultiplier", () => {
  it("follows the table and caps", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 50].map(comboMultiplier)).toEqual([1, 1, 1.1, 1.2, 1.35, 1.5, 1.5, 1.5]);
    expect(comboMultiplier(Number.NaN)).toBe(1);
    expect(comboMultiplier(-1)).toBe(1);
  });
});

describe("nextComboMultiplier", () => {
  it("previews the next step and returns null at the cap", () => {
    expect(nextComboMultiplier(0)).toBe(1);
    expect(nextComboMultiplier(1)).toBe(1.1);
    expect(nextComboMultiplier(4)).toBe(1.5);
    expect(nextComboMultiplier(COMBO_CAP)).toBeNull();
    expect(nextComboMultiplier(COMBO_CAP + 3)).toBeNull();
  });
});
