import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PowerPlantType, InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { Hull } from '../types/hull';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getPowerPlantsData: vi.fn(),
  getFuelTankData: vi.fn(),
}));

import {
  getAllPowerPlantTypes,
  getFuelTankType,
  getPowerPlantTypesForShipClass,
  getPowerPlantTypeById,
  getFuelRequiringPlantTypes,
  calculatePowerGenerated,
  calculatePowerPlantCost,
  calculateFuelTankCost,
  calculateFuelTankEndurance,
  getTotalFuelTankHPForPlantType,
  getTotalFuelTankHP,
  hasFuelRequiringPlants,
  getFuelRequiringInstallations,
  calculatePowerPlantStats,
  calculateTotalPowerPlantStats,
  validatePowerPlantInstallation,
  validateFuelTankInstallation,
  validatePowerPlantDesign,
  generatePowerPlantId,
  generatePowerPlantFuelTankId,
} from './powerPlantService';
import { getPowerPlantsData, getFuelTankData } from './dataLoader';

// ============== Test Data ==============

const MOCK_FUEL_TANK = {
  id: 'fuel-tank',
  name: 'Fuel Tank',
  progressLevel: 6 as const,
  techTracks: [] as string[],
  baseCost: 50000,
  costPerHullPoint: 10000,
  minSize: 0,
  description: 'Test fuel tank',
};

function makePowerPlantType(overrides: Partial<PowerPlantType> = {}): PowerPlantType {
  return {
    id: 'fusion-reactor',
    name: 'Fusion Reactor',
    progressLevel: 6,
    techTracks: [],
    powerPerHullPoint: 5,
    baseCost: 300000,
    costPerHullPoint: 75000,
    minSize: 3,
    requiresFuel: true,
    fuelCostPerHullPoint: 12000,
    fuelEfficiency: 30,
    description: 'Test power plant',
    ...overrides,
  };
}

function makeHull(overrides: Partial<Hull> = {}): Hull {
  return {
    id: 'test-hull',
    name: 'Test Hull',
    shipClass: 'medium',
    category: 'military',
    hullPoints: 100,
    bonusHullPoints: 10,
    toughness: 'Medium',
    targetModifier: 0,
    maneuverability: 2,
    damageTrack: { stun: 10, wound: 10, mortal: 5, critical: 3 },
    crew: 50,
    cost: 1000000,
    description: 'Test hull',
    ...overrides,
  };
}

function makeInstalledPlant(overrides: Partial<InstalledPowerPlant> = {}): InstalledPowerPlant {
  return {
    id: 'pp-1',
    type: makePowerPlantType(),
    hullPoints: 10,
    ...overrides,
  };
}

function makeInstalledFuelTank(overrides: Partial<InstalledFuelTank> = {}): InstalledFuelTank {
  return {
    id: 'ft-1',
    forPowerPlantType: makePowerPlantType(),
    hullPoints: 5,
    ...overrides,
  };
}

// ============== Setup ==============

const mockGetPowerPlantsData = getPowerPlantsData as ReturnType<typeof vi.fn>;
const mockGetFuelTankData = getFuelTankData as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  const plants = [
    makePowerPlantType({ id: 'fusion-reactor', name: 'Fusion Reactor', requiresFuel: true }),
    makePowerPlantType({ id: 'antimatter-plant', name: 'Antimatter Plant', requiresFuel: false, powerPerHullPoint: 10, progressLevel: 8 }),
    makePowerPlantType({ id: 'quantum-reactor', name: 'Quantum Reactor', requiresFuel: false, powerPerHullPoint: 15, progressLevel: 9 }),
  ];
  mockGetPowerPlantsData.mockReturnValue(plants);
  mockGetFuelTankData.mockReturnValue(MOCK_FUEL_TANK);
});

// ============== Tests ==============

