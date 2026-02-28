import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Hull } from '../types/hull';
import type { DamageZone, ZoneCode, ZoneSystemReference, DamageDiagramData, DamageDiagram } from '../types/damageDiagram';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getDamageDiagramDataGetter: vi.fn(),
}));

import {
  getZoneConfigForHull,
  getZoneLimitForHull,
  getZoneCountForHull,
  createEmptyZones,
  generateZoneSystemRefId,
  getSystemDamageCategory,
  getDamageCategoryOrder,
  sortSystemsByDamagePriority,
  canWeaponBeInZone,
  validateZone,
  calculateDamageDiagramStats,
  createDefaultHitLocationChart,
  validateDamageDiagram,
  isDamageDiagramComplete,
} from './damageDiagramService';
import { getDamageDiagramDataGetter } from './dataLoader';

// ============== Test Data ==============

const MOCK_DIAGRAM_DATA: DamageDiagramData = {
  zoneConfigurations: {
    'small-craft': {
      '2-zone': { maxHullPoints: 20, zones: ['F', 'A'] as ZoneCode[], hitDie: 6 },
      '4-zone': { maxHullPoints: 40, zones: ['F', 'FC', 'AC', 'A'] as ZoneCode[], hitDie: 8 },
    },
    light: { zones: ['F', 'FC', 'P', 'S', 'AC', 'A'] as ZoneCode[], hitDie: 8 },
    medium: { zones: ['F', 'FP', 'FC', 'FS', 'AP', 'AC', 'AS', 'A'] as ZoneCode[], hitDie: 12 },
    heavy: { zones: ['F', 'FC', 'FP', 'FS', 'P', 'CF', 'S', 'AP', 'CA', 'AS', 'AC', 'A'] as ZoneCode[], hitDie: 20 },
    'super-heavy': { zones: ['F', 'FFP', 'FFC', 'FFS', 'FP', 'FC', 'FS', 'P', 'PC', 'CF', 'SC', 'S', 'AP', 'CA', 'AS', 'AAP', 'AC', 'AAS', 'AAC', 'A'] as ZoneCode[], hitDie: 20 },
  },
  zoneLimits: {
    hulls: {
      'fighter': { hullPoints: 10, zoneCount: 2, zoneLimit: 7 },
      'cutter': { hullPoints: 20, zoneCount: 2, zoneLimit: 14 },
      'scout': { hullPoints: 30, zoneCount: 4, zoneLimit: 10 },
      'corvette': { hullPoints: 80, zoneCount: 6, zoneLimit: 22 },
      'heavy-cruiser': { hullPoints: 400, zoneCount: 8, zoneLimit: 96 },
      'battleship': { hullPoints: 1200, zoneCount: 12, zoneLimit: 195 },
      'dreadnought': { hullPoints: 3200, zoneCount: 20, zoneLimit: 480 },
    },
  },
  hitLocationTables: {
    '6-die': {
      forward: [{ roll: [1, 2, 3], zone: 'F' }, { roll: [4, 5, 6], zone: 'A' }],
      port: [{ roll: [1, 2, 3], zone: 'F' }, { roll: [4, 5, 6], zone: 'A' }],
      starboard: [{ roll: [1, 2, 3], zone: 'F' }, { roll: [4, 5, 6], zone: 'A' }],
      aft: [{ roll: [1, 2, 3], zone: 'A' }, { roll: [4, 5, 6], zone: 'F' }],
    },
  },
};

function makeHull(overrides: Partial<Hull> = {}): Hull {
  return {
    id: 'heavy-cruiser',
    name: 'Heavy Cruiser',
    shipClass: 'medium',
    category: 'military',
    hullPoints: 400,
    bonusHullPoints: 0,
    toughness: 'Medium',
    targetModifier: 0,
    maneuverability: 2,
    damageTrack: { stun: 10, wound: 10, mortal: 5, critical: 3 },
    crew: 200,
    cost: 5000000,
    description: 'Test hull',
    ...overrides,
  };
}

function makeZoneSystemRef(overrides: Partial<ZoneSystemReference> = {}): ZoneSystemReference {
  return {
    id: 'zsr-1',
    systemType: 'weapon',
    name: 'Test System',
    hullPoints: 5,
    installedSystemId: 'inst-1',
    ...overrides,
  };
}

function makeZone(overrides: Partial<DamageZone> = {}): DamageZone {
  return {
    code: 'F',
    systems: [],
    totalHullPoints: 0,
    maxHullPoints: 96,
    ...overrides,
  };
}

