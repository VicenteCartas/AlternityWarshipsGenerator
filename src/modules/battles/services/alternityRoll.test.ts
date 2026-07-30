import { describe, it, expect } from 'vitest';
import { stepDieSize, gradeRoll, rollTacticsCheck } from './alternityRoll';

describe('stepDieSize', () => {
  it('matches Alternity step table', () => {
    expect(stepDieSize(0)).toBe(0);
    expect(stepDieSize(1)).toBe(4);
    expect(stepDieSize(2)).toBe(6);
    expect(stepDieSize(3)).toBe(8);
    expect(stepDieSize(4)).toBe(12);
    expect(stepDieSize(5)).toBe(20);
  });

  it('is symmetric for bonus steps', () => {
    expect(stepDieSize(-1)).toBe(4);
    expect(stepDieSize(-2)).toBe(6);
    expect(stepDieSize(-3)).toBe(8);
    expect(stepDieSize(-4)).toBe(12);
    expect(stepDieSize(-5)).toBe(20);
  });

  it('clamps steps beyond the table to d20', () => {
    expect(stepDieSize(9)).toBe(20);
    expect(stepDieSize(-9)).toBe(20);
  });
});

describe('gradeRoll', () => {
  // Score 12: amazing ≤ 3, good ≤ 6, ordinary ≤ 12, fail > 12
  it('grades by score thresholds', () => {
    expect(gradeRoll(3, 3, 12)).toBe('amazing');
    expect(gradeRoll(6, 6, 12)).toBe('good');
    expect(gradeRoll(12, 12, 12)).toBe('ordinary');
    expect(gradeRoll(13, 13, 12)).toBe('failure');
  });

  it('natural 20 is always critical failure', () => {
    expect(gradeRoll(5, 20, 100)).toBe('criticalFailure');
  });
});

describe('rollTacticsCheck', () => {
  it('uses provided RNG deterministically', () => {
    // Sequence: d20=10, d6=3 → total 13 vs score 12 → failure (step +2 → d6)
    const seq = [9 / 20, 2 / 6]; // floor(0.45*20)+1=10, floor(0.333*6)+1=3
    let i = 0;
    const rng = () => seq[i++];
    const r = rollTacticsCheck(12, 2, rng);
    expect(r.d20).toBe(10);
    expect(r.situationDie).toBe(6);
    expect(r.situationRoll).toBe(3);
    expect(r.total).toBe(13);
    expect(r.result).toBe('failure');
  });

  it('subtracts the situation die for an advantage step', () => {
    // d20=10, d20=8 → total 2 vs score 12 → amazing (step -5 → -d20)
    const seq = [9 / 20, 7 / 20];
    let i = 0;
    const rng = () => seq[i++];
    const r = rollTacticsCheck(12, -5, rng);
    expect(r.d20).toBe(10);
    expect(r.situationDie).toBe(20);
    expect(r.situationRoll).toBe(8);
    expect(r.total).toBe(2);
    expect(r.result).toBe('amazing');
  });
});