describe('powerPlantService', () => {

  // ---------- Getters ----------

  describe('getAllPowerPlantTypes', () => {
    it('returns all power plant types from data loader', () => {
      const result = getAllPowerPlantTypes();
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('fusion-reactor');
    });
  });

  describe('getFuelTankType', () => {
    it('returns the fuel tank type definition', () => {
      const result = getFuelTankType();
      expect(result.id).toBe('fuel-tank');
      expect(result.baseCost).toBe(50000);
    });
  });

  describe('getPowerPlantTypesForShipClass', () => {
    it('returns all types (currently unfiltered)', () => {
      expect(getPowerPlantTypesForShipClass()).toHaveLength(3);
    });
  });

  describe('getPowerPlantTypeById', () => {
    it('returns the matching type', () => {
      const result = getPowerPlantTypeById('antimatter-plant');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Antimatter Plant');
    });

    it('returns undefined for unknown id', () => {
      expect(getPowerPlantTypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('getFuelRequiringPlantTypes', () => {
    it('returns only plants that require fuel', () => {
      const result = getFuelRequiringPlantTypes();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fusion-reactor');
    });
  });

  // ---------- Power & Cost ----------

  describe('calculatePowerGenerated', () => {
    it('calculates power based on powerPerHullPoint', () => {
      const plant = makePowerPlantType({ powerPerHullPoint: 5 });
      expect(calculatePowerGenerated(plant, 10)).toBe(50);
    });

    it('returns 0 for 0 HP', () => {
      expect(calculatePowerGenerated(makePowerPlantType(), 0)).toBe(0);
    });
  });

  describe('calculatePowerPlantCost', () => {
    it('calculates base cost plus per-HP cost', () => {
      const plant = makePowerPlantType({ baseCost: 300000, costPerHullPoint: 75000 });
      // 300000 + 75000 * 10 = 1,050,000
      expect(calculatePowerPlantCost(plant, 10)).toBe(1050000);
    });

    it('returns just base cost for 0 HP', () => {
      const plant = makePowerPlantType({ baseCost: 300000 });
      expect(calculatePowerPlantCost(plant, 0)).toBe(300000);
    });
  });

  // ---------- Fuel Tank Calculations ----------

  describe('calculateFuelTankCost', () => {
    it('combines tank cost and fuel cost', () => {
      const plant = makePowerPlantType({ fuelCostPerHullPoint: 12000 });
      // Tank: 50000 + 10000*5 = 100000
      // Fuel: 12000 * 5 = 60000
      // Total: 160000
      expect(calculateFuelTankCost(plant, 5)).toBe(160000);
    });

    it('returns just tank base cost for 0 HP', () => {
      const plant = makePowerPlantType();
      expect(calculateFuelTankCost(plant, 0)).toBe(50000);
    });
  });

  describe('calculateFuelTankEndurance', () => {
    it('calculates power-days based on fuel efficiency', () => {
      // fuelEfficiency=30, fuelHP=10, plantHP=5
      // powerDaysPerFuelHP = 30/5 = 6
      // endurance = floor(6 * 10) = 60
      const plant = makePowerPlantType({ fuelEfficiency: 30 });
      expect(calculateFuelTankEndurance(plant, 10, 5)).toBe(60);
    });

    it('returns 0 when plant HP is 0', () => {
      expect(calculateFuelTankEndurance(makePowerPlantType(), 10, 0)).toBe(0);
    });

    it('floors fractional endurance', () => {
      // fuelEfficiency=30, fuelHP=3, plantHP=7
      // powerDaysPerFuelHP = 30/7 ≈ 4.286
      // endurance = floor(4.286 * 3) = floor(12.857) = 12
      const plant = makePowerPlantType({ fuelEfficiency: 30 });
      expect(calculateFuelTankEndurance(plant, 3, 7)).toBe(12);
    });

    it('scales inversely with plant HP', () => {
      const plant = makePowerPlantType({ fuelEfficiency: 100 });
      const small = calculateFuelTankEndurance(plant, 10, 1);
      const large = calculateFuelTankEndurance(plant, 10, 10);
      expect(small).toBeGreaterThan(large);
    });
  });

  // ---------- Fuel Tank HP Aggregation ----------

  describe('getTotalFuelTankHPForPlantType', () => {
    it('sums HP for tanks matching a specific plant type', () => {
      const plantA = makePowerPlantType({ id: 'a' });
      const plantB = makePowerPlantType({ id: 'b' });
      const tanks: InstalledFuelTank[] = [
        makeInstalledFuelTank({ forPowerPlantType: plantA, hullPoints: 5 }),
        makeInstalledFuelTank({ forPowerPlantType: plantB, hullPoints: 10 }),
        makeInstalledFuelTank({ forPowerPlantType: plantA, hullPoints: 3 }),
      ];
      expect(getTotalFuelTankHPForPlantType(tanks, 'a')).toBe(8);
    });

    it('returns 0 if no tanks match', () => {
      expect(getTotalFuelTankHPForPlantType([], 'nonexistent')).toBe(0);
    });
  });

  describe('getTotalFuelTankHP', () => {
    it('sums HP across all fuel tanks', () => {
      const tanks = [
        makeInstalledFuelTank({ hullPoints: 5 }),
        makeInstalledFuelTank({ hullPoints: 10 }),
      ];
      expect(getTotalFuelTankHP(tanks)).toBe(15);
    });

    it('returns 0 for empty array', () => {
      expect(getTotalFuelTankHP([])).toBe(0);
    });
  });

  // ---------- Fuel Requirement Checks ----------

  describe('hasFuelRequiringPlants', () => {
    it('returns true when at least one plant requires fuel', () => {
      const plants = [
        makeInstalledPlant({ type: makePowerPlantType({ requiresFuel: false }) }),
        makeInstalledPlant({ type: makePowerPlantType({ requiresFuel: true }) }),
      ];
      expect(hasFuelRequiringPlants(plants)).toBe(true);
    });

    it('returns false when no plants require fuel', () => {
      const plants = [makeInstalledPlant({ type: makePowerPlantType({ requiresFuel: false }) })];
      expect(hasFuelRequiringPlants(plants)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasFuelRequiringPlants([])).toBe(false);
    });
  });

  describe('getFuelRequiringInstallations', () => {
    it('filters to only fuel-requiring plants', () => {
      const fuelPlant = makeInstalledPlant({ type: makePowerPlantType({ requiresFuel: true }) });
      const nofuelPlant = makeInstalledPlant({ type: makePowerPlantType({ requiresFuel: false }) });
      const result = getFuelRequiringInstallations([fuelPlant, nofuelPlant]);
      expect(result).toHaveLength(1);
      expect(result[0].type.requiresFuel).toBe(true);
    });
  });

  // ---------- Stats Calculation ----------

  describe('calculatePowerPlantStats', () => {
    it('calculates stats for a power plant installation', () => {
      const plant = makeInstalledPlant({ hullPoints: 10 });
      const stats = calculatePowerPlantStats(plant);

      expect(stats.totalHullPoints).toBe(10);
      expect(stats.powerGenerated).toBe(50); // 5 * 10
      expect(stats.totalCost).toBe(1050000); // 300000 + 75000*10
    });
  });

  describe('calculateTotalPowerPlantStats', () => {
    it('aggregates stats for multiple plants and fuel tanks', () => {
      const plant1 = makeInstalledPlant({ hullPoints: 10 });
      const plant2 = makeInstalledPlant({ hullPoints: 5 });
      const fuelTank = makeInstalledFuelTank({ hullPoints: 3 });

      const result = calculateTotalPowerPlantStats([plant1, plant2], [fuelTank]);

      // Plant 1: HP=10, power=50, cost=1050000
      // Plant 2: HP=5, power=25, cost=675000 (300000+75000*5)
      // Fuel: HP=3, cost = 50000+10000*3+12000*3 = 116000
      expect(result.totalPowerGenerated).toBe(75);
      expect(result.totalHullPoints).toBe(18); // 10+5+3
      expect(result.totalCost).toBe(1841000); // 1050000+675000+116000
    });

    it('returns zeros for empty inputs', () => {
      const result = calculateTotalPowerPlantStats([], []);
      expect(result.totalPowerGenerated).toBe(0);
      expect(result.totalHullPoints).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  // ---------- Validation ----------

  describe('validatePowerPlantInstallation', () => {
    it('passes when HP meets minimum', () => {
      const plant = makePowerPlantType({ minSize: 3 });
      const result = validatePowerPlantInstallation(plant, 5);
      expect(result.valid).toBe(true);
    });

    it('fails when HP below minimum', () => {
      const plant = makePowerPlantType({ minSize: 3 });
      const result = validatePowerPlantInstallation(plant, 2);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('minimum');
    });
  });

  describe('validateFuelTankInstallation', () => {
    it('passes when HP is valid', () => {
      const hull = makeHull({ hullPoints: 100, bonusHullPoints: 10 });
      const result = validateFuelTankInstallation(5, hull, 50);
      expect(result.valid).toBe(true);
    });

    it('fails when not enough hull points available', () => {
      const hull = makeHull({ hullPoints: 100, bonusHullPoints: 10 });
      const result = validateFuelTankInstallation(70, hull, 50);
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePowerPlantDesign', () => {
    it('passes when fuel-requiring plants have fuel tanks', () => {
      const fuelPlant = makePowerPlantType({ id: 'fp', requiresFuel: true });
      const plants = [makeInstalledPlant({ type: fuelPlant })];
      const tanks = [makeInstalledFuelTank({ forPowerPlantType: fuelPlant, hullPoints: 5 })];
      const result = validatePowerPlantDesign(plants, tanks);
      expect(result.valid).toBe(true);
    });

    it('fails when fuel-requiring plant has no fuel tanks', () => {
      const fuelPlant = makePowerPlantType({ id: 'fp', requiresFuel: true });
      const plants = [makeInstalledPlant({ type: fuelPlant })];
      const result = validatePowerPlantDesign(plants, []);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires fuel');
    });

    it('passes when no plants require fuel', () => {
      const noFuelPlant = makePowerPlantType({ requiresFuel: false });
      const plants = [makeInstalledPlant({ type: noFuelPlant })];
      const result = validatePowerPlantDesign(plants, []);
      expect(result.valid).toBe(true);
    });
  });

  // ---------- ID Generation ----------

  describe('generatePowerPlantId', () => {
    it('returns a string starting with pp-', () => {
      expect(generatePowerPlantId()).toMatch(/^pp-/);
    });
  });

  describe('generatePowerPlantFuelTankId', () => {
    it('returns a string starting with ft-', () => {
      expect(generatePowerPlantFuelTankId()).toMatch(/^ft-/);
    });
  });
});
