import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DefenseSystemType, InstalledDefenseSystem } from '../types/defense';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getDefenseSystemsData: vi.fn(),
}));

import {
  getAllDefenseSystemTypes,
  getDefenseSystemTypeById,
  generateDefenseId,
  calculateDefenseHullPoints,
  calculateDefensePower,
  calculateDefenseCost,
  calculateUnitsForFullCoverage,
  calculateTotalCoverage,
  calculateDefenseStats,
  hasScreenConflict,
  getInstalledScreenNames,
  getActiveScreenTypeName,
} from './defenseService';
import { getDefenseSystemsData } from './dataLoader';

// ============== Test Data ==============

function makeDefenseType(overrides: Partial<DefenseSystemType> = {}): DefenseSystemType {
  return {
    id: 'magnetic-screen',
    name: 'Magnetic Screen',
    progressLevel: 6,
    techTracks: ['S'],
    category: 'screen',
    hullPoints: 4,
    hullPercentage: 0,
    powerRequired: 2,
    powerPer: 'unit',
    cost: 400000,
    costPer: 'unit',
    coverage: 20,
    effect: '+2 steps to missiles, projectiles',
    damageCheckBonus: 0,
    description: 'Test screen',
    ...overrides,
  };
}

function makeInstalledDefense(overrides: Partial<InstalledDefenseSystem> = {}): InstalledDefenseSystem {
  return {
    id: 'def-1',
    type: makeDefenseType(),
    quantity: 1,
    hullPoints: 4,
    powerRequired: 2,
    cost: 400000,
    ...overrides,
  };
}

// ============== Setup ==============

const mockGetDefenseSystemsData = getDefenseSystemsData as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  const defenses = [
    makeDefenseType({ id: 'magnetic-screen', name: 'Magnetic Screen', category: 'screen' }),
    makeDefenseType({ id: 'chaff', name: 'Chaff', category: 'countermeasure', hullPoints: 1, powerRequired: 0, cost: 50000, coverage: 100, costPer: 'unit', powerPer: 'unit', coverageMultiples: true }),
    makeDefenseType({ id: 'damage-control', name: 'Damage Control', category: 'repair', hullPoints: 0, hullPercentage: 5, powerRequired: 1, powerPer: 'systemHp', cost: 100000, costPer: 'systemHp', coverage: 0, damageCheckBonus: 2 }),
    makeDefenseType({ id: 'deflection-inducer', name: 'Deflection Inducer', category: 'screen', coverage: 25, hullPoints: 5, progressLevel: 7 }),
  ];
  mockGetDefenseSystemsData.mockReturnValue(defenses);
});

// ============== Tests ==============

