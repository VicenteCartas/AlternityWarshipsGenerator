import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  LaunchSystem,
  PropulsionSystem,
  Warhead,
  GuidanceSystem,
  InstalledLaunchSystem,
  OrdnanceDesign,
  MissileDesign,
  BombDesign,
  MineDesign,
} from '../types/ordnance';

// Mock dataLoader
vi.mock('./dataLoader', () => ({
  getLaunchSystemsData: vi.fn(),
  getPropulsionSystemsData: vi.fn(),
  getWarheadsData: vi.fn(),
  getGuidanceSystemsData: vi.fn(),
}));

// Mock utilities — keep filterByDesignConstraints as passthrough, mock generateId
vi.mock('./utilities', () => ({
  filterByDesignConstraints: vi.fn(
    (items: unknown[]) => items // passthrough by default
  ),
  generateId: vi.fn((prefix: string) => `${prefix}-mock-id`),
}));

import {
  getLaunchSystems,
  getPropulsionSystems,
  getWarheads,
  getGuidanceSystems,
  findPropulsionByCategory,
  filterLaunchSystemsByConstraints,
  filterPropulsionByConstraints,
  filterWarheadsByConstraints,
  filterGuidanceByConstraints,
  calculateMissileDesign,
  calculateBombDesign,
  calculateMineDesign,
  calculateLaunchSystemStats,
  getUsedCapacity,
  getRemainingCapacity,
  calculateOrdnanceStats,
  generateOrdnanceDesignId,
  generateLaunchSystemId,
  createMissileDesign,
  createBombDesign,
  createMineDesign,
  createOrdnanceDesign,
  createInstalledLaunchSystem,
  canLoadOrdnance,
  addOrdnanceToLoadout,
  removeOrdnanceFromLoadout,
  getDesignById,
  getDesignDisplayName,
  getDesignSummary,
} from './ordnanceService';
import {
  getLaunchSystemsData,
  getPropulsionSystemsData,
  getWarheadsData,
  getGuidanceSystemsData,
} from './dataLoader';
import { filterByDesignConstraints } from './utilities';

// ============== Factories ==============

function makeLaunchSystem(overrides: Partial<LaunchSystem> = {}): LaunchSystem {
  return {
    id: 'missile-rack',
    name: 'Missile Rack',
    progressLevel: 6,
    techTracks: [],
    hullPoints: 2,
    powerRequired: 1,
    cost: 5000,
    capacity: 4,
    rateOfFire: 1,
    spaceReload: false,
    ordnanceTypes: ['missile'],
    description: 'Test',
    expandable: false,
    ...overrides,
  };
}

function makePropulsion(overrides: Partial<PropulsionSystem> = {}): PropulsionSystem {
  return {
    id: 'chemical-light',
    name: 'Chemical Rocket (Light)',
    progressLevel: 6,
    techTracks: [],
    applicableTo: ['missile'],
    size: 1,
    maxWarheadSize: 1,
    cost: 100,
    accuracyModifier: 0,
    endurance: 4,
    acceleration: 10,
    description: 'Test',
    ...overrides,
  };
}

function makeWarhead(overrides: Partial<Warhead> = {}): Warhead {
  return {
    id: 'he-light',
    name: 'HE (Light)',
    progressLevel: 6,
    techTracks: [],
    size: 1,
    cost: 200,
    accuracyModifier: 0,
    damageType: 'HI',
    firepower: 'Light',
    damage: 'd6+2w/d6+4w/d6m',
    description: 'Test',
    ...overrides,
  };
}

function makeGuidance(overrides: Partial<GuidanceSystem> = {}): GuidanceSystem {
  return {
    id: 'radar-homing',
    name: 'Radar Homing',
    progressLevel: 6,
    techTracks: [],
    cost: 150,
    accuracyModifier: 1,
    applicableTo: ['missile'],
    description: 'Test',
    ...overrides,
  };
}

function makeInstalledLaunchSystem(overrides: Partial<InstalledLaunchSystem> = {}): InstalledLaunchSystem {
  return {
    id: 'ls-1',
    launchSystemType: 'missile-rack',
    quantity: 1,
    extraHp: 0,
    loadout: [],
    hullPoints: 2,
    powerRequired: 1,
    cost: 5000,
    totalCapacity: 4,
    ...overrides,
  };
}

