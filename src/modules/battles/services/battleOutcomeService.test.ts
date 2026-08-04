import { describe, expect, it } from 'vitest';
import rulesJson from '../data/battleRules.json';
import type {
  BattleRules,
  BattleState,
  Side,
  SideId,
  Theatre,
  UnitStack,
  VictoryCondition,
  VictoryConditionKind,
} from '../types/battle';
import {
  concludeTheatre,
  evaluateVictoryCondition,
  reopenTheatre,
} from './battleOutcomeService';

const rules = rulesJson as BattleRules;
const theatre: Theatre = { id: 'orbit', name: 'Orbit', kind: 'space', rounds: [] };

function stack(
  id: string,
  currentStrength: number,
  overrides: Partial<UnitStack> = {},
): UnitStack {
  return {
    id,
    name: id,
    combatStrengthPerUnit: 100,
    initialQuantity: 1,
    currentStrength,
    category: 'cruiser',
    domain: 'space',
    crossDomainFactor: null,
    specialization: 'none',
    theatreId: theatre.id,
    source: 'custom',
    ...overrides,
  };
}

function side(id: SideId, stacks: UnitStack[]): Side {
  return {
    id,
    name: `Side ${id}`,
    tacticsSpaceScore: 12,
    tacticsGroundScore: 12,
    stacks,
    withdrawThreshold: 0.4,
  };
}

function battle(sideAStacks: UnitStack[], sideBStacks: UnitStack[]): BattleState {
  return {
    scenarioName: 'Objective Test',
    sideA: side('A', sideAStacks),
    sideB: side('B', sideBStacks),
    theatres: [theatre],
    victoryConditions: [],
  };
}

function condition(kind: VictoryConditionKind, overrides: Partial<VictoryCondition> = {}): VictoryCondition {
  return {
    id: 'objective-1',
    name: 'Test objective',
    beneficiarySideId: 'A',
    targetSideId: 'B',
    theatreId: theatre.id,
    kind,
    categories: [],
    stackIds: [],
    thresholdPct: 0.25,
    minimumSurvivingQuantity: 1,
    ...overrides,
  };
}

describe('evaluateVictoryCondition', () => {
  it('achieves a priority-asset objective only after every scoped priority asset is destroyed', () => {
    const state = battle([], [
      stack('carrier', 0, { category: 'carrier', priorityAsset: true }),
      stack('battleship', 50, { category: 'battleship', priorityAsset: true }),
      stack('escort', 0, { category: 'escort' }),
    ]);

    const inProgress = evaluateVictoryCondition(state, condition('priorityAssetsDestroyed'), rules);
    expect(inProgress).toMatchObject({ available: true, achieved: false, progress: 0.5 });

    state.sideB.stacks[1].currentStrength = 0;
    const achieved = evaluateVictoryCondition(state, condition('priorityAssetsDestroyed'), rules);
    expect(achieved).toMatchObject({ available: true, achieved: true, progress: 1 });
  });

  it('does not vacuously achieve an objective when no matching target exists', () => {
    const state = battle([], [stack('escort', 0, { category: 'escort' })]);
    const evaluation = evaluateVictoryCondition(state, condition('categoriesDestroyed', {
      categories: ['cruiser'],
    }), rules);

    expect(evaluation).toMatchObject({ available: false, achieved: false, progress: 0 });
  });

  it('evaluates selected categories against their starting combat strength', () => {
    const state = battle([], [
      stack('cruisers', 20, { category: 'cruiser', initialQuantity: 2, combatStrengthPerUnit: 100 }),
      stack('carrier', 100, { category: 'carrier' }),
    ]);
    const evaluation = evaluateVictoryCondition(state, condition('categoryStrengthBelow', {
      categories: ['cruiser'],
      thresholdPct: 0.25,
    }), rules);

    expect(evaluation.achieved).toBe(true);
    expect(evaluation.detail).toContain('10.0% remains');
  });

  it('treats withdrawal as an achieved objective without ending the theatre automatically', () => {
    const state = battle([], [stack('fleet', 40)]);
    const evaluation = evaluateVictoryCondition(state, condition('opponentWithdraws'), rules);

    expect(evaluation.achieved).toBe(true);
    expect(state.theatres[0].conclusion).toBeUndefined();
  });

  it('keeps preservation provisional until the scoped theatre concludes', () => {
    const state = battle([
      stack('convoy', 100, { initialQuantity: 2, combatStrengthPerUnit: 100 }),
    ], []);
    const objective = condition('preserveStacks', {
      targetSideId: 'A',
      stackIds: ['convoy'],
      minimumSurvivingQuantity: 1,
    });

    expect(evaluateVictoryCondition(state, objective, rules)).toMatchObject({
      currentlySatisfied: true,
      achieved: false,
    });

    const concluded = concludeTheatre(state, theatre.id, 'A', 'objective', objective.id);
    expect(evaluateVictoryCondition(concluded, objective, rules)).toMatchObject({
      currentlySatisfied: true,
      achieved: true,
    });
  });
});

describe('theatre conclusions', () => {
  it('records a winner and can reopen the theatre', () => {
    const state = battle([], []);
    const concluded = concludeTheatre(state, theatre.id, 'B', 'manual');

    expect(concluded.theatres[0].conclusion).toEqual({
      winnerSideId: 'B',
      reason: 'manual',
      round: 0,
    });
    expect(reopenTheatre(concluded, theatre.id).theatres[0].conclusion).toBeUndefined();
  });
});
