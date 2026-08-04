import { describe, it, expect } from 'vitest';
import {
  serializeBattle, battleSaveFileToJson, jsonToBattleSaveFile,
  deserializeBattle, getDefaultBattleFileName,
} from './battleSaveService';
import { BATTLE_SAVE_FILE_VERSION } from '../types/battleSaveFile';
import type { BattleSaveFile } from '../types/battleSaveFile';
import type { BattleState } from '../types/battle';

function sampleBattle(): BattleState {
  return {
    scenarioName: 'Fall of Spes',
    sideA: {
      id: 'A',
      name: 'Concord',
      tacticsSpaceScore: 14,
      tacticsGroundScore: 11,
      withdrawThreshold: 0.4,
      stacks: [
        {
          id: 'stack-1',
          name: 'Invader',
          combatStrengthPerUnit: 500,
          initialQuantity: 2,
          currentStrength: 850,
          category: 'cruiser',
          domain: 'space',
          crossDomainFactor: 0.5,
          specialization: 'none',
          theatreId: 'sp',
          source: 'catalogue',
        },
      ],
    },
    sideB: {
      id: 'B',
      name: 'Exeat',
      tacticsSpaceScore: 12,
      tacticsGroundScore: 12,
      withdrawThreshold: 0.6,
      stacks: [],
    },
    theatres: [
      {
        id: 'sp',
        name: 'Orbit',
        kind: 'space',
        rounds: [{
          round: 1,
          attackerSide: 'A',
          defenderSide: 'B',
          attackerStrengthBefore: 1000,
          defenderStrengthBefore: 800,
          ratio: 0.8,
          stepModifier: -1,
          checkResult: 'ordinary',
          attackerLossPct: 0.15,
          defenderLossPct: 0.15,
          attackerStrengthAfter: 850,
          defenderStrengthAfter: 680,
        }],
      },
    ],
  };
}

describe('serializeBattle', () => {
  it('wraps the battle with version metadata', () => {
    const file = serializeBattle(sampleBattle());
    expect(file.version).toBe(BATTLE_SAVE_FILE_VERSION);
    expect(file.appVersion).toBeTruthy();
    expect(file.battle.scenarioName).toBe('Fall of Spes');
    expect(file.activeMods).toBeUndefined();
  });

  it('records active mods when any are enabled', () => {
    const file = serializeBattle(sampleBattle(), [
      {
        manifest: { name: 'Extra Fleets', author: 'a', version: '2.0', description: '' },
        folderName: 'extra-fleets',
        enabled: true,
        priority: 1,
        files: ['spaceUnits.json'],
      },
    ]);
    expect(file.activeMods).toEqual([{ name: 'Extra Fleets', version: '2.0' }]);
  });
});

describe('jsonToBattleSaveFile', () => {
  it('round-trips a serialized battle', () => {
    const json = battleSaveFileToJson(serializeBattle(sampleBattle()));
    const parsed = jsonToBattleSaveFile(json);
    expect(parsed?.battle.scenarioName).toBe('Fall of Spes');
  });

  it('rejects malformed input', () => {
    expect(jsonToBattleSaveFile('not json')).toBeNull();
    expect(jsonToBattleSaveFile('{"version":"1.0"}')).toBeNull();
    expect(jsonToBattleSaveFile('[]')).toBeNull();
  });
});

