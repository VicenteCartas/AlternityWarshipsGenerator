import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WarshipSaveFile } from '../types/saveFile';
import { SAVE_FILE_VERSION } from '../types/saveFile';
import type { Hull } from '../types/hull';
import type { ArmorType, ShipArmor } from '../types/armor';

// ============== Mock All Service Dependencies ==============

vi.mock('./hullService', () => ({
  getAllHulls: vi.fn(() => []),
  getAllStationHulls: vi.fn(() => []),
}));

vi.mock('./armorService', () => ({
  getAllArmorTypes: vi.fn(() => []),
  buildShipArmor: vi.fn(),
}));

vi.mock('./powerPlantService', () => ({
  getAllPowerPlantTypes: vi.fn(() => []),
  generatePowerPlantFuelTankId: vi.fn(() => 'gen-fuel-id'),
}));

vi.mock('./engineService', () => ({
  getAllEngineTypes: vi.fn(() => []),
  generateEngineId: vi.fn(() => 'gen-engine-id'),
  generateEngineFuelTankId: vi.fn(() => 'gen-eng-fuel-id'),
}));

vi.mock('./ftlDriveService', () => ({
  getAllFTLDriveTypes: vi.fn(() => []),
  generateFTLDriveId: vi.fn(() => 'gen-ftl-id'),
  generateFTLFuelTankId: vi.fn(() => 'gen-ftl-fuel-id'),
}));

vi.mock('./supportSystemService', () => ({
  getAllLifeSupportTypes: vi.fn(() => []),
  getAllAccommodationTypes: vi.fn(() => []),
  getAllStoreSystemTypes: vi.fn(() => []),
  getAllGravitySystemTypes: vi.fn(() => []),
  generateLifeSupportId: vi.fn(() => 'gen-ls-id'),
  generateAccommodationId: vi.fn(() => 'gen-acc-id'),
  generateStoreSystemId: vi.fn(() => 'gen-store-id'),
  generateGravitySystemId: vi.fn(() => 'gen-grav-id'),
}));

vi.mock('./defenseService', () => ({
  getAllDefenseSystemTypes: vi.fn(() => []),
  generateDefenseId: vi.fn(() => 'gen-def-id'),
  calculateDefenseHullPoints: vi.fn(() => 5),
  calculateDefensePower: vi.fn(() => 2),
  calculateDefenseCost: vi.fn(() => 1),
}));

vi.mock('./commandControlService', () => ({
  getAllCommandControlSystemTypes: vi.fn(() => []),
  calculateCommandControlHullPoints: vi.fn(() => 3),
  calculateCommandControlPower: vi.fn(() => 1),
  calculateCommandControlCost: vi.fn(() => 0.5),
  calculateFireControlCost: vi.fn(() => 0.75),
  calculateSensorControlCost: vi.fn(() => 0.6),
  generateCommandControlId: vi.fn(() => 'gen-cc-id'),
}));

vi.mock('./sensorService', () => ({
  getAllSensorTypes: vi.fn(() => []),
  generateSensorId: vi.fn(() => 'gen-sensor-id'),
  calculateSensorHullPoints: vi.fn(() => 2),
  calculateSensorPower: vi.fn(() => 1),
  calculateSensorCost: vi.fn(() => 0.5),
  calculateTrackingCapability: vi.fn(() => 0),
  defaultArcsForSensor: vi.fn(() => ['forward']),
}));

vi.mock('./hangarMiscService', () => ({
  getAllHangarMiscSystemTypes: vi.fn(() => []),
  generateHangarMiscId: vi.fn(() => 'gen-hm-id'),
  calculateHangarMiscHullPoints: vi.fn(() => 10),
  calculateHangarMiscPower: vi.fn(() => 3),
  calculateHangarMiscCost: vi.fn(() => 2),
  calculateHangarMiscCapacity: vi.fn(() => 0),
}));

vi.mock('./weaponService', () => ({
  getAllBeamWeaponTypes: vi.fn(() => []),
  getAllProjectileWeaponTypes: vi.fn(() => []),
  getAllTorpedoWeaponTypes: vi.fn(() => []),
  getAllSpecialWeaponTypes: vi.fn(() => []),
  createInstalledWeapon: vi.fn(),
}));

vi.mock('./ordnanceService', () => ({
  getLaunchSystems: vi.fn(() => []),
  getPropulsionSystems: vi.fn(() => []),
  getWarheads: vi.fn(() => []),
  getGuidanceSystems: vi.fn(() => []),
  calculateLaunchSystemStats: vi.fn(() => ({ hullPoints: 5, powerRequired: 2, cost: 1, totalCapacity: 10 })),
  calculateMissileDesign: vi.fn(() => ({ totalAccuracy: 0, totalCost: 1, capacityRequired: 2 })),
  calculateBombDesign: vi.fn(() => ({ totalAccuracy: 0, totalCost: 0.5, capacityRequired: 1 })),
  calculateMineDesign: vi.fn(() => ({ totalAccuracy: 0, totalCost: 0.8, capacityRequired: 1 })),
  findPropulsionByCategory: vi.fn(),
}));

vi.mock('./dataLoader', () => ({
  getActiveMods: vi.fn(() => []),
}));

// ============== Imports (after mocks) ==============

import {
  serializeWarship,
  saveFileToJson,
  jsonToSaveFile,
  deserializeWarship,
  getDefaultFileName,
  type WarshipState,
} from './saveService';

