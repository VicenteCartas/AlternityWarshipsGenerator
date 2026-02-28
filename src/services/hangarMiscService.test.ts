import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HangarMiscSystemType, InstalledHangarMiscSystem } from '../types/hangarMisc';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getHangarMiscSystemsData: vi.fn(),
}));

import {
  getAllHangarMiscSystemTypes,
  generateHangarMiscId,
  calculateHangarMiscHullPoints,
  calculateHangarMiscPower,
  calculateHangarMiscCost,
  calculateHangarMiscCapacity,
  createInstalledHangarMiscSystem,
  updateInstalledHangarMiscSystem,
  calculateHangarMiscStats,
} from './hangarMiscService';

import { getHangarMiscSystemsData } from './dataLoader';

const mockGetHangarMiscSystemsData = vi.mocked(getHangarMiscSystemsData);

// ============== Test Data ==============

const makeHangarType = (overrides?: Partial<HangarMiscSystemType>): HangarMiscSystemType => ({
  id: 'small-hangar',
  name: 'Small Hangar',
  progressLevel: 6,
  techTracks: [],
  category: 'hangar',
  hullPoints: 5,
  powerRequired: 1,
  cost: 2000,
  costPer: 'unit',
  hangarCapacity: 10,
  description: 'A small hangar bay',
  ...overrides,
});

const makeCargoType = (overrides?: Partial<HangarMiscSystemType>): HangarMiscSystemType => ({
  id: 'cargo-bay',
  name: 'Cargo Bay',
  progressLevel: 6,
  techTracks: [],
  category: 'cargo',
  hullPoints: 3,
  powerRequired: 0,
  cost: 500,
  costPer: 'unit',
  cargoCapacity: 50,
  description: 'Standard cargo bay',
  ...overrides,
});

const makeEmergencyType = (overrides?: Partial<HangarMiscSystemType>): HangarMiscSystemType => ({
  id: 'escape-pod',
  name: 'Escape Pod',
  progressLevel: 6,
  techTracks: [],
  category: 'emergency',
  hullPoints: 1,
  powerRequired: 0,
  cost: 300,
  costPer: 'unit',
  evacCapacity: 6,
  description: 'Emergency escape pod',
  ...overrides,
});

const makePercentageType = (overrides?: Partial<HangarMiscSystemType>): HangarMiscSystemType => ({
  id: 'stabilizer',
  name: 'Stabilizer',
  progressLevel: 7,
  techTracks: [],
  category: 'utility',
  hullPoints: 0,
  powerRequired: 2,
  powerPer: 'systemHp',
  cost: 100,
  costPer: 'systemHp',
  hullPercentage: 5,
  description: 'Hull stabilization system',
  ...overrides,
});

const makeExpandableEvacType = (overrides?: Partial<HangarMiscSystemType>): HangarMiscSystemType => ({
  id: 'evac-bay',
  name: 'Evacuation Bay',
  progressLevel: 7,
  techTracks: [],
  category: 'emergency',
  hullPoints: 2,
  powerRequired: 0,
  cost: 1000,
  costPer: 'unit',
  evacCapacity: 10,
  evacCapacityPerHP: 5,
  expandable: true,
  expansionCostPerHp: 200,
  description: 'Expandable evacuation system',
  ...overrides,
});

// ============== Tests ==============

