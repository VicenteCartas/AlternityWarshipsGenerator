import { describe, expect, it } from 'vitest';
import {
  getAllComputers,
  getAllEquipment,
  getAllPersonalEquipment,
  getAllServices,
  getEquipmentById,
  getProfessionById,
} from './characterDataService';
import {
  calculateStartingFunds,
  evaluateEquipmentPurchases,
  getEquipmentActiveMemory,
} from './equipmentService';

describe('PHB noncombat equipment', () => {
  it('loads the personal, service, and computer catalogues with unique IDs', () => {
    expect(getAllPersonalEquipment()).toHaveLength(75);
    expect(getAllServices()).toHaveLength(36);
    expect(getAllComputers()).toHaveLength(32);
    const all = getAllEquipment();
    expect(new Set(all.map((entry) => entry.id)).size).toBe(all.length);
  });

  it('calculates profession funds and wealth outcome adjustments', () => {
    const freeAgent = getProfessionById('free-agent')!;
    expect(calculateStartingFunds(freeAgent, [8, 7, 6, 5, 4], null)).toMatchObject({
      valid: true,
      dieSize: 8,
      baseFunds: 3000,
      totalFunds: 3000,
    });
    expect(calculateStartingFunds(freeAgent, [8, 7, 6, 5, 4], 'filthy-rich', 'good').totalFunds).toBe(150000);
    expect(calculateStartingFunds(freeAgent, [8, 7, 6, 5, 4], 'dirt-poor', 'ordinary').totalFunds).toBe(750);
  });

  it('validates die count, die range, and required wealth checks', () => {
    const result = calculateStartingFunds(getProfessionById('mindwalker')!, [1, 2, 3, 5], 'filthy-rich');
    expect(result.errors).toEqual(expect.arrayContaining([
      'Starting funds require exactly 5 die results.',
      'Each starting-funds die must be a whole number from 1 to 4.',
      'Filthy Rich requires a perk or flaw check result.',
    ]));
  });

  it('prices fixed, quality-based, variable, and granted equipment', () => {
    const result = evaluateEquipmentPurchases([
      { equipmentId: 'bedroll', quantity: 2 },
      { equipmentId: 'computer-pl7-data-slate', quantity: 1, quality: 'good' },
      { equipmentId: 'animal-mount', quantity: 1, unitCostOverride: 400 },
      { equipmentId: 'e-suit-soft', quantity: 1, granted: true },
    ], getAllEquipment(), 2000, 7);

    expect(result.valid).toBe(true);
    expect(result.totalCost).toBe(1200);
    expect(result.remainingFunds).toBe(800);
    expect(result.grantedValue).toBe(2500);
    expect(result.totalMass).toBe(18);
    expect(getEquipmentActiveMemory(getEquipmentById('computer-pl7-data-slate')!, 'good')).toBe(3);
  });

  it('reports Progress Level, quality, variable-cost, quantity, and budget errors together', () => {
    const result = evaluateEquipmentPurchases([
      { equipmentId: 'holorecorder', quantity: 1 },
      { equipmentId: 'computer-pl7-gridsuit', quantity: 1, quality: 'good' },
      { equipmentId: 'climate-weave', quantity: 1 },
      { equipmentId: 'bedroll', quantity: 0 },
    ], getAllEquipment(), 100, 6);

    expect(result.errors).toEqual(expect.arrayContaining([
      'Holorecorder requires Progress Level 7.',
      'Gridsuit requires Progress Level 7.',
      'Gridsuit is not available at good quality.',
      'Climate Weave requires a nonnegative unit cost.',
      'Bedroll quantity must be a positive whole number.',
      expect.stringContaining('Equipment purchases exceed starting funds'),
    ]));
  });
});