function makeMissileDesign(overrides: Partial<MissileDesign> = {}): MissileDesign {
  return {
    id: 'design-1',
    name: 'Test Missile',
    category: 'missile',
    size: 'light',
    propulsionId: 'chemical-light',
    guidanceId: 'radar-homing',
    warheadId: 'he-light',
    totalAccuracy: 1,
    totalCost: 450,
    capacityRequired: 1,
    ...overrides,
  };
}

function makeBombDesign(overrides: Partial<BombDesign> = {}): BombDesign {
  return {
    id: 'bomb-1',
    name: 'Test Bomb',
    category: 'bomb',
    size: 'light',
    warheadId: 'he-light',
    totalAccuracy: 0,
    totalCost: 250,
    capacityRequired: 1,
    ...overrides,
  };
}

function makeMineDesign(overrides: Partial<MineDesign> = {}): MineDesign {
  return {
    id: 'mine-1',
    name: 'Test Mine',
    category: 'mine',
    size: 'light',
    guidanceId: 'proximity',
    warheadId: 'he-light',
    totalAccuracy: 1,
    totalCost: 400,
    capacityRequired: 1,
    ...overrides,
  };
}

// ============== Setup ==============

const mockGetLaunchSystems = getLaunchSystemsData as ReturnType<typeof vi.fn>;
const mockGetPropulsion = getPropulsionSystemsData as ReturnType<typeof vi.fn>;
const mockGetWarheads = getWarheadsData as ReturnType<typeof vi.fn>;
const mockGetGuidance = getGuidanceSystemsData as ReturnType<typeof vi.fn>;

const defaultLaunchSystems = [
  makeLaunchSystem(),
  makeLaunchSystem({
    id: 'bomb-rack',
    name: 'Bomb Rack',
    hullPoints: 1,
    powerRequired: 0,
    cost: 2000,
    capacity: 6,
    ordnanceTypes: ['bomb'],
    expandable: true,
    expansionValuePerHp: 3,
    expansionCostPerHp: 1000,
  }),
  makeLaunchSystem({
    id: 'minelayer',
    name: 'Minelayer',
    hullPoints: 3,
    powerRequired: 1,
    cost: 8000,
    capacity: 8,
    ordnanceTypes: ['mine'],
  }),
];

const defaultPropulsion = [
  makePropulsion(),
  makePropulsion({
    id: 'chemical-medium',
    name: 'Chemical Rocket (Medium)',
    size: 2,
    maxWarheadSize: 2,
    cost: 300,
    accuracyModifier: 0,
  }),
  makePropulsion({
    id: 'bomb-casing-light',
    name: 'Bomb Casing (Light)',
    applicableTo: ['bomb'],
    size: 1,
    maxWarheadSize: 1,
    cost: 50,
    accuracyModifier: 0,
    endurance: null,
    acceleration: null,
  }),
  makePropulsion({
    id: 'mine-housing-light',
    name: 'Mine Housing (Light)',
    applicableTo: ['mine'],
    size: 1,
    maxWarheadSize: 1,
    cost: 50,
    accuracyModifier: 0,
    endurance: null,
    acceleration: null,
  }),
];

const defaultWarheads = [
  makeWarhead(),
  makeWarhead({ id: 'he-medium', name: 'HE (Medium)', size: 2, cost: 500, accuracyModifier: 0 }),
];