describe('hangarMiscService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllHangarMiscSystemTypes', () => {
    it('returns data from the data loader', () => {
      const types = [makeHangarType(), makeCargoType()];
      mockGetHangarMiscSystemsData.mockReturnValue(types);
      expect(getAllHangarMiscSystemTypes()).toEqual(types);
    });
  });

  describe('generateHangarMiscId', () => {
    it('generates unique IDs with hangmisc prefix', () => {
      const id1 = generateHangarMiscId();
      const id2 = generateHangarMiscId();
      expect(id1).toContain('hangmisc');
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateHangarMiscHullPoints', () => {
    it('calculates fixed HP: hullPoints * quantity', () => {
      const type = makeHangarType({ hullPoints: 5 });
      expect(calculateHangarMiscHullPoints(type, 100, 3)).toBe(15);
    });

    it('adds extra HP for expandable systems', () => {
      const type = makeHangarType({ hullPoints: 5 });
      expect(calculateHangarMiscHullPoints(type, 100, 2, 3)).toBe(13); // 5*2 + 3
    });

    it('uses hull percentage when hullPercentage is set', () => {
      const type = makePercentageType({ hullPercentage: 5 });
      // ceil(100 * 5 / 100) * 2 = 5 * 2 = 10
      expect(calculateHangarMiscHullPoints(type, 100, 2)).toBe(10);
    });

    it('ceiling-rounds hull percentage calculation', () => {
      const type = makePercentageType({ hullPercentage: 5 });
      // ceil(77 * 5 / 100) * 1 = ceil(3.85) * 1 = 4
      expect(calculateHangarMiscHullPoints(type, 77, 1)).toBe(4);
    });
  });

  describe('calculateHangarMiscPower', () => {
    it('calculates per-unit power', () => {
      const type = makeHangarType({ powerRequired: 2 });
      expect(calculateHangarMiscPower(type, 100, 3)).toBe(6);
    });

    it('calculates per-system-HP power', () => {
      const type = makePercentageType({ powerRequired: 2, powerPer: 'systemHp', hullPercentage: 5 });
      // System HP = ceil(100 * 5/100) * 1 = 5
      // Power = 2 * 5 = 10
      expect(calculateHangarMiscPower(type, 100, 1)).toBe(10);
    });
  });

  describe('calculateHangarMiscCost', () => {
    it('calculates per-unit cost', () => {
      const type = makeCargoType({ cost: 500, costPer: 'unit' });
      expect(calculateHangarMiscCost(type, 100, 3)).toBe(1500);
    });

    it('calculates per-system-HP cost with baseCost', () => {
      const type = makePercentageType({ cost: 100, costPer: 'systemHp', baseCost: 500, hullPercentage: 5 });
      // System HP = ceil(100 * 5/100) * 1 = 5
      // Cost = 500 + 100 * 5 = 1000
      expect(calculateHangarMiscCost(type, 100, 1)).toBe(1000);
    });

    it('adds expansion cost for extra HP on expandable systems', () => {
      const type = makeExpandableEvacType({ cost: 1000, costPer: 'unit', expandable: true, expansionCostPerHp: 200 });
      // 1000 * 2 + 3 * 200 = 2600
      expect(calculateHangarMiscCost(type, 100, 2, 3)).toBe(2600);
    });
  });

  describe('calculateHangarMiscCapacity', () => {
    it('returns cargo capacity', () => {
      const type = makeCargoType({ cargoCapacity: 50 });
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(100);
    });

    it('returns evacuation capacity', () => {
      const type = makeEmergencyType({ evacCapacity: 6 });
      expect(calculateHangarMiscCapacity(type, 100, 3)).toBe(18);
    });

    it('returns expandable evac capacity with extra HP', () => {
      const type = makeExpandableEvacType({ evacCapacity: 10, evacCapacityPerHP: 5, expandable: true });
      // base: 10 * 2 = 20, extra: 3 * 5 = 15, total = 35
      expect(calculateHangarMiscCapacity(type, 100, 2, 3)).toBe(35);
    });

    it('returns hangar capacity', () => {
      const type = makeHangarType({ hangarCapacity: 10 });
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(20);
    });

    it('returns dock capacity', () => {
      const type = makeHangarType({ hangarCapacity: undefined, dockCapacity: 25 });
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(50);
    });

    it('returns ordnance capacity', () => {
      const type = makeHangarType({ hangarCapacity: undefined, ordnanceCapacity: 30 });
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(60);
    });

    it('returns prisoners capacity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type = makeHangarType({ hangarCapacity: undefined, prisonersCapacity: 8 } as any);
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(16);
    });

    it('returns scientist capacity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type = makeHangarType({ hangarCapacity: undefined, scientistCapacity: 4 } as any);
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(8);
    });

    it('returns bed capacity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type = makeHangarType({ hangarCapacity: undefined, bedCapacity: 12 } as any);
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(24);
    });

    it('returns 0 for systems without capacity', () => {
      const type = makeHangarType({
        hangarCapacity: undefined,
        cargoCapacity: undefined,
        evacCapacity: undefined,
        dockCapacity: undefined,
        ordnanceCapacity: undefined,
      });
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(0);
    });

    it('returns fuel collection capacity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type = makeHangarType({ hangarCapacity: undefined, fuelCollectionCapacity: 3 } as any);
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(6);
    });

    it('returns power points capacity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type = makeHangarType({ hangarCapacity: undefined, powerPointsCapacity: 15 } as any);
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(30);
    });

    it('returns troop capacity', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type = makeHangarType({ hangarCapacity: undefined, troopCapacity: 5 } as any);
      expect(calculateHangarMiscCapacity(type, 100, 2)).toBe(10);
    });
  });

  describe('createInstalledHangarMiscSystem', () => {
    it('creates an installed system with calculated values', () => {
      const type = makeHangarType({ hullPoints: 5, powerRequired: 1, cost: 2000, hangarCapacity: 10 });
      const result = createInstalledHangarMiscSystem(type, 100, 2);
      expect(result.type).toBe(type);
      expect(result.quantity).toBe(2);
      expect(result.hullPoints).toBe(10);
      expect(result.powerRequired).toBe(2);
      expect(result.cost).toBe(4000);
      expect(result.capacity).toBe(20);
      expect(result.id).toContain('hangmisc');
    });

    it('sets capacity to undefined when 0', () => {
      const type = makeHangarType({ hangarCapacity: undefined, hullPoints: 1, powerRequired: 0, cost: 100 });
      const result = createInstalledHangarMiscSystem(type, 100, 1);
      expect(result.capacity).toBeUndefined();
    });

    it('handles extra HP for expandable systems', () => {
      const type = makeExpandableEvacType({ hullPoints: 2, evacCapacity: 10, evacCapacityPerHP: 5 });
      const result = createInstalledHangarMiscSystem(type, 100, 1, 4);
      expect(result.hullPoints).toBe(6); // 2*1 + 4
      expect(result.capacity).toBe(30); // 10*1 + 4*5
      expect(result.extraHp).toBe(4);
    });

    it('sets extraHp to undefined when 0', () => {
      const type = makeHangarType();
      const result = createInstalledHangarMiscSystem(type, 100, 1, 0);
      expect(result.extraHp).toBeUndefined();
    });

    it('calculates service capacity when type has cargoServiceCapacity', () => {
      const type = makeCargoType({ cargoServiceCapacity: 100 });
      const result = createInstalledHangarMiscSystem(type, 100, 2);
      expect(result.serviceCapacity).toBe(200);
    });
  });

  describe('updateInstalledHangarMiscSystem', () => {
    it('updates quantity and recalculates', () => {
      const type = makeHangarType({ hullPoints: 5, powerRequired: 1, cost: 2000, hangarCapacity: 10 });
      const installed: InstalledHangarMiscSystem = {
        id: 'existing-system',
        type,
        quantity: 1,
        hullPoints: 5,
        powerRequired: 1,
        cost: 2000,
        capacity: 10,
      };
      const result = updateInstalledHangarMiscSystem(installed, 100, 3);
      expect(result.id).toBe('existing-system');
      expect(result.quantity).toBe(3);
      expect(result.hullPoints).toBe(15);
      expect(result.powerRequired).toBe(3);
      expect(result.cost).toBe(6000);
      expect(result.capacity).toBe(30);
    });

    it('updates with extra HP', () => {
      const type = makeExpandableEvacType();
      const installed: InstalledHangarMiscSystem = {
        id: 'existing',
        type,
        quantity: 1,
        hullPoints: 2,
        powerRequired: 0,
        cost: 1000,
        capacity: 10,
      };
      const result = updateInstalledHangarMiscSystem(installed, 100, 1, 5);
      expect(result.hullPoints).toBe(7); // 2*1 + 5
      expect(result.extraHp).toBe(5);
    });
  });

  describe('calculateHangarMiscStats', () => {
    it('returns zeros for empty array', () => {
      const result = calculateHangarMiscStats([]);
      expect(result.totalHullPoints).toBe(0);
      expect(result.totalPowerRequired).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalHangarCapacity).toBe(0);
      expect(result.totalDockingCapacity).toBe(0);
      expect(result.totalCargoCapacity).toBe(0);
      expect(result.totalEvacCapacity).toBe(0);
      expect(result.totalMagazineCapacity).toBe(0);
    });

    it('accumulates hangar capacity', () => {
      const systems: InstalledHangarMiscSystem[] = [
        {
          id: 's1',
          type: makeHangarType({ hangarCapacity: 10 }),
          quantity: 2,
          hullPoints: 10,
          powerRequired: 2,
          cost: 4000,
          capacity: 20,
        },
      ];
      const result = calculateHangarMiscStats(systems);
      expect(result.totalHangarCapacity).toBe(20);
      expect(result.totalHullPoints).toBe(10);
    });

    it('accumulates cargo capacity', () => {
      const systems: InstalledHangarMiscSystem[] = [
        {
          id: 's1',
          type: makeCargoType({ cargoCapacity: 50 }),
          quantity: 3,
          hullPoints: 9,
          powerRequired: 0,
          cost: 1500,
          capacity: 150,
        },
      ];
      const result = calculateHangarMiscStats(systems);
      expect(result.totalCargoCapacity).toBe(150);
    });

    it('accumulates evac capacity', () => {
      const systems: InstalledHangarMiscSystem[] = [
        {
          id: 's1',
          type: makeEmergencyType({ evacCapacity: 6 }),
          quantity: 4,
          hullPoints: 4,
          powerRequired: 0,
          cost: 1200,
          capacity: 24,
        },
      ];
      const result = calculateHangarMiscStats(systems);
      expect(result.totalEvacCapacity).toBe(24);
    });

    it('accumulates magazine capacity', () => {
      const systems: InstalledHangarMiscSystem[] = [
        {
          id: 's1',
          type: makeHangarType({ hangarCapacity: undefined, ordnanceCapacity: 30 }),
          quantity: 2,
          hullPoints: 10,
          powerRequired: 2,
          cost: 4000,
          capacity: 60,
        },
      ];
      const result = calculateHangarMiscStats(systems);
      expect(result.totalMagazineCapacity).toBe(60);
    });

    it('accumulates docking capacity', () => {
      const systems: InstalledHangarMiscSystem[] = [
        {
          id: 's1',
          type: makeHangarType({ hangarCapacity: undefined, dockCapacity: 25 }),
          quantity: 2,
          hullPoints: 10,
          powerRequired: 2,
          cost: 4000,
          capacity: 50,
        },
      ];
      const result = calculateHangarMiscStats(systems);
      expect(result.totalDockingCapacity).toBe(50);
    });

    it('sums totals across multiple systems of different categories', () => {
      const systems: InstalledHangarMiscSystem[] = [
        {
          id: 's1',
          type: makeHangarType({ hangarCapacity: 10 }),
          quantity: 1,
          hullPoints: 5,
          powerRequired: 1,
          cost: 2000,
          capacity: 10,
        },
        {
          id: 's2',
          type: makeCargoType({ cargoCapacity: 50 }),
          quantity: 1,
          hullPoints: 3,
          powerRequired: 0,
          cost: 500,
          capacity: 50,
        },
        {
          id: 's3',
          type: makeEmergencyType({ evacCapacity: 6 }),
          quantity: 2,
          hullPoints: 2,
          powerRequired: 0,
          cost: 600,
          capacity: 12,
        },
      ];
      const result = calculateHangarMiscStats(systems);
      expect(result.totalHullPoints).toBe(10);
      expect(result.totalPowerRequired).toBe(1);
      expect(result.totalCost).toBe(3100);
      expect(result.totalHangarCapacity).toBe(10);
      expect(result.totalCargoCapacity).toBe(50);
      expect(result.totalEvacCapacity).toBe(12);
    });
  });
});
