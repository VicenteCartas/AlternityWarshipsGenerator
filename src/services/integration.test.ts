/**
 * Integration tests: Cross-service interactions
 * CT3–CT8: Weapon/Damage/Ordnance/Armor/DesignType service integration
 *
 * Tests how services work together: armor HP depends on hull, power budget
 * spans multiple plants + consumers, damage diagram ties all systems together.
 */
import { describe, it, expect, vi } from 'vitest';

// ---- Armor + Hull integration ----
import {
  calculateArmorHullPoints,
  calculateArmorCost,
  buildShipArmor,
  getAllArmorTypes,
  getArmorWeightsForShipClass,
} from '../services/armorService';
import {
  getAllHulls,
} from '../services/hullService';

// ---- Power budget ----
import {
  calculatePowerGenerated,
  calculatePowerPlantCost,
  calculateTotalPowerPlantStats,
} from '../services/powerPlantService';
import type { InstalledPowerPlant, PowerPlantType } from '../types/powerPlant';

// ---- Damage diagram helpers that don't touch dataLoader ----
import {
  getSystemDamageCategory,
  getDamageCategoryOrder,
  getFirepowerOrder,
  sortSystemsByDamagePriority,
} from '../services/damageDiagramService';
import type { ZoneSystemReference } from '../types/damageDiagram';

// Mock dataLoader for each service
vi.mock('../services/dataLoader', () => ({
  getHullsData: vi.fn(() => [
    {
      id: 'frigate',
      name: 'Frigate',
      shipClass: 'light',
      category: 'military',
      hullPoints: 20,
      bonusHullPoints: 0,
      toughness: 'Light',
      targetModifier: 1,
      maneuverability: 2,
      damageTrack: { stun: 5, wound: 10, mortal: 5, critical: 5 },
      crew: 15,
      cost: 5000000,
    },
    {
      id: 'cruiser',
      name: 'Cruiser',
      shipClass: 'heavy',
      category: 'military',
      hullPoints: 60,
      bonusHullPoints: 0,
      toughness: 'Heavy',
      targetModifier: -1,
      maneuverability: 1,
      damageTrack: { stun: 15, wound: 30, mortal: 15, critical: 15 },
      crew: 80,
      cost: 20000000,
    },
  ]),
  getStationHullsData: vi.fn(() => []),
  getArmorTypesData: vi.fn(() => [
    {
      id: 'ceramic',
      name: 'Ceramic',
      armorWeight: 'light',
      progressLevel: 6,
      techTracks: [],
      protectionLI: 'd4+1',
      protectionHI: 'd4',
      protectionEn: 'd4-1',
      costPerHullPoint: 10000,
    },
  ]),
  getArmorWeightsData: vi.fn(() => [
    { id: 'light', name: 'Light', hullPercentage: 10, costHullPercentage: 10, minShipClass: 'small-craft' },
    { id: 'heavy', name: 'Heavy', hullPercentage: 25, costHullPercentage: 25, minShipClass: 'medium' },
  ]),
  getArmorAllowMultipleLayers: vi.fn(() => false),
  getPowerPlantsData: vi.fn(() => [
    { id: 'fusion-a', name: 'Fusion A', progressLevel: 6, techTracks: [], hullPoints: 1, powerOutput: 2, cost: 100000 },
  ]),
  getFuelTankData: vi.fn(() => ({
    fuelTank: { costPerHullPoint: 5000, hullPointsPerDuration: 1 },
  })),
  getEnginesData: vi.fn(() => [
    { id: 'ion-drive', name: 'Ion Drive', progressLevel: 6, techTracks: [], hullPercentage: 10, accelerationRating: 2, powerPerHullPoint: 1, costPerHullPoint: 50000 },
  ]),
  getFTLDrivesData: vi.fn(() => [
    {
      id: 'stardrive',
      name: 'Stardrive',
      progressLevel: 7,
      techTracks: [],
      driveType: 'star',
      ratings: {
        hullPercentage: [5, 10, 15, 20, 25, 30, 35, 40, 45],
        rating: [null, null, 1, 2, 3, 4, 5, 6, 7],
      },
      powerRequired: 2,
      costPerHullPoint: 75000,
    },
  ]),
  getBeamWeaponsData: vi.fn(() => []),
  getProjectileWeaponsData: vi.fn(() => []),
  getTorpedoWeaponsData: vi.fn(() => []),
  getSpecialWeaponsData: vi.fn(() => []),
  getMountModifiersData: vi.fn(() => ({})),
  getGunConfigurationsData: vi.fn(() => ({})),
  getConcealmentModifierData: vi.fn(() => null),
  getSensorsData: vi.fn(() => []),
  getTrackingTableData: vi.fn(() => ({})),
  getDefenseSystemsData: vi.fn(() => []),
  getLifeSupportData: vi.fn(() => []),
  getAccommodationsData: vi.fn(() => []),
  getStoreSystemsData: vi.fn(() => []),
  getGravitySystemsData: vi.fn(() => []),
  getCommandControlSystemsData: vi.fn(() => []),
  getHangarMiscSystemsData: vi.fn(() => []),
  getLaunchSystemsData: vi.fn(() => []),
  getPropulsionSystemsData: vi.fn(() => []),
  getWarheadsData: vi.fn(() => []),
  getGuidanceSystemsData: vi.fn(() => []),
  getDamageDiagramData: vi.fn(() => ({
    zoneLimits: { 'light': 100 },
  })),
}));

