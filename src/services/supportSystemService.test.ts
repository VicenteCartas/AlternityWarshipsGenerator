import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  LifeSupportType,
  AccommodationType,
  StoreSystemType,
  GravitySystemType,
  InstalledLifeSupport,
  InstalledAccommodation,
  InstalledStoreSystem,
  InstalledGravitySystem,
} from '../types/supportSystem';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getLifeSupportData: vi.fn(),
  getAccommodationsData: vi.fn(),
  getStoreSystemsData: vi.fn(),
  getGravitySystemsData: vi.fn(),
}));

import {
  getAllLifeSupportTypes,
  getAllAccommodationTypes,
  getAllStoreSystemTypes,
  getAllGravitySystemTypes,
  getLifeSupportTypeById,
  getAccommodationTypeById,
  getStoreSystemTypeById,
  getGravitySystemTypeById,
  generateLifeSupportId,
  generateAccommodationId,
  generateStoreSystemId,
  generateGravitySystemId,
  calculateGravitySystemHullPoints,
  calculateGravitySystemCost,
  calculateSupportSystemsStats,
} from './supportSystemService';

import {
  getLifeSupportData,
  getAccommodationsData,
  getStoreSystemsData,
  getGravitySystemsData,
} from './dataLoader';

const mockGetLifeSupportData = vi.mocked(getLifeSupportData);
const mockGetAccommodationsData = vi.mocked(getAccommodationsData);
const mockGetStoreSystemsData = vi.mocked(getStoreSystemsData);
const mockGetGravitySystemsData = vi.mocked(getGravitySystemsData);

// ============== Test Data ==============

const makeLifeSupport = (overrides?: Partial<LifeSupportType>): LifeSupportType => ({
  id: 'basic-ls',
  name: 'Basic Life Support',
  progressLevel: 6,
  techTracks: [],
  hullPoints: 1,
  powerRequired: 1,
  cost: 1000,
  coveragePerHullPoint: 10,
  description: 'Basic life support system',
  ...overrides,
});

const makeAccommodation = (overrides?: Partial<AccommodationType>): AccommodationType => ({
  id: 'crew-quarters',
  name: 'Crew Quarters',
  progressLevel: 6,
  techTracks: [],
  hullPoints: 1,
  powerRequired: 0,
  cost: 500,
  capacity: 10,
  category: 'crew',
  includesAirlock: false,
  storesDaysPerPerson: 30,
  description: 'Standard crew quarters',
  ...overrides,
});

const makeStoreSystem = (overrides?: Partial<StoreSystemType>): StoreSystemType => ({
  id: 'stores',
  name: 'Standard Stores',
  progressLevel: 6,
  techTracks: [],
  hullPoints: 1,
  powerRequired: 0,
  cost: 200,
  effect: 'adds-stores',
  effectValue: 100,
  description: 'Standard supply stores',
  ...overrides,
});

const makeGravitySystem = (overrides?: Partial<GravitySystemType>): GravitySystemType => ({
  id: 'grav-deck',
  name: 'Gravity Deck',
  progressLevel: 7,
  techTracks: ['G'],
  hullPercentage: 10,
  isFixedSize: false,
  costPerHullPoint: 500,
  powerRequired: 5,
  description: 'Artificial gravity system',
  ...overrides,
});

// ============== Tests ==============

