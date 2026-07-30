import { describe, it, expect } from 'vitest';
import {
  computeForceStrength,
  computeStartingForceStrength,
  computeTotalStrength,
  determineRoles,
  tacticalAdvantageStep,
  lossesForResult,
  systemDefenseCombatStrength,
  effectiveFactor,
  effectiveStrength,
  applyRound,
  shouldWithdraw,
  resetBattle,
  isBattleStarted,
  tacticsScoreFor,
  createStackFromUnitType,
  createCustomStack,
  createSystemDefenseStack,
} from './battleResolutionService';
import type {
  BattleRules, BattleState, BattleUnitType, Side, Theatre, UnitSpecialization, UnitStack,
} from '../types/battle';
import rulesJson from '../data/battleRules.json';

const rules = rulesJson as BattleRules;

const spaceTheatre: Theatre = { id: 'sp', name: 'Orbit', kind: 'space', rounds: [] };
const groundTheatre: Theatre = { id: 'gr', name: 'Surface', kind: 'ground', rounds: [] };
const bombardTheatre: Theatre = { id: 'bo', name: 'Bombardment', kind: 'bombardment', rounds: [] };

function stack(overrides: Partial<UnitStack> & { combatStrengthPerUnit: number }): UnitStack {
  const qty = overrides.initialQuantity ?? 1;
  return {
    id: overrides.id ?? `s-${Math.random()}`,
    name: overrides.name ?? 'X',
    combatStrengthPerUnit: overrides.combatStrengthPerUnit,
    initialQuantity: qty,
    currentStrength: overrides.currentStrength ?? overrides.combatStrengthPerUnit * qty,
    category: overrides.category ?? 'custom',
    domain: overrides.domain ?? 'space',
    crossDomainFactor: overrides.crossDomainFactor ?? null,
    specialization: (overrides.specialization ?? 'none') as UnitSpecialization,
    theatreId: overrides.theatreId ?? spaceTheatre.id,
    source: overrides.source ?? 'custom',
    notes: overrides.notes,
    canBePlanetaryDefenseBattery: overrides.canBePlanetaryDefenseBattery,
  };
}

function side(id: 'A' | 'B', stacks: UnitStack[], withdrawThreshold = 0.4): Side {
  return {
    id,
    name: `Side ${id}`,
    tacticsSpaceScore: 12,
    tacticsGroundScore: 10,
    stacks,
    withdrawThreshold,
  };
}

function battle(sideA: Side, sideB: Side, theatres: Theatre[] = [spaceTheatre]): BattleState {
  return { scenarioName: 'Test', sideA, sideB, theatres };
}

describe('tacticalAdvantageStep', () => {
  it('applies the book table magnitudes as attacker bonus steps', () => {
    expect(tacticalAdvantageStep(100, 1000, rules)).toBe(-5); // 0.1
    expect(tacticalAdvantageStep(300, 1000, rules)).toBe(-4); // 0.3
    expect(tacticalAdvantageStep(500, 1000, rules)).toBe(-3); // 0.5
    expect(tacticalAdvantageStep(700, 1000, rules)).toBe(-2); // 0.7
    expect(tacticalAdvantageStep(900, 1000, rules)).toBe(-1); // 0.9
    expect(tacticalAdvantageStep(1000, 1000, rules)).toBe(-1); // 1.0
  });

  it('falls back to the weakest advantage when the attacker has no strength', () => {
    expect(tacticalAdvantageStep(500, 0, rules)).toBe(-1);
  });
});

describe('lossesForResult', () => {
  it('matches the book outcomes table', () => {
    expect(lossesForResult('criticalFailure', rules)).toEqual({ attackerLossPct: 0.25, defenderLossPct: 0.05 });
    expect(lossesForResult('failure', rules)).toEqual({ attackerLossPct: 0.20, defenderLossPct: 0.10 });
    expect(lossesForResult('ordinary', rules)).toEqual({ attackerLossPct: 0.15, defenderLossPct: 0.15 });
    expect(lossesForResult('good', rules)).toEqual({ attackerLossPct: 0.10, defenderLossPct: 0.20 });
    expect(lossesForResult('amazing', rules)).toEqual({ attackerLossPct: 0.05, defenderLossPct: 0.25 });
  });
});

describe('determineRoles', () => {
  it('higher force strength is the attacker; ties go to A', () => {
    expect(determineRoles(500, 1000)).toEqual({ attacker: 'B', defender: 'A' });
    expect(determineRoles(1000, 500)).toEqual({ attacker: 'A', defender: 'B' });
    expect(determineRoles(500, 500)).toEqual({ attacker: 'A', defender: 'B' });
  });
});

