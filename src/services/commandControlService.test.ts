import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CommandControlSystemType, InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledLaunchSystem } from '../types/ordnance';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getCommandControlSystemsData: vi.fn(),
  getLaunchSystemsData: vi.fn(),
}));

import {
  getAllCommandControlSystemTypes,
  getCommandControlSystemTypeById,
  filterCommandSystemsByShipSize,
  generateCommandControlId,
  createWeaponBatteryKey,
  parseWeaponBatteryKey,
  getWeaponBatteryDisplayName,
  getWeaponBatteries,
  getWeaponBatteryHullPoints,
  calculateCoverageBasedHullPoints,
  calculateRequiredComputerCoreHullPoints,
  calculateCommandControlHullPoints,
  calculateCommandControlPower,
  calculateCommandControlCost,
  calculateFireControlCost,
  calculateSensorControlCost,
  calculateCommandControlStats,
  hasCommandSystemInstalled,
  hasComputerCoreInstalled,
  getInstalledComputerCoreQuality,
  getMaxControlQualityForCore,
  getFireControlsForBattery,
  getSensorControlForSensor,
  getOrphanedFireControls,
  getOrphanedSensorControls,
  batteryHasFireControl,
  sensorHasSensorControl,
  getSensorControlBonus,
  getFireControlBonus,
} from './commandControlService';
import { getCommandControlSystemsData, getLaunchSystemsData } from './dataLoader';

// ============== Test Data ==============

function makeCCType(overrides: Partial<CommandControlSystemType> = {}): CommandControlSystemType {
  return {
    id: 'command-deck',
    name: 'Command Deck',
    progressLevel: 6,
    techTracks: [],
    category: 'command',
    hullPoints: 2,
    powerRequired: 2,
    cost: 100000,
    costPer: 'systemHp',
    description: 'Test command system',
    ...overrides,
  };
}

function makeInstalledCC(overrides: Partial<InstalledCommandControlSystem> = {}): InstalledCommandControlSystem {
  return {
    id: 'cc-1',
    type: makeCCType(),
    quantity: 1,
    hullPoints: 4,
    powerRequired: 2,
    cost: 400000,
    ...overrides,
  };
}

function makeWeapon(overrides: Partial<InstalledWeapon> = {}): InstalledWeapon {
  return {
    id: 'w-1',
    weaponType: { id: 'matter-beam', name: 'Matter Beam' } as InstalledWeapon['weaponType'],
    category: 'beam',
    mountType: 'turret',
    gunConfiguration: 'single',
    concealed: false,
    quantity: 1,
    arcs: ['forward'],
    hullPoints: 5,
    powerRequired: 3,
    cost: 500000,
    ...overrides,
  };
}

function makeSensor(overrides: Partial<InstalledSensor> = {}): InstalledSensor {
  return {
    id: 'sen-1',
    type: { id: 'active-sensor', name: 'Active Sensor' } as InstalledSensor['type'],
    quantity: 1,
    hullPoints: 5,
    powerRequired: 2,
    cost: 250000,
    arcsCovered: 1,
    trackingCapability: 2,
    ...overrides,
  };
}

function makeLaunchSystem(overrides: Partial<InstalledLaunchSystem> = {}): InstalledLaunchSystem {
  return {
    id: 'ls-1',
    launchSystemType: 'missile-rack',
    quantity: 1,
    extraHp: 0,
    loadout: [],
    totalCapacity: 4,
    hullPoints: 3,
    powerRequired: 1,
    cost: 200000,
    ...overrides,
  } as InstalledLaunchSystem;
}

// ============== Setup ==============

const mockGetCCData = getCommandControlSystemsData as ReturnType<typeof vi.fn>;
const mockGetLSData = getLaunchSystemsData as ReturnType<typeof vi.fn>;

const MOCK_LAUNCH_SYSTEM_DEFS = [
  { id: 'missile-rack', name: 'Missile Rack' },
  { id: 'bomb-rack', name: 'Bomb Rack' },
];

