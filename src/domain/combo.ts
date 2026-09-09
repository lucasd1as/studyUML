import { XP_CONFIG } from "./config";

/** Combo counts consecutive correct answers within one session. A miss resets it to 0; it never goes negative. */
export function updateCombo(current: number, correct: boolean): number {
  const safe = Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
  return correct ? safe + 1 : 0;
}

/** Multiplier for a correct answer at the given combo (combo includes the current answer). Capped at the table's last entry. */
export function comboMultiplier(combo: number): number {
  const table = XP_CONFIG.COMBO_MULTIPLIERS;
  const idx = Number.isFinite(combo) && combo > 0 ? Math.min(Math.floor(combo), table.length - 1) : 0;
  return table[idx] ?? 1;
}

/** The multiplier the *next* correct answer would earn, or null when the combo is already capped. */
export function nextComboMultiplier(combo: number): number | null {
  const cap = XP_CONFIG.COMBO_MULTIPLIERS.length - 1;
  if (combo >= cap) return null;
  return comboMultiplier(combo + 1);
}

export const COMBO_CAP = XP_CONFIG.COMBO_MULTIPLIERS.length - 1;