describe('systemDefenseCombatStrength', () => {
  it('squares the rating and multiplies by 1,000', () => {
    expect(systemDefenseCombatStrength(5, rules)).toBe(25000); // book example: Aegis
    expect(systemDefenseCombatStrength(3, rules)).toBe(9000);
    expect(systemDefenseCombatStrength(0, rules)).toBe(0);
  });

  it('clamps out-of-range ratings', () => {
    expect(systemDefenseCombatStrength(-2, rules)).toBe(0);
    expect(systemDefenseCombatStrength(99, rules)).toBe(25000);
  });
});

describe('effectiveFactor', () => {
  it('gives full strength in a unit’s native domain', () => {
    const ship = stack({ combatStrengthPerUnit: 100, domain: 'space', crossDomainFactor: 0.5 });
    expect(effectiveFactor(ship, 'space', rules)).toBe(1);
  });

  it('halves spacecraft strength when bombarding ground targets', () => {
    const ship = stack({ combatStrengthPerUnit: 100, domain: 'space', crossDomainFactor: 0.5 });
    expect(effectiveFactor(ship, 'ground', rules)).toBe(0.5);
  });

  it('blocks units that cannot engage the other domain', () => {
    const infantry = stack({ combatStrengthPerUnit: 75, domain: 'ground', crossDomainFactor: null });
    expect(effectiveFactor(infantry, 'space', rules)).toBeNull();
    expect(effectiveStrength(infantry, 'space', rules)).toBe(0);
  });

  it('inverts the factors for a designated planet bomber', () => {
    const bomber = stack({
      combatStrengthPerUnit: 100, domain: 'space', crossDomainFactor: 0.5, specialization: 'bomber',
    });
    expect(effectiveFactor(bomber, 'space', rules)).toBe(0.5);
    expect(effectiveFactor(bomber, 'ground', rules)).toBe(1);
  });

  it('inverts the factors for a designated planetary defense battery', () => {
    const pdb = stack({
      combatStrengthPerUnit: 200, domain: 'ground', crossDomainFactor: 0.5,
      specialization: 'planetaryDefenseBattery',
    });
    expect(effectiveFactor(pdb, 'space', rules)).toBe(1);
    expect(effectiveFactor(pdb, 'ground', rules)).toBe(0.5);
  });
});

describe('computeForceStrength', () => {
  it('sums only the stacks committed to the theatre', () => {
    const s = side('A', [
      stack({ combatStrengthPerUnit: 100, initialQuantity: 3, theatreId: spaceTheatre.id }),
      stack({ combatStrengthPerUnit: 500, theatreId: groundTheatre.id, domain: 'ground' }),
    ]);
    expect(computeForceStrength(s, spaceTheatre, rules)).toBe(300);
    expect(computeTotalStrength(s)).toBe(800);
  });

  it('applies the bombardment factor in a bombardment theatre', () => {
    const s = side('A', [
      stack({ combatStrengthPerUnit: 1000, domain: 'space', crossDomainFactor: 0.5, theatreId: bombardTheatre.id }),
    ]);
    expect(computeForceStrength(s, bombardTheatre, rules)).toBe(500);
    expect(computeStartingForceStrength(s, bombardTheatre, rules)).toBe(500);
  });
});

describe('applyRound (book example, p. 65)', () => {
  // Attacker force strength 12,500 vs defender 10,000.
  const state = battle(
    side('A', [stack({ combatStrengthPerUnit: 12500 })]),
    side('B', [stack({ combatStrengthPerUnit: 10000 })]),
  );

  it('costs each side 15% on an ordinary success', () => {
    const { state: next, round } = applyRound(state, spaceTheatre.id, 'ordinary', rules);
    expect(round!.attackerSide).toBe('A');
    expect(round!.attackerStrengthBefore).toBe(12500);
    expect(round!.defenderStrengthBefore).toBe(10000);
    expect(computeForceStrength(next.sideA, next.theatres[0], rules)).toBeCloseTo(10625);
    expect(computeForceStrength(next.sideB, next.theatres[0], rules)).toBeCloseTo(8500);
  });

  it('turns the tide on a critical failure', () => {
    const { state: next } = applyRound(state, spaceTheatre.id, 'criticalFailure', rules);
    expect(computeForceStrength(next.sideA, next.theatres[0], rules)).toBeCloseTo(9375);
    expect(computeForceStrength(next.sideB, next.theatres[0], rules)).toBeCloseTo(9500);
    // Roles swap on the next round because B is now stronger.
    expect(determineRoles(9375, 9500)).toEqual({ attacker: 'B', defender: 'A' });
  });

  it('records the round on the theatre and leaves other theatres untouched', () => {
    const multi = battle(
      side('A', [stack({ combatStrengthPerUnit: 1000 })]),
      side('B', [stack({ combatStrengthPerUnit: 800 })]),
      [spaceTheatre, groundTheatre],
    );
    const { state: next } = applyRound(multi, spaceTheatre.id, 'ordinary', rules);
    expect(next.theatres[0].rounds).toHaveLength(1);
    expect(next.theatres[1].rounds).toHaveLength(0);
    expect(isBattleStarted(next)).toBe(true);
  });

  it('only damages stacks committed to the resolved theatre', () => {
    const multi = battle(
      side('A', [
        stack({ combatStrengthPerUnit: 1000, theatreId: spaceTheatre.id }),
        stack({ combatStrengthPerUnit: 400, theatreId: groundTheatre.id, domain: 'ground' }),
      ]),
      side('B', [
        stack({ combatStrengthPerUnit: 800, theatreId: spaceTheatre.id }),
        stack({ combatStrengthPerUnit: 400, theatreId: groundTheatre.id, domain: 'ground' }),
      ]),
      [spaceTheatre, groundTheatre],
    );
    const { state: next } = applyRound(multi, spaceTheatre.id, 'ordinary', rules);
    expect(next.sideA.stacks[0].currentStrength).toBeCloseTo(850);
    expect(next.sideA.stacks[1].currentStrength).toBe(400);
  });

  it('returns the state unchanged for an unknown theatre', () => {
    const { state: next, round } = applyRound(state, 'nope', 'ordinary', rules);
    expect(round).toBeNull();
    expect(next).toBe(state);
  });
});

