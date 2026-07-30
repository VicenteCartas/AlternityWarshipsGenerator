/**
 * Alternity step system roller for tactics checks.
 *
 * Skill check: roll d20 + situation die, compare total to skill score.
 *  - total > 20 (natural 20 on d20) → critical failure
 *  - total > score → failure
 *  - total ≤ score → ordinary success
 *  - total ≤ score / 2 → good success
 *  - total ≤ score / 4 → amazing success
 *
 * Step modifier converts to a situation die. Positive steps are penalties (added);
 * negative steps are bonuses (subtracted).
 */

import type { CheckResult } from '../types/battle';

/**
 * Map a step modifier to its situation die size. 0 → no die.
 *
 * A step moves the situation die one type at a time, as defined in the Warships
 * glossary: d0 ↔ ±d4 ↔ ±d6 ↔ ±d8 ↔ ±d12 ↔ ±d20. The table is symmetric, so only
 * the magnitude of the step matters here; the caller applies the sign.
 */
const STEP_DIE_SIZES = [0, 4, 6, 8, 12, 20] as const;

export function stepDieSize(step: number): number {
  const magnitude = Math.min(Math.abs(Math.trunc(step)), STEP_DIE_SIZES.length - 1);
  return STEP_DIE_SIZES[magnitude];
}

/** Roll an integer in [1, sides]. Uses Math.random by default; override for tests. */
export function rollDie(sides: number, rng: () => number = Math.random): number {
  if (sides <= 0) return 0;
  return Math.floor(rng() * sides) + 1;
}

export interface TacticsRoll {
  d20: number;
  situationDie: number;
  situationRoll: number;
  step: number;
  total: number;
  score: number;
  result: CheckResult;
}

export function gradeRoll(total: number, d20: number, score: number): CheckResult {
  // Natural 20 on the d20 component is always a critical failure.
  if (d20 === 20) return 'criticalFailure';
  if (total > score) return 'failure';
  if (total <= Math.floor(score / 4)) return 'amazing';
  if (total <= Math.floor(score / 2)) return 'good';
  return 'ordinary';
}

export function rollTacticsCheck(
  score: number,
  step: number,
  rng: () => number = Math.random,
): TacticsRoll {
  const d20 = rollDie(20, rng);
  const sides = stepDieSize(step);
  const situationRoll = sides > 0 ? rollDie(sides, rng) : 0;
  const sign = step >= 0 ? 1 : -1;
  const total = d20 + sign * situationRoll;
  return {
    d20,
    situationDie: sides,
    situationRoll,
    step,
    total,
    score,
    result: gradeRoll(total, d20, score),
  };
}