beforeEach(() => {
  vi.clearAllMocks();
  const systems = [
    makeCCType({ id: 'cockpit', name: 'Cockpit', category: 'command', isRequired: true, maxShipHullPoints: 50 }),
    makeCCType({ id: 'command-deck', name: 'Command Deck', category: 'command', isRequired: true, coveragePerHullPoint: 100, maxHullPoints: 10 }),
    makeCCType({ id: 'ordinary-core', name: 'Ordinary Computer Core', category: 'computer', isCore: true, quality: 'Ordinary', hullPoints: 0, coveragePerHullPoint: 200, costPer: 'systemHp' }),
    makeCCType({ id: 'good-core', name: 'Good Computer Core', category: 'computer', isCore: true, quality: 'Good', hullPoints: 0, coveragePerHullPoint: 200, costPer: 'systemHp', progressLevel: 7 }),
    makeCCType({ id: 'amazing-core', name: 'Amazing Computer Core', category: 'computer', isCore: true, quality: 'Amazing', hullPoints: 0, coveragePerHullPoint: 200, costPer: 'systemHp', progressLevel: 8 }),
    makeCCType({ id: 'fire-control-ordinary', name: 'Fire Control (Ord)', category: 'computer', linkedSystemType: 'weapon', quality: 'Ordinary', stepBonus: -1, requiresCore: true }),
    makeCCType({ id: 'sensor-control-ordinary', name: 'Sensor Control (Ord)', category: 'computer', linkedSystemType: 'sensor', quality: 'Ordinary', stepBonus: -1, requiresCore: true }),
    makeCCType({ id: 'radio-transceiver', name: 'Radio Transceiver', category: 'communication', hullPoints: 1 }),
    makeCCType({ id: 'attack-computer', name: 'Attack Computer', category: 'computer', stepBonus: -2 }),
  ];
  mockGetCCData.mockReturnValue(systems);
  mockGetLSData.mockReturnValue(MOCK_LAUNCH_SYSTEM_DEFS);
});

// ============== Tests ==============