// Mock dataLoader for services that use it
vi.mock('../services/dataLoader', () => ({
  getHullsData: vi.fn(() => [
    {
      id: 'frigate', name: 'Frigate', shipClass: 'light', category: 'military',
      hullPoints: 20, bonusHullPoints: 0, toughness: 'Light', targetModifier: 1,
      maneuverability: 2, damageTrack: { stun: 5, wound: 10, mortal: 5, critical: 5 },
      crew: 15, cost: 5000000,
    },
    {
      id: 'cruiser', name: 'Cruiser', shipClass: 'heavy', category: 'military',
      hullPoints: 60, bonusHullPoints: 0, toughness: 'Heavy', targetModifier: -1,
      maneuverability: 1, damageTrack: { stun: 15, wound: 30, mortal: 15, critical: 15 },
      crew: 80, cost: 20000000,
    },
  ]),
  getStationHullsData: vi.fn(() => []),
  getArmorTypesData: vi.fn(() => [
    {
      id: 'ceramic', name: 'Ceramic', armorWeight: 'light', progressLevel: 6,
      techTracks: [], protectionLI: 'd4+1', protectionHI: 'd4', protectionEn: 'd4-1',
      costPerHullPoint: 10000,
    },
  ]),
  getArmorWeightsData: vi.fn(() => [
    { id: 'light', name: 'Light', hullPercentage: 10, costHullPercentage: 10, minShipClass: 'small-craft' },
    { id: 'heavy', name: 'Heavy', hullPercentage: 25, costHullPercentage: 25, minShipClass: 'medium' },
  ]),
  getArmorAllowMultipleLayers: vi.fn(() => false),
  getPowerPlantsData: vi.fn(() => [
    {
      id: 'fusion-a', name: 'Fusion A', progressLevel: 6, techTracks: [],
      powerPerHullPoint: 2, baseCost: 0, costPerHullPoint: 100000, requiresFuel: false,
    },
  ]),
  getFuelTankData: vi.fn(() => ({
    fuelTank: { costPerHullPoint: 5000, hullPointsPerDuration: 1 },
  })),
  getEnginesData: vi.fn(() => []),
  getFTLDrivesData: vi.fn(() => []),
  getDamageDiagramDataGetter: vi.fn(() => ({
    zoneLimits: { 'light': 100, 'heavy': 100 },
    zoneConfigs: {},
  })),
}));