describe('supportSystemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============== Getter Tests ==============

  describe('getAllLifeSupportTypes', () => {
    it('returns data from the data loader', () => {
      const types = [makeLifeSupport()];
      mockGetLifeSupportData.mockReturnValue(types);
      expect(getAllLifeSupportTypes()).toEqual(types);
    });
  });

  describe('getAllAccommodationTypes', () => {
    it('returns data from the data loader', () => {
      const types = [makeAccommodation()];
      mockGetAccommodationsData.mockReturnValue(types);
      expect(getAllAccommodationTypes()).toEqual(types);
    });
  });

  describe('getAllStoreSystemTypes', () => {
    it('returns data from the data loader', () => {
      const types = [makeStoreSystem()];
      mockGetStoreSystemsData.mockReturnValue(types);
      expect(getAllStoreSystemTypes()).toEqual(types);
    });
  });

  describe('getAllGravitySystemTypes', () => {
    it('returns data from the data loader', () => {
      const types = [makeGravitySystem()];
      mockGetGravitySystemsData.mockReturnValue(types);
      expect(getAllGravitySystemTypes()).toEqual(types);
    });
  });

  describe('getLifeSupportTypeById', () => {
    it('finds type by ID', () => {
      mockGetLifeSupportData.mockReturnValue([makeLifeSupport({ id: 'ls-1', name: 'LS One' })]);
      expect(getLifeSupportTypeById('ls-1')?.name).toBe('LS One');
    });

    it('returns undefined for unknown ID', () => {
      mockGetLifeSupportData.mockReturnValue([makeLifeSupport()]);
      expect(getLifeSupportTypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('getAccommodationTypeById', () => {
    it('finds type by ID', () => {
      mockGetAccommodationsData.mockReturnValue([makeAccommodation({ id: 'acc-1', name: 'Acc One' })]);
      expect(getAccommodationTypeById('acc-1')?.name).toBe('Acc One');
    });

    it('returns undefined for unknown ID', () => {
      mockGetAccommodationsData.mockReturnValue([]);
      expect(getAccommodationTypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('getStoreSystemTypeById', () => {
    it('finds type by ID', () => {
      mockGetStoreSystemsData.mockReturnValue([makeStoreSystem({ id: 'st-1', name: 'Store One' })]);
      expect(getStoreSystemTypeById('st-1')?.name).toBe('Store One');
    });
  });

  describe('getGravitySystemTypeById', () => {
    it('finds type by ID', () => {
      mockGetGravitySystemsData.mockReturnValue([makeGravitySystem({ id: 'grav-1', name: 'Grav One' })]);
      expect(getGravitySystemTypeById('grav-1')?.name).toBe('Grav One');
    });
  });

  // ============== ID Generation ==============

  describe('ID generation', () => {
    it('generates unique life support IDs', () => {
      const id1 = generateLifeSupportId();
      const id2 = generateLifeSupportId();
      expect(id1).toContain('ls');
      expect(id1).not.toBe(id2);
    });

    it('generates unique accommodation IDs', () => {
      const id1 = generateAccommodationId();
      const id2 = generateAccommodationId();
      expect(id1).toContain('acc');
      expect(id1).not.toBe(id2);
    });

    it('generates unique store system IDs', () => {
      const id1 = generateStoreSystemId();
      const id2 = generateStoreSystemId();
      expect(id1).toContain('store');
      expect(id1).not.toBe(id2);
    });

    it('generates unique gravity system IDs', () => {
      const id1 = generateGravitySystemId();
      const id2 = generateGravitySystemId();
      expect(id1).toContain('grav');
      expect(id1).not.toBe(id2);
    });
  });

  // ============== Gravity Calculations ==============

  describe('calculateGravitySystemHullPoints', () => {
    it('calculates HP from hull percentage', () => {
      const grav = makeGravitySystem({ hullPercentage: 10 });
      // 10% of 100 = 10
      expect(calculateGravitySystemHullPoints(grav, 100)).toBe(10);
    });

    it('ceiling-rounds the result', () => {
      const grav = makeGravitySystem({ hullPercentage: 10 });
      // 10% of 77 = 7.7, ceil = 8
      expect(calculateGravitySystemHullPoints(grav, 77)).toBe(8);
    });
  });

  describe('calculateGravitySystemCost', () => {
    it('multiplies HP by cost per hull point', () => {
      const grav = makeGravitySystem({ costPerHullPoint: 500 });
      expect(calculateGravitySystemCost(grav, 10)).toBe(5000);
    });
  });

  // ============== Stats Calculation ==============

  describe('calculateSupportSystemsStats', () => {
    it('returns zeros for all empty arrays', () => {
      const result = calculateSupportSystemsStats([], [], [], [], 7, []);
      expect(result.totalHullPoints).toBe(0);
      expect(result.totalPowerRequired).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalCoverage).toBe(0);
      expect(result.crewCapacity).toBe(0);
      expect(result.passengerCapacity).toBe(0);
      expect(result.troopCapacity).toBe(0);
      expect(result.suspendedCapacity).toBe(0);
    });

    it('accumulates life support stats', () => {
      const ls: InstalledLifeSupport[] = [
        { id: 'ls1', type: makeLifeSupport({ hullPoints: 2, powerRequired: 3, cost: 1000, coveragePerHullPoint: 10 }), quantity: 3 },
      ];
      const result = calculateSupportSystemsStats(ls, [], [], [], 7, []);
      expect(result.lifeSupportHP).toBe(6);
      expect(result.lifeSupportPower).toBe(9);
      expect(result.lifeSupportCost).toBe(3000);
      expect(result.totalCoverage).toBe(30);
    });

    it('accumulates life support with extra HP', () => {
      const type = makeLifeSupport({ hullPoints: 1, cost: 1000, expandable: true, expansionCostPerHp: 200, expansionValuePerHp: 5 });
      const ls: InstalledLifeSupport[] = [
        { id: 'ls1', type, quantity: 1, extraHp: 3 },
      ];
      const result = calculateSupportSystemsStats(ls, [], [], [], 7, []);
      expect(result.lifeSupportHP).toBe(4); // 1*1 + 3
      expect(result.lifeSupportCost).toBe(1600); // 1000*1 + 3*200
      expect(result.totalCoverage).toBe(25); // 10*1 + 3*5
    });

    it('accumulates crew accommodation stats', () => {
      const acc: InstalledAccommodation[] = [
        {
          id: 'acc1',
          type: makeAccommodation({
            hullPoints: 2, powerRequired: 1, cost: 500,
            capacity: 10, category: 'crew', storesDaysPerPerson: 30,
            includesAirlock: true,
          }),
          quantity: 2,
        },
      ];
      const result = calculateSupportSystemsStats([], acc, [], [], 7, []);
      expect(result.accommodationsHP).toBe(4);
      expect(result.accommodationsPower).toBe(2);
      expect(result.accommodationsCost).toBe(1000);
      expect(result.crewCapacity).toBe(20);
      expect(result.freeAirlocks).toBe(2);
      expect(result.baseStoreDays).toBe(600); // 20 * 30
    });

    it('accumulates passenger and troop capacities', () => {
      const acc: InstalledAccommodation[] = [
        {
          id: 'acc1',
          type: makeAccommodation({ capacity: 5, category: 'passenger', storesDaysPerPerson: 10 }),
          quantity: 2,
        },
        {
          id: 'acc2',
          type: makeAccommodation({ id: 'troop-q', capacity: 8, category: 'troop', storesDaysPerPerson: 15 }),
          quantity: 1,
        },
        {
          id: 'acc3',
          type: makeAccommodation({ id: 'cryo', capacity: 20, category: 'suspended', storesDaysPerPerson: 0 }),
          quantity: 1,
        },
      ];
      const result = calculateSupportSystemsStats([], acc, [], [], 7, []);
      expect(result.passengerCapacity).toBe(10);
      expect(result.troopCapacity).toBe(8);
      expect(result.suspendedCapacity).toBe(20);
      expect(result.totalCapacity).toBe(38); // 10 + 8 + 20
      // base store days: passengers 10*10=100, troops 8*15=120, suspended gets 0
      expect(result.baseStoreDays).toBe(220);
    });

    it('accumulates store system effects (adds-stores)', () => {
      const stores: InstalledStoreSystem[] = [
        { id: 'st1', type: makeStoreSystem({ effect: 'adds-stores', effectValue: 100 }), quantity: 2 },
      ];
      const result = calculateSupportSystemsStats([], [], stores, [], 7, []);
      expect(result.additionalStoresDays).toBe(200);
    });

    it('accumulates store system effects (feeds)', () => {
      const stores: InstalledStoreSystem[] = [
        { id: 'st1', type: makeStoreSystem({ effect: 'feeds', effectValue: 10 }), quantity: 2 },
      ];
      const result = calculateSupportSystemsStats([], [], stores, [], 7, []);
      expect(result.peopleFed).toBe(20);
      // 20 people fed, but they count as 2 for stores
      // Reduction: 20 - (20 / 10) = 20 - 2 = 18
      expect(result.feedsReduction).toBe(18);
    });

    it('accumulates store system effects (reduces-consumption)', () => {
      const stores: InstalledStoreSystem[] = [
        {
          id: 'st1',
          type: makeStoreSystem({ effect: 'reduces-consumption', effectValue: 10, affectedPeople: 20 }),
          quantity: 2,
        },
      ];
      const result = calculateSupportSystemsStats([], [], stores, [], 7, []);
      // 20 affected * 2 = 40 people
      expect(result.recyclingCapacity).toBe(40);
      // 40 * (1 - 10/100) = 40 * 0.9 = 36
      expect(result.recyclingReduction).toBe(36);
    });

    it('accumulates gravity system stats', () => {
      const grav: InstalledGravitySystem[] = [
        {
          id: 'grav1',
          type: makeGravitySystem({ powerRequired: 5 }),
          hullPoints: 10,
          cost: 5000,
        },
      ];
      const result = calculateSupportSystemsStats([], [], [], grav, 7, []);
      expect(result.gravitySystemsHP).toBe(10);
      expect(result.gravitySystemsPower).toBe(5);
      expect(result.gravitySystemsCost).toBe(5000);
      expect(result.hasGravitySystemInstalled).toBe(true);
    });

    it('hasGravitySystemInstalled is false when no gravity systems', () => {
      const result = calculateSupportSystemsStats([], [], [], [], 7, []);
      expect(result.hasGravitySystemInstalled).toBe(false);
    });

    it('hasArtificialGravity true at PL6 with G-tech', () => {
      const result = calculateSupportSystemsStats([], [], [], [], 6, ['G']);
      expect(result.hasArtificialGravity).toBe(true);
    });

    it('hasArtificialGravity true at PL8 with X-tech', () => {
      const result = calculateSupportSystemsStats([], [], [], [], 8, ['X']);
      expect(result.hasArtificialGravity).toBe(true);
    });

    it('hasArtificialGravity true when no tech restrictions', () => {
      const result = calculateSupportSystemsStats([], [], [], [], 6, []);
      expect(result.hasArtificialGravity).toBe(true);
    });

    it('hasArtificialGravity false at PL6 without G or X tech', () => {
      const result = calculateSupportSystemsStats([], [], [], [], 6, ['D', 'A']);
      expect(result.hasArtificialGravity).toBe(false);
    });

    it('sums totals across all subsystem categories', () => {
      const ls: InstalledLifeSupport[] = [
        { id: 'ls1', type: makeLifeSupport({ hullPoints: 1, powerRequired: 1, cost: 100 }), quantity: 1 },
      ];
      const acc: InstalledAccommodation[] = [
        { id: 'acc1', type: makeAccommodation({ hullPoints: 2, powerRequired: 2, cost: 200 }), quantity: 1 },
      ];
      const stores: InstalledStoreSystem[] = [
        { id: 'st1', type: makeStoreSystem({ hullPoints: 3, powerRequired: 0, cost: 300, effect: 'adds-stores', effectValue: 50 }), quantity: 1 },
      ];
      const grav: InstalledGravitySystem[] = [
        { id: 'grav1', type: makeGravitySystem({ powerRequired: 4 }), hullPoints: 5, cost: 400 },
      ];
      const result = calculateSupportSystemsStats(ls, acc, stores, grav, 7, []);
      expect(result.totalHullPoints).toBe(11); // 1 + 2 + 3 + 5
      expect(result.totalPowerRequired).toBe(7); // 1 + 2 + 0 + 4
      expect(result.totalCost).toBe(1000); // 100 + 200 + 300 + 400
    });
  });
});
