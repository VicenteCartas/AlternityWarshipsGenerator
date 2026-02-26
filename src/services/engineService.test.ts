import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EngineType, InstalledEngine, InstalledEngineFuelTank, AccelerationRatings } from '../types/engine';
import type { Hull } from '../types/hull';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getEnginesData: vi.fn(),
  getFuelTankData: vi.fn(),
}));

import {
  getAllEngineTypes,
  getEngineTypesForShipClass,
  getEngineTypeById,
  calculateHullPercentage,
  getAccelerationForPercentage,
  calculateEnginePowerRequired,
  calculateEngineCost,
  calculateEngineFuelTankCost,
  calculateEngineFuelTankEndurance,
  getTotalEngineFuelTankHPForEngineType,
  getTotalEngineHPForEngineType,
  getTotalEngineFuelTankHP,
  hasFuelRequiringEngines,
  getFuelRequiringInstallations,
  getUniqueFuelRequiringEngineTypes,
  calculateEngineStats,
  calculateTotalEngineStats,
  validateEngineInstallation,
  validateEngineFuelTankInstallation,
  validateEngineDesign,
  generateEngineId,
  generateEngineFuelTankId,
  getPercentageBrackets,
} from './engineService';
import { getEnginesData, getFuelTankData } from './dataLoader';

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

const ACCELERATION_RATINGS: AccelerationRatings = {
  at5Percent: 1,
  at10Percent: 2,
  at15Percent: 3,
  at20Percent: 4,
  at30Percent: 6,
  at40Percent: 8,
  at50Percent: 10,
};

function makeEngineType(overrides: Partial<EngineType> = {}): EngineType {
  return {
    id: 'fusion-torch',
    name: 'Fusion Torch',
    progressLevel: 6,
    techTracks: [],
    powerPerHullPoint: 2,
    minSize: 5,
    baseCost: 500000,
    costPerHullPoint: 100000,
    accelerationRatings: ACCELERATION_RATINGS,
    usesPL6Scale: false,
    requiresFuel: true,
    fuelEfficiency: 20,
    fuelCostPerHullPoint: 15000,
    description: 'Test engine',
    atmosphereSafe: false,
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

function makeInstalledEngine(overrides: Partial<InstalledEngine> = {}): InstalledEngine {
  return {
    id: 'eng-1',
    type: makeEngineType(),
    hullPoints: 10,
    ...overrides,
  };
}

function makeInstalledFuelTank(overrides: Partial<InstalledEngineFuelTank> = {}): InstalledEngineFuelTank {
  return {
    id: 'eft-1',
    forEngineType: makeEngineType(),
    hullPoints: 5,
    ...overrides,
  };
}

// ============== Setup ==============

const mockGetEnginesData = getEnginesData as ReturnType<typeof vi.fn>;
const mockGetFuelTankData = getFuelTankData as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  const engines = [
    makeEngineType({ id: 'fusion-torch', name: 'Fusion Torch' }),
    makeEngineType({ id: 'induction-engine', name: 'Induction Engine', requiresFuel: false, fuelEfficiency: 0, fuelCostPerHullPoint: 0, progressLevel: 7 }),
    makeEngineType({ id: 'planetary-thruster', name: 'Planetary Thruster', fuelOptional: true }),
  ];
  mockGetEnginesData.mockReturnValue(engines);
  mockGetFuelTankData.mockReturnValue(MOCK_FUEL_TANK);
});

// ============== Tests ==============