describe('shouldWithdraw', () => {
  it('triggers once the configured fraction of starting strength is lost', () => {
    const s = side('A', [stack({ combatStrengthPerUnit: 1000, currentStrength: 600 })], 0.4);
    expect(shouldWithdraw(s, spaceTheatre, rules)).toBe(true);

    const stillFighting = side('A', [stack({ combatStrengthPerUnit: 1000, currentStrength: 700 })], 0.4);
    expect(shouldWithdraw(stillFighting, spaceTheatre, rules)).toBe(false);
  });

  it('is false when the side never committed anything to the theatre', () => {
    expect(shouldWithdraw(side('A', []), spaceTheatre, rules)).toBe(false);
  });
});

describe('resetBattle', () => {
  it('restores starting strength and clears every theatre log', () => {
    const state = battle(
      side('A', [stack({ combatStrengthPerUnit: 100, initialQuantity: 5, currentStrength: 120 })]),
      side('B', [stack({ combatStrengthPerUnit: 200, currentStrength: 10 })]),
    );
    const { state: fought } = applyRound(state, spaceTheatre.id, 'good', rules);
    const reset = resetBattle(fought);
    expect(reset.sideA.stacks[0].currentStrength).toBe(500);
    expect(reset.sideB.stacks[0].currentStrength).toBe(200);
    expect(isBattleStarted(reset)).toBe(false);
  });
});

describe('tacticsScoreFor', () => {
  const s = side('A', []);
  it('uses space tactics for space and bombardment theatres', () => {
    expect(tacticsScoreFor(s, 'space')).toBe(12);
    expect(tacticsScoreFor(s, 'bombardment')).toBe(12);
  });
  it('uses ground tactics for ground theatres', () => {
    expect(tacticsScoreFor(s, 'ground')).toBe(10);
  });
});

describe('stack construction', () => {
  const carrier: BattleUnitType = {
    id: 'lanza', name: 'Lanza', category: 'carrier', role: 'Carrier',
    combatStrength: 250, fighterComplement: 80,
  };

  it('defaults spacecraft to half strength against ground targets', () => {
    const s = createStackFromUnitType(carrier, 'space', 2, spaceTheatre.id, rules);
    expect(s.combatStrengthPerUnit).toBe(250);
    expect(s.currentStrength).toBe(500);
    expect(s.crossDomainFactor).toBe(0.5);
    expect(s.notes).toContain('80 fighters');
  });

  it('leaves ground units unable to engage orbit unless the catalogue says otherwise', () => {
    const infantry: BattleUnitType = {
      id: 'groush', name: 'Groush', category: 'infantry', role: 'Platoon', combatStrength: 75,
    };
    expect(createStackFromUnitType(infantry, 'ground', 1, groundTheatre.id, rules).crossDomainFactor).toBeNull();

    const broadsword: BattleUnitType = {
      id: 'broadsword', name: 'Broadsword', category: 'armor', role: 'Mobile fortress',
      combatStrength: 100, spaceFactor: 0.5,
    };
    expect(createStackFromUnitType(broadsword, 'ground', 1, groundTheatre.id, rules).crossDomainFactor).toBe(0.5);
  });

  it('builds custom and system-defense stacks', () => {
    const custom = createCustomStack({
      name: 'Concord Cruiser', combatStrength: 400, quantity: 3,
      domain: 'space', crossDomainFactor: 0.5, theatreId: spaceTheatre.id,
    });
    expect(custom.currentStrength).toBe(1200);
    expect(custom.category).toBe('custom');

    const defenses = createSystemDefenseStack('Aegis', 5, spaceTheatre.id, rules);
    expect(defenses.combatStrengthPerUnit).toBe(25000);
    expect(defenses.crossDomainFactor).toBeNull();
    expect(defenses.name).toBe('Aegis Defenses');
  });
});