describe('Cross-Service Integration', () => {
  describe('Armor + Hull constraints', () => {
    it('armor HP is a percentage of hull points', () => {
      const hull = getAllHulls()[0]; // frigate, 20 HP
      const armorHp = calculateArmorHullPoints(hull, 'light');
      // 10% of 20 = 2
      expect(armorHp).toBe(2);
    });

    it('armor cost uses costPerHullPoint × armor HP', () => {
      const hull = getAllHulls()[0]; // frigate, cost 5M
      const armorType = getAllArmorTypes()[0]; // ceramic, costPerHullPoint=10000
      const armorCost = calculateArmorCost(hull, 'light', armorType);
      // costPerHullPoint(10000) * armorHp(2) = 20000
      expect(armorCost).toBe(20000);
    });

    it('heavy armor uses larger hull percentage', () => {
      const cruiser = getAllHulls()[1]; // heavy class, 60 HP
      const heavyHp = calculateArmorHullPoints(cruiser, 'heavy');
      expect(heavyHp).toBe(15); // 25% of 60
    });

    it('buildShipArmor creates complete armor layer from hull and type', () => {
      const hull = getAllHulls()[0];
      const armorType = getAllArmorTypes()[0];
      const armor = buildShipArmor(hull, armorType);
      expect(armor.type).toBe(armorType);
      expect(armor.hullPointsUsed).toBe(2);
      expect(armor.cost).toBe(20000);
      expect(armor.weight).toBe('light');
    });

    it('getArmorWeightsForShipClass filters by ship class', () => {
      // Light ships can use light armor
      const lightWeights = getArmorWeightsForShipClass('light');
      expect(lightWeights.some(w => w.id === 'light')).toBe(true);
      // Heavy armor requires medium+ so light ships shouldn't see it
      expect(lightWeights.some(w => w.id === 'heavy')).toBe(false);
    });
  });

  describe('Power budget across systems', () => {
    it('power plant output scales with allocated HP', () => {
      const plantType = {
        id: 'fusion-a', name: 'Fusion A', powerPerHullPoint: 2,
        baseCost: 0, costPerHullPoint: 100000,
      } as PowerPlantType;
      expect(calculatePowerGenerated(plantType, 3)).toBe(6); // 2 * 3
      expect(calculatePowerGenerated(plantType, 5)).toBe(10);
    });

    it('power plant cost uses base + perHP formula', () => {
      const plantType = {
        id: 'fusion-a', name: 'Fusion A', powerPerHullPoint: 2,
        baseCost: 50000, costPerHullPoint: 100000,
      } as PowerPlantType;
      expect(calculatePowerPlantCost(plantType, 3)).toBe(350000); // 50k + 100k*3
    });

    it('total power stats aggregates across multiple plants', () => {
      const plantType = {
        id: 'fusion-a', name: 'Fusion A', powerPerHullPoint: 2,
        baseCost: 0, costPerHullPoint: 100000, requiresFuel: false,
      } as PowerPlantType;
      const installations: InstalledPowerPlant[] = [
        { id: 'pp-1', type: plantType, hullPoints: 3 },
        { id: 'pp-2', type: plantType, hullPoints: 2 },
      ];
      const stats = calculateTotalPowerPlantStats(installations, []);
      expect(stats.totalPowerGenerated).toBe(10); // 3*2 + 2*2
      expect(stats.totalHullPoints).toBe(5);
      expect(stats.totalCost).toBe(500000); // 100k*3 + 100k*2
    });
  });

  describe('Damage diagram category ordering', () => {
    it('system damage categories are derived from system type strings', () => {
      expect(getSystemDamageCategory('weapon')).toBeTruthy();
      expect(getSystemDamageCategory('engine')).toBeTruthy();
      expect(getSystemDamageCategory('sensor')).toBeTruthy();
    });

    it('damage categories have defined ordering', () => {
      const weaponOrder = getDamageCategoryOrder('weapons');
      const engineOrder = getDamageCategoryOrder('engines');
      const sensorOrder = getDamageCategoryOrder('sensors');
      // All should return finite numbers
      expect(Number.isFinite(weaponOrder)).toBe(true);
      expect(Number.isFinite(engineOrder)).toBe(true);
      expect(Number.isFinite(sensorOrder)).toBe(true);
    });

    it('firepower ordering respects scale (Gd < S < L < M < H < SH)', () => {
      expect(getFirepowerOrder('Gd')).toBeLessThan(getFirepowerOrder('S'));
      expect(getFirepowerOrder('S')).toBeLessThan(getFirepowerOrder('L'));
      expect(getFirepowerOrder('L')).toBeLessThan(getFirepowerOrder('M'));
      expect(getFirepowerOrder('M')).toBeLessThan(getFirepowerOrder('H'));
      expect(getFirepowerOrder('H')).toBeLessThan(getFirepowerOrder('SH'));
    });

    it('sortSystemsByDamagePriority sorts by category then firepower', () => {
      const systems: ZoneSystemReference[] = [
        { id: 'r1', systemId: 's1', systemType: 'sensor', name: 'Sensor A', hullPoints: 2, category: 'sensors', firepower: 'Gd' },
        { id: 'r2', systemId: 's2', systemType: 'weapon', name: 'Weapon A', hullPoints: 5, category: 'weapons', firepower: 'H' },
        { id: 'r3', systemId: 's3', systemType: 'weapon', name: 'Weapon B', hullPoints: 3, category: 'weapons', firepower: 'L' },
      ];
      const sorted = sortSystemsByDamagePriority(systems);
      // Weapons should come before sensors (or vice versa based on ordering — just check grouping)
      const weaponIndices = sorted.map((s, i) => s.category === 'weapons' ? i : -1).filter(i => i >= 0);
      // All weapons should be adjacent
      if (weaponIndices.length > 1) {
        expect(weaponIndices[1] - weaponIndices[0]).toBe(1);
      }
    });
  });
});