describe('commandControlService', () => {

  // ---------- Getters ----------

  describe('getAllCommandControlSystemTypes', () => {
    it('returns all C&C systems from data loader', () => {
      const result = getAllCommandControlSystemTypes();
      expect(result).toHaveLength(9);
    });
  });

  describe('getCommandControlSystemTypeById', () => {
    it('returns the matching type', () => {
      const result = getCommandControlSystemTypeById('cockpit');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Cockpit');
    });

    it('returns undefined for unknown id', () => {
      expect(getCommandControlSystemTypeById('nonexistent')).toBeUndefined();
    });
  });

  // ---------- Filtering ----------

  describe('filterCommandSystemsByShipSize', () => {
    it('includes cockpit for small ships', () => {
      const all = getAllCommandControlSystemTypes();
      const result = filterCommandSystemsByShipSize(all, 30);
      expect(result.find(s => s.id === 'cockpit')).toBeDefined();
    });

    it('excludes cockpit for large ships', () => {
      const all = getAllCommandControlSystemTypes();
      const result = filterCommandSystemsByShipSize(all, 100);
      expect(result.find(s => s.id === 'cockpit')).toBeUndefined();
    });

    it('always includes non-command systems', () => {
      const all = getAllCommandControlSystemTypes();
      const result = filterCommandSystemsByShipSize(all, 100);
      expect(result.find(s => s.id === 'radio-transceiver')).toBeDefined();
      expect(result.find(s => s.id === 'ordinary-core')).toBeDefined();
    });

    it('includes cockpit at exactly max HP', () => {
      const all = getAllCommandControlSystemTypes();
      const result = filterCommandSystemsByShipSize(all, 50);
      expect(result.find(s => s.id === 'cockpit')).toBeDefined();
    });
  });

  // ---------- ID Generation ----------

  describe('generateCommandControlId', () => {
    it('returns a string starting with cc-', () => {
      expect(generateCommandControlId()).toMatch(/^cc-/);
    });
  });

  // ---------- Weapon Battery Key ----------

  describe('createWeaponBatteryKey', () => {
    it('creates key from weapon type ID and mount type', () => {
      expect(createWeaponBatteryKey('matter-beam', 'turret')).toBe('matter-beam:turret');
    });
  });

  describe('parseWeaponBatteryKey', () => {
    it('parses key back into components', () => {
      const parsed = parseWeaponBatteryKey('matter-beam:turret');
      expect(parsed.weaponTypeId).toBe('matter-beam');
      expect(parsed.mountType).toBe('turret');
    });
  });

  // ---------- Weapon Battery Functions ----------

  describe('getWeaponBatteryDisplayName', () => {
    it('returns formatted name for regular weapons', () => {
      const weapons = [makeWeapon()];
      const name = getWeaponBatteryDisplayName('matter-beam:turret', weapons);
      expect(name).toBe('Matter Beam Turret');
    });

    it('returns key for unknown weapon', () => {
      const name = getWeaponBatteryDisplayName('unknown:fixed', []);
      expect(name).toBe('unknown:fixed');
    });

    it('returns launch system name for launchers', () => {
      const launchSystems = [makeLaunchSystem({ launchSystemType: 'missile-rack' as const })];
      const name = getWeaponBatteryDisplayName('missile-rack:launcher', [], launchSystems);
      expect(name).toBe('Missile Rack Launcher');
    });
  });

  describe('getWeaponBatteries', () => {
    it('groups weapons by type and mount', () => {
      const weapons = [
        makeWeapon({ id: 'w-1', weaponType: { id: 'matter-beam', name: 'Matter Beam' } as InstalledWeapon['weaponType'], mountType: 'turret', hullPoints: 5, quantity: 2 }),
        makeWeapon({ id: 'w-2', weaponType: { id: 'matter-beam', name: 'Matter Beam' } as InstalledWeapon['weaponType'], mountType: 'turret', hullPoints: 5, quantity: 1 }),
        makeWeapon({ id: 'w-3', weaponType: { id: 'plasma-gun', name: 'Plasma Gun' } as InstalledWeapon['weaponType'], mountType: 'fixed', hullPoints: 3, quantity: 1 }),
      ];
      const batteries = getWeaponBatteries(weapons);
      expect(batteries).toHaveLength(2);

      const beamBattery = batteries.find(b => b.key === 'matter-beam:turret');
      expect(beamBattery).toBeDefined();
      expect(beamBattery!.weaponCount).toBe(3); // 2+1
      expect(beamBattery!.totalHullPoints).toBe(15); // 5*2 + 5*1

      const plasmaBattery = batteries.find(b => b.key === 'plasma-gun:fixed');
      expect(plasmaBattery).toBeDefined();
      expect(plasmaBattery!.weaponCount).toBe(1);
    });

    it('includes launch systems as launcher batteries', () => {
      const launchSystems = [
        makeLaunchSystem({ launchSystemType: 'missile-rack' as const, hullPoints: 3, quantity: 2 }),
      ];
      const batteries = getWeaponBatteries([], launchSystems);
      expect(batteries).toHaveLength(1);
      expect(batteries[0].key).toBe('missile-rack:launcher');
      expect(batteries[0].weaponCount).toBe(2);
      expect(batteries[0].totalHullPoints).toBe(3);
    });

    it('returns empty array for no weapons or launches', () => {
      expect(getWeaponBatteries([])).toHaveLength(0);
    });
  });

  describe('getWeaponBatteryHullPoints', () => {
    it('returns total HP for a weapon battery', () => {
      const weapons = [
        makeWeapon({ weaponType: { id: 'beam', name: 'Beam' } as InstalledWeapon['weaponType'], mountType: 'turret', hullPoints: 5, quantity: 2 }),
        makeWeapon({ weaponType: { id: 'beam', name: 'Beam' } as InstalledWeapon['weaponType'], mountType: 'turret', hullPoints: 3, quantity: 1 }),
      ];
      expect(getWeaponBatteryHullPoints('beam:turret', weapons)).toBe(13); // 5*2 + 3*1
    });

    it('returns HP for launch system battery', () => {
      const launchSystems = [
        makeLaunchSystem({ launchSystemType: 'missile-rack' as const, hullPoints: 5 }),
        makeLaunchSystem({ launchSystemType: 'missile-rack' as const, hullPoints: 3 }),
      ];
      expect(getWeaponBatteryHullPoints('missile-rack:launcher', [], launchSystems)).toBe(8);
    });

    it('returns 0 for non-matching battery', () => {
      expect(getWeaponBatteryHullPoints('nonexistent:turret', [])).toBe(0);
    });
  });

  // ---------- Coverage-Based HP ----------

  describe('calculateCoverageBasedHullPoints', () => {
    it('calculates base + coverage HP', () => {
      // base=2, coveragePerHullPoint=100, ship=400 → 2 + ceil(400/100) = 6
      const type = { hullPoints: 2, coveragePerHullPoint: 100 };
      expect(calculateCoverageBasedHullPoints(400, type)).toBe(6);
    });

    it('returns base HP when no coverage defined', () => {
      const type = { hullPoints: 5 };
      expect(calculateCoverageBasedHullPoints(400, type)).toBe(5);
    });

    it('applies max hull points cap', () => {
      // base=2, coverage=100, max=10, ship=2000 → 2+ceil(2000/100)=22, capped to 10
      const type = { hullPoints: 2, coveragePerHullPoint: 100, maxHullPoints: 10 };
      expect(calculateCoverageBasedHullPoints(2000, type)).toBe(10);
    });

    it('does not cap when below max', () => {
      const type = { hullPoints: 2, coveragePerHullPoint: 100, maxHullPoints: 10 };
      expect(calculateCoverageBasedHullPoints(200, type)).toBe(4); // 2+2
    });

    it('rounds up coverage HP', () => {
      // base=0, coveragePerHullPoint=200, ship=350 → ceil(350/200) = 2
      const type = { hullPoints: 0, coveragePerHullPoint: 200 };
      expect(calculateCoverageBasedHullPoints(350, type)).toBe(2);
    });
  });

  describe('calculateRequiredComputerCoreHullPoints', () => {
    it('calculates core HP from computer core data', () => {
      // Mocked cores have coveragePerHullPoint=200
      // ship=400 → ceil(400/200) = 2
      expect(calculateRequiredComputerCoreHullPoints(400)).toBe(2);
    });

    it('rounds up fractional HP', () => {
      // ship=350 → ceil(350/200) = 2
      expect(calculateRequiredComputerCoreHullPoints(350)).toBe(2);
    });
  });

  // ---------- C&C Calculations ----------

  describe('calculateCommandControlHullPoints', () => {
    it('calculates HP for coverage-based systems', () => {
      const type = makeCCType({ hullPoints: 2, coveragePerHullPoint: 100, maxHullPoints: 10 });
      // ship=400 → (2+ceil(400/100)) = 6, × quantity=2 = 12
      expect(calculateCommandControlHullPoints(type, 400, 2)).toBe(12);
    });

    it('calculates HP for fixed-size systems', () => {
      const type = makeCCType({ hullPoints: 1, costPer: 'unit' });
      expect(calculateCommandControlHullPoints(type, 400, 3)).toBe(3);
    });
  });

  describe('calculateCommandControlPower', () => {
    it('calculates power as powerRequired × quantity', () => {
      const type = makeCCType({ powerRequired: 3 });
      expect(calculateCommandControlPower(type, 5)).toBe(15);
    });
  });

  describe('calculateCommandControlCost', () => {
    it('calculates cost for coverage+systemHp types', () => {
      // coveragePerHullPoint=200, costPer=systemHp, base hp=0, cost=100000
      // ship=400 → systemHP = ceil(400/200)=2 → cost=100000*2*1 = 200000
      const type = makeCCType({ hullPoints: 0, coveragePerHullPoint: 200, costPer: 'systemHp', cost: 100000 });
      expect(calculateCommandControlCost(type, 400, 1)).toBe(200000);
    });

    it('returns 0 for linked system types', () => {
      const type = makeCCType({ linkedSystemType: 'weapon', costPer: 'unit' });
      expect(calculateCommandControlCost(type, 400, 1)).toBe(0);
    });

    it('calculates cost for standard per-quantity systems', () => {
      const type = makeCCType({ cost: 50000, costPer: 'unit' });
      expect(calculateCommandControlCost(type, 400, 3)).toBe(150000);
    });
  });

  describe('calculateFireControlCost', () => {
    it('calculates cost based on linked battery HP', () => {
      const fcType = makeCCType({ cost: 10000, linkedSystemType: 'weapon' });
      const weapons = [makeWeapon({ hullPoints: 5, quantity: 2, mountType: 'turret' })];
      // Battery HP = 5*2 = 10, cost = 10000 * 10 = 100000
      expect(calculateFireControlCost(fcType, 'matter-beam:turret', weapons)).toBe(100000);
    });

    it('returns 0 when no battery key', () => {
      const fcType = makeCCType({ cost: 10000 });
      expect(calculateFireControlCost(fcType, undefined, [])).toBe(0);
    });
  });

  describe('calculateSensorControlCost', () => {
    it('calculates cost based on linked sensor HP', () => {
      const scType = makeCCType({ cost: 20000, linkedSystemType: 'sensor' });
      const sensors = [makeSensor({ id: 'sen-1', hullPoints: 8 })];
      expect(calculateSensorControlCost(scType, 'sen-1', sensors)).toBe(160000);
    });

    it('returns 0 when no sensor linked', () => {
      expect(calculateSensorControlCost(makeCCType(), undefined, [])).toBe(0);
    });

    it('returns 0 when linked sensor not found', () => {
      expect(calculateSensorControlCost(makeCCType(), 'nonexistent', [])).toBe(0);
    });
  });

  // ---------- Stats ----------

  describe('calculateCommandControlStats', () => {
    it('aggregates stats for mixed C&C systems', () => {
      const commandType = makeCCType({ id: 'command-deck', name: 'Command Deck', category: 'command', isRequired: true });
      const coreType = makeCCType({ id: 'ordinary-core', category: 'computer', isCore: true, quality: 'Ordinary' });
      const transceiverType = makeCCType({ id: 'radio', name: 'Radio Transceiver', category: 'communication' });
      const attackType = makeCCType({ id: 'attack-computer', name: 'Attack Computer', category: 'computer', stepBonus: -2 });

      const systems: InstalledCommandControlSystem[] = [
        makeInstalledCC({ type: commandType, quantity: 4, hullPoints: 6, powerRequired: 8, cost: 600000 }),
        makeInstalledCC({ type: coreType, quantity: 2, hullPoints: 2, powerRequired: 2, cost: 200000 }),
        makeInstalledCC({ type: transceiverType, quantity: 1, hullPoints: 1, powerRequired: 1, cost: 50000 }),
        makeInstalledCC({ type: attackType, quantity: 1, hullPoints: 1, powerRequired: 1, cost: 100000 }),
      ];

      const stats = calculateCommandControlStats(systems, 400);

      expect(stats.totalHullPoints).toBe(10);
      expect(stats.totalPowerRequired).toBe(12);
      expect(stats.totalCost).toBe(950000);
      expect(stats.hasCommandSystem).toBe(true);
      expect(stats.commandSystemName).toBe('Command Deck');
      expect(stats.commandStations).toBe(4);
      expect(stats.hasComputerCore).toBe(true);
      expect(stats.computerCoreQuality).toBe('Ordinary');
      expect(stats.installedComputerCoreHullPoints).toBe(2);
      expect(stats.attackBonus).toBe(-2);
      expect(stats.installedTransceivers).toEqual(['Radio Transceiver']);
    });

    it('returns empty stats for no systems', () => {
      const stats = calculateCommandControlStats([], 100);
      expect(stats.hasCommandSystem).toBe(false);
      expect(stats.commandSystemName).toBeNull();
      expect(stats.hasComputerCore).toBe(false);
      expect(stats.computerCoreQuality).toBeNull();
      expect(stats.installedTransceivers).toEqual([]);
    });
  });

  // ---------- Helpers ----------

  describe('hasCommandSystemInstalled', () => {
    it('returns true when required command system exists', () => {
      const cmdType = makeCCType({ category: 'command', isRequired: true });
      expect(hasCommandSystemInstalled([makeInstalledCC({ type: cmdType })])).toBe(true);
    });

    it('returns false when no command system', () => {
      const coreType = makeCCType({ category: 'computer', isCore: true });
      expect(hasCommandSystemInstalled([makeInstalledCC({ type: coreType })])).toBe(false);
    });

    it('returns false for empty list', () => {
      expect(hasCommandSystemInstalled([])).toBe(false);
    });
  });

  describe('hasComputerCoreInstalled', () => {
    it('returns true when core exists', () => {
      const coreType = makeCCType({ isCore: true });
      expect(hasComputerCoreInstalled([makeInstalledCC({ type: coreType })])).toBe(true);
    });

    it('returns false when no core', () => {
      expect(hasComputerCoreInstalled([makeInstalledCC()])).toBe(false);
    });
  });

  describe('getInstalledComputerCoreQuality', () => {
    it('returns the best quality among installed cores', () => {
      const ordinary = makeCCType({ isCore: true, quality: 'Ordinary' });
      const good = makeCCType({ isCore: true, quality: 'Good' });
      const systems = [
        makeInstalledCC({ type: ordinary }),
        makeInstalledCC({ type: good }),
      ];
      expect(getInstalledComputerCoreQuality(systems)).toBe('Good');
    });

    it('returns Amazing when it is installed', () => {
      const amazing = makeCCType({ isCore: true, quality: 'Amazing' });
      expect(getInstalledComputerCoreQuality([makeInstalledCC({ type: amazing })])).toBe('Amazing');
    });

    it('returns null when no cores', () => {
      expect(getInstalledComputerCoreQuality([])).toBeNull();
    });
  });

  describe('getMaxControlQualityForCore', () => {
    it('returns the core quality when provided', () => {
      expect(getMaxControlQualityForCore('Good')).toBe('Good');
      expect(getMaxControlQualityForCore('Amazing')).toBe('Amazing');
    });

    it('returns Ordinary when core is null', () => {
      expect(getMaxControlQualityForCore(null)).toBe('Ordinary');
    });
  });

  // ---------- Fire Control / Sensor Control ----------

  describe('getFireControlsForBattery', () => {
    it('returns fire controls linked to a specific battery', () => {
      const fcType = makeCCType({ linkedSystemType: 'weapon' });
      const fc1 = makeInstalledCC({ id: 'fc-1', type: fcType, linkedWeaponBatteryKey: 'beam:turret' });
      const fc2 = makeInstalledCC({ id: 'fc-2', type: fcType, linkedWeaponBatteryKey: 'other:fixed' });
      const fc3 = makeInstalledCC({ id: 'fc-3', type: fcType, linkedWeaponBatteryKey: 'beam:turret' });

      const result = getFireControlsForBattery('beam:turret', [fc1, fc2, fc3]);
      expect(result).toHaveLength(2);
      expect(result.map(f => f.id)).toEqual(['fc-1', 'fc-3']);
    });
  });

  describe('getSensorControlForSensor', () => {
    it('returns sensor control linked to a specific sensor', () => {
      const scType = makeCCType({ linkedSystemType: 'sensor' });
      const sc = makeInstalledCC({ id: 'sc-1', type: scType, linkedSensorId: 'sen-1' });
      expect(getSensorControlForSensor('sen-1', [sc])).toBe(sc);
    });

    it('returns undefined when no sensor control found', () => {
      expect(getSensorControlForSensor('sen-1', [])).toBeUndefined();
    });
  });

  describe('getOrphanedFireControls', () => {
    it('returns fire controls whose batteries no longer exist', () => {
      const fcType = makeCCType({ linkedSystemType: 'weapon' });
      const fc1 = makeInstalledCC({ id: 'fc-1', type: fcType, linkedWeaponBatteryKey: 'deleted-weapon:turret' });
      const fc2 = makeInstalledCC({ id: 'fc-2', type: fcType, linkedWeaponBatteryKey: 'matter-beam:turret' });
      const weapons = [makeWeapon()]; // has matter-beam:turret

      const orphans = getOrphanedFireControls([fc1, fc2], weapons);
      expect(orphans).toHaveLength(1);
      expect(orphans[0].id).toBe('fc-1');
    });

    it('marks unassigned fire controls as orphans', () => {
      const fcType = makeCCType({ linkedSystemType: 'weapon' });
      const fc = makeInstalledCC({ type: fcType }); // no linkedWeaponBatteryKey
      expect(getOrphanedFireControls([fc], [])).toHaveLength(1);
    });

    it('returns empty for all valid links', () => {
      const fcType = makeCCType({ linkedSystemType: 'weapon' });
      const fc = makeInstalledCC({ type: fcType, linkedWeaponBatteryKey: 'matter-beam:turret' });
      const weapons = [makeWeapon()];
      expect(getOrphanedFireControls([fc], weapons)).toHaveLength(0);
    });
  });

  describe('getOrphanedSensorControls', () => {
    it('returns sensor controls whose sensors no longer exist', () => {
      const scType = makeCCType({ linkedSystemType: 'sensor' });
      const sc1 = makeInstalledCC({ id: 'sc-1', type: scType, linkedSensorId: 'deleted-sensor' });
      const sc2 = makeInstalledCC({ id: 'sc-2', type: scType, linkedSensorId: 'sen-1' });
      const sensors = [makeSensor({ id: 'sen-1' })];

      const orphans = getOrphanedSensorControls([sc1, sc2], sensors);
      expect(orphans).toHaveLength(1);
      expect(orphans[0].id).toBe('sc-1');
    });

    it('marks unassigned sensor controls as orphans', () => {
      const scType = makeCCType({ linkedSystemType: 'sensor' });
      const sc = makeInstalledCC({ type: scType }); // no linkedSensorId
      expect(getOrphanedSensorControls([sc], [])).toHaveLength(1);
    });
  });

  describe('batteryHasFireControl', () => {
    it('returns true when battery has fire control', () => {
      const fcType = makeCCType({ linkedSystemType: 'weapon' });
      const fc = makeInstalledCC({ type: fcType, linkedWeaponBatteryKey: 'beam:turret' });
      expect(batteryHasFireControl('beam:turret', [fc])).toBe(true);
    });

    it('returns false when battery has no fire control', () => {
      expect(batteryHasFireControl('beam:turret', [])).toBe(false);
    });
  });

  describe('sensorHasSensorControl', () => {
    it('returns true when sensor has control', () => {
      const scType = makeCCType({ linkedSystemType: 'sensor' });
      const sc = makeInstalledCC({ type: scType, linkedSensorId: 'sen-1' });
      expect(sensorHasSensorControl('sen-1', [sc])).toBe(true);
    });

    it('returns false when sensor has no control', () => {
      expect(sensorHasSensorControl('sen-1', [])).toBe(false);
    });
  });

  describe('getSensorControlBonus', () => {
    it('returns step bonus from linked sensor control', () => {
      const scType = makeCCType({ linkedSystemType: 'sensor', stepBonus: -2 });
      const sc = makeInstalledCC({ type: scType, linkedSensorId: 'sen-1' });
      expect(getSensorControlBonus('sen-1', [sc])).toBe(-2);
    });

    it('returns 0 when no sensor control', () => {
      expect(getSensorControlBonus('sen-1', [])).toBe(0);
    });
  });

  describe('getFireControlBonus', () => {
    it('returns best (most negative) bonus from fire controls', () => {
      const ord = makeCCType({ linkedSystemType: 'weapon', stepBonus: -1 });
      const good = makeCCType({ linkedSystemType: 'weapon', stepBonus: -2 });
      const fc1 = makeInstalledCC({ type: ord, linkedWeaponBatteryKey: 'beam:turret' });
      const fc2 = makeInstalledCC({ type: good, linkedWeaponBatteryKey: 'beam:turret' });
      expect(getFireControlBonus('beam:turret', [fc1, fc2])).toBe(-2);
    });

    it('returns 0 when no fire controls', () => {
      expect(getFireControlBonus('beam:turret', [])).toBe(0);
    });
  });
});