import { getAllHulls, getAllStationHulls } from './hullService';
import { getAllArmorTypes, buildShipArmor } from './armorService';
import { getAllPowerPlantTypes } from './powerPlantService';
import { getAllEngineTypes } from './engineService';
import { getAllFTLDriveTypes } from './ftlDriveService';
import { getAllAccommodationTypes, getAllGravitySystemTypes } from './supportSystemService';
import { getAllDefenseSystemTypes, calculateDefenseHullPoints, calculateDefensePower, calculateDefenseCost } from './defenseService';
import { getAllCommandControlSystemTypes, calculateFireControlCost, calculateSensorControlCost } from './commandControlService';
import { getAllSensorTypes, calculateTrackingCapability } from './sensorService';
import { getAllBeamWeaponTypes, createInstalledWeapon } from './weaponService';
import { getWarheads, getPropulsionSystems, getGuidanceSystems, getLaunchSystems, calculateLaunchSystemStats, findPropulsionByCategory } from './ordnanceService';

// ============== Test Helpers ==============

function makeHull(overrides: Partial<Hull> = {}): Hull {
  return {
    id: 'test-hull',
    name: 'Test Hull',
    shipClass: 'medium',
    category: 'military',
    hullPoints: 200,
    cost: 50,
    durability: { ordinary: 100, good: 50, amazing: 50 },
    armor: 'd6',
    size: 'Huge',
    crew: { officers: 10, enlisted: 40, gunners: 20 },
    description: 'A test hull',
    progressLevel: 7,
    techTracks: [],
    acceleration: 0,
    ...overrides,
  } as Hull;
}

function makeMinimalSaveFile(overrides: Partial<WarshipSaveFile> = {}): WarshipSaveFile {
  return {
    version: SAVE_FILE_VERSION,
    name: 'Test Ship',
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z',
    hull: null,
    armor: null,
    designProgressLevel: 7,
    designTechTracks: [],
    powerPlants: [],
    fuelTanks: [],
    engines: [],
    engineFuelTanks: [],
    ftlDrive: null,
    ftlFuelTanks: [],
    lifeSupport: [],
    accommodations: [],
    storeSystems: [],
    gravitySystems: [],
    defenses: [],
    commandControl: [],
    sensors: [],
    hangarMisc: [],
    weapons: [],
    ordnanceDesigns: [],
    launchSystems: [],
    damageDiagramZones: [],
    hitLocationChart: null,
    systems: [],
    ...overrides,
  };
}

function makeMinimalState(overrides: Partial<WarshipState> = {}): WarshipState {
  return {
    name: 'Test Ship',
    shipDescription: { lore: '', imageData: null, imageMimeType: null, faction: '', role: '', commissioningDate: '', classification: '', manufacturer: '' },
    designType: 'warship',
    stationType: null,
    surfaceProvidesLifeSupport: false,
    surfaceProvidesGravity: false,
    hull: null,
    armorLayers: [],
    powerPlants: [],
    fuelTanks: [],
    engines: [],
    engineFuelTanks: [],
    ftlDrive: null,
    ftlFuelTanks: [],
    lifeSupport: [],
    accommodations: [],
    storeSystems: [],
    gravitySystems: [],
    defenses: [],
    commandControl: [],
    sensors: [],
    hangarMisc: [],
    weapons: [],
    ordnanceDesigns: [],
    launchSystems: [],
    damageDiagramZones: [],
    hitLocationChart: null,
    designProgressLevel: 7,
    designTechTracks: [],
    ...overrides,
  };
}

// ============== Setup ==============

beforeEach(() => {
  vi.clearAllMocks();
  // Default: return empty arrays for all type lookups
  (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllStationHulls as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllArmorTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllPowerPlantTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllEngineTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllFTLDriveTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllDefenseSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllCommandControlSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllSensorTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getAllBeamWeaponTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getWarheads as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getPropulsionSystems as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getGuidanceSystems as ReturnType<typeof vi.fn>).mockReturnValue([]);
  (getLaunchSystems as ReturnType<typeof vi.fn>).mockReturnValue([]);
});

// ============== Tests ==============