describe('engineService', () => {

  // ---------- Getters ----------

  describe('getAllEngineTypes', () => {
    it('returns all engine types from data loader', () => {
      const result = getAllEngineTypes();
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('fusion-torch');
    });
  });

  describe('getEngineTypesForShipClass', () => {
    it('returns all engine types (currently unfiltered)', () => {
      expect(getEngineTypesForShipClass()).toHaveLength(3);
    });
  });

  describe('getEngineTypeById', () => {
    it('returns the matching engine type', () => {
      const result = getEngineTypeById('induction-engine');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Induction Engine');
    });

    it('returns undefined for unknown id', () => {
      expect(getEngineTypeById('nonexistent')).toBeUndefined();
    });
  });

  // ---------- Hull Percentage ----------

  describe('calculateHullPercentage', () => {
    it('calculates percentage based on base hull points (not bonus)', () => {
      const hull = makeHull({ hullPoints: 200 });
      expect(calculateHullPercentage(hull, 20)).toBe(10);
    });

    it('returns 0 for 0 engine HP', () => {
      expect(calculateHullPercentage(makeHull(), 0)).toBe(0);
    });

    it('returns 50 for half hull allocation', () => {
      const hull = makeHull({ hullPoints: 100 });
      expect(calculateHullPercentage(hull, 50)).toBe(50);
    });
  });

  // ---------- Acceleration ----------

  describe('getAccelerationForPercentage', () => {
    const ratings = ACCELERATION_RATINGS;

    it('returns 0 for 0 percentage', () => {
      expect(getAccelerationForPercentage(ratings, 0)).toBe(0);
    });

    it('interpolates below 5% from zero', () => {
      // 2.5% → half of at5Percent (1) = 0.5
      expect(getAccelerationForPercentage(ratings, 2.5)).toBe(0.5);
    });

    it('returns exact value at 5%', () => {
      expect(getAccelerationForPercentage(ratings, 5)).toBe(1);
    });

    it('returns exact value at 10%', () => {
      expect(getAccelerationForPercentage(ratings, 10)).toBe(2);
    });

    it('interpolates between breakpoints', () => {
      // 7.5% → midpoint of 5% (1) and 10% (2) = 1.5
      expect(getAccelerationForPercentage(ratings, 7.5)).toBe(1.5);
    });

    it('returns exact value at 50%', () => {
      expect(getAccelerationForPercentage(ratings, 50)).toBe(10);
    });

    it('caps at 50% value for percentages above 50%', () => {
      expect(getAccelerationForPercentage(ratings, 75)).toBe(10);
      expect(getAccelerationForPercentage(ratings, 100)).toBe(10);
    });

    it('interpolates between 20% and 30% correctly', () => {
      // 25% → midpoint of 20% (4) and 30% (6) = 5
      expect(getAccelerationForPercentage(ratings, 25)).toBe(5);
    });
  });

  // ---------- Power & Cost ----------

  describe('calculateEnginePowerRequired', () => {
    it('calculates power based on powerPerHullPoint', () => {
      const engine = makeEngineType({ powerPerHullPoint: 2 });
      expect(calculateEnginePowerRequired(engine, 10)).toBe(20);
    });

    it('rounds up fractional power', () => {
      const engine = makeEngineType({ powerPerHullPoint: 1.5 });
      expect(calculateEnginePowerRequired(engine, 3)).toBe(5); // 4.5 → 5
    });

    it('returns 0 for zero-power engines', () => {
      const engine = makeEngineType({ powerPerHullPoint: 0 });
      expect(calculateEnginePowerRequired(engine, 20)).toBe(0);
    });
  });

  describe('calculateEngineCost', () => {
    it('calculates base cost plus per-HP cost', () => {
      const engine = makeEngineType({ baseCost: 500000, costPerHullPoint: 100000 });
      // 500000 + 100000 * 10 = 1,500,000
      expect(calculateEngineCost(engine, 10)).toBe(1500000);
    });

    it('returns just base cost for 0 HP', () => {
      const engine = makeEngineType({ baseCost: 500000, costPerHullPoint: 100000 });
      expect(calculateEngineCost(engine, 0)).toBe(500000);
    });
  });

  // ---------- Fuel Tank Calculations ----------

  describe('calculateEngineFuelTankCost', () => {
    it('combines tank cost and fuel cost', () => {
      const engine = makeEngineType({ fuelCostPerHullPoint: 15000 });
      // Tank: baseCost(50000) + costPerHP(10000)*5 = 100000
      // Fuel: 15000 * 5 = 75000
      // Total: 175000
      expect(calculateEngineFuelTankCost(engine, 5)).toBe(175000);
    });

    it('returns just tank base cost for 0 HP', () => {
      const engine = makeEngineType({ fuelCostPerHullPoint: 15000 });
      expect(calculateEngineFuelTankCost(engine, 0)).toBe(50000);
    });
  });

  describe('calculateEngineFuelTankEndurance', () => {
    it('calculates thrust-days based on fuel efficiency', () => {
      // fuelEfficiency=20, fuelHP=10, engineHP=5
      // thrustDaysPerFuelHP = 20/5 = 4
      // endurance = floor(4 * 10) = 40
      const engine = makeEngineType({ fuelEfficiency: 20 });
      expect(calculateEngineFuelTankEndurance(engine, 10, 5)).toBe(40);
    });

    it('returns 0 when engine HP is 0', () => {
      expect(calculateEngineFuelTankEndurance(makeEngineType(), 10, 0)).toBe(0);
    });

    it('floors fractional endurance', () => {
      // fuelEfficiency=20, fuelHP=3, engineHP=7
      // thrustDaysPerFuelHP = 20/7 ≈ 2.857
      // endurance = floor(2.857 * 3) = floor(8.571) = 8
      const engine = makeEngineType({ fuelEfficiency: 20 });
      expect(calculateEngineFuelTankEndurance(engine, 3, 7)).toBe(8);
    });

    it('scales inversely with engine HP (larger engines burn faster)', () => {
      const engine = makeEngineType({ fuelEfficiency: 100 });
      const small = calculateEngineFuelTankEndurance(engine, 10, 1);
      const large = calculateEngineFuelTankEndurance(engine, 10, 10);
      expect(small).toBeGreaterThan(large);
      expect(small).toBe(1000);
      expect(large).toBe(100);
    });
  });

  // ---------- Fuel Tank HP Aggregation ----------

  describe('getTotalEngineFuelTankHPForEngineType', () => {
    it('sums HP for tanks matching a specific engine type', () => {
      const targetEngine = makeEngineType({ id: 'fusion-torch' });
      const otherEngine = makeEngineType({ id: 'other' });
      const tanks: InstalledEngineFuelTank[] = [
        makeInstalledFuelTank({ forEngineType: targetEngine, hullPoints: 5 }),
        makeInstalledFuelTank({ forEngineType: otherEngine, hullPoints: 10 }),
        makeInstalledFuelTank({ forEngineType: targetEngine, hullPoints: 3 }),
      ];
      expect(getTotalEngineFuelTankHPForEngineType(tanks, 'fusion-torch')).toBe(8);
    });

    it('returns 0 if no tanks match', () => {
      expect(getTotalEngineFuelTankHPForEngineType([], 'fusion-torch')).toBe(0);
    });
  });

  describe('getTotalEngineHPForEngineType', () => {
    it('sums HP for engines matching a specific type', () => {
      const engines: InstalledEngine[] = [
        makeInstalledEngine({ type: makeEngineType({ id: 'a' }), hullPoints: 10 }),
        makeInstalledEngine({ type: makeEngineType({ id: 'b' }), hullPoints: 20 }),
        makeInstalledEngine({ type: makeEngineType({ id: 'a' }), hullPoints: 5 }),
      ];
      expect(getTotalEngineHPForEngineType(engines, 'a')).toBe(15);
    });
  });

  describe('getTotalEngineFuelTankHP', () => {
    it('sums HP across all fuel tanks', () => {
      const tanks = [
        makeInstalledFuelTank({ hullPoints: 5 }),
        makeInstalledFuelTank({ hullPoints: 10 }),
      ];
      expect(getTotalEngineFuelTankHP(tanks)).toBe(15);
    });

    it('returns 0 for empty array', () => {
      expect(getTotalEngineFuelTankHP([])).toBe(0);
    });
  });

  // ---------- Fuel Requirement Checks ----------

  describe('hasFuelRequiringEngines', () => {
    it('returns true when at least one engine requires fuel', () => {
      const engines = [
        makeInstalledEngine({ type: makeEngineType({ requiresFuel: false }) }),
        makeInstalledEngine({ type: makeEngineType({ requiresFuel: true }) }),
      ];
      expect(hasFuelRequiringEngines(engines)).toBe(true);
    });

    it('returns false when no engines require fuel', () => {
      const engines = [
        makeInstalledEngine({ type: makeEngineType({ requiresFuel: false }) }),
      ];
      expect(hasFuelRequiringEngines(engines)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasFuelRequiringEngines([])).toBe(false);
    });
  });

  describe('getFuelRequiringInstallations', () => {
    it('filters to only fuel-requiring engines', () => {
      const fuelEngine = makeInstalledEngine({ type: makeEngineType({ requiresFuel: true }) });
      const nofuelEngine = makeInstalledEngine({ type: makeEngineType({ requiresFuel: false }) });
      const result = getFuelRequiringInstallations([fuelEngine, nofuelEngine]);
      expect(result).toHaveLength(1);
      expect(result[0].type.requiresFuel).toBe(true);
    });
  });

  describe('getUniqueFuelRequiringEngineTypes', () => {
    it('returns unique engine types that require fuel', () => {
      const typeA = makeEngineType({ id: 'a', requiresFuel: true });
      const typeB = makeEngineType({ id: 'b', requiresFuel: false });
      const engines = [
        makeInstalledEngine({ type: typeA }),
        makeInstalledEngine({ type: typeA }), // duplicate
        makeInstalledEngine({ type: typeB }),
      ];
      const result = getUniqueFuelRequiringEngineTypes(engines);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('returns empty array when no engines require fuel', () => {
      const noFuel = makeEngineType({ requiresFuel: false });
      expect(getUniqueFuelRequiringEngineTypes([makeInstalledEngine({ type: noFuel })])).toHaveLength(0);
    });
  });

  // ---------- Stats Calculation ----------

  describe('calculateEngineStats', () => {
    it('calculates all stats for an engine installation', () => {
      const hull = makeHull({ hullPoints: 100 });
      const engine = makeInstalledEngine({ hullPoints: 10 });
      const stats = calculateEngineStats(engine, hull);

      expect(stats.totalHullPoints).toBe(10);
      expect(stats.hullPercentage).toBe(10); // 10/100
      expect(stats.acceleration).toBe(2); // at10Percent
      expect(stats.powerRequired).toBe(20); // 2 * 10
      expect(stats.totalCost).toBe(1500000); // 500000 + 100000*10
    });
  });

  describe('calculateTotalEngineStats', () => {
    it('aggregates stats for multiple engines and fuel tanks', () => {
      const hull = makeHull({ hullPoints: 100 });
      const engine1 = makeInstalledEngine({ hullPoints: 10 });
      const engine2 = makeInstalledEngine({ hullPoints: 5 });
      const fuelTank = makeInstalledFuelTank({ hullPoints: 3 });
      const result = calculateTotalEngineStats([engine1, engine2], [fuelTank], hull);

      // Engine 1: HP=10, power=20, cost=1500000, accel=2 (10%)
      // Engine 2: HP=5, power=10, cost=1000000, accel=1 (5%)
      // Fuel: HP=3, cost = 50000+10000*3 + 15000*3 = 125000
      expect(result.totalHullPoints).toBe(18); // 10+5+3
      expect(result.totalPowerRequired).toBe(30); // 20+10
      expect(result.totalAcceleration).toBe(3); // 2+1
      expect(result.totalCost).toBe(2625000); // 1500000+1000000+125000
    });

    it('returns zeros for empty inputs', () => {
      const hull = makeHull();
      const result = calculateTotalEngineStats([], [], hull);
      expect(result.totalHullPoints).toBe(0);
      expect(result.totalPowerRequired).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalAcceleration).toBe(0);
    });
  });

  // ---------- Validation ----------

  describe('validateEngineInstallation', () => {
    it('passes when HP meets minimum size', () => {
      const engine = makeEngineType({ minSize: 5 });
      const result = validateEngineInstallation(engine, 5);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when HP below minimum size', () => {
      const engine = makeEngineType({ minSize: 5 });
      const result = validateEngineInstallation(engine, 3);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('minimum');
    });
  });

  describe('validateEngineFuelTankInstallation', () => {
    it('passes when HP is valid', () => {
      const hull = makeHull({ hullPoints: 100, bonusHullPoints: 10 });
      const result = validateEngineFuelTankInstallation(5, hull, 50);
      expect(result.valid).toBe(true);
    });

    it('fails when not enough hull points available', () => {
      const hull = makeHull({ hullPoints: 100, bonusHullPoints: 10 });
      const result = validateEngineFuelTankInstallation(70, hull, 50);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('hull points');
    });
  });

  describe('validateEngineDesign', () => {
    it('passes when fuel-requiring engines have fuel tanks', () => {
      const fuelEngine = makeEngineType({ id: 'fuel-eng', requiresFuel: true });
      const engines = [makeInstalledEngine({ type: fuelEngine })];
      const tanks = [makeInstalledFuelTank({ forEngineType: fuelEngine, hullPoints: 5 })];
      const result = validateEngineDesign(engines, tanks);
      expect(result.valid).toBe(true);
    });

    it('fails when fuel-requiring engine has no fuel tanks', () => {
      const fuelEngine = makeEngineType({ id: 'fuel-eng', requiresFuel: true });
      const engines = [makeInstalledEngine({ type: fuelEngine })];
      const result = validateEngineDesign(engines, []);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires fuel');
    });

    it('skips fuel-optional engines', () => {
      const optionalEngine = makeEngineType({ id: 'opt', requiresFuel: true, fuelOptional: true });
      const engines = [makeInstalledEngine({ type: optionalEngine })];
      const result = validateEngineDesign(engines, []);
      expect(result.valid).toBe(true);
    });

    it('passes when no engines require fuel', () => {
      const engine = makeEngineType({ requiresFuel: false });
      const engines = [makeInstalledEngine({ type: engine })];
      const result = validateEngineDesign(engines, []);
      expect(result.valid).toBe(true);
    });

    it('reports error for each fuel-requiring type missing tanks', () => {
      const engineA = makeEngineType({ id: 'a', name: 'Engine A', requiresFuel: true });
      const engineB = makeEngineType({ id: 'b', name: 'Engine B', requiresFuel: true });
      const engines = [
        makeInstalledEngine({ type: engineA }),
        makeInstalledEngine({ type: engineB }),
      ];
      const result = validateEngineDesign(engines, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ---------- ID Generation ----------

  describe('generateEngineId', () => {
    it('returns a string starting with eng-', () => {
      expect(generateEngineId()).toMatch(/^eng-/);
    });
  });

  describe('generateEngineFuelTankId', () => {
    it('returns a string starting with eft-', () => {
      expect(generateEngineFuelTankId()).toMatch(/^eft-/);
    });
  });

  // ---------- Percentage Brackets ----------

  describe('getPercentageBrackets', () => {
    it('returns 7 bracket labels', () => {
      const brackets = getPercentageBrackets();
      expect(brackets).toHaveLength(7);
      expect(brackets[0]).toBe('5%');
      expect(brackets[6]).toBe('50%');
    });
  });
});
