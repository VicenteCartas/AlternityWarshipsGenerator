import { describe, expect, it } from 'vitest';
import rulesJson from '../data/battleRules.json';
import type { BattleRules, BattleState, UnitStack } from '../types/battle';
import { createBattleReportPdf, getBattleReportFileName } from './battleReportService';

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

function battle(casualtyMode: 'abstract' | 'tracked'): BattleState {
  return {
    scenarioName: 'Relief of Tendril',
    casualtyMode,
    sideA: {
      id: 'A', name: 'Alliance', tacticsSpaceScore: 12, tacticsGroundScore: 12,
      withdrawThreshold: 0.4, stacks: [stack('Cruiser Squadron', 100)],
    },
    sideB: {
      id: 'B', name: 'Exeat', tacticsSpaceScore: 12, tacticsGroundScore: 12,
      withdrawThreshold: 0.4,
      stacks: [stack('Fleet Carrier', 0, { category: 'carrier', priorityAsset: true })],
    },
    theatres: [{
      id: 'orbit',
      name: 'High Orbit',
      kind: 'space',
      rounds: [],
      conclusion: { winnerSideId: 'A', reason: 'objective', conditionId: 'objective-1', round: 0 },
    }],
    victoryConditions: [{
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
    }],
  };
}

describe('battle report PDF', () => {
  it('includes results, objectives, withdrawal, and tracked casualty allocation', () => {
    const pdf = createBattleReportPdf(battle('tracked'), rules);
    const output = pdf.output();

    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(4000);
    expect(output).toContain('Overall result');
    expect(output).toContain('Specific casualties allocated');
    expect(output).toContain('Victory Objectives');
    expect(output).toContain('Destroy the carrier');
    expect(output).toContain('SHOULD WITHDRAW');
    expect(getBattleReportFileName('Relief / Tendril')).toBe('Relief_Tendril_battle_report.pdf');
  });

  it('explicitly identifies abstract casualties as unallocated', () => {
    const output = createBattleReportPdf(battle('abstract'), rules).output();
    expect(output).toContain('Specific casualties unallocated');
  });
});