describe('defenseService', () => {

  // ---------- Getters ----------

  describe('getAllDefenseSystemTypes', () => {
    it('returns all defense system types from data loader', () => {
      const result = getAllDefenseSystemTypes();
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('magnetic-screen');
    });
  });

  describe('getDefenseSystemTypeById', () => {
    it('returns the matching type', () => {
      const result = getDefenseSystemTypeById('chaff');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Chaff');
    });

    it('returns undefined for unknown id', () => {
      expect(getDefenseSystemTypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('generateDefenseId', () => {
    it('returns a string starting with def-', () => {
      expect(generateDefenseId()).toMatch(/^def-/);
    });
  });

  // ---------- Units for Full Coverage ----------

  describe('calculateUnitsForFullCoverage', () => {
    it('calculates units needed for coverage-based systems', () => {
      const type = makeDefenseType({ coverage: 20 });
      // 100 HP ship / 20 coverage per unit = 5 units
      expect(calculateUnitsForFullCoverage(type, 100)).toBe(5);
    });

    it('rounds up for uneven division', () => {
      const type = makeDefenseType({ coverage: 30 });
      // 100 / 30 = 3.33 → ceil = 4
      expect(calculateUnitsForFullCoverage(type, 100)).toBe(4);
    });

    it('returns 1 for systems with 0 coverage (repair systems)', () => {
      const type = makeDefenseType({ coverage: 0 });
      expect(calculateUnitsForFullCoverage(type, 100)).toBe(1);
    });

    it('handles small ships needing only 1 unit', () => {
      const type = makeDefenseType({ coverage: 50 });
      expect(calculateUnitsForFullCoverage(type, 20)).toBe(1);
    });
  });

  // ---------- Hull Points Calculation ----------

  describe('calculateDefenseHullPoints', () => {
    it('calculates HP for fixed-size systems (quantity only)', () => {
      // hullPercentage=0, hullPoints=4, coverage-based=no
      const type = makeDefenseType({ hullPercentage: 0, hullPoints: 4 });
      expect(calculateDefenseHullPoints(type, 100, 3)).toBe(12); // 4 * 3
    });

    it('calculates HP for percentage-based systems', () => {
      // hullPercentage=5 → ceil(5% of 100) = 5 HP
      const type = makeDefenseType({ hullPercentage: 5 });
      expect(calculateDefenseHullPoints(type, 100, 1)).toBe(5);
    });

    it('rounds up percentage-based HP', () => {
      // 5% of 73 = 3.65 → ceil = 4
      const type = makeDefenseType({ hullPercentage: 5 });
      expect(calculateDefenseHullPoints(type, 73, 1)).toBe(4);
    });

    it('calculates HP for coverageMultiples systems', () => {
      // coverageMultiples=true, coverage=100, hullPoints=1
      // full coverage units for 200 HP ship = ceil(200/100) = 2
      // quantity=3, effectiveUnits = 3 * 2 = 6
      // HP = 1 * 6 = 6
      const type = makeDefenseType({ coverageMultiples: true, coverage: 100, hullPoints: 1 });
      expect(calculateDefenseHullPoints(type, 200, 3)).toBe(6);
    });

    it('handles quantity=1 for coverageMultiples', () => {
      const type = makeDefenseType({ coverageMultiples: true, coverage: 100, hullPoints: 1 });
      // Ship has 200 HP, so full coverage = 2 units
      // quantity=1, effectiveUnits = 1 * 2 = 2
      expect(calculateDefenseHullPoints(type, 200, 1)).toBe(2);
    });
  });

  // ---------- Power Calculation ----------

  describe('calculateDefensePower', () => {
    it('calculates power for unit-based systems', () => {
      const type = makeDefenseType({ powerPer: 'unit', powerRequired: 2 });
      expect(calculateDefensePower(type, 100, 3)).toBe(6); // 2 * 3
    });

    it('calculates power for systemHp-based percentage systems', () => {
      // powerPer='systemHp', hullPercentage=5, powerRequired=1
      // systemHP = ceil(5% of 100) = 5
      // power = 1 * 5 = 5
      const type = makeDefenseType({ powerPer: 'systemHp', hullPercentage: 5, powerRequired: 1 });
      expect(calculateDefensePower(type, 100, 1)).toBe(5);
    });

    it('calculates power for systemHp-based fixed systems', () => {
      // powerPer='systemHp', hullPercentage=0, hullPoints=3, powerRequired=2
      // power = 2 * 3 * quantity
      const type = makeDefenseType({ powerPer: 'systemHp', hullPercentage: 0, hullPoints: 3, powerRequired: 2 });
      expect(calculateDefensePower(type, 100, 2)).toBe(12); // 2*3*2
    });

    it('calculates power for coverageMultiples systems', () => {
      // coverageMultiples=true, coverage=100, powerPer='unit', powerRequired=1
      // Ship HP=200, full coverage units = 2
      // quantity=3 → effectiveUnits = 3*2 = 6
      // power = 1 * 6 = 6
      const type = makeDefenseType({ coverageMultiples: true, coverage: 100, powerPer: 'unit', powerRequired: 1 });
      expect(calculateDefensePower(type, 200, 3)).toBe(6);
    });

    it('returns 0 for systems with no power requirement', () => {
      const type = makeDefenseType({ powerRequired: 0, powerPer: 'unit' });
      expect(calculateDefensePower(type, 100, 5)).toBe(0);
    });
  });

  // ---------- Cost Calculation ----------

  describe('calculateDefenseCost', () => {
    it('calculates cost for unit-based systems', () => {
      const type = makeDefenseType({ costPer: 'unit', cost: 400000 });
      expect(calculateDefenseCost(type, 100, 3)).toBe(1200000);
    });

    it('calculates cost for systemHp-based percentage systems', () => {
      // costPer='systemHp', hullPercentage=5, cost=100000
      // systemHP = ceil(5% of 100) = 5
      // totalCost = 100000 * 5 = 500000
      const type = makeDefenseType({ costPer: 'systemHp', hullPercentage: 5, cost: 100000 });
      expect(calculateDefenseCost(type, 100, 1)).toBe(500000);
    });

    it('calculates cost for systemHp-based fixed systems', () => {
      // costPer='systemHp', hullPercentage=0, hullPoints=3, cost=50000
      // cost = 50000 * 3 * 2 = 300000
      const type = makeDefenseType({ costPer: 'systemHp', hullPercentage: 0, hullPoints: 3, cost: 50000 });
      expect(calculateDefenseCost(type, 100, 2)).toBe(300000);
    });

    it('calculates cost for coverageMultiples systems', () => {
      const type = makeDefenseType({ coverageMultiples: true, coverage: 100, costPer: 'unit', cost: 50000 });
      // Ship HP=200 → full coverage = 2 units, quantity=3 → effective=6
      expect(calculateDefenseCost(type, 200, 3)).toBe(300000);
    });
  });

  // ---------- Total Coverage ----------

  describe('calculateTotalCoverage', () => {
    it('multiplies coverage per unit by quantity', () => {
      const type = makeDefenseType({ coverage: 20 });
      expect(calculateTotalCoverage(type, 5)).toBe(100);
    });

    it('returns 0 for systems with no coverage', () => {
      const type = makeDefenseType({ coverage: 0 });
      expect(calculateTotalCoverage(type, 3)).toBe(0);
    });
  });

  // ---------- Stats Calculation ----------

  describe('calculateDefenseStats', () => {
    it('aggregates stats for multiple defense systems', () => {
      const screenType = makeDefenseType({ category: 'screen', coverage: 20 });
      const cmType = makeDefenseType({ id: 'chaff', category: 'countermeasure', coverage: 100 });
      const repairType = makeDefenseType({ id: 'repair', category: 'repair', coverage: 0, damageCheckBonus: 2 });

      const defenses: InstalledDefenseSystem[] = [
        makeInstalledDefense({ type: screenType, quantity: 5, hullPoints: 20, powerRequired: 10, cost: 2000000 }),
        makeInstalledDefense({ type: cmType, quantity: 1, hullPoints: 1, powerRequired: 0, cost: 50000 }),
        makeInstalledDefense({ type: repairType, quantity: 1, hullPoints: 5, powerRequired: 5, cost: 500000 }),
      ];
      const stats = calculateDefenseStats(defenses);

      expect(stats.totalHullPoints).toBe(26);
      expect(stats.totalPowerRequired).toBe(15);
      expect(stats.totalCost).toBe(2550000);
      expect(stats.screenCoverage).toBe(100); // 20*5
      expect(stats.countermeasureCoverage).toBe(100); // 100*1
      expect(stats.damageCheckBonus).toBe(2);
      expect(stats.hasActiveScreen).toBe(true);
      expect(stats.activeScreenType).toBe('Magnetic Screen');
    });

    it('returns zeros for empty input', () => {
      const stats = calculateDefenseStats([]);
      expect(stats.totalHullPoints).toBe(0);
      expect(stats.totalPowerRequired).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.screenCoverage).toBe(0);
      expect(stats.countermeasureCoverage).toBe(0);
      expect(stats.damageCheckBonus).toBe(0);
      expect(stats.hasActiveScreen).toBe(false);
      expect(stats.activeScreenType).toBeNull();
    });

    it('tracks shield points from shield components', () => {
      const shieldType = makeDefenseType({ id: 'capacitor', category: 'shield-component', shieldPoints: 10 });
      const defenses = [
        makeInstalledDefense({ type: shieldType, quantity: 3, hullPoints: 6, powerRequired: 3, cost: 600000 }),
      ];
      const stats = calculateDefenseStats(defenses);
      expect(stats.totalShieldPoints).toBe(30); // 10*3
      expect(stats.hasActiveScreen).toBe(false);
    });

    it('sets active screen type from first screen found', () => {
      const screen1 = makeDefenseType({ id: 'screen-a', name: 'Screen A', category: 'screen' });
      const screen2 = makeDefenseType({ id: 'screen-b', name: 'Screen B', category: 'screen' });
      const defenses = [
        makeInstalledDefense({ type: screen1 }),
        makeInstalledDefense({ type: screen2 }),
      ];
      const stats = calculateDefenseStats(defenses);
      expect(stats.activeScreenType).toBe('Screen A');
    });
  });

  // ---------- Screen Conflict ----------

  describe('hasScreenConflict', () => {
    it('returns false for non-screen types', () => {
      const newType = makeDefenseType({ category: 'countermeasure' });
      const installed = [makeInstalledDefense()]; // has a screen
      expect(hasScreenConflict(installed, newType)).toBe(false);
    });

    it('returns false when no existing screens', () => {
      const newType = makeDefenseType({ category: 'screen', id: 'new-screen' });
      const installed = [
        makeInstalledDefense({ type: makeDefenseType({ category: 'countermeasure', id: 'cm' }) }),
      ];
      expect(hasScreenConflict(installed, newType)).toBe(false);
    });

    it('returns true when a different screen is already installed', () => {
      const existingScreen = makeDefenseType({ id: 'screen-a', category: 'screen' });
      const newScreen = makeDefenseType({ id: 'screen-b', category: 'screen' });
      const installed = [makeInstalledDefense({ type: existingScreen })];
      expect(hasScreenConflict(installed, newScreen)).toBe(true);
    });

    it('returns false when adding more of the same screen type', () => {
      const screen = makeDefenseType({ id: 'screen-a', category: 'screen' });
      const installed = [makeInstalledDefense({ type: screen })];
      expect(hasScreenConflict(installed, screen)).toBe(false);
    });

    it('returns false for empty installed list', () => {
      const newScreen = makeDefenseType({ category: 'screen' });
      expect(hasScreenConflict([], newScreen)).toBe(false);
    });
  });

  // ---------- Screen Name Helpers ----------

  describe('getInstalledScreenNames', () => {
    it('returns names of all installed screen types', () => {
      const screen1 = makeDefenseType({ name: 'Magnetic Screen', category: 'screen' });
      const cm = makeDefenseType({ id: 'cm', name: 'Chaff', category: 'countermeasure' });
      const installed = [
        makeInstalledDefense({ type: screen1 }),
        makeInstalledDefense({ type: cm }),
      ];
      const names = getInstalledScreenNames(installed);
      expect(names).toEqual(['Magnetic Screen']);
    });

    it('returns empty array for no screens', () => {
      expect(getInstalledScreenNames([])).toEqual([]);
    });
  });

  describe('getActiveScreenTypeName', () => {
    it('returns name of first screen found', () => {
      const screen = makeDefenseType({ name: 'Deflection Inducer', category: 'screen' });
      const installed = [makeInstalledDefense({ type: screen })];
      expect(getActiveScreenTypeName(installed)).toBe('Deflection Inducer');
    });

    it('returns null when no screens installed', () => {
      const cm = makeDefenseType({ category: 'countermeasure' });
      expect(getActiveScreenTypeName([makeInstalledDefense({ type: cm })])).toBeNull();
    });

    it('returns null for empty list', () => {
      expect(getActiveScreenTypeName([])).toBeNull();
    });
  });
});