describe('saveService', () => {
  // ============== serializeWarship ==============

  describe('serializeWarship', () => {
    it('sets version to current SAVE_FILE_VERSION', () => {
      const state = makeMinimalState();
      const result = serializeWarship(state);
      expect(result.version).toBe(SAVE_FILE_VERSION);
    });

    it('sets createdAt and modifiedAt to current timestamp', () => {
      const before = new Date().toISOString();
      const state = makeMinimalState();
      const result = serializeWarship(state);
      const after = new Date().toISOString();
      expect(result.createdAt >= before).toBe(true);
      expect(result.modifiedAt <= after).toBe(true);
    });

    it('omits designType when warship (default)', () => {
      const state = makeMinimalState({ designType: 'warship' });
      const result = serializeWarship(state);
      expect(result.designType).toBeUndefined();
    });

    it('includes designType when station', () => {
      const state = makeMinimalState({ designType: 'station' });
      const result = serializeWarship(state);
      expect(result.designType).toBe('station');
    });

    it('omits stationType when null', () => {
      const state = makeMinimalState({ stationType: null });
      const result = serializeWarship(state);
      expect(result.stationType).toBeUndefined();
    });

    it('includes stationType when set', () => {
      const state = makeMinimalState({ designType: 'station', stationType: 'ground-base' });
      const result = serializeWarship(state);
      expect(result.stationType).toBe('ground-base');
    });

    it('omits surface flags when false', () => {
      const state = makeMinimalState({ surfaceProvidesLifeSupport: false, surfaceProvidesGravity: false });
      const result = serializeWarship(state);
      expect(result.surfaceProvidesLifeSupport).toBeUndefined();
      expect(result.surfaceProvidesGravity).toBeUndefined();
    });

    it('includes surface flags when true', () => {
      const state = makeMinimalState({ surfaceProvidesLifeSupport: true, surfaceProvidesGravity: true });
      const result = serializeWarship(state);
      expect(result.surfaceProvidesLifeSupport).toBe(true);
      expect(result.surfaceProvidesGravity).toBe(true);
    });

    it('serializes hull as ID only', () => {
      const hull = makeHull({ id: 'corvette' });
      const state = makeMinimalState({ hull });
      const result = serializeWarship(state);
      expect(result.hull).toEqual({ id: 'corvette' });
    });

    it('serializes null hull', () => {
      const state = makeMinimalState({ hull: null });
      const result = serializeWarship(state);
      expect(result.hull).toBeNull();
    });

    it('serializes single armor layer into both armor and armorLayers', () => {
      const armorType = { id: 'cerametal-medium', armorWeight: 'medium' } as ArmorType;
      const armor: ShipArmor = { weight: 'medium', type: armorType, hullPointsUsed: 10, cost: 5 };
      const state = makeMinimalState({ armorLayers: [armor] });
      const result = serializeWarship(state);
      expect(result.armor).toEqual({ id: 'cerametal-medium' });
      expect(result.armorLayers).toEqual([{ id: 'cerametal-medium' }]);
    });

    it('serializes multiple armor layers with null single armor', () => {
      const type1 = { id: 'light-1' } as ArmorType;
      const type2 = { id: 'heavy-1' } as ArmorType;
      const layers: ShipArmor[] = [
        { weight: 'light', type: type1, hullPointsUsed: 5, cost: 2 },
        { weight: 'heavy', type: type2, hullPointsUsed: 20, cost: 10 },
      ];
      const state = makeMinimalState({ armorLayers: layers });
      const result = serializeWarship(state);
      expect(result.armor).toBeNull(); // multi-layer → no single armor
      expect(result.armorLayers).toEqual([{ id: 'light-1' }, { id: 'heavy-1' }]);
    });

    it('serializes power plants stripping computed fields', () => {
      const ppType = { id: 'fusion-reactor', name: 'Fusion', progressLevel: 7 };
      const state = makeMinimalState({
        powerPlants: [{
          id: 'pp-1',
          type: ppType as never,
          hullPoints: 20,
        }],
      });
      const result = serializeWarship(state);
      expect(result.powerPlants).toEqual([{ id: 'pp-1', typeId: 'fusion-reactor', hullPoints: 20 }]);
    });

    it('serializes weapons stripping computed fields', () => {
      const weaponType = { id: 'laser' };
      const state = makeMinimalState({
        weapons: [{
          id: 'w-1',
          weaponType: weaponType as never,
          category: 'beam',
          mountType: 'turret',
          gunConfiguration: 'twin',
          concealed: true,
          quantity: 2,
          arcs: ['forward', 'starboard', 'port'],
          hullPoints: 10,
          powerRequired: 4,
          cost: 5,
        } as never],
      });
      const result = serializeWarship(state);
      expect(result.weapons).toEqual([{
        id: 'w-1',
        typeId: 'laser',
        category: 'beam',
        mountType: 'turret',
        gunConfiguration: 'twin',
        concealed: true,
        quantity: 2,
        arcs: ['forward', 'starboard', 'port'],
      }]);
    });

    it('serializes empty arrays as empty', () => {
      const state = makeMinimalState();
      const result = serializeWarship(state);
      expect(result.powerPlants).toEqual([]);
      expect(result.weapons).toEqual([]);
      expect(result.defenses).toEqual([]);
      expect(result.sensors).toEqual([]);
      expect(result.systems).toEqual([]);
    });

    it('serializes lore from shipDescription', () => {
      const state = makeMinimalState({
        shipDescription: { lore: 'A fearsome vessel', imageData: null, imageMimeType: null },
      });
      const result = serializeWarship(state);
      expect(result.lore).toBe('A fearsome vessel');
    });

    it('omits lore when empty', () => {
      const state = makeMinimalState({
        shipDescription: { lore: '', imageData: null, imageMimeType: null, faction: '', role: '', commissioningDate: '', classification: '', manufacturer: '' },
      });
      const result = serializeWarship(state);
      expect(result.lore).toBeUndefined();
    });
  });

  // ============== JSON conversion ==============

  describe('saveFileToJson / jsonToSaveFile', () => {
    it('round-trips a save file through JSON', () => {
      const saveFile = makeMinimalSaveFile({ name: 'Round Trip Ship' });
      const json = saveFileToJson(saveFile);
      const parsed = jsonToSaveFile(json);
      expect(parsed).toEqual(saveFile);
    });

    it('produces pretty-printed JSON', () => {
      const saveFile = makeMinimalSaveFile();
      const json = saveFileToJson(saveFile);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('returns null for invalid JSON', () => {
      expect(jsonToSaveFile('{')).toBeNull();
      expect(jsonToSaveFile('not json')).toBeNull();
      expect(jsonToSaveFile('')).toBeNull();
    });

    it('parses valid JSON', () => {
      const result = jsonToSaveFile('{"version":"1.2","name":"Test"}');
      expect(result).toBeTruthy();
      expect(result!.name).toBe('Test');
    });
  });

  // ============== deserializeWarship - Version checks ==============

  describe('deserializeWarship - version checks', () => {
    it('fails when version is missing', () => {
      const saveFile = makeMinimalSaveFile({ version: '' });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Save file is missing version information');
    });

    it('fails on major version mismatch', () => {
      const saveFile = makeMinimalSaveFile({ version: '2.0' });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Incompatible save file version');
    });

    it('succeeds with current version', () => {
      const saveFile = makeMinimalSaveFile({ version: SAVE_FILE_VERSION });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
    });

    it('succeeds with older minor version and adds migration warning', () => {
      const saveFile = makeMinimalSaveFile({ version: '1.0' });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.warnings?.some(w => w.includes('migrated') || w.includes('upgraded'))).toBe(true);
    });
  });

  // ============== deserializeWarship - Migration ==============

  describe('deserializeWarship - migration', () => {
    it('migrates old weapon IDs', () => {
      const saveFile = makeMinimalSaveFile({
        version: '1.0',
        weapons: [{
          id: 'w-1',
          typeId: 'laser-burst',
          category: 'beam',
          mountType: 'standard',
          gunConfiguration: 'single',
          concealed: false,
          quantity: 1,
          arcs: ['forward'],
        }],
      });
      // Mock beam weapons to include the migrated ID
      const laserMod = { id: 'laser-mod', name: 'Laser', progressLevel: 7, hullPoints: 4, powerRequired: 2, cost: 1, firepower: 'L', accuracyModifier: 0, rangeShort: 2, rangeMedium: 6, rangeLong: 12, damageType: 'En', damage: '', fireModes: ['F'], description: '', techTracks: [] };
      (getAllBeamWeaponTypes as ReturnType<typeof vi.fn>).mockReturnValue([laserMod]);
      (createInstalledWeapon as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 'generated-id',
        weaponType: laserMod,
        category: 'beam',
        mountType: 'standard',
        gunConfiguration: 'single',
        concealed: false,
        quantity: 1,
        arcs: ['forward'],
        hullPoints: 4,
        powerRequired: 2,
        cost: 1,
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      // The weapon should have been found with the migrated ID
      expect(result.state!.weapons.length).toBe(1);
      expect(result.warnings?.some(w => w.includes('laser-burst') && w.includes('laser-mod'))).toBe(true);
    });

    it('migrates old accommodation IDs', () => {
      const saveFile = makeMinimalSaveFile({
        version: '1.0',
        accommodations: [{ id: 'acc-1', typeId: 'staterooms', quantity: 2 }],
      });
      // The migrated ID
      const accType = { id: 'staterooms-1st-class', name: 'Staterooms (1st Class)' };
      (getAllAccommodationTypes as ReturnType<typeof vi.fn>).mockReturnValue([accType]);

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.warnings?.some(w => w.includes('staterooms') && w.includes('staterooms-1st-class'))).toBe(true);
    });

    it('migrates linkedWeaponBatteryKey in command control', () => {
      const saveFile = makeMinimalSaveFile({
        version: '1.0',
        commandControl: [{
          id: 'cc-1',
          typeId: 'fire-control',
          quantity: 1,
          linkedWeaponBatteryKey: 'laser-burst:standard',
        }],
      });

      const ccType = { id: 'fire-control', name: 'Fire Control', linkedSystemType: 'weapon' };
      (getAllCommandControlSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([ccType]);

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      // The linked key should have been migrated
      expect(result.warnings?.some(w => w.includes('laser-burst:standard') && w.includes('laser-mod:standard'))).toBe(true);
    });

    it('migrates countermeasure quantities (raw units → coverage sets)', () => {
      const hull = makeHull({ id: 'cruiser', hullPoints: 1600 });
      const defenseType = { id: 'jammers', name: 'Jammers', coverageMultiples: true, coverage: 100 };

      (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([hull]);
      (getAllDefenseSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([defenseType]);

      const saveFile = makeMinimalSaveFile({
        version: '1.0',
        hull: { id: 'cruiser' },
        defenses: [{ id: 'def-1', typeId: 'jammers', quantity: 16 }],
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      // 1600/100 = 16 units per set, 16 units / 16 = 1 set
      expect(result.warnings?.some(w => w.includes('Jammers') && w.includes('quantity 16') && w.includes('→ 1'))).toBe(true);
    });
  });

  // ============== deserializeWarship - Design type loading ==============

  describe('deserializeWarship - design type', () => {
    it('defaults to warship when designType is absent', () => {
      const saveFile = makeMinimalSaveFile();
      delete saveFile.designType;
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.designType).toBe('warship');
    });

    it('loads station design type', () => {
      const saveFile = makeMinimalSaveFile({
        designType: 'station',
        stationType: 'space-station',
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.designType).toBe('station');
      expect(result.state!.stationType).toBe('space-station');
    });

    it('loads surface flags for ground base', () => {
      const saveFile = makeMinimalSaveFile({
        designType: 'station',
        stationType: 'ground-base',
        surfaceProvidesLifeSupport: true,
        surfaceProvidesGravity: true,
      });
      const result = deserializeWarship(saveFile);
      expect(result.state!.surfaceProvidesLifeSupport).toBe(true);
      expect(result.state!.surfaceProvidesGravity).toBe(true);
    });

    it('defaults surface flags to false when absent', () => {
      const saveFile = makeMinimalSaveFile();
      const result = deserializeWarship(saveFile);
      expect(result.state!.surfaceProvidesLifeSupport).toBe(false);
      expect(result.state!.surfaceProvidesGravity).toBe(false);
    });
  });

  // ============== deserializeWarship - Hull loading ==============

  describe('deserializeWarship - hull loading', () => {
    it('loads hull from ship hulls', () => {
      const hull = makeHull({ id: 'corvette' });
      (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([hull]);

      const saveFile = makeMinimalSaveFile({ hull: { id: 'corvette' } });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.hull).toEqual(hull);
    });

    it('loads hull from station hulls', () => {
      const stationHull = makeHull({ id: 'orbital-station' });
      (getAllStationHulls as ReturnType<typeof vi.fn>).mockReturnValue([stationHull]);

      const saveFile = makeMinimalSaveFile({ hull: { id: 'orbital-station' } });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.hull).toEqual(stationHull);
    });

    it('fails when hull ID specified but not found', () => {
      const saveFile = makeMinimalSaveFile({ hull: { id: 'nonexistent' } });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Hull type not found'))).toBe(true);
    });

    it('succeeds with null hull', () => {
      const saveFile = makeMinimalSaveFile({ hull: null });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.hull).toBeNull();
    });
  });

  // ============== deserializeWarship - Armor loading ==============

  describe('deserializeWarship - armor loading', () => {
    it('loads new format armorLayers', () => {
      const hull = makeHull();
      const armorType = { id: 'cerametal-medium', armorWeight: 'medium' } as ArmorType;
      const builtArmor: ShipArmor = { weight: 'medium', type: armorType, hullPointsUsed: 10, cost: 5 };

      (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([hull]);
      (getAllArmorTypes as ReturnType<typeof vi.fn>).mockReturnValue([armorType]);
      (buildShipArmor as ReturnType<typeof vi.fn>).mockReturnValue(builtArmor);

      const saveFile = makeMinimalSaveFile({
        hull: { id: 'test-hull' },
        armorLayers: [{ id: 'cerametal-medium' }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.armorLayers).toEqual([builtArmor]);
    });

    it('loads old format single armor into armorLayers', () => {
      const hull = makeHull();
      const armorType = { id: 'old-armor', armorWeight: 'light' } as ArmorType;
      const builtArmor: ShipArmor = { weight: 'light', type: armorType, hullPointsUsed: 5, cost: 2 };

      (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([hull]);
      (getAllArmorTypes as ReturnType<typeof vi.fn>).mockReturnValue([armorType]);
      (buildShipArmor as ReturnType<typeof vi.fn>).mockReturnValue(builtArmor);

      const saveFile = makeMinimalSaveFile({
        hull: { id: 'test-hull' },
        armor: { id: 'old-armor' },
        armorLayers: undefined, // old format
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.armorLayers).toEqual([builtArmor]);
    });

    it('warns when armor type not found', () => {
      const hull = makeHull();
      (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([hull]);
      (getAllArmorTypes as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const saveFile = makeMinimalSaveFile({
        hull: { id: 'test-hull' },
        armorLayers: [{ id: 'unknown-armor' }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true); // Non-fatal
      expect(result.warnings?.some(w => w.includes('Armor type not found'))).toBe(true);
    });

    it('creates minimal armor when hull is null', () => {
      const armorType = { id: 'cerametal', armorWeight: 'medium' } as ArmorType;
      (getAllArmorTypes as ReturnType<typeof vi.fn>).mockReturnValue([armorType]);

      const saveFile = makeMinimalSaveFile({
        hull: null,
        armorLayers: [{ id: 'cerametal' }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.armorLayers[0].hullPointsUsed).toBe(0);
      expect(result.state!.armorLayers[0].cost).toBe(0);
    });
  });

  // ============== deserializeWarship - System loading ==============

  describe('deserializeWarship - power plants', () => {
    it('loads power plants matching by type ID', () => {
      const ppType = { id: 'fusion-reactor', name: 'Fusion Reactor' };
      (getAllPowerPlantTypes as ReturnType<typeof vi.fn>).mockReturnValue([ppType]);

      const saveFile = makeMinimalSaveFile({
        powerPlants: [{ id: 'pp-1', typeId: 'fusion-reactor', hullPoints: 20 }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.powerPlants).toEqual([{
        id: 'pp-1',
        type: ppType,
        hullPoints: 20,
      }]);
    });

    it('warns when power plant type not found', () => {
      const saveFile = makeMinimalSaveFile({
        powerPlants: [{ id: 'pp-1', typeId: 'unknown-reactor', hullPoints: 20 }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.powerPlants).toEqual([]);
      expect(result.warnings?.some(w => w.includes('Power plant type not found'))).toBe(true);
    });

    it('handles missing powerPlants array gracefully', () => {
      const saveFile = makeMinimalSaveFile();
      (saveFile as Partial<WarshipSaveFile>).powerPlants = undefined as never;
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.powerPlants).toEqual([]);
    });
  });

  describe('deserializeWarship - defense systems', () => {
    it('recalculates defense stats from service functions', () => {
      const hull = makeHull({ hullPoints: 500 });
      const defType = { id: 'shields', name: 'Shields' };
      (getAllHulls as ReturnType<typeof vi.fn>).mockReturnValue([hull]);
      (getAllDefenseSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([defType]);
      (calculateDefenseHullPoints as ReturnType<typeof vi.fn>).mockReturnValue(10);
      (calculateDefensePower as ReturnType<typeof vi.fn>).mockReturnValue(5);
      (calculateDefenseCost as ReturnType<typeof vi.fn>).mockReturnValue(3);

      const saveFile = makeMinimalSaveFile({
        hull: { id: 'test-hull' },
        defenses: [{ id: 'def-1', typeId: 'shields', quantity: 2 }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      const defense = result.state!.defenses[0];
      expect(defense.hullPoints).toBe(10);
      expect(defense.powerRequired).toBe(5);
      expect(defense.cost).toBe(3);
      // Verify it was called with shipHullPoints
      expect(calculateDefenseHullPoints).toHaveBeenCalledWith(defType, 500, 2);
    });

    it('uses default 100 HP when no hull', () => {
      const defType = { id: 'shields', name: 'Shields' };
      (getAllDefenseSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([defType]);

      const saveFile = makeMinimalSaveFile({
        hull: null,
        defenses: [{ id: 'def-1', typeId: 'shields', quantity: 1 }],
      });
      const result = deserializeWarship(saveFile);
      expect(calculateDefenseHullPoints).toHaveBeenCalledWith(defType, 100, 1);
    });
  });

  describe('deserializeWarship - weapons', () => {
    it('loads beam weapons correctly', () => {
      const beamType = { id: 'laser', name: 'Laser', firepower: 'L' };
      const installed = {
        id: 'generated',
        weaponType: beamType,
        category: 'beam',
        mountType: 'turret',
        gunConfiguration: 'twin',
        concealed: false,
        quantity: 2,
        arcs: ['forward', 'starboard', 'port'],
        hullPoints: 10,
        powerRequired: 4,
        cost: 5,
      };

      (getAllBeamWeaponTypes as ReturnType<typeof vi.fn>).mockReturnValue([beamType]);
      (createInstalledWeapon as ReturnType<typeof vi.fn>).mockReturnValue({ ...installed });

      const saveFile = makeMinimalSaveFile({
        weapons: [{
          id: 'w-1',
          typeId: 'laser',
          category: 'beam',
          mountType: 'turret',
          gunConfiguration: 'twin',
          concealed: false,
          quantity: 2,
          arcs: ['forward', 'starboard', 'port'],
        }],
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.weapons.length).toBe(1);
      // Overrides generated id with saved id
      expect(result.state!.weapons[0].id).toBe('w-1');
    });

    it('warns for unsupported weapon category', () => {
      const saveFile = makeMinimalSaveFile({
        weapons: [{
          id: 'w-1',
          typeId: 'some-ordnance',
          category: 'ordnance',
          mountType: 'standard',
          gunConfiguration: 'single',
          concealed: false,
          quantity: 1,
          arcs: ['forward'],
        }],
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.weapons.length).toBe(0);
      expect(result.warnings?.some(w => w.includes('not yet supported'))).toBe(true);
    });

    it('warns when weapon type not found', () => {
      const saveFile = makeMinimalSaveFile({
        weapons: [{
          id: 'w-1',
          typeId: 'nonexistent-weapon',
          category: 'beam',
          mountType: 'standard',
          gunConfiguration: 'single',
          concealed: false,
          quantity: 1,
          arcs: ['forward'],
        }],
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.weapons.length).toBe(0);
      expect(result.warnings?.some(w => w.includes('Weapon type not found'))).toBe(true);
    });
  });

  describe('deserializeWarship - command & control post-processing', () => {
    it('recalculates fire control cost after weapons are loaded', () => {
      const ccType = { id: 'fire-control', name: 'Fire Control', linkedSystemType: 'weapon', quality: undefined };
      const beamType = { id: 'laser', name: 'Laser' };
      const installedWeapon = {
        id: 'w-1',
        weaponType: beamType,
        category: 'beam',
        mountType: 'turret',
        gunConfiguration: 'single',
        concealed: false,
        quantity: 1,
        arcs: ['forward'],
        hullPoints: 4,
        powerRequired: 2,
        cost: 1,
      };

      (getAllCommandControlSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([ccType]);
      (getAllBeamWeaponTypes as ReturnType<typeof vi.fn>).mockReturnValue([beamType]);
      (createInstalledWeapon as ReturnType<typeof vi.fn>).mockReturnValue({ ...installedWeapon });
      (calculateFireControlCost as ReturnType<typeof vi.fn>).mockReturnValue(2.5);

      const saveFile = makeMinimalSaveFile({
        commandControl: [{
          id: 'cc-1',
          typeId: 'fire-control',
          quantity: 1,
          linkedWeaponBatteryKey: 'laser:turret',
        }],
        weapons: [{
          id: 'w-1',
          typeId: 'laser',
          category: 'beam',
          mountType: 'turret',
          gunConfiguration: 'single',
          concealed: false,
          quantity: 1,
          arcs: ['forward'],
        }],
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      // Fire control cost should be recalculated
      expect(calculateFireControlCost).toHaveBeenCalled();
      expect(result.state!.commandControl[0].cost).toBe(2.5);
    });

    it('recalculates sensor control cost after sensors are loaded', () => {
      const ccType = { id: 'sensor-control', name: 'Sensor Control', linkedSystemType: 'sensor', quality: 'standard' };
      const sensorType = { id: 'active-sensor', name: 'Active Sensor', arcsCovered: 1 };

      (getAllCommandControlSystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([ccType]);
      (getAllSensorTypes as ReturnType<typeof vi.fn>).mockReturnValue([sensorType]);
      (calculateSensorControlCost as ReturnType<typeof vi.fn>).mockReturnValue(1.8);
      (calculateTrackingCapability as ReturnType<typeof vi.fn>).mockReturnValue(3);

      const saveFile = makeMinimalSaveFile({
        commandControl: [{
          id: 'cc-1',
          typeId: 'sensor-control',
          quantity: 1,
          linkedSensorId: 'sensor-1',
        }],
        sensors: [{
          id: 'sensor-1',
          typeId: 'active-sensor',
          quantity: 2,
        }],
      });

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(calculateSensorControlCost).toHaveBeenCalled();
      expect(result.state!.commandControl[0].cost).toBe(1.8);
    });
  });

  describe('deserializeWarship - gravity systems', () => {
    it('recalculates cost from hullPoints × costPerHullPoint', () => {
      const gsType = { id: 'standard-gravity', name: 'Standard Gravity', costPerHullPoint: 50000 };
      (getAllGravitySystemTypes as ReturnType<typeof vi.fn>).mockReturnValue([gsType]);

      const saveFile = makeMinimalSaveFile({
        gravitySystems: [{ id: 'gs-1', typeId: 'standard-gravity', hullPoints: 10 }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.gravitySystems[0].cost).toBe(500000);
    });
  });

  describe('deserializeWarship - ordnance', () => {
    it('loads missile designs with recalculated stats', () => {
      const warhead = { id: 'he-warhead', name: 'HE Warhead' };
      const propulsion = { id: 'solid-rocket', name: 'Solid Rocket' };
      const guidance = { id: 'ir-seeker', name: 'IR Seeker' };

      (getWarheads as ReturnType<typeof vi.fn>).mockReturnValue([warhead]);
      (getPropulsionSystems as ReturnType<typeof vi.fn>).mockReturnValue([propulsion]);
      (getGuidanceSystems as ReturnType<typeof vi.fn>).mockReturnValue([guidance]);

      const saveFile = makeMinimalSaveFile({
        ordnanceDesigns: [{
          id: 'missile-1',
          name: 'Test Missile',
          category: 'missile',
          size: 'medium',
          warheadId: 'he-warhead',
          propulsionId: 'solid-rocket',
          guidanceId: 'ir-seeker',
        }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.ordnanceDesigns.length).toBe(1);
      expect(result.state!.ordnanceDesigns[0].category).toBe('missile');
    });

    it('loads bomb designs using findPropulsionByCategory', () => {
      const warhead = { id: 'ap-warhead', name: 'AP Warhead' };
      const bombCasing = { id: 'bomb-casing-med', name: 'Medium Bomb Casing' };

      (getWarheads as ReturnType<typeof vi.fn>).mockReturnValue([warhead]);
      (findPropulsionByCategory as ReturnType<typeof vi.fn>).mockReturnValue(bombCasing);

      const saveFile = makeMinimalSaveFile({
        ordnanceDesigns: [{
          id: 'bomb-1',
          name: 'Test Bomb',
          category: 'bomb',
          size: 'medium',
          warheadId: 'ap-warhead',
        }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.ordnanceDesigns.length).toBe(1);
      expect(findPropulsionByCategory).toHaveBeenCalledWith('bomb', 'medium');
    });

    it('warns when warhead not found', () => {
      const saveFile = makeMinimalSaveFile({
        ordnanceDesigns: [{
          id: 'missile-1',
          name: 'Bad Missile',
          category: 'missile',
          size: 'medium',
          warheadId: 'nonexistent',
          propulsionId: 'something',
          guidanceId: 'something',
        }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.ordnanceDesigns.length).toBe(0);
      expect(result.warnings?.some(w => w.includes('Warhead not found'))).toBe(true);
    });
  });

  describe('deserializeWarship - launch systems', () => {
    it('loads launch systems with recalculated stats', () => {
      const launchSystem = { id: 'missile-rack', name: 'Missile Rack' };
      (getLaunchSystems as ReturnType<typeof vi.fn>).mockReturnValue([launchSystem]);
      (calculateLaunchSystemStats as ReturnType<typeof vi.fn>).mockReturnValue({
        hullPoints: 8, powerRequired: 3, cost: 2, totalCapacity: 12,
      });

      const saveFile = makeMinimalSaveFile({
        launchSystems: [{
          id: 'ls-1',
          typeId: 'missile-rack',
          quantity: 2,
          extraHp: 5,
          loadout: [{ designId: 'missile-1', quantity: 4 }],
        }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.launchSystems.length).toBe(1);
      expect(result.state!.launchSystems[0].totalCapacity).toBe(12);
      expect(calculateLaunchSystemStats).toHaveBeenCalledWith(launchSystem, 2, 5);
    });

    it('supports old extraCapacity field name', () => {
      const launchSystem = { id: 'missile-rack', name: 'Missile Rack' };
      (getLaunchSystems as ReturnType<typeof vi.fn>).mockReturnValue([launchSystem]);

      const saveFile = makeMinimalSaveFile({
        launchSystems: [{
          id: 'ls-1',
          typeId: 'missile-rack',
          quantity: 1,
          extraHp: undefined as unknown as number,
          loadout: [],
        }],
      });
      // Simulate old format with extraCapacity
      (saveFile.launchSystems[0] as Record<string, unknown>).extraCapacity = 3;
      delete (saveFile.launchSystems[0] as Record<string, unknown>).extraHp;

      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(calculateLaunchSystemStats).toHaveBeenCalledWith(launchSystem, 1, 3);
    });
  });

  // ============== deserializeWarship - Defaults ==============

  describe('deserializeWarship - defaults', () => {
    it('defaults name to "Unnamed Design"', () => {
      const saveFile = makeMinimalSaveFile({ name: '' });
      const result = deserializeWarship(saveFile);
      expect(result.state!.name).toBe('Unnamed Design');
    });

    it('defaults lore to empty string', () => {
      const saveFile = makeMinimalSaveFile();
      delete (saveFile as Record<string, unknown>).lore;
      const result = deserializeWarship(saveFile);
      expect(result.state!.shipDescription.lore).toBe('');
    });

    it('defaults designProgressLevel to 7', () => {
      const saveFile = makeMinimalSaveFile();
      delete (saveFile as Record<string, unknown>).designProgressLevel;
      const result = deserializeWarship(saveFile);
      expect(result.state!.designProgressLevel).toBe(7);
    });

    it('defaults designTechTracks to empty array', () => {
      const saveFile = makeMinimalSaveFile();
      delete (saveFile as Record<string, unknown>).designTechTracks;
      const result = deserializeWarship(saveFile);
      expect(result.state!.designTechTracks).toEqual([]);
    });

    it('preserves explicit null for imageData', () => {
      const saveFile = makeMinimalSaveFile();
      saveFile.imageData = null;
      const result = deserializeWarship(saveFile);
      expect(result.state!.shipDescription.imageData).toBeNull();
    });
  });

  // ============== deserializeWarship - Damage zones ==============

  describe('deserializeWarship - damage diagram', () => {
    it('loads damage zones', () => {
      const saveFile = makeMinimalSaveFile({
        damageDiagramZones: [{
          code: 'A',
          systems: [{
            id: 'sys-1',
            systemType: 'weapon',
            name: 'Laser',
            hullPoints: 4,
            installedSystemId: 'w-1',
            firepowerOrder: 2,
          }],
          totalHullPoints: 4,
          maxHullPoints: 50,
        }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.damageDiagramZones.length).toBe(1);
      expect(result.state!.damageDiagramZones[0].code).toBe('A');
      expect(result.state!.damageDiagramZones[0].systems[0].name).toBe('Laser');
    });

    it('loads hit location chart', () => {
      const saveFile = makeMinimalSaveFile({
        hitLocationChart: {
          hitDie: 12,
          columns: [{
            direction: 'fore',
            entries: [{ minRoll: 1, maxRoll: 4, zone: 'A' }],
          }],
        } as never,
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.state!.hitLocationChart!.hitDie).toBe(12);
      expect(result.state!.hitLocationChart!.columns[0].direction).toBe('fore');
    });
  });

  // ============== deserializeWarship - Error vs Warning policy ==============

  describe('deserializeWarship - error vs warning policy', () => {
    it('hull not found is an error (fatal)', () => {
      const saveFile = makeMinimalSaveFile({ hull: { id: 'nonexistent' } });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('component type not found is a warning (non-fatal)', () => {
      const saveFile = makeMinimalSaveFile({
        engines: [{ id: 'e-1', typeId: 'nonexistent-engine', hullPoints: 10 }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(true);
      expect(result.warnings?.some(w => w.includes('Engine type not found'))).toBe(true);
    });

    it('missing version is an error', () => {
      const saveFile = makeMinimalSaveFile({ version: undefined as unknown as string });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(false);
    });

    it('returns both errors and warnings together', () => {
      const saveFile = makeMinimalSaveFile({
        hull: { id: 'nonexistent' },
        engines: [{ id: 'e-1', typeId: 'nonexistent', hullPoints: 10 }],
      });
      const result = deserializeWarship(saveFile);
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  // ============== getDefaultFileName ==============

  describe('getDefaultFileName', () => {
    it('uses ship name for filename', () => {
      const state = makeMinimalState({ name: 'USS Enterprise' });
      expect(getDefaultFileName(state)).toBe('USS Enterprise.warship.json');
    });

    it('returns default name when name is empty', () => {
      const state = makeMinimalState({ name: '' });
      expect(getDefaultFileName(state)).toBe('New Ship.warship.json');
    });

    it('returns default name when name is whitespace', () => {
      const state = makeMinimalState({ name: '   ' });
      expect(getDefaultFileName(state)).toBe('New Ship.warship.json');
    });

    it('sanitizes illegal filename characters', () => {
      const state = makeMinimalState({ name: 'Ship: The <Best> "One"' });
      const filename = getDefaultFileName(state);
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('<');
      expect(filename).not.toContain('>');
      expect(filename).not.toContain('"');
      expect(filename).toContain('.warship.json');
    });
  });
});