// ============== Setup ==============

const mockGetDamageDiagramData = getDamageDiagramDataGetter as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDamageDiagramData.mockReturnValue(MOCK_DIAGRAM_DATA);
});

// ============== Tests ==============

describe('damageDiagramService', () => {

  // ---------- Zone Configuration ----------

  describe('getZoneConfigForHull', () => {
    it('returns 8-zone config for medium ship class', () => {
      const hull = makeHull({ shipClass: 'medium' });
      const config = getZoneConfigForHull(hull);
      expect(config.zoneCount).toBe(8);
      expect(config.hitDie).toBe(12);
      expect(config.zones).toHaveLength(8);
    });

    it('returns 6-zone config for light ships', () => {
      const hull = makeHull({ shipClass: 'light', hullPoints: 80 });
      const config = getZoneConfigForHull(hull);
      expect(config.zoneCount).toBe(6);
      expect(config.hitDie).toBe(8);
    });

    it('returns 2-zone config for small craft <= 20 HP', () => {
      const hull = makeHull({ shipClass: 'small-craft', hullPoints: 10 });
      const config = getZoneConfigForHull(hull);
      expect(config.zoneCount).toBe(2);
      expect(config.hitDie).toBe(6);
      expect(config.zones).toEqual(['F', 'A']);
    });

    it('returns 4-zone config for small craft > 20 HP', () => {
      const hull = makeHull({ shipClass: 'small-craft', hullPoints: 30 });
      const config = getZoneConfigForHull(hull);
      expect(config.zoneCount).toBe(4);
      expect(config.hitDie).toBe(8);
      expect(config.zones).toEqual(['F', 'FC', 'AC', 'A']);
    });

    it('returns 12-zone config for heavy ships', () => {
      const hull = makeHull({ shipClass: 'heavy', hullPoints: 1200 });
      const config = getZoneConfigForHull(hull);
      expect(config.zoneCount).toBe(12);
      expect(config.hitDie).toBe(20);
    });

    it('returns 20-zone config for super-heavy ships', () => {
      const hull = makeHull({ shipClass: 'super-heavy', hullPoints: 3200 });
      const config = getZoneConfigForHull(hull);
      expect(config.zoneCount).toBe(20);
      expect(config.hitDie).toBe(20);
    });
  });

  describe('getZoneLimitForHull', () => {
    it('returns correct zone limit for known hull', () => {
      expect(getZoneLimitForHull('heavy-cruiser')).toBe(96);
    });

    it('returns correct limit for small craft', () => {
      expect(getZoneLimitForHull('fighter')).toBe(7);
    });

    it('returns default 100 for unknown hull', () => {
      expect(getZoneLimitForHull('unknown-hull')).toBe(100);
    });
  });

  describe('getZoneCountForHull', () => {
    it('returns zone count for known hull', () => {
      expect(getZoneCountForHull('corvette')).toBe(6);
      expect(getZoneCountForHull('heavy-cruiser')).toBe(8);
    });

    it('returns default 6 for unknown hull', () => {
      expect(getZoneCountForHull('unknown')).toBe(6);
    });
  });

  // ---------- Zone Initialization ----------

  describe('createEmptyZones', () => {
    it('creates correct number of zones for medium ship', () => {
      const hull = makeHull({ shipClass: 'medium', id: 'heavy-cruiser' });
      const zones = createEmptyZones(hull);
      expect(zones).toHaveLength(8);
      expect(zones[0].code).toBe('F');
      expect(zones[0].systems).toEqual([]);
      expect(zones[0].totalHullPoints).toBe(0);
      expect(zones[0].maxHullPoints).toBe(96);
    });

    it('creates 2 zones for small craft', () => {
      const hull = makeHull({ shipClass: 'small-craft', hullPoints: 10, id: 'fighter' });
      const zones = createEmptyZones(hull);
      expect(zones).toHaveLength(2);
      expect(zones[0].maxHullPoints).toBe(7);
    });
  });

  // ---------- ID Generation ----------

  describe('generateZoneSystemRefId', () => {
    it('generates unique IDs', () => {
      const id1 = generateZoneSystemRefId();
      const id2 = generateZoneSystemRefId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^zsr-/);
    });
  });

  // ---------- System Categorization ----------

  describe('getSystemDamageCategory', () => {
    it('maps weapon types correctly', () => {
      expect(getSystemDamageCategory('beam')).toBe('weapon');
      expect(getSystemDamageCategory('projectile')).toBe('weapon');
      expect(getSystemDamageCategory('torpedo')).toBe('weapon');
      expect(getSystemDamageCategory('special')).toBe('weapon');
      expect(getSystemDamageCategory('launchSystem')).toBe('weapon');
    });

    it('maps defense types correctly', () => {
      expect(getSystemDamageCategory('defense')).toBe('defense');
      expect(getSystemDamageCategory('screen')).toBe('defense');
    });

    it('maps sensors correctly', () => {
      expect(getSystemDamageCategory('sensor')).toBe('sensor');
      expect(getSystemDamageCategory('active')).toBe('sensor');
    });

    it('maps command types correctly', () => {
      expect(getSystemDamageCategory('command')).toBe('command');
      expect(getSystemDamageCategory('computer')).toBe('command');
    });

    it('maps engine/power/ftl correctly', () => {
      expect(getSystemDamageCategory('engine')).toBe('engine');
      expect(getSystemDamageCategory('powerPlant')).toBe('powerPlant');
      expect(getSystemDamageCategory('ftlDrive')).toBe('ftlDrive');
    });

    it('falls back to miscellaneous for unknown types', () => {
      expect(getSystemDamageCategory('unknown')).toBe('miscellaneous');
    });
  });

  describe('getDamageCategoryOrder', () => {
    it('puts weapons first and command last', () => {
      expect(getDamageCategoryOrder('weapon')).toBe(0);
      expect(getDamageCategoryOrder('command')).toBe(12);
    });

    it('defense before sensor', () => {
      expect(getDamageCategoryOrder('defense')).toBeLessThan(getDamageCategoryOrder('sensor'));
    });

    it('engine before powerPlant', () => {
      expect(getDamageCategoryOrder('engine')).toBeLessThan(getDamageCategoryOrder('powerPlant'));
    });
  });

  // ---------- System Sorting ----------

  describe('sortSystemsByDamagePriority', () => {
    it('sorts by category order: weapons before defenses before command', () => {
      const systems: ZoneSystemReference[] = [
        makeZoneSystemRef({ id: '1', systemType: 'command', hullPoints: 5 }),
        makeZoneSystemRef({ id: '2', systemType: 'weapon', hullPoints: 3 }),
        makeZoneSystemRef({ id: '3', systemType: 'defense', hullPoints: 4 }),
      ];
      const sorted = sortSystemsByDamagePriority(systems);
      expect(sorted.map(s => s.systemType)).toEqual(['weapon', 'defense', 'command']);
    });

    it('sorts weapons by firepower (lighter first)', () => {
      const systems: ZoneSystemReference[] = [
        makeZoneSystemRef({ id: '1', systemType: 'weapon', firepowerOrder: 5, hullPoints: 10 }),
        makeZoneSystemRef({ id: '2', systemType: 'weapon', firepowerOrder: 1, hullPoints: 3 }),
        makeZoneSystemRef({ id: '3', systemType: 'weapon', firepowerOrder: 3, hullPoints: 7 }),
      ];
      const sorted = sortSystemsByDamagePriority(systems);
      expect(sorted.map(s => s.firepowerOrder)).toEqual([1, 3, 5]);
    });

    it('sorts non-weapons by HP (larger first) within same category', () => {
      const systems: ZoneSystemReference[] = [
        makeZoneSystemRef({ id: '1', systemType: 'defense', hullPoints: 3 }),
        makeZoneSystemRef({ id: '2', systemType: 'defense', hullPoints: 10 }),
        makeZoneSystemRef({ id: '3', systemType: 'defense', hullPoints: 7 }),
      ];
      const sorted = sortSystemsByDamagePriority(systems);
      expect(sorted.map(s => s.hullPoints)).toEqual([10, 7, 3]);
    });

    it('does not mutate original array', () => {
      const systems = [
        makeZoneSystemRef({ id: '1', systemType: 'command' }),
        makeZoneSystemRef({ id: '2', systemType: 'weapon' }),
      ];
      const sorted = sortSystemsByDamagePriority(systems);
      expect(systems[0].systemType).toBe('command'); // unchanged
      expect(sorted[0].systemType).toBe('weapon');
    });
  });

  // ---------- Weapon-Zone Compatibility ----------

  describe('canWeaponBeInZone', () => {
    it('allows forward weapons in forward zones', () => {
      expect(canWeaponBeInZone(['forward'], 'F')).toBe(true);
      expect(canWeaponBeInZone(['forward'], 'FC')).toBe(true);
      expect(canWeaponBeInZone(['forward'], 'FP')).toBe(true);
      expect(canWeaponBeInZone(['forward'], 'FS')).toBe(true);
    });

    it('rejects forward weapons in aft zones', () => {
      expect(canWeaponBeInZone(['forward'], 'A')).toBe(false);
      expect(canWeaponBeInZone(['forward'], 'AC')).toBe(false);
    });

    it('allows aft weapons in aft zones', () => {
      expect(canWeaponBeInZone(['aft'], 'A')).toBe(true);
      expect(canWeaponBeInZone(['aft'], 'AC')).toBe(true);
    });

    it('allows port weapons in port zones', () => {
      expect(canWeaponBeInZone(['port'], 'P')).toBe(true);
      expect(canWeaponBeInZone(['port'], 'FP')).toBe(true);
      expect(canWeaponBeInZone(['port'], 'AP')).toBe(true);
    });

    it('allows starboard weapons in starboard zones', () => {
      expect(canWeaponBeInZone(['starboard'], 'S')).toBe(true);
      expect(canWeaponBeInZone(['starboard'], 'FS')).toBe(true);
    });

    it('allows multi-arc weapons if ANY arc matches', () => {
      expect(canWeaponBeInZone(['forward', 'aft'], 'F')).toBe(true);
      expect(canWeaponBeInZone(['forward', 'aft'], 'A')).toBe(true);
    });

    it('rejects weapons with no matching arc for zone', () => {
      expect(canWeaponBeInZone(['port'], 'S')).toBe(false);
      expect(canWeaponBeInZone(['starboard'], 'P')).toBe(false);
    });

    it('handles zero-range arcs in center zones', () => {
      expect(canWeaponBeInZone(['zero-port'], 'FC')).toBe(true);
      expect(canWeaponBeInZone(['zero-starboard'], 'AC')).toBe(true);
    });

    it('returns false for empty arcs', () => {
      expect(canWeaponBeInZone([], 'F')).toBe(false);
    });
  });

  // ---------- Zone Validation ----------

  describe('validateZone', () => {
    it('returns no errors for valid zone', () => {
      const zone = makeZone({ systems: [makeZoneSystemRef()], totalHullPoints: 50, maxHullPoints: 96 });
      expect(validateZone(zone)).toHaveLength(0);
    });

    it('reports error when HP exceeds limit', () => {
      const zone = makeZone({ totalHullPoints: 100, maxHullPoints: 96, systems: [makeZoneSystemRef()] });
      const errors = validateZone(zone);
      expect(errors.some(e => e.includes('exceeds HP limit'))).toBe(true);
    });

    it('reports warning for empty zone', () => {
      const zone = makeZone({ systems: [], totalHullPoints: 0 });
      const errors = validateZone(zone);
      expect(errors.some(e => e.includes('no systems'))).toBe(true);
    });

    it('reports both errors for over-limit AND empty zone', () => {
      // Edge case: zone with HP but no systems (shouldn't normally happen)
      const zone = makeZone({ systems: [], totalHullPoints: 100, maxHullPoints: 96 });
      const errors = validateZone(zone);
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------- Stats ----------

  describe('calculateDamageDiagramStats', () => {
    it('calculates stats for a partially-filled diagram', () => {
      const zones: DamageZone[] = [
        makeZone({ systems: [makeZoneSystemRef({ hullPoints: 50 })], totalHullPoints: 50, maxHullPoints: 96 }),
        makeZone({ systems: [makeZoneSystemRef({ hullPoints: 30 })], totalHullPoints: 30, maxHullPoints: 96 }),
        makeZone({ systems: [], totalHullPoints: 0, maxHullPoints: 96 }),
      ];

      const stats = calculateDamageDiagramStats(zones, 5);
      expect(stats.zoneCount).toBe(3);
      expect(stats.zonesWithSystems).toBe(2);
      expect(stats.emptyZones).toBe(1);
      expect(stats.zonesOverLimit).toBe(0);
      expect(stats.totalSystemsAssigned).toBe(2);
      expect(stats.totalHullPointsAssigned).toBe(80);
      expect(stats.unassignedSystems).toBe(3); // 5 - 2
    });

    it('detects over-limit zones', () => {
      const zones = [
        makeZone({ systems: [makeZoneSystemRef()], totalHullPoints: 100, maxHullPoints: 96 }),
      ];
      const stats = calculateDamageDiagramStats(zones, 1);
      expect(stats.zonesOverLimit).toBe(1);
    });

    it('returns zeroed stats for empty zones array', () => {
      const stats = calculateDamageDiagramStats([], 10);
      expect(stats.zoneCount).toBe(0);
      expect(stats.unassignedSystems).toBe(10);
    });
  });

  // ---------- Hit Location Chart ----------

  describe('createDefaultHitLocationChart', () => {
    it('loads chart from JSON data when available', () => {
      const chart = createDefaultHitLocationChart(['F', 'A'] as ZoneCode[], 6);
      expect(chart.hitDie).toBe(6);
      expect(chart.columns).toHaveLength(4); // forward, port, starboard, aft
      // Check forward column uses JSON data
      const forwardCol = chart.columns.find(c => c.direction === 'forward')!;
      expect(forwardCol.entries).toHaveLength(2);
      expect(forwardCol.entries[0].zone).toBe('F');
      expect(forwardCol.entries[0].minRoll).toBe(1);
      expect(forwardCol.entries[0].maxRoll).toBe(3);
    });

    it('falls back to generated chart when no JSON table exists', () => {
      // 12-die-8zone is not in our mock data
      const zones = ['F', 'FP', 'FC', 'FS', 'AP', 'AC', 'AS', 'A'] as ZoneCode[];
      const chart = createDefaultHitLocationChart(zones, 12);
      expect(chart.hitDie).toBe(12);
      expect(chart.columns).toHaveLength(4);
      // Verify fallback distributes rolls
      const forwardCol = chart.columns.find(c => c.direction === 'forward')!;
      expect(forwardCol.entries.length).toBeGreaterThan(0);
      // All rolls should be covered (1 to 12)
      const maxRoll = Math.max(...forwardCol.entries.map(e => e.maxRoll));
      expect(maxRoll).toBe(12);
    });
  });

  // ---------- Full Diagram Validation ----------

  describe('validateDamageDiagram', () => {
    it('returns no errors for valid diagram', () => {
      const diagram: DamageDiagram = {
        zones: [
          makeZone({ code: 'F', systems: [makeZoneSystemRef()], totalHullPoints: 50, maxHullPoints: 96 }),
          makeZone({ code: 'A', systems: [makeZoneSystemRef()], totalHullPoints: 40, maxHullPoints: 96 }),
        ],
        hitLocationChart: { hitDie: 6, columns: [] },
        isComplete: true,
        validationErrors: [],
      };
      const errors = validateDamageDiagram(diagram);
      expect(errors).toHaveLength(0);
    });

    it('reports errors for over-limit and empty zones', () => {
      const diagram: DamageDiagram = {
        zones: [
          makeZone({ code: 'F', systems: [makeZoneSystemRef()], totalHullPoints: 100, maxHullPoints: 96 }),
          makeZone({ code: 'A', systems: [], totalHullPoints: 0 }),
        ],
        hitLocationChart: { hitDie: 6, columns: [] },
        isComplete: false,
        validationErrors: [],
      };
      const errors = validateDamageDiagram(diagram);
      expect(errors.some(e => e.includes('exceeds HP'))).toBe(true);
      expect(errors.some(e => e.includes('no systems'))).toBe(true);
    });
  });

  describe('isDamageDiagramComplete', () => {
    it('returns true when all conditions met', () => {
      const zones = [
        makeZone({ systems: [makeZoneSystemRef()], totalHullPoints: 50, maxHullPoints: 96 }),
        makeZone({ systems: [makeZoneSystemRef()], totalHullPoints: 30, maxHullPoints: 96 }),
      ];
      expect(isDamageDiagramComplete(zones, 0)).toBe(true);
    });

    it('returns false when unassigned systems remain', () => {
      const zones = [makeZone({ systems: [makeZoneSystemRef()] })];
      expect(isDamageDiagramComplete(zones, 3)).toBe(false);
    });

    it('returns false when empty zones exist', () => {
      const zones = [
        makeZone({ systems: [makeZoneSystemRef()] }),
        makeZone({ systems: [] }),
      ];
      expect(isDamageDiagramComplete(zones, 0)).toBe(false);
    });

    it('returns false when zones over limit', () => {
      const zones = [
        makeZone({ systems: [makeZoneSystemRef()], totalHullPoints: 100, maxHullPoints: 96 }),
      ];
      expect(isDamageDiagramComplete(zones, 0)).toBe(false);
    });
  });
});