const defaultGuidance = [
  makeGuidance(),
  makeGuidance({
    id: 'proximity',
    name: 'Proximity',
    cost: 100,
    accuracyModifier: -1,
    applicableTo: ['missile', 'mine'],
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLaunchSystems.mockReturnValue(defaultLaunchSystems);
  mockGetPropulsion.mockReturnValue(defaultPropulsion);
  mockGetWarheads.mockReturnValue(defaultWarheads);
  mockGetGuidance.mockReturnValue(defaultGuidance);
  (filterByDesignConstraints as ReturnType<typeof vi.fn>).mockImplementation(
    (items: unknown[]) => items
  );
});

// ============== Tests ==============

describe('ordnanceService', () => {

  // ---------- Data Getters ----------

  describe('data getters', () => {
    it('getLaunchSystems returns data from dataLoader', () => {
      expect(getLaunchSystems()).toEqual(defaultLaunchSystems);
    });

    it('getPropulsionSystems returns data from dataLoader', () => {
      expect(getPropulsionSystems()).toEqual(defaultPropulsion);
    });

    it('getWarheads returns data from dataLoader', () => {
      expect(getWarheads()).toEqual(defaultWarheads);
    });

    it('getGuidanceSystems returns data from dataLoader', () => {
      expect(getGuidanceSystems()).toEqual(defaultGuidance);
    });
  });

  // ---------- findPropulsionByCategory ----------

  describe('findPropulsionByCategory', () => {
    it('finds bomb casing for bomb + light', () => {
      const result = findPropulsionByCategory('bomb', 'light');
      expect(result?.id).toBe('bomb-casing-light');
    });

    it('finds mine housing for mine + light', () => {
      const result = findPropulsionByCategory('mine', 'light');
      expect(result?.id).toBe('mine-housing-light');
    });

    it('returns undefined when no match', () => {
      expect(findPropulsionByCategory('bomb', 'heavy')).toBeUndefined();
    });
  });

  // ---------- Filtering ----------

  describe('filter functions', () => {
    it('filterLaunchSystemsByConstraints passes through to filterByDesignConstraints', () => {
      const result = filterLaunchSystemsByConstraints(defaultLaunchSystems, 7, ['G']);
      expect(filterByDesignConstraints).toHaveBeenCalledWith(defaultLaunchSystems, 7, ['G']);
      expect(result).toEqual(defaultLaunchSystems);
    });

    it('filterPropulsionByConstraints filters by category after constraint filter', () => {
      const result = filterPropulsionByConstraints(defaultPropulsion, 7, [], 'bomb');
      expect(result.every(p => p.applicableTo.includes('bomb'))).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('filterWarheadsByConstraints filters by maxWarheadSize', () => {
      const result = filterWarheadsByConstraints(defaultWarheads, 9, [], 1);
      expect(result.every(w => w.size <= 1)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('filterGuidanceByConstraints filters by category', () => {
      const result = filterGuidanceByConstraints(defaultGuidance, 9, [], 'mine');
      // Only proximity applies to mines
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('proximity');
    });
  });

  // ---------- Design Calculations ----------

  describe('calculateMissileDesign', () => {
    it('sums accuracy and cost from all three components', () => {
      const prop = makePropulsion({ accuracyModifier: 0, cost: 100 });
      const guid = makeGuidance({ accuracyModifier: 1, cost: 150 });
      const warh = makeWarhead({ accuracyModifier: -1, cost: 200 });

      const result = calculateMissileDesign(prop, guid, warh);
      expect(result.totalAccuracy).toBe(0); // 0 + 1 + (-1)
      expect(result.totalCost).toBe(450); // 100 + 150 + 200
      expect(result.capacityRequired).toBe(prop.size);
    });
  });

  describe('calculateBombDesign', () => {
    it('sums only propulsion + warhead (no guidance)', () => {
      const prop = makePropulsion({ accuracyModifier: 0, cost: 50 });
      const warh = makeWarhead({ accuracyModifier: 0, cost: 200 });

      const result = calculateBombDesign(prop, warh);
      expect(result.totalAccuracy).toBe(0);
      expect(result.totalCost).toBe(250);
      expect(result.capacityRequired).toBe(prop.size);
    });
  });

  describe('calculateMineDesign', () => {
    it('sums propulsion + guidance + warhead', () => {
      const prop = makePropulsion({ accuracyModifier: 0, cost: 50 });
      const guid = makeGuidance({ accuracyModifier: -1, cost: 100 });
      const warh = makeWarhead({ accuracyModifier: 0, cost: 200 });

      const result = calculateMineDesign(prop, guid, warh);
      expect(result.totalAccuracy).toBe(-1);
      expect(result.totalCost).toBe(350);
    });
  });

  // ---------- Launch System Stats ----------

  describe('calculateLaunchSystemStats', () => {
    it('multiplies by quantity', () => {
      const ls = makeLaunchSystem({ hullPoints: 2, powerRequired: 1, cost: 5000, capacity: 4 });
      const result = calculateLaunchSystemStats(ls, 3, 0);
      expect(result.hullPoints).toBe(6);
      expect(result.powerRequired).toBe(3);
      expect(result.cost).toBe(15000);
      expect(result.totalCapacity).toBe(12);
    });

    it('adds expansion HP for expandable systems', () => {
      const ls = makeLaunchSystem({
        hullPoints: 1,
        cost: 2000,
        capacity: 6,
        expandable: true,
        expansionValuePerHp: 3,
        expansionCostPerHp: 1000,
      });
      const result = calculateLaunchSystemStats(ls, 1, 2);
      expect(result.hullPoints).toBe(3); // 1 base + 2 extra
      expect(result.totalCapacity).toBe(12); // 6 base + 2*3 expansion
      expect(result.cost).toBe(4000); // 2000 base + 2*1000 expansion
    });

    it('ignores extraHp for non-expandable systems', () => {
      const ls = makeLaunchSystem({ expandable: false, hullPoints: 2, capacity: 4, cost: 5000 });
      const result = calculateLaunchSystemStats(ls, 1, 5);
      expect(result.hullPoints).toBe(2);
      expect(result.totalCapacity).toBe(4);
      expect(result.cost).toBe(5000);
    });
  });

  // ---------- Capacity Functions ----------

  describe('getUsedCapacity', () => {
    it('sums capacity of loaded designs', () => {
      const designs: OrdnanceDesign[] = [
        makeMissileDesign({ id: 'd1', capacityRequired: 1 }),
        makeMissileDesign({ id: 'd2', capacityRequired: 2 }),
      ];
      const loadout = [
        { designId: 'd1', quantity: 3 },
        { designId: 'd2', quantity: 1 },
      ];
      expect(getUsedCapacity(loadout, designs)).toBe(5); // 1*3 + 2*1
    });

    it('ignores unknown design IDs', () => {
      const loadout = [{ designId: 'nonexistent', quantity: 5 }];
      expect(getUsedCapacity(loadout, [])).toBe(0);
    });
  });

  describe('getRemainingCapacity', () => {
    it('returns total minus used', () => {
      const designs: OrdnanceDesign[] = [makeMissileDesign({ id: 'd1', capacityRequired: 1 })];
      const loadout = [{ designId: 'd1', quantity: 2 }];
      expect(getRemainingCapacity(10, loadout, designs)).toBe(8);
    });

    it('can go negative', () => {
      const designs: OrdnanceDesign[] = [makeMissileDesign({ id: 'd1', capacityRequired: 5 })];
      const loadout = [{ designId: 'd1', quantity: 3 }];
      expect(getRemainingCapacity(10, loadout, designs)).toBe(-5);
    });
  });

  // ---------- Ordnance Stats ----------

  describe('calculateOrdnanceStats', () => {
    it('aggregates launcher and ordnance costs', () => {
      const installed = [
        makeInstalledLaunchSystem({
          launchSystemType: 'missile-rack',
          quantity: 2,
          extraHp: 0,
          loadout: [{ designId: 'design-1', quantity: 3 }],
        }),
      ];
      const designs: OrdnanceDesign[] = [makeMissileDesign({ id: 'design-1', totalCost: 450 })];

      const stats = calculateOrdnanceStats(installed, designs);
      // 2 racks × 2 HP each = 4 HP
      expect(stats.totalLauncherHullPoints).toBe(4);
      // 2 racks × 1 power = 2
      expect(stats.totalLauncherPower).toBe(2);
      // 2 racks × 5000 cost = 10000
      expect(stats.totalLauncherCost).toBe(10000);
      // 3 missiles × 450 = 1350
      expect(stats.totalOrdnanceCost).toBe(1350);
      expect(stats.totalCost).toBe(11350);
      expect(stats.launchSystemCount).toBe(2);
      expect(stats.missileDesignCount).toBe(1);
    });

    it('counts designs by category', () => {
      const designs: OrdnanceDesign[] = [
        makeMissileDesign({ id: 'm1' }),
        makeMissileDesign({ id: 'm2' }),
        makeBombDesign({ id: 'b1' }),
        makeMineDesign({ id: 'mn1' }),
      ];
      const stats = calculateOrdnanceStats([], designs);
      expect(stats.missileDesignCount).toBe(2);
      expect(stats.bombDesignCount).toBe(1);
      expect(stats.mineDesignCount).toBe(1);
    });

    it('skips unknown launch system types', () => {
      const installed = [
        makeInstalledLaunchSystem({ launchSystemType: 'nonexistent' as never }),
      ];
      const stats = calculateOrdnanceStats(installed, []);
      expect(stats.totalLauncherHullPoints).toBe(0);
    });
  });

  // ---------- ID Generation ----------

  describe('ID generation', () => {
    it('generateOrdnanceDesignId uses ordnance-design prefix', () => {
      expect(generateOrdnanceDesignId()).toBe('ordnance-design-mock-id');
    });

    it('generateLaunchSystemId uses launch-system prefix', () => {
      expect(generateLaunchSystemId()).toBe('launch-system-mock-id');
    });
  });

  // ---------- Design Creation ----------

  describe('createMissileDesign', () => {
    it('creates a missile design with calculated values', () => {
      const result = createMissileDesign('Alpha Strike', 'light', 'chemical-light', 'radar-homing', 'he-light');
      expect(result).not.toBeNull();
      expect(result!.category).toBe('missile');
      expect(result!.name).toBe('Alpha Strike');
      expect(result!.propulsionId).toBe('chemical-light');
      expect(result!.guidanceId).toBe('radar-homing');
      expect(result!.warheadId).toBe('he-light');
      // accuracy: 0(prop) + 1(guid) + 0(warh) = 1
      expect(result!.totalAccuracy).toBe(1);
      // cost: 100 + 150 + 200 = 450
      expect(result!.totalCost).toBe(450);
      expect(result!.capacityRequired).toBe(1);
    });

    it('returns null if propulsion not found', () => {
      expect(createMissileDesign('X', 'light', 'nonexistent', 'radar-homing', 'he-light')).toBeNull();
    });

    it('returns null if guidance not found', () => {
      expect(createMissileDesign('X', 'light', 'chemical-light', 'nonexistent', 'he-light')).toBeNull();
    });

    it('returns null if warhead not found', () => {
      expect(createMissileDesign('X', 'light', 'chemical-light', 'radar-homing', 'nonexistent')).toBeNull();
    });
  });

  describe('createBombDesign', () => {
    it('creates a bomb using auto-found propulsion', () => {
      const result = createBombDesign('Dumb Bomb', 'light', 'he-light');
      expect(result).not.toBeNull();
      expect(result!.category).toBe('bomb');
      expect(result!.warheadId).toBe('he-light');
      // bomb casing cost 50 + warhead cost 200 = 250
      expect(result!.totalCost).toBe(250);
    });

    it('returns null if no bomb propulsion for size', () => {
      // No heavy bomb casing in our mock data
      expect(createBombDesign('X', 'heavy', 'he-light')).toBeNull();
    });
  });

  describe('createMineDesign', () => {
    it('creates a mine using auto-found propulsion', () => {
      const result = createMineDesign('Proximity Mine', 'light', 'proximity', 'he-light');
      expect(result).not.toBeNull();
      expect(result!.category).toBe('mine');
      expect(result!.guidanceId).toBe('proximity');
      // mine housing 50 + proximity guidance 100 + warhead 200 = 350
      expect(result!.totalCost).toBe(350);
      // proximity accuracy -1 + others 0 = -1
      expect(result!.totalAccuracy).toBe(-1);
    });

    it('returns null if guidance not found', () => {
      expect(createMineDesign('X', 'light', 'nonexistent', 'he-light')).toBeNull();
    });
  });

  // ---------- createOrdnanceDesign (unified factory) ----------

  describe('createOrdnanceDesign', () => {
    it('creates a missile design via factory', () => {
      const result = createOrdnanceDesign('missile', 'Factory Missile', 'light', {
        propulsionId: 'chemical-light', guidanceId: 'radar-homing', warheadId: 'he-light',
      });
      expect(result).not.toBeNull();
      expect(result!.category).toBe('missile');
      expect(result!.name).toBe('Factory Missile');
      expect((result as any).propulsionId).toBe('chemical-light');
      expect((result as any).guidanceId).toBe('radar-homing');
      expect(result!.warheadId).toBe('he-light');
      expect(result!.totalAccuracy).toBe(1);
      expect(result!.totalCost).toBe(450);
    });

    it('creates a bomb design via factory', () => {
      const result = createOrdnanceDesign('bomb', 'Factory Bomb', 'light', { warheadId: 'he-light' });
      expect(result).not.toBeNull();
      expect(result!.category).toBe('bomb');
      expect(result!.totalCost).toBe(250);
    });

    it('creates a mine design via factory', () => {
      const result = createOrdnanceDesign('mine', 'Factory Mine', 'light', {
        guidanceId: 'proximity', warheadId: 'he-light',
      });
      expect(result).not.toBeNull();
      expect(result!.category).toBe('mine');
      expect(result!.totalAccuracy).toBe(-1);
      expect(result!.totalCost).toBe(350);
    });

    it('returns null for missing propulsion on missile', () => {
      expect(createOrdnanceDesign('missile', 'X', 'light', {
        propulsionId: 'nonexistent', guidanceId: 'radar-homing', warheadId: 'he-light',
      })).toBeNull();
    });

    it('returns null for missing warhead', () => {
      expect(createOrdnanceDesign('bomb', 'X', 'light', { warheadId: 'nonexistent' })).toBeNull();
    });

    it('returns null for missing guidance on mine', () => {
      expect(createOrdnanceDesign('mine', 'X', 'light', {
        guidanceId: 'nonexistent', warheadId: 'he-light',
      })).toBeNull();
    });
  });

  // ---------- Installed Launch System ----------

  describe('createInstalledLaunchSystem', () => {
    it('creates with calculated stats', () => {
      const result = createInstalledLaunchSystem('missile-rack', 2, 0);
      expect(result).not.toBeNull();
      expect(result!.launchSystemType).toBe('missile-rack');
      expect(result!.quantity).toBe(2);
      expect(result!.hullPoints).toBe(4); // 2 HP × 2
      expect(result!.powerRequired).toBe(2);
      expect(result!.cost).toBe(10000);
      expect(result!.totalCapacity).toBe(8);
      expect(result!.loadout).toEqual([]);
    });

    it('returns null for unknown launch system', () => {
      expect(createInstalledLaunchSystem('nonexistent', 1, 0)).toBeNull();
    });

    it('applies expansion HP', () => {
      const result = createInstalledLaunchSystem('bomb-rack', 1, 2);
      expect(result).not.toBeNull();
      expect(result!.hullPoints).toBe(3); // 1 base + 2 extra
      expect(result!.totalCapacity).toBe(12); // 6 base + 2×3
    });
  });

  // ---------- Loadout Management ----------

  describe('canLoadOrdnance', () => {
    it('allows loading compatible ordnance within capacity', () => {
      const ls = makeInstalledLaunchSystem({ totalCapacity: 4, loadout: [] });
      const design = makeMissileDesign({ capacityRequired: 1 });
      expect(canLoadOrdnance(ls, design, 2, [design])).toBe(true);
    });

    it('rejects when exceeding capacity', () => {
      const ls = makeInstalledLaunchSystem({ totalCapacity: 4, loadout: [] });
      const design = makeMissileDesign({ capacityRequired: 2 });
      expect(canLoadOrdnance(ls, design, 3, [design])).toBe(false);
    });

    it('rejects incompatible ordnance category', () => {
      const ls = makeInstalledLaunchSystem({ launchSystemType: 'missile-rack', totalCapacity: 20 });
      const design = makeBombDesign();
      expect(canLoadOrdnance(ls, design, 1, [design])).toBe(false);
    });

    it('returns false for unknown launch system type', () => {
      const ls = makeInstalledLaunchSystem({ launchSystemType: 'nonexistent' as never });
      const design = makeMissileDesign();
      expect(canLoadOrdnance(ls, design, 1, [design])).toBe(false);
    });

    it('accounts for existing loadout capacity', () => {
      const design = makeMissileDesign({ id: 'd1', capacityRequired: 1 });
      const ls = makeInstalledLaunchSystem({
        totalCapacity: 4,
        loadout: [{ designId: 'd1', quantity: 3 }],
      });
      // 3 already loaded = 3 used, 1 remaining, trying to add 2 = fail
      expect(canLoadOrdnance(ls, design, 2, [design])).toBe(false);
      // But 1 fits
      expect(canLoadOrdnance(ls, design, 1, [design])).toBe(true);
    });
  });

  describe('addOrdnanceToLoadout', () => {
    it('adds new design to loadout', () => {
      const ls = makeInstalledLaunchSystem({ loadout: [] });
      const result = addOrdnanceToLoadout(ls, 'design-1', 2);
      expect(result.loadout).toHaveLength(1);
      expect(result.loadout[0]).toEqual({ designId: 'design-1', quantity: 2 });
    });

    it('increments quantity for existing design', () => {
      const ls = makeInstalledLaunchSystem({
        loadout: [{ designId: 'design-1', quantity: 3 }],
      });
      const result = addOrdnanceToLoadout(ls, 'design-1', 2);
      expect(result.loadout).toHaveLength(1);
      expect(result.loadout[0].quantity).toBe(5);
    });

    it('does not mutate original', () => {
      const ls = makeInstalledLaunchSystem({ loadout: [] });
      const result = addOrdnanceToLoadout(ls, 'design-1', 1);
      expect(ls.loadout).toHaveLength(0);
      expect(result.loadout).toHaveLength(1);
    });
  });

  describe('removeOrdnanceFromLoadout', () => {
    it('removes all when quantity is undefined', () => {
      const ls = makeInstalledLaunchSystem({
        loadout: [{ designId: 'd1', quantity: 5 }],
      });
      const result = removeOrdnanceFromLoadout(ls, 'd1');
      expect(result.loadout).toHaveLength(0);
    });

    it('decrements quantity when specified', () => {
      const ls = makeInstalledLaunchSystem({
        loadout: [{ designId: 'd1', quantity: 5 }],
      });
      const result = removeOrdnanceFromLoadout(ls, 'd1', 2);
      expect(result.loadout[0].quantity).toBe(3);
    });

    it('removes item when quantity reaches zero', () => {
      const ls = makeInstalledLaunchSystem({
        loadout: [{ designId: 'd1', quantity: 3 }],
      });
      const result = removeOrdnanceFromLoadout(ls, 'd1', 3);
      expect(result.loadout).toHaveLength(0);
    });

    it('removes item when quantity goes negative', () => {
      const ls = makeInstalledLaunchSystem({
        loadout: [{ designId: 'd1', quantity: 2 }],
      });
      const result = removeOrdnanceFromLoadout(ls, 'd1', 5);
      expect(result.loadout).toHaveLength(0);
    });

    it('returns unchanged if designId not found', () => {
      const ls = makeInstalledLaunchSystem({
        loadout: [{ designId: 'd1', quantity: 3 }],
      });
      const result = removeOrdnanceFromLoadout(ls, 'nonexistent', 1);
      expect(result.loadout).toEqual([{ designId: 'd1', quantity: 3 }]);
    });
  });

  // ---------- Design Lookup ----------

  describe('getDesignById', () => {
    it('finds design by ID', () => {
      const designs = [makeMissileDesign({ id: 'x1' }), makeBombDesign({ id: 'x2' })];
      expect(getDesignById(designs, 'x2')?.id).toBe('x2');
    });

    it('returns undefined for missing ID', () => {
      expect(getDesignById([], 'nope')).toBeUndefined();
    });
  });

  describe('getDesignDisplayName', () => {
    it('returns the design name', () => {
      expect(getDesignDisplayName(makeMissileDesign({ name: 'Alpha Strike' }))).toBe('Alpha Strike');
    });
  });

  describe('getDesignSummary', () => {
    it('formats missile summary with propulsion/guidance/warhead', () => {
      const summary = getDesignSummary(makeMissileDesign());
      expect(summary).toContain('Chemical Rocket (Light)');
      expect(summary).toContain('Radar Homing');
      expect(summary).toContain('HE (Light)');
    });

    it('formats bomb summary with size and warhead', () => {
      const summary = getDesignSummary(makeBombDesign({ size: 'light' }));
      expect(summary).toContain('light bomb');
      expect(summary).toContain('HE (Light)');
    });

    it('formats mine summary with guidance and warhead', () => {
      const summary = getDesignSummary(makeMineDesign({ guidanceId: 'proximity' }));
      expect(summary).toContain('Proximity');
      expect(summary).toContain('HE (Light)');
    });

    it('uses ? for missing components', () => {
      const design = makeMissileDesign({ propulsionId: 'bogus', guidanceId: 'bogus', warheadId: 'bogus' });
      const summary = getDesignSummary(design);
      expect(summary).toBe('? / ? / ?');
    });
  });
});