describe('deserializeBattle', () => {
  function wrap(battle: unknown, version = BATTLE_SAVE_FILE_VERSION): BattleSaveFile {
    return {
      version,
      appVersion: '1.1.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      modifiedAt: '2026-01-01T00:00:00.000Z',
      battle: battle as BattleState,
    };
  }

  it('restores a well-formed battle unchanged', () => {
    const result = deserializeBattle(wrap(sampleBattle()));
    expect(result.success).toBe(true);
    expect(result.battle?.scenarioName).toBe('Fall of Spes');
    expect(result.battle?.sideA.stacks[0].currentStrength).toBe(850);
    expect(result.battle?.theatres[0].rounds).toHaveLength(1);
    expect(result.warnings).toBeUndefined();
    expect(result.battle?.casualtyMode).toBe('abstract');
    expect(result.battle?.pendingCasualties).toEqual([]);
    expect(result.battle?.victoryConditions).toEqual([]);
  });

  it('fails when the file has no battle object', () => {
    const result = deserializeBattle(wrap(null));
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('creates a space theatre when none are present', () => {
    const battle = sampleBattle();
    const result = deserializeBattle(wrap({ ...battle, theatres: [] }));
    expect(result.success).toBe(true);
    expect(result.battle?.theatres).toHaveLength(1);
    expect(result.battle?.theatres[0].kind).toBe('space');
    expect(result.warnings?.some((w) => w.includes('no theatres'))).toBe(true);
  });

  it('migrates a flat rounds array into a single space theatre', () => {
    const battle = sampleBattle();
    const legacy = {
      scenarioName: battle.scenarioName,
      sideA: { ...battle.sideA, stacks: [] },
      sideB: battle.sideB,
      rounds: battle.theatres[0].rounds,
    };
    const result = deserializeBattle(wrap(legacy, '0.9'));
    expect(result.success).toBe(true);
    expect(result.battle?.theatres).toHaveLength(1);
    expect(result.battle?.theatres[0].rounds).toHaveLength(1);
    expect(result.warnings?.some((w) => w.includes('older engagement'))).toBe(true);
  });

  it('carries a legacy single tactics score into both skills', () => {
    const battle = sampleBattle();
    const legacySide = { name: 'Old Fleet', tacticsScore: 9, stacks: [], withdrawThreshold: 0.4 };
    const result = deserializeBattle(wrap({ ...battle, sideA: legacySide }));
    expect(result.battle?.sideA.tacticsSpaceScore).toBe(9);
    expect(result.battle?.sideA.tacticsGroundScore).toBe(9);
  });

  it('moves stacks that point at a missing theatre into the first one', () => {
    const battle = sampleBattle();
    battle.sideA.stacks[0].theatreId = 'gone';
    const result = deserializeBattle(wrap(battle));
    expect(result.battle?.sideA.stacks[0].theatreId).toBe('sp');
    expect(result.warnings?.some((w) => w.includes('missing theatre'))).toBe(true);
  });

  it('defaults malformed stack fields rather than failing', () => {
    const battle = sampleBattle();
    const result = deserializeBattle(wrap({
      ...battle,
      sideA: {
        ...battle.sideA,
        stacks: [{ name: 'Broken', combatStrengthPerUnit: 'x', initialQuantity: -3, theatreId: 'sp' }],
      },
    }));
    const stack = result.battle!.sideA.stacks[0];
    expect(stack.combatStrengthPerUnit).toBe(0);
    expect(stack.initialQuantity).toBe(1);
    expect(stack.domain).toBe('space');
    expect(stack.specialization).toBe('none');
    expect(stack.crossDomainFactor).toBeNull();
  });

  it('falls back to a space theatre for an unknown theatre type', () => {
    const battle = sampleBattle();
    const result = deserializeBattle(wrap({
      ...battle,
      theatres: [{ id: 'sp', name: 'Odd', kind: 'orbital-duel', rounds: [] }],
    }));
    expect(result.battle?.theatres[0].kind).toBe('space');
    expect(result.warnings?.some((w) => w.includes('Unknown theatre type'))).toBe(true);
  });

  it('warns when the file was written by a different format version', () => {
    const result = deserializeBattle(wrap(sampleBattle(), '0.5'));
    expect(result.warnings?.some((w) => w.includes('migrated'))).toBe(true);
  });

  it('restores tracked casualties and priority assets', () => {
    const battle = sampleBattle();
    battle.casualtyMode = 'tracked';
    battle.sideA.stacks[0].priorityAsset = true;
    battle.pendingCasualties = [{
      theatreId: 'sp',
      round: 1,
      targetEffectiveLoss: { A: 150, B: 100 },
      allocations: { A: [{ stackId: 'stack-1', strengthLoss: 150 }], B: [] },
    }];
    const result = deserializeBattle(wrap(battle));
    expect(result.battle?.casualtyMode).toBe('tracked');
    expect(result.battle?.sideA.stacks[0].priorityAsset).toBe(true);
    expect(result.battle?.pendingCasualties?.[0].allocations.A[0].strengthLoss).toBe(150);
  });

  it('restores objectives and theatre conclusions defensively', () => {
    const battle = sampleBattle();
    battle.theatres[0].conclusion = {
      winnerSideId: 'A', reason: 'objective', conditionId: 'objective-1', round: 1,
    };
    battle.victoryConditions = [{
      id: 'objective-1',
      name: 'Destroy the cruisers',
      beneficiarySideId: 'A',
      targetSideId: 'B',
      theatreId: 'sp',
      kind: 'categoryStrengthBelow',
      categories: ['cruiser'],
      stackIds: [],
      thresholdPct: 0.25,
      minimumSurvivingQuantity: 1,
    }];

    const result = deserializeBattle(wrap(battle));
    expect(result.battle?.theatres[0].conclusion).toEqual(battle.theatres[0].conclusion);
    expect(result.battle?.victoryConditions).toEqual(battle.victoryConditions);
  });

  it('warns about rounds resolved with the reversed tactical-advantage sign', () => {
    const battle = sampleBattle();
    battle.theatres[0].rounds[0].stepModifier = 5;
    const result = deserializeBattle(wrap(battle));
    expect(result.warnings?.some((w) => w.includes('reversed tactical-advantage sign'))).toBe(true);
  });
});

describe('getDefaultBattleFileName', () => {
  it('uses the scenario name', () => {
    expect(getDefaultBattleFileName('Fall of Spes')).toBe('Fall of Spes.battle.json');
  });

  it('strips characters that are illegal in file names', () => {
    expect(getDefaultBattleFileName('Tendril: Relief?/Blockade'))
      .toBe('Tendril ReliefBlockade.battle.json');
  });

  it('falls back when the name is empty', () => {
    expect(getDefaultBattleFileName('   ')).toBe('Engagement.battle.json');
  });
});
