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
 * negative steps are bonuses (subtracted). The Externals abstract combat system uses
 * only positive step modifiers (+1..+5).
 */

import type { CheckResult } from '../types/battle';

/** Map a step modifier to its situation die size. 0 → no die. */
export function stepDieSize(step: number): number {
  // Symmetric table from the Alternity core rules.
  const table: Record<number, number> = {
    [-4]: 20,
    [-3]: 12,
    [-2]: 8,
    [-1]: 6,
    [0]: 0,
    [1]: 4,
    [2]: 6,
    [3]: 8,
    [4]: 12,
    [5]: 20,
  };
  if (step <= -4) return 20;
  if (step >= 5) return 20;
  return table[step] ?? 0;
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
