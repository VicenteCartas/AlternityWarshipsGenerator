import { describe, it, expect } from 'vitest';
import {
  computeForceStrength,
  determineRoles,
  tacticalAdvantageStep,
  lossesForResult,
  applyRound,
  shouldWithdraw,
} from './battleResolutionService';
import type { BattleState, Side, UnitStack } from '../types/battle';

function stack(strength: number, qty = 1): UnitStack {
  return {
    id: 's' + Math.random(),
    name: 'X',
    combatStrengthPerUnit: strength,
    initialQuantity: qty,
    currentStrength: strength * qty,
    category: 'custom',
    source: 'custom',
  };
}

function side(name: string, stacks: UnitStack[], threshold = 0.4): Side {
  const fs = stacks.reduce((s, x) => s + x.currentStrength, 0);
  return { id: 'A', name, stacks, tacticsScore: 12, initialForceStrength: fs, withdrawThreshold: threshold };
}

describe('tacticalAdvantageStep', () => {
  it('matches book table', () => {
    expect(tacticalAdvantageStep(100, 1000)).toBe(5); // 0.1
    expect(tacticalAdvantageStep(300, 1000)).toBe(4); // 0.3
    expect(tacticalAdvantageStep(500, 1000)).toBe(3); // 0.5
    expect(tacticalAdvantageStep(700, 1000)).toBe(2); // 0.7
    expect(tacticalAdvantageStep(1000, 1000)).toBe(1); // 1.0
    expect(tacticalAdvantageStep(900, 1000)).toBe(1); // 0.9
  });
});

describe('lossesForResult', () => {
  it('matches the book outcomes table', () => {
    expect(lossesForResult('criticalFailure')).toEqual({ attackerLossPct: 0.25, defenderLossPct: 0.05 });
    expect(lossesForResult('failure')).toEqual({ attackerLossPct: 0.20, defenderLossPct: 0.10 });
    expect(lossesForResult('ordinary')).toEqual({ attackerLossPct: 0.15, defenderLossPct: 0.15 });
    expect(lossesForResult('good')).toEqual({ attackerLossPct: 0.10, defenderLossPct: 0.20 });
    expect(lossesForResult('amazing')).toEqual({ attackerLossPct: 0.05, defenderLossPct: 0.25 });
  });
});

describe('determineRoles', () => {
  it('higher FS is attacker; ties go to A', () => {
    expect(determineRoles(500, 1000)).toEqual({ attacker: 'B', defender: 'A' });
    expect(determineRoles(1000, 500)).toEqual({ attacker: 'A', defender: 'B' });
    expect(determineRoles(500, 500)).toEqual({ attacker: 'A', defender: 'B' });
  });
});

describe('applyRound (book example)', () => {
  // Attacker FS 12500, Defender FS 10000, ordinary success → 15% each side.
  const state: BattleState = {
    scenarioName: 'Test',
    sideA: { ...side('Attacker', [stack(12500)]), id: 'A' },
    sideB: { ...side('Defender', [stack(10000)]), id: 'B' },
    rounds: [],
  };

  it('reduces by 15% each on ordinary', () => {
    const { state: next, round } = applyRound(state, 'ordinary');
    expect(round.attackerSide).toBe('A');
    expect(round.attackerStrengthBefore).toBe(12500);
    expect(round.defenderStrengthBefore).toBe(10000);
    expect(computeForceStrength(next.sideA)).toBeCloseTo(12500 * 0.85);
    expect(computeForceStrength(next.sideB)).toBeCloseTo(10000 * 0.85);
  });

  it('critical failure flips outcome (book example)', () => {
    const { state: next } = applyRound(state, 'criticalFailure');
    expect(computeForceStrength(next.sideA)).toBeCloseTo(9375); // 12500 - 25%
    expect(computeForceStrength(next.sideB)).toBeCloseTo(9500); // 10000 - 5%
  });
});

describe('shouldWithdraw', () => {
  it('triggers at the configured loss fraction', () => {
    const s = side('S', [stack(1000)], 0.4);
    expect(shouldWithdraw(s)).toBe(false);
    const reduced: Side = { ...s, stacks: [{ ...s.stacks[0], currentStrength: 600 }] };
    expect(shouldWithdraw(reduced)).toBe(true);
    const justAbove: Side = { ...s, stacks: [{ ...s.stacks[0], currentStrength: 601 }] };
    expect(shouldWithdraw(justAbove)).toBe(false);
  });
});
