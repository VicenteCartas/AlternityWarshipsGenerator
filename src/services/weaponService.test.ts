import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WeaponType, InstalledWeapon, FiringArc, MountModifier, GunConfigModifier } from '../types/weapon';
import type { ShipClass } from '../types/hull';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getBeamWeaponsData: vi.fn(),
  getProjectileWeaponsData: vi.fn(),
  getTorpedoWeaponsData: vi.fn(),
  getSpecialWeaponsData: vi.fn(),
  getMountModifiersData: vi.fn(),
  getGunConfigurationsData: vi.fn(),
  getConcealmentModifierData: vi.fn(),
}));

// Mock the utilities module (for generateId)
vi.mock('./utilities', () => ({
  generateId: vi.fn(() => 'test-weapon-id'),
}));

import {
  getAllBeamWeaponTypes,
  getAllProjectileWeaponTypes,
  getAllTorpedoWeaponTypes,
  getAllSpecialWeaponTypes,
  sortWeapons,
  isMountTypeAvailable,
  getMountModifiers,
  getGunConfigurationModifiers,
  getConcealmentModifier,
  calculateWeaponHullPoints,
  calculateWeaponPower,
  calculateWeaponCost,
  createInstalledWeapon,
  updateInstalledWeapon,
  calculateWeaponStats,
  getMountTypeName,
  getGunConfigurationName,
  getFreeArcCount,
  canUseZeroArcs,
  getDefaultArcs,
  validateArcs,
  getArcDisplayName,
  formatArcs,
  generateWeaponId,
} from './weaponService';

import {
  getBeamWeaponsData,
  getProjectileWeaponsData,
  getTorpedoWeaponsData,
  getSpecialWeaponsData,
  getMountModifiersData,
  getGunConfigurationsData,
  getConcealmentModifierData,
} from './dataLoader';

// ============== Test Data ==============

const MOUNT_MODIFIERS: Record<string, MountModifier> = {
  standard: { costMultiplier: 1, hpMultiplier: 1, standardArcs: 1, allowsZeroArc: true },
  fixed: { costMultiplier: 0.75, hpMultiplier: 0.75, standardArcs: 1, allowsZeroArc: false },
  turret: { costMultiplier: 1.25, hpMultiplier: 1.25, standardArcs: 3, allowsZeroArc: true },
  sponson: { costMultiplier: 1.25, hpMultiplier: 1, standardArcs: 2, allowsZeroArc: true },
  bank: { costMultiplier: 1.25, hpMultiplier: 1, standardArcs: 3, allowsZeroArc: true, allowedCategories: ['beam'], minProgressLevel: 8 },
};

const GUN_CONFIGS: Record<string, GunConfigModifier> = {
  single: { effectiveGunCount: 1, actualGunCount: 1 },
  twin: { effectiveGunCount: 1.5, actualGunCount: 2 },
  triple: { effectiveGunCount: 2, actualGunCount: 3 },
  quadruple: { effectiveGunCount: 2.5, actualGunCount: 4 },
};

const CONCEALMENT_MOD: MountModifier = { costMultiplier: 1.5, hpMultiplier: 1.5 };

function makeWeapon(overrides: Partial<WeaponType> = {}): WeaponType {
  return {
    id: 'test-weapon',
    name: 'Test Laser',
    progressLevel: 7,
    techTracks: [],
    hullPoints: 4,
    powerRequired: 2,
    cost: 1,
    accuracyModifier: 0,
    rangeShort: 2,
    rangeMedium: 6,
    rangeLong: 12,
    damageType: 'En',
    firepower: 'L',
    damage: 'd6w/d8w/d12w',
    fireModes: ['F'],
    description: 'Test weapon',
    ...overrides,
  } as WeaponType;
}

function makeInstalledWeapon(overrides: Partial<InstalledWeapon> = {}): InstalledWeapon {
  const w = makeWeapon();
  return {
    id: 'installed-1',
    weaponType: w,
    category: 'beam',
    mountType: 'standard',
    gunConfiguration: 'single',
    concealed: false,
    quantity: 1,
    arcs: ['forward'],
    hullPoints: 4,
    powerRequired: 2,
    cost: 1,
    ...overrides,
  } as InstalledWeapon;
}

// ============== Setup ==============

beforeEach(() => {
  vi.clearAllMocks();
  (getMountModifiersData as ReturnType<typeof vi.fn>).mockReturnValue(MOUNT_MODIFIERS);
  (getGunConfigurationsData as ReturnType<typeof vi.fn>).mockReturnValue(GUN_CONFIGS);
  (getConcealmentModifierData as ReturnType<typeof vi.fn>).mockReturnValue(CONCEALMENT_MOD);
});

// ============== Tests ==============

