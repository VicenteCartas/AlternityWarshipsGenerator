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
} from '../types/battle';
import { summarizeBattleResults } from './battleResultsService';

const rules = rulesJson as BattleRules;

function stack(id: string, currentStrength: number, overrides: Partial<UnitStack> = {}): UnitStack {
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
    theatreId: 'orbit',
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

function theatre(id = 'orbit'): Theatre {
  return { id, name: id, kind: 'space', rounds: [] };
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  return {
    scenarioName: 'Results Test',
    sideA: side('A', [stack('A cruisers', 150, { initialQuantity: 3 })]),
    sideB: side('B', [stack('B carrier', 100, { category: 'carrier', priorityAsset: true })]),
    theatres: [theatre()],
    casualtyMode: 'tracked',
    victoryConditions: [],
    ...overrides,
  };
}

function objective(overrides: Partial<VictoryCondition> = {}): VictoryCondition {
  return {
    id: 'objective-1',
    name: 'Destroy the carrier',
    beneficiarySideId: 'A',
    targetSideId: 'B',
    theatreId: 'orbit',
    kind: 'priorityAssetsDestroyed',
    categories: [],
    stackIds: [],
    thresholdPct: 0.25,
    minimumSurvivingQuantity: 1,
    ...overrides,
  };
}

describe('summarizeBattleResults', () => {
  it('counts survivors, damaged units, and destroyed units in tracked mode', () => {
    const summary = summarizeBattleResults(battle(), rules);
    const cruisers = summary.theatres[0].sideA.stacks[0];

    expect(cruisers).toMatchObject({
      initialQuantity: 3,
      survivingQuantity: 2,
      damagedQuantity: 1,
      destroyedQuantity: 1,
      startingStrength: 300,
      remainingStrength: 150,
    });
    expect(summary.theatres[0].sideA.categories[0]).toMatchObject({
      survivingQuantity: 2,
      damagedQuantity: 1,
      destroyedQuantity: 1,
    });
  });

  it('labels specific casualty counts as unallocated in abstract mode', () => {
    const summary = summarizeBattleResults(battle({ casualtyMode: 'abstract' }), rules);
    const cruisers = summary.theatres[0].sideA.stacks[0];

    expect(summary.casualtiesAllocated).toBe(false);
    expect(cruisers).toMatchObject({
      survivingQuantity: null,
      damagedQuantity: null,
      destroyedQuantity: null,
    });
  });

  it('reports withdrawal without declaring a winner', () => {
    const summary = summarizeBattleResults(battle({
      sideB: side('B', [stack('B carrier', 50, { category: 'carrier', priorityAsset: true })]),
    }), rules);

    expect(summary.theatres[0].sideB.shouldWithdraw).toBe(true);
    expect(summary.theatres[0]).toMatchObject({ status: 'unresolved', winnerSideId: null });
  });

  it('uses recorded theatre conclusions for the overall result', () => {
    const first = { ...theatre(), conclusion: { winnerSideId: 'A' as const, reason: 'manual' as const, round: 2 } };
    const second = { ...theatre('surface'), conclusion: { winnerSideId: 'B' as const, reason: 'manual' as const, round: 1 } };
    const third = { ...theatre('moon'), conclusion: { winnerSideId: 'A' as const, reason: 'objective' as const, round: 3 } };
    const state = battle({
      theatres: [first, second, third],
      sideA: side('A', [
        stack('A orbit', 100),
        stack('A surface', 100, { theatreId: 'surface' }),
        stack('A moon', 100, { theatreId: 'moon' }),
      ]),
      sideB: side('B', [
        stack('B orbit', 100),
        stack('B surface', 100, { theatreId: 'surface' }),
        stack('B moon', 100, { theatreId: 'moon' }),
      ]),
    });

    const summary = summarizeBattleResults(state, rules);
    expect(summary.winsBySide).toEqual({ A: 2, B: 1 });
    expect(summary.winnerSideId).toBe('A');
    expect(summary.overallLabel).toContain('Side A prevails overall');
  });

  it('marks an unmet objective failed once its theatre concludes', () => {
    const state = battle({ victoryConditions: [objective()] });
    state.theatres = [{
      ...state.theatres[0],
      conclusion: { winnerSideId: 'B', reason: 'manual', round: 1 },
    }];

    const summary = summarizeBattleResults(state, rules);
    expect(summary.objectiveResults[0].status).toBe('failed');
  });

  it('flags pending casualty allocations as provisional results', () => {
    const state = battle({
      pendingCasualties: [{
        theatreId: 'orbit',
        round: 1,
        targetEffectiveLoss: { A: 50, B: 50 },
        allocations: { A: [], B: [] },
      }],
    });

    const summary = summarizeBattleResults(state, rules);
    expect(summary.casualtiesPending).toBe(true);
    expect(summary.theatres[0].casualtiesPending).toBe(true);
  });
});