describe('weaponService', () => {
  // ============== Data Access ==============

  describe('data access functions', () => {
    it('getAllBeamWeaponTypes returns data from loader', () => {
      const beams = [makeWeapon({ id: 'laser' })];
      (getBeamWeaponsData as ReturnType<typeof vi.fn>).mockReturnValue(beams);
      expect(getAllBeamWeaponTypes()).toBe(beams);
    });

    it('getAllProjectileWeaponTypes returns data from loader', () => {
      const projectiles = [makeWeapon({ id: 'railgun' })];
      (getProjectileWeaponsData as ReturnType<typeof vi.fn>).mockReturnValue(projectiles);
      expect(getAllProjectileWeaponTypes()).toBe(projectiles);
    });

    it('getAllTorpedoWeaponTypes returns data from loader', () => {
      const torpedoes = [makeWeapon({ id: 'torpedo' })];
      (getTorpedoWeaponsData as ReturnType<typeof vi.fn>).mockReturnValue(torpedoes);
      expect(getAllTorpedoWeaponTypes()).toBe(torpedoes);
    });

    it('getAllSpecialWeaponTypes returns data from loader', () => {
      const specials = [makeWeapon({ id: 'tractor' })];
      (getSpecialWeaponsData as ReturnType<typeof vi.fn>).mockReturnValue(specials);
      expect(getAllSpecialWeaponTypes()).toBe(specials);
    });
  });

  // ============== Modifier Lookups ==============

  describe('getMountModifiers', () => {
    it('returns modifiers from JSON data', () => {
      const result = getMountModifiers('turret');
      expect(result).toEqual(MOUNT_MODIFIERS.turret);
    });

    it('falls back to hardcoded defaults when JSON not loaded', () => {
      (getMountModifiersData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = getMountModifiers('turret');
      expect(result.costMultiplier).toBe(1.25);
      expect(result.hpMultiplier).toBe(1.25);
      expect(result.standardArcs).toBe(3);
    });

    it('returns correct values for all mount types', () => {
      expect(getMountModifiers('standard').costMultiplier).toBe(1);
      expect(getMountModifiers('fixed').costMultiplier).toBe(0.75);
      expect(getMountModifiers('turret').costMultiplier).toBe(1.25);
      expect(getMountModifiers('sponson').costMultiplier).toBe(1.25);
      expect(getMountModifiers('bank').costMultiplier).toBe(1.25);
    });

    it('bank mount has beam-only restriction at PL 8+', () => {
      const bank = getMountModifiers('bank');
      expect(bank.allowedCategories).toEqual(['beam']);
      expect(bank.minProgressLevel).toBe(8);
    });

    it('fixed mount disallows zero arcs', () => {
      expect(getMountModifiers('fixed').allowsZeroArc).toBe(false);
    });

    it('standard mount allows zero arcs', () => {
      expect(getMountModifiers('standard').allowsZeroArc).toBe(true);
    });
  });

  describe('getGunConfigurationModifiers', () => {
    it('returns modifiers from JSON data', () => {
      const result = getGunConfigurationModifiers('twin');
      expect(result).toEqual(GUN_CONFIGS.twin);
    });

    it('falls back to hardcoded defaults when JSON not loaded', () => {
      (getGunConfigurationsData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = getGunConfigurationModifiers('triple');
      expect(result.effectiveGunCount).toBe(2);
      expect(result.actualGunCount).toBe(3);
    });

    it('returns correct effectiveGunCount vs actualGunCount', () => {
      expect(getGunConfigurationModifiers('single')).toEqual({ effectiveGunCount: 1, actualGunCount: 1 });
      expect(getGunConfigurationModifiers('twin')).toEqual({ effectiveGunCount: 1.5, actualGunCount: 2 });
      expect(getGunConfigurationModifiers('triple')).toEqual({ effectiveGunCount: 2, actualGunCount: 3 });
      expect(getGunConfigurationModifiers('quadruple')).toEqual({ effectiveGunCount: 2.5, actualGunCount: 4 });
    });

    it('returns default {1,1} for unknown config', () => {
      (getGunConfigurationsData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = getGunConfigurationModifiers('quintuple' as string);
      expect(result).toEqual({ effectiveGunCount: 1, actualGunCount: 1 });
    });
  });

  describe('getConcealmentModifier', () => {
    it('returns 1.5x multipliers from JSON', () => {
      const result = getConcealmentModifier();
      expect(result.costMultiplier).toBe(1.5);
      expect(result.hpMultiplier).toBe(1.5);
    });

    it('falls back to hardcoded defaults when JSON not loaded', () => {
      (getConcealmentModifierData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = getConcealmentModifier();
      expect(result.costMultiplier).toBe(1.5);
      expect(result.hpMultiplier).toBe(1.5);
    });
  });

  // ============== Core Calculations ==============

  describe('calculateWeaponHullPoints', () => {
    it('standard single non-concealed: uses base HP', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.0 × 1 = 4
      expect(calculateWeaponHullPoints(w, 'standard', 'single', false)).toBe(4);
    });

    it('turret single non-concealed: 1.25x', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.25 × 1 = 5
      expect(calculateWeaponHullPoints(w, 'turret', 'single', false)).toBe(5);
    });

    it('fixed single non-concealed: 0.75x', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 0.75 × 1 = 3
      expect(calculateWeaponHullPoints(w, 'fixed', 'single', false)).toBe(3);
    });

    it('sponson single non-concealed: 1.0x HP (sponson only increases cost)', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.0 × 1 = 4
      expect(calculateWeaponHullPoints(w, 'sponson', 'single', false)).toBe(4);
    });

    it('standard twin non-concealed: 1.5x effective', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.0 × 1.5 = 6
      expect(calculateWeaponHullPoints(w, 'standard', 'twin', false)).toBe(6);
    });

    it('standard triple non-concealed: 2x effective', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.0 × 2 = 8
      expect(calculateWeaponHullPoints(w, 'standard', 'triple', false)).toBe(8);
    });

    it('standard quadruple non-concealed: 2.5x effective', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.0 × 2.5 = 10
      expect(calculateWeaponHullPoints(w, 'standard', 'quadruple', false)).toBe(10);
    });

    it('standard single concealed: 1.5x concealment', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.0 × 1 × 1.5 = 6
      expect(calculateWeaponHullPoints(w, 'standard', 'single', true)).toBe(6);
    });

    it('turret twin concealed: compound multiplier', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.25 = 5, × 1.5 (twin effective) = 7.5, × 1.5 (concealment) = 11.25
      // roundToHalf(11.25) = Math.ceil(11.25×2 - 0.5)/2 = Math.ceil(22)/2 = 22/2 = 11
      expect(calculateWeaponHullPoints(w, 'turret', 'twin', true)).toBe(11);
    });

    it('turret triple concealed: compound multiplier', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 1.25 = 5, × 2 (triple effective) = 10, × 1.5 (concealment) = 15
      expect(calculateWeaponHullPoints(w, 'turret', 'triple', true)).toBe(15);
    });

    it('fixed twin non-concealed', () => {
      const w = makeWeapon({ hullPoints: 4 });
      // 4 × 0.75 = 3, × 1.5 (twin) = 4.5
      expect(calculateWeaponHullPoints(w, 'fixed', 'twin', false)).toBe(4.5);
    });

    // roundToHalf edge cases
    it('rounds 1.25 down to 1.0 (tie rounds down)', () => {
      // Need a combination that produces 1.25
      // weapon HP=1, turret twin: 1 × 1.25 × 1.5 = 1.875 → roundToHalf(1.875) = Math.ceil(3.25)/2 = 4/2 = 2
      // Let's try: HP=1, turret single: 1 × 1.25 = 1.25 → roundToHalf(1.25) = Math.ceil(2.0)/2 = 1.0
      const w = makeWeapon({ hullPoints: 1 });
      expect(calculateWeaponHullPoints(w, 'turret', 'single', false)).toBe(1);
    });

    it('rounds 3.75 down to 3.5 (tie rounds down)', () => {
      // HP=3, turret single: 3 × 1.25 = 3.75 → roundToHalf(3.75) = Math.ceil(7.0)/2 = 3.5
      const w = makeWeapon({ hullPoints: 3 });
      expect(calculateWeaponHullPoints(w, 'turret', 'single', false)).toBe(3.5);
    });

    it('rounds 6.26 up to 6.5', () => {
      // Need to produce 6.26 via multipliers - tricky. Let's find one.
      // HP=5, turret single: 5 × 1.25 = 6.25 → roundToHalf = 6.0 (tie down)
      // HP=5, turret single concealed: 5 × 1.25 = 6.25, × 1.5 = 9.375 → Math.ceil(18.25)/2 = 19/2 = 9.5
      const w = makeWeapon({ hullPoints: 5 });
      expect(calculateWeaponHullPoints(w, 'turret', 'single', true)).toBe(9.5);
    });

    it('preserves exact 0.5 values', () => {
      const w = makeWeapon({ hullPoints: 2 });
      // 2 × 1.0 × 1.5 (twin) = 3.0
      expect(calculateWeaponHullPoints(w, 'standard', 'twin', false)).toBe(3);
    });

    it('handles large base HP correctly', () => {
      const w = makeWeapon({ hullPoints: 20 });
      // 20 × 1.25 × 2.5 × 1.5 = 93.75 → roundToHalf(93.75) = Math.ceil(187.0)/2 = 93.5
      expect(calculateWeaponHullPoints(w, 'turret', 'quadruple', true)).toBe(93.5);
    });
  });

  describe('calculateWeaponPower', () => {
    it('single: base power', () => {
      const w = makeWeapon({ powerRequired: 3 });
      expect(calculateWeaponPower(w, 'single')).toBe(3);
    });

    it('twin: 2x base power', () => {
      const w = makeWeapon({ powerRequired: 3 });
      expect(calculateWeaponPower(w, 'twin')).toBe(6);
    });

    it('triple: 3x base power', () => {
      const w = makeWeapon({ powerRequired: 3 });
      expect(calculateWeaponPower(w, 'triple')).toBe(9);
    });

    it('quadruple: 4x base power', () => {
      const w = makeWeapon({ powerRequired: 3 });
      expect(calculateWeaponPower(w, 'quadruple')).toBe(12);
    });

    it('power is NOT affected by mount type (verified by checking the formula)', () => {
      const w = makeWeapon({ powerRequired: 5 });
      // Same gun config, different mounts → same power
      expect(calculateWeaponPower(w, 'single')).toBe(5);
      // Power function only takes gunConfig, doesn't even accept mountType
    });

    it('handles zero power weapons', () => {
      const w = makeWeapon({ powerRequired: 0 });
      expect(calculateWeaponPower(w, 'quadruple')).toBe(0);
    });
  });

  describe('calculateWeaponCost', () => {
    it('standard single non-concealed: base cost', () => {
      const w = makeWeapon({ cost: 2 });
      expect(calculateWeaponCost(w, 'standard', 'single', false)).toBe(2);
    });

    it('turret single non-concealed: 1.25x', () => {
      const w = makeWeapon({ cost: 2 });
      // 2 × 1.25 = 2.5
      expect(calculateWeaponCost(w, 'turret', 'single', false)).toBe(2.5);
    });

    it('fixed single non-concealed: 0.75x', () => {
      const w = makeWeapon({ cost: 2 });
      // 2 × 0.75 = 1.5
      expect(calculateWeaponCost(w, 'fixed', 'single', false)).toBe(1.5);
    });

    it('sponson single non-concealed: 1.25x cost (unlike HP)', () => {
      const w = makeWeapon({ cost: 2 });
      // 2 × 1.25 = 2.5
      expect(calculateWeaponCost(w, 'sponson', 'single', false)).toBe(2.5);
    });

    it('standard twin non-concealed: 1.5x effective', () => {
      const w = makeWeapon({ cost: 2 });
      // 2 × 1.0 × 1.5 = 3
      expect(calculateWeaponCost(w, 'standard', 'twin', false)).toBe(3);
    });

    it('turret twin concealed: compound multiplier', () => {
      const w = makeWeapon({ cost: 2 });
      // 2 × 1.25 = 2.5, × 1.5 (twin) = 3.75, × 1.5 (concealment) = 5.625
      // roundToHalf(5.625) = Math.ceil(10.75)/2 = 11/2 = 5.5
      expect(calculateWeaponCost(w, 'turret', 'twin', true)).toBe(5.5);
    });

    it('fixed quadruple concealed: compound multiplier', () => {
      const w = makeWeapon({ cost: 4 });
      // 4 × 0.75 = 3, × 2.5 (quad) = 7.5, × 1.5 (concealment) = 11.25
      // roundToHalf(11.25) = Math.ceil(22.0)/2 = 11.0
      expect(calculateWeaponCost(w, 'fixed', 'quadruple', true)).toBe(11);
    });

    it('rounds cost to nearest 0.5', () => {
      const w = makeWeapon({ cost: 3 });
      // 3 × 1.25 (turret) × 1 (single) = 3.75 → roundToHalf = 3.5 (tie rounds down)
      expect(calculateWeaponCost(w, 'turret', 'single', false)).toBe(3.5);
    });
  });

  // ============== Compound Multiplier Rounding ==============

  describe('compound multiplier rounding (roundToHalf behavior)', () => {
    it('turret twin: HP and cost both rounded correctly', () => {
      const w = makeWeapon({ hullPoints: 5, cost: 2 });
      // HP: 5 × 1.25 × 1.5 = 9.375 → roundToHalf(9.375) = Math.ceil(18.25)/2 = 19/2 = 9.5
      expect(calculateWeaponHullPoints(w, 'turret', 'twin', false)).toBe(9.5);
      // Cost: 2 × 1.25 × 1.5 = 3.75 → roundToHalf(3.75) = Math.ceil(7.0)/2 = 3.5
      expect(calculateWeaponCost(w, 'turret', 'twin', false)).toBe(3.5);
    });

    it('turret quadruple concealed: heavy compound', () => {
      const w = makeWeapon({ hullPoints: 10, cost: 5 });
      // HP: 10 × 1.25 × 2.5 × 1.5 = 46.875 → roundToHalf(46.875) = Math.ceil(93.25)/2 = 94/2 = 47
      expect(calculateWeaponHullPoints(w, 'turret', 'quadruple', true)).toBe(47);
      // Cost: 5 × 1.25 × 2.5 × 1.5 = 23.4375 → roundToHalf(23.4375) = Math.ceil(46.375)/2 = 47/2 = 23.5
      expect(calculateWeaponCost(w, 'turret', 'quadruple', true)).toBe(23.5);
    });

    it('sponson triple concealed: HP vs cost multiplier difference', () => {
      const w = makeWeapon({ hullPoints: 6, cost: 3 });
      // HP: 6 × 1.0 (sponson HP) × 2 (triple) × 1.5 (concealed) = 18
      expect(calculateWeaponHullPoints(w, 'sponson', 'triple', true)).toBe(18);
      // Cost: 3 × 1.25 (sponson cost) × 2 (triple) × 1.5 (concealed) = 11.25
      // roundToHalf(11.25) = Math.ceil(22.0)/2 = 11.0
      expect(calculateWeaponCost(w, 'sponson', 'triple', true)).toBe(11);
    });
  });

  // ============== Sorting ==============

  describe('sortWeapons', () => {
    it('sorts by progress level first', () => {
      const w1 = makeWeapon({ id: 'pl8', progressLevel: 8 });
      const w2 = makeWeapon({ id: 'pl6', progressLevel: 6 });
      const w3 = makeWeapon({ id: 'pl7', progressLevel: 7 });
      const sorted = sortWeapons([w1, w2, w3]);
      expect(sorted.map(w => w.id)).toEqual(['pl6', 'pl7', 'pl8']);
    });

    it('sorts by firepower rating when PL is equal', () => {
      const w1 = makeWeapon({ id: 'heavy', firepower: 'H' });
      const w2 = makeWeapon({ id: 'small', firepower: 'S' });
      const w3 = makeWeapon({ id: 'light', firepower: 'L' });
      const w4 = makeWeapon({ id: 'good', firepower: 'Gd' });
      const sorted = sortWeapons([w1, w2, w3, w4]);
      expect(sorted.map(w => w.id)).toEqual(['good', 'small', 'light', 'heavy']);
    });

    it('sorts by accuracy when PL and firepower are equal', () => {
      const w1 = makeWeapon({ id: 'acc0', accuracyModifier: 0 });
      const w2 = makeWeapon({ id: 'acc-1', accuracyModifier: -1 });
      const w3 = makeWeapon({ id: 'acc1', accuracyModifier: 1 });
      const sorted = sortWeapons([w1, w2, w3]);
      expect(sorted.map(w => w.id)).toEqual(['acc-1', 'acc0', 'acc1']);
    });

    it('sorts by ranges when other fields are equal', () => {
      const w1 = makeWeapon({ id: 'long-range', rangeShort: 4 });
      const w2 = makeWeapon({ id: 'short-range', rangeShort: 2 });
      const sorted = sortWeapons([w1, w2]);
      expect(sorted.map(w => w.id)).toEqual(['short-range', 'long-range']);
    });

    it('returns a new array (does not mutate)', () => {
      const original = [makeWeapon({ id: 'a' }), makeWeapon({ id: 'b' })];
      const sorted = sortWeapons(original);
      expect(sorted).not.toBe(original);
    });

    it('handles empty array', () => {
      expect(sortWeapons([])).toEqual([]);
    });

    it('handles single element', () => {
      const w = makeWeapon({ id: 'only' });
      expect(sortWeapons([w])).toEqual([w]);
    });
  });

  // ============== Mount Availability ==============

  describe('isMountTypeAvailable', () => {
    it('standard mount is available for all weapons', () => {
      const w = makeWeapon({ progressLevel: 6 });
      expect(isMountTypeAvailable(w, 'standard', 'beam')).toBe(true);
      expect(isMountTypeAvailable(w, 'standard', 'projectile')).toBe(true);
      expect(isMountTypeAvailable(w, 'standard', 'torpedo')).toBe(true);
    });

    it('bank mount is only available for beam category', () => {
      const w = makeWeapon({ progressLevel: 8 });
      expect(isMountTypeAvailable(w, 'bank', 'beam')).toBe(true);
      expect(isMountTypeAvailable(w, 'bank', 'projectile')).toBe(false);
      expect(isMountTypeAvailable(w, 'bank', 'torpedo')).toBe(false);
      expect(isMountTypeAvailable(w, 'bank', 'special')).toBe(false);
    });

    it('bank mount requires PL 8+', () => {
      const w7 = makeWeapon({ progressLevel: 7 });
      const w8 = makeWeapon({ progressLevel: 8 });
      const w9 = makeWeapon({ progressLevel: 9 });
      expect(isMountTypeAvailable(w7, 'bank', 'beam')).toBe(false);
      expect(isMountTypeAvailable(w8, 'bank', 'beam')).toBe(true);
      expect(isMountTypeAvailable(w9, 'bank', 'beam')).toBe(true);
    });

    it('turret mount available for all categories', () => {
      const w = makeWeapon({ progressLevel: 6 });
      expect(isMountTypeAvailable(w, 'turret', 'beam')).toBe(true);
      expect(isMountTypeAvailable(w, 'turret', 'torpedo')).toBe(true);
    });

    it('fixed mount available for all categories', () => {
      const w = makeWeapon({ progressLevel: 6 });
      expect(isMountTypeAvailable(w, 'fixed', 'beam')).toBe(true);
      expect(isMountTypeAvailable(w, 'fixed', 'projectile')).toBe(true);
    });
  });

  // ============== CRUD ==============

  describe('generateWeaponId', () => {
    it('returns an id from generateId utility', () => {
      expect(generateWeaponId()).toBe('test-weapon-id');
    });
  });

  describe('createInstalledWeapon', () => {
    it('creates an installed weapon with all calculated stats', () => {
      const w = makeWeapon({ hullPoints: 4, powerRequired: 2, cost: 1 });
      const installed = createInstalledWeapon(w, 'beam', 'standard', 'single', false);
      expect(installed.id).toBe('test-weapon-id');
      expect(installed.weaponType).toBe(w);
      expect(installed.category).toBe('beam');
      expect(installed.mountType).toBe('standard');
      expect(installed.gunConfiguration).toBe('single');
      expect(installed.concealed).toBe(false);
      expect(installed.quantity).toBe(1);
      expect(installed.arcs).toEqual(['forward']);
      expect(installed.hullPoints).toBe(4);
      expect(installed.powerRequired).toBe(2);
      expect(installed.cost).toBe(1);
    });

    it('uses custom quantity and arcs', () => {
      const w = makeWeapon();
      const installed = createInstalledWeapon(w, 'beam', 'turret', 'twin', false, 3, ['forward', 'starboard', 'port']);
      expect(installed.quantity).toBe(3);
      expect(installed.arcs).toEqual(['forward', 'starboard', 'port']);
    });

    it('calculates stats based on mount and gun config', () => {
      const w = makeWeapon({ hullPoints: 4, powerRequired: 2, cost: 2 });
      const installed = createInstalledWeapon(w, 'beam', 'turret', 'twin', true);
      // HP: 4 × 1.25 × 1.5 × 1.5 = 11.25 → 11
      expect(installed.hullPoints).toBe(11);
      // Power: 2 × 2 = 4
      expect(installed.powerRequired).toBe(4);
      // Cost: 2 × 1.25 × 1.5 × 1.5 = 5.625 → roundToHalf = 5.5
      expect(installed.cost).toBe(5.5);
    });
  });

  describe('updateInstalledWeapon', () => {
    it('updates mount type and recalculates', () => {
      const w = makeWeapon({ hullPoints: 4, powerRequired: 2, cost: 2 });
      const original = makeInstalledWeapon({
        id: 'keep-this-id',
        weaponType: w,
        mountType: 'standard',
        gunConfiguration: 'single',
      });
      const updated = updateInstalledWeapon(original, 'turret', 'single', false);
      expect(updated.id).toBe('keep-this-id'); // preserves id
      expect(updated.mountType).toBe('turret');
      expect(updated.hullPoints).toBe(5); // 4 × 1.25
    });

    it('preserves weaponType reference', () => {
      const w = makeWeapon();
      const original = makeInstalledWeapon({ weaponType: w });
      const updated = updateInstalledWeapon(original, 'fixed', 'single', false);
      expect(updated.weaponType).toBe(w);
    });

    it('uses provided arcs (not default)', () => {
      const original = makeInstalledWeapon({ arcs: ['forward', 'starboard'] });
      const updated = updateInstalledWeapon(original, 'turret', 'single', false, 1, ['forward', 'port', 'aft']);
      expect(updated.arcs).toEqual(['forward', 'port', 'aft']);
    });

    it('uses existing arcs when arcs param is not provided', () => {
      const original = makeInstalledWeapon({ arcs: ['forward', 'starboard'] });
      const updated = updateInstalledWeapon(original, 'turret', 'single', false);
      expect(updated.arcs).toEqual(['forward', 'starboard']);
    });
  });

  // ============== Aggregate Stats ==============

  describe('calculateWeaponStats', () => {
    it('returns zero stats for empty array', () => {
      const stats = calculateWeaponStats([]);
      expect(stats.totalHullPoints).toBe(0);
      expect(stats.totalPowerRequired).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.beamCount).toBe(0);
      expect(stats.projectileCount).toBe(0);
      expect(stats.torpedoCount).toBe(0);
      expect(stats.specialCount).toBe(0);
      expect(stats.ordnanceCount).toBe(0);
    });

    it('sums HP, power and cost multiplied by quantity', () => {
      const weapons: InstalledWeapon[] = [
        makeInstalledWeapon({ hullPoints: 4, powerRequired: 2, cost: 1, quantity: 3 }),
        makeInstalledWeapon({ hullPoints: 6, powerRequired: 3, cost: 2, quantity: 2 }),
      ];
      const stats = calculateWeaponStats(weapons);
      expect(stats.totalHullPoints).toBe(4 * 3 + 6 * 2); // 24
      expect(stats.totalPowerRequired).toBe(2 * 3 + 3 * 2); // 12
      expect(stats.totalCost).toBe(1 * 3 + 2 * 2); // 7
    });

    it('counts weapons by category', () => {
      const weapons: InstalledWeapon[] = [
        makeInstalledWeapon({ category: 'beam', quantity: 2 }),
        makeInstalledWeapon({ category: 'beam', quantity: 1 }),
        makeInstalledWeapon({ category: 'projectile', quantity: 3 }),
        makeInstalledWeapon({ category: 'torpedo', quantity: 1 }),
        makeInstalledWeapon({ category: 'special', quantity: 2 }),
        makeInstalledWeapon({ category: 'ordnance', quantity: 4 }),
      ];
      const stats = calculateWeaponStats(weapons);
      expect(stats.beamCount).toBe(3);
      expect(stats.projectileCount).toBe(3);
      expect(stats.torpedoCount).toBe(1);
      expect(stats.specialCount).toBe(2);
      expect(stats.ordnanceCount).toBe(4);
    });
  });

  // ============== Display Names ==============

  describe('getMountTypeName', () => {
    it('capitalizes first letter', () => {
      expect(getMountTypeName('standard')).toBe('Standard');
      expect(getMountTypeName('fixed')).toBe('Fixed');
      expect(getMountTypeName('turret')).toBe('Turret');
      expect(getMountTypeName('sponson')).toBe('Sponson');
      expect(getMountTypeName('bank')).toBe('Bank');
    });
  });

  describe('getGunConfigurationName', () => {
    it('returns correct display names', () => {
      expect(getGunConfigurationName('single')).toBe('Single');
      expect(getGunConfigurationName('twin')).toBe('Twin');
      expect(getGunConfigurationName('triple')).toBe('Triple');
      expect(getGunConfigurationName('quadruple')).toBe('Quadruple');
    });

    it('falls back to capitalized input for unknown', () => {
      expect(getGunConfigurationName('quintuple' as string)).toBe('Quintuple');
    });
  });

  // ============== Firing Arc Functions ==============

  describe('getFreeArcCount', () => {
    it('standard mount for medium ship: 1 zero + 1 standard', () => {
      const result = getFreeArcCount('standard', 'medium');
      expect(result.zeroArcs).toBe(1);
      expect(result.standardArcs).toBe(1);
    });

    it('turret mount for medium ship: 1 zero + 3 standard', () => {
      const result = getFreeArcCount('turret', 'medium');
      expect(result.zeroArcs).toBe(1);
      expect(result.standardArcs).toBe(3);
    });

    it('fixed mount: 0 zero arcs', () => {
      const result = getFreeArcCount('fixed', 'medium');
      expect(result.zeroArcs).toBe(0);
      expect(result.standardArcs).toBe(1);
    });

    it('small-craft gets 4 zero arcs', () => {
      const result = getFreeArcCount('standard', 'small-craft');
      expect(result.zeroArcs).toBe(4);
      expect(result.standardArcs).toBe(1);
    });

    it('small-craft with turret: 4 zero + 3 standard', () => {
      const result = getFreeArcCount('turret', 'small-craft');
      expect(result.zeroArcs).toBe(4);
      expect(result.standardArcs).toBe(3);
    });

    it('small-craft with fixed: still 0 zero arcs', () => {
      const result = getFreeArcCount('fixed', 'small-craft');
      expect(result.zeroArcs).toBe(0);
      expect(result.standardArcs).toBe(1);
    });

    it('sponson mount: 1 zero + 2 standard', () => {
      const result = getFreeArcCount('sponson', 'heavy');
      expect(result.zeroArcs).toBe(1);
      expect(result.standardArcs).toBe(2);
    });
  });

  describe('canUseZeroArcs', () => {
    it('S (Small) firepower can use zero arcs', () => {
      expect(canUseZeroArcs(makeWeapon({ firepower: 'S' }))).toBe(true);
    });

    it('L (Light) firepower can use zero arcs', () => {
      expect(canUseZeroArcs(makeWeapon({ firepower: 'L' }))).toBe(true);
    });

    it('Gd (Good) firepower can use zero arcs', () => {
      expect(canUseZeroArcs(makeWeapon({ firepower: 'Gd' }))).toBe(true);
    });

    it('M (Medium) firepower cannot use zero arcs', () => {
      expect(canUseZeroArcs(makeWeapon({ firepower: 'M' }))).toBe(false);
    });

    it('H (Heavy) firepower cannot use zero arcs', () => {
      expect(canUseZeroArcs(makeWeapon({ firepower: 'H' }))).toBe(false);
    });

    it('SH (Super-Heavy) firepower cannot use zero arcs', () => {
      expect(canUseZeroArcs(makeWeapon({ firepower: 'SH' }))).toBe(false);
    });
  });

  describe('getDefaultArcs', () => {
    it('standard mount with zero eligible: zero-forward + forward', () => {
      const arcs = getDefaultArcs('standard', 'medium', true);
      expect(arcs).toEqual(['zero-forward', 'forward']);
    });

    it('standard mount without zero eligible: forward only', () => {
      const arcs = getDefaultArcs('standard', 'medium', false);
      expect(arcs).toEqual(['forward']);
    });

    it('turret mount with zero eligible: zero-forward + forward + starboard + port', () => {
      const arcs = getDefaultArcs('turret', 'medium', true);
      expect(arcs).toEqual(['zero-forward', 'forward', 'starboard', 'port']);
    });

    it('sponson mount: zero-forward + forward + starboard (2 standard arcs)', () => {
      const arcs = getDefaultArcs('sponson', 'medium', true);
      expect(arcs).toEqual(['zero-forward', 'forward', 'starboard']);
    });

    it('fixed mount ignores zero eligibility: forward only', () => {
      const arcs = getDefaultArcs('fixed', 'medium', true);
      expect(arcs).toEqual(['forward']);
    });

    it('small-craft with zero eligible: all 4 zero arcs + standard arcs', () => {
      const arcs = getDefaultArcs('standard', 'small-craft', true);
      expect(arcs).toEqual(['zero-forward', 'zero-starboard', 'zero-port', 'zero-aft', 'forward']);
    });

    it('small-craft without zero eligible: forward only', () => {
      const arcs = getDefaultArcs('standard', 'small-craft', false);
      expect(arcs).toEqual(['forward']);
    });

    it('small-craft fixed mount: forward only (no zeros)', () => {
      const arcs = getDefaultArcs('fixed', 'small-craft', true);
      expect(arcs).toEqual(['forward']);
    });
  });

  describe('validateArcs', () => {
    it('returns empty string for valid standard mount', () => {
      expect(validateArcs(['forward'], 'standard', 'medium', true)).toBe('');
    });

    it('rejects empty arcs', () => {
      expect(validateArcs([], 'standard', 'medium', true)).toBe('At least one arc must be selected');
    });

    it('rejects zero arcs when weapon cannot use them', () => {
      expect(validateArcs(['zero-forward', 'forward'], 'standard', 'medium', false))
        .toBe('Only Small and Light firepower weapons can use zero arcs');
    });

    it('rejects zero arcs on fixed mount', () => {
      // Fixed mount checks arc count first — 1 zero arc doesn't satisfy the "exactly 1 standard arc" rule
      expect(validateArcs(['zero-forward'], 'fixed', 'medium', true))
        .toContain('Fixed mounts must have exactly 1 arc(s)');
    });

    it('fixed mount requires exactly 1 standard arc', () => {
      expect(validateArcs(['forward', 'starboard'], 'fixed', 'medium', false))
        .toContain('Fixed mounts must have exactly 1 arc(s)');
    });

    it('accepts valid fixed mount with 1 arc', () => {
      expect(validateArcs(['forward'], 'fixed', 'medium', false)).toBe('');
    });

    it('rejects too many standard arcs for standard mount', () => {
      expect(validateArcs(['forward', 'starboard'], 'standard', 'medium', false))
        .toContain('Maximum 1 standard arc(s)');
    });

    it('accepts valid turret mount with 3 standard arcs', () => {
      expect(validateArcs(['forward', 'starboard', 'port'], 'turret', 'medium', false)).toBe('');
    });

    it('rejects turret mount with too many standard arcs', () => {
      expect(validateArcs(['forward', 'starboard', 'port', 'aft'], 'turret', 'medium', false))
        .toContain('Maximum 3 standard arc(s)');
    });

    it('accepts turret mount with 1 zero + 3 standard', () => {
      expect(validateArcs(
        ['zero-forward', 'forward', 'starboard', 'port'],
        'turret', 'medium', true
      )).toBe('');
    });

    it('rejects more than 1 zero arc on non-small-craft', () => {
      expect(validateArcs(
        ['zero-forward', 'zero-starboard', 'forward'],
        'turret', 'medium', true
      )).toContain('Maximum 1 zero arc(s)');
    });

    it('accepts all 4 zero arcs for small-craft', () => {
      expect(validateArcs(
        ['zero-forward', 'zero-starboard', 'zero-port', 'zero-aft', 'forward'],
        'standard', 'small-craft', true
      )).toBe('');
    });
  });

  describe('getArcDisplayName', () => {
    it('maps standard arcs correctly', () => {
      expect(getArcDisplayName('forward')).toBe('Fwd');
      expect(getArcDisplayName('starboard')).toBe('Stbd');
      expect(getArcDisplayName('port')).toBe('Port');
      expect(getArcDisplayName('aft')).toBe('Aft');
    });

    it('maps zero arcs correctly (same short names)', () => {
      expect(getArcDisplayName('zero-forward')).toBe('Fwd');
      expect(getArcDisplayName('zero-starboard')).toBe('Stbd');
      expect(getArcDisplayName('zero-port')).toBe('Port');
      expect(getArcDisplayName('zero-aft')).toBe('Aft');
    });
  });

  describe('formatArcs', () => {
    it('returns "None" for empty arcs', () => {
      expect(formatArcs([])).toBe('None');
    });

    it('formats a single standard arc', () => {
      expect(formatArcs(['forward'])).toBe('Fwd');
    });

    it('formats multiple standard arcs', () => {
      expect(formatArcs(['forward', 'starboard', 'port'])).toBe('Fwd, Stbd, Port');
    });

    it('formats zero arcs with Zero- prefix', () => {
      expect(formatArcs(['zero-forward'])).toBe('Zero-Fwd');
    });

    it('displays "All Zero" when all 4 zero arcs present', () => {
      expect(formatArcs(['zero-forward', 'zero-starboard', 'zero-port', 'zero-aft']))
        .toBe('All Zero');
    });

    it('shows "All Zero" + standard arcs combined', () => {
      const result = formatArcs([
        'zero-forward', 'zero-starboard', 'zero-port', 'zero-aft',
        'forward', 'starboard',
      ]);
      expect(result).toBe('All Zero, Fwd, Stbd');
    });

    it('shows individual zero arcs + standard arcs when not all 4', () => {
      const result = formatArcs(['zero-forward', 'forward', 'starboard']);
      expect(result).toBe('Zero-Fwd, Fwd, Stbd');
    });
  });
});
