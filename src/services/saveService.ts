import type { WarshipSaveFile, SavedPowerPlant, SavedFuelTank, SavedEngine, SavedEngineFuelTank, SavedFTLDrive, SavedFTLFuelTank, SavedLifeSupport, SavedAccommodation, SavedStoreSystem, SavedGravitySystem, SavedDefenseSystem, SavedCommandControlSystem, SavedSensor, SavedHangarMiscSystem, SavedWeapon, SavedOrdnanceDesign, SavedLaunchSystem, SavedDamageZone, SavedHitLocationChart } from '../types/saveFile';
import type { Hull } from '../types/hull';
import type { ShipArmor } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { InstalledWeapon, FiringArc } from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem, MissileDesign, BombDesign, MineDesign } from '../types/ordnance';
import type { ProgressLevel, TechTrack, DesignType, StationType } from '../types/common';
import type { DamageZone, HitLocationChart, SystemDamageCategory, ZoneCode } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';
import { SAVE_FILE_VERSION } from '../types/saveFile';
import { getAllHulls, getAllStationHulls } from './hullService';
import { getAllArmorTypes, buildShipArmor } from './armorService';
import { getAllPowerPlantTypes, generatePowerPlantFuelTankId } from './powerPlantService';
import { getAllEngineTypes, generateEngineId, generateEngineFuelTankId } from './engineService';
import { getAllFTLDriveTypes, generateFTLDriveId, generateFTLFuelTankId } from './ftlDriveService';
import { getAllLifeSupportTypes, getAllAccommodationTypes, getAllStoreSystemTypes, getAllGravitySystemTypes, generateLifeSupportId, generateAccommodationId, generateStoreSystemId, generateGravitySystemId } from './supportSystemService';
import { getAllDefenseSystemTypes, generateDefenseId, calculateDefenseHullPoints, calculateDefensePower, calculateDefenseCost } from './defenseService';
import { getAllCommandControlSystemTypes, calculateCommandControlHullPoints, calculateCommandControlPower, calculateCommandControlCost, calculateFireControlCost, calculateSensorControlCost, generateCommandControlId } from './commandControlService';
import { getAllSensorTypes, generateSensorId, calculateSensorHullPoints, calculateSensorPower, calculateSensorCost, calculateTrackingCapability, type ComputerQuality } from './sensorService';
import { getAllHangarMiscSystemTypes, generateHangarMiscId, calculateHangarMiscHullPoints, calculateHangarMiscPower, calculateHangarMiscCost, calculateHangarMiscCapacity } from './hangarMiscService';
import { getAllBeamWeaponTypes, getAllProjectileWeaponTypes, getAllTorpedoWeaponTypes, getAllSpecialWeaponTypes, createInstalledWeapon } from './weaponService';
import { getLaunchSystems, getPropulsionSystems, getWarheads, getGuidanceSystems, calculateLaunchSystemStats, calculateMissileDesign, calculateBombDesign, calculateMineDesign, findPropulsionByCategory } from './ordnanceService';
import { getActiveMods } from './dataLoader';

/**
 * State representing the current warship configuration
 */
export interface WarshipState {
  name: string;
  shipDescription: ShipDescription;
  designType: DesignType;
  stationType: StationType | null;
  surfaceProvidesLifeSupport: boolean;
  surfaceProvidesGravity: boolean;
  hull: Hull | null;
  armorLayers: ShipArmor[];
  powerPlants: InstalledPowerPlant[];
  fuelTanks: InstalledFuelTank[];
  engines: InstalledEngine[];
  engineFuelTanks: InstalledEngineFuelTank[];
  ftlDrive: InstalledFTLDrive | null;
  ftlFuelTanks: InstalledFTLFuelTank[];
  lifeSupport: InstalledLifeSupport[];
  accommodations: InstalledAccommodation[];
  storeSystems: InstalledStoreSystem[];
  gravitySystems: InstalledGravitySystem[];
  defenses: InstalledDefenseSystem[];
  commandControl: InstalledCommandControlSystem[];
  sensors: InstalledSensor[];
  hangarMisc: InstalledHangarMiscSystem[];
  weapons: InstalledWeapon[];
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  damageDiagramZones: DamageZone[];
  hitLocationChart: HitLocationChart | null;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
}

/**
 * Result of loading a save file
 */
export interface LoadResult {
  success: boolean;
  state?: WarshipState;
  errors?: string[];
  warnings?: string[];
}

/**
 * Serialize the current warship state to a save file format
 */
export function serializeWarship(state: WarshipState): WarshipSaveFile {
  const now = new Date().toISOString();
  
  return {
    version: SAVE_FILE_VERSION,
    designType: state.designType !== 'warship' ? state.designType : undefined,
    stationType: state.stationType || undefined,
    surfaceProvidesLifeSupport: state.surfaceProvidesLifeSupport || undefined,
    surfaceProvidesGravity: state.surfaceProvidesGravity || undefined,
    name: state.name,
    createdAt: now,
    modifiedAt: now,
    lore: state.shipDescription.lore || undefined,
    imageData: state.shipDescription.imageData,
    imageMimeType: state.shipDescription.imageMimeType,
    faction: state.shipDescription.faction || undefined,
    role: state.shipDescription.role || undefined,
    commissioningDate: state.shipDescription.commissioningDate || undefined,
    classification: state.shipDescription.classification || undefined,
    manufacturer: state.shipDescription.manufacturer || undefined,
    hull: state.hull ? { id: state.hull.id } : null,
    armor: state.armorLayers.length === 1 ? { id: state.armorLayers[0].type.id } : null,
    armorLayers: state.armorLayers.map(layer => ({ id: layer.type.id })),
    designProgressLevel: state.designProgressLevel,
    designTechTracks: state.designTechTracks,
    powerPlants: (state.powerPlants || []).map((pp): SavedPowerPlant => ({
      id: pp.id,
      typeId: pp.type.id,
      hullPoints: pp.hullPoints,
    })),
    fuelTanks: (state.fuelTanks || []).map((ft): SavedFuelTank => ({
      id: ft.id,
      forPowerPlantTypeId: ft.forPowerPlantType.id,
      hullPoints: ft.hullPoints,
    })),
    engines: (state.engines || []).map((eng): SavedEngine => ({
      id: eng.id,
      typeId: eng.type.id,
      hullPoints: eng.hullPoints,
    })),
    engineFuelTanks: (state.engineFuelTanks || []).map((ft): SavedEngineFuelTank => ({
      id: ft.id,
      forEngineTypeId: ft.forEngineType.id,
      hullPoints: ft.hullPoints,
    })),
    ftlDrive: state.ftlDrive ? {
      id: state.ftlDrive.id,
      typeId: state.ftlDrive.type.id,
      hullPoints: state.ftlDrive.hullPoints,
    } as SavedFTLDrive : null,
    ftlFuelTanks: (state.ftlFuelTanks || []).map((ft): SavedFTLFuelTank => ({
      id: ft.id,
      forFTLDriveTypeId: ft.forFTLDriveType.id,
      hullPoints: ft.hullPoints,
    })),
    lifeSupport: (state.lifeSupport || []).map((ls): SavedLifeSupport => ({
      id: ls.id,
      typeId: ls.type.id,
      quantity: ls.quantity,
      ...(ls.extraHp ? { extraHp: ls.extraHp } : {}),
    })),
    accommodations: (state.accommodations || []).map((acc): SavedAccommodation => ({
      id: acc.id,
      typeId: acc.type.id,
      quantity: acc.quantity,
      ...(acc.extraHp ? { extraHp: acc.extraHp } : {}),
    })),
    storeSystems: (state.storeSystems || []).map((ss): SavedStoreSystem => ({
      id: ss.id,
      typeId: ss.type.id,
      quantity: ss.quantity,
      ...(ss.extraHp ? { extraHp: ss.extraHp } : {}),
    })),
    gravitySystems: (state.gravitySystems || []).map((gs): SavedGravitySystem => ({
      id: gs.id,
      typeId: gs.type.id,
      hullPoints: gs.hullPoints,
    })),
    defenses: (state.defenses || []).map((def): SavedDefenseSystem => ({
      id: def.id,
      typeId: def.type.id,
      quantity: def.quantity,
    })),
    commandControl: (state.commandControl || []).map((cc): SavedCommandControlSystem => ({
      id: cc.id,
      typeId: cc.type.id,
      quantity: cc.quantity,
      linkedWeaponBatteryKey: cc.linkedWeaponBatteryKey,
      linkedSensorId: cc.linkedSensorId,
    })),
    sensors: (state.sensors || []).map((s): SavedSensor => ({
      id: s.id,
      typeId: s.type.id,
      quantity: s.quantity,
    })),
    hangarMisc: (state.hangarMisc || []).map((hm): SavedHangarMiscSystem => ({
      id: hm.id,
      typeId: hm.type.id,
      quantity: hm.quantity,
      extraHp: hm.extraHp,
    })),
    weapons: (state.weapons || []).map((w): SavedWeapon => ({
      id: w.id,
      typeId: w.weaponType.id,
      category: w.category,
      mountType: w.mountType,
      gunConfiguration: w.gunConfiguration,
      concealed: w.concealed,
      quantity: w.quantity,
      arcs: w.arcs,
    })),
    ordnanceDesigns: (state.ordnanceDesigns || []).map((d): SavedOrdnanceDesign => {
      const base = {
        id: d.id,
        name: d.name,
        category: d.category,
        size: d.size,
        warheadId: d.warheadId,
      };
      if (d.category === 'missile') {
        return {
          ...base,
          propulsionId: (d as MissileDesign).propulsionId,
          guidanceId: (d as MissileDesign).guidanceId,
        };
      } else if (d.category === 'mine') {
        return {
          ...base,
          guidanceId: (d as MineDesign).guidanceId,
        };
      }
      return base;
    }),
    launchSystems: (state.launchSystems || []).map((ls): SavedLaunchSystem => ({
      id: ls.id,
      typeId: ls.launchSystemType,
      quantity: ls.quantity,
      extraHp: ls.extraHp,
      loadout: ls.loadout || [],
    })),
    damageDiagramZones: (state.damageDiagramZones || []).map((zone): SavedDamageZone => ({
      code: zone.code,
      systems: zone.systems.map((sys) => ({
        id: sys.id,
        systemType: sys.systemType,
        name: sys.name,
        hullPoints: sys.hullPoints,
        installedSystemId: sys.installedSystemId,
        firepowerOrder: sys.firepowerOrder,
      })),
      totalHullPoints: zone.totalHullPoints,
      maxHullPoints: zone.maxHullPoints,
    })),
    hitLocationChart: state.hitLocationChart ? {
      hitDie: state.hitLocationChart.hitDie,
      columns: state.hitLocationChart.columns.map((col) => ({
        direction: col.direction,
        entries: col.entries.map((e) => ({
          minRoll: e.minRoll,
          maxRoll: e.maxRoll,
          zone: e.zone,
        })),
      })),
    } as SavedHitLocationChart : null,
    systems: [],
    activeMods: getActiveMods().map(m => ({
      name: m.manifest.name,
      version: m.manifest.version,
    })),
  };
}

/**
 * Convert save file to JSON string with pretty formatting
 */
export function saveFileToJson(saveFile: WarshipSaveFile): string {
  return JSON.stringify(saveFile, null, 2);
}

/**
 * Parse JSON string to save file
 */
export function jsonToSaveFile(json: string): WarshipSaveFile | null {
  try {
    return JSON.parse(json) as WarshipSaveFile;
  } catch {
    return null;
  }
}

/**
 * ID migration mappings for upgrading old save files.
 * Maps old IDs to their new replacements.
 */
const WEAPON_ID_MIGRATIONS: Record<string, string> = {
  'laser-burst': 'laser-mod',
  'laser-auto': 'laser-mod',
  'ir-laser-burst': 'ir-laser-mod',
  'ir-laser-auto': 'ir-laser-mod',
  'x-ray-laser-burst': 'x-ray-laser-mod',
  'x-ray-laser-auto': 'x-ray-laser-mod',
  'plasma-cannon-burst': 'plasma-cannon-mod',
  'plasma-cannon-auto': 'plasma-cannon-mod',
  'maser-burst': 'maser-mod',
  'maser-auto': 'maser-mod',
  'pulse-maser-burst': 'pulse-maser-mod',
  'pulse-maser-auto': 'pulse-maser-mod',
};

const ACCOMMODATION_ID_MIGRATIONS: Record<string, string> = {
  'staterooms': 'staterooms-1st-class',
};

/**
 * Generic helper: iterate a saved array, look up each item's type, build the installed item.
 * Produces a warning for each type not found.
 */
function deserializeArray<TSaved, TType extends { id: string }, TInstalled>(
  savedItems: TSaved[] | undefined,
  allTypes: TType[],
  lookupId: (saved: TSaved) => string,
  build: (saved: TSaved, type: TType) => TInstalled,
  warningPrefix: string,
  warnings: string[]
): TInstalled[] {
  const result: TInstalled[] = [];
  for (const saved of savedItems || []) {
    const id = lookupId(saved);
    const type = allTypes.find(t => t.id === id);
    if (type) {
      result.push(build(saved, type));
    } else {
      warnings.push(`${warningPrefix}: ${id}`);
    }
  }
  return result;
}

/**
 * Migrate a save file from an older version to the current format.
 * Applies all necessary ID and structure changes.
 */
function migrateSaveFile(saveFile: WarshipSaveFile): string[] {
  const migrations: string[] = [];

  // Migrate weapon typeIds
  for (const weapon of (saveFile.weapons || [])) {
    const newId = WEAPON_ID_MIGRATIONS[weapon.typeId];
    if (newId) {
      migrations.push(`Migrated weapon "${weapon.typeId}" → "${newId}"`);
      weapon.typeId = newId;
    }
  }

  // Migrate linkedWeaponBatteryKey in command & control (format: "weaponTypeId:mountType")
  for (const cc of (saveFile.commandControl || [])) {
    if (cc.linkedWeaponBatteryKey) {
      const [weaponId, ...rest] = cc.linkedWeaponBatteryKey.split(':');
      const newWeaponId = WEAPON_ID_MIGRATIONS[weaponId];
      if (newWeaponId) {
        const oldKey = cc.linkedWeaponBatteryKey;
        cc.linkedWeaponBatteryKey = [newWeaponId, ...rest].join(':');
        migrations.push(`Migrated fire control link "${oldKey}" → "${cc.linkedWeaponBatteryKey}"`);
      }
    }
  }

  // Migrate accommodation typeIds
  for (const acc of (saveFile.accommodations || [])) {
    const newId = ACCOMMODATION_ID_MIGRATIONS[acc.typeId];
    if (newId) {
      migrations.push(`Migrated accommodation "${acc.typeId}" → "${newId}"`);
      acc.typeId = newId;
    }
  }

  // Migrate countermeasure quantities: old saves stored raw unit counts,
  // new format stores number of full coverage sets.
  // e.g. old save: 16 jammers (coverage 100 each, 1600 HP hull) = 1 full set → new quantity: 1
  if (saveFile.hull?.id && (saveFile.defenses || []).length > 0) {
    const allHulls = getAllHulls();
    const hull = allHulls.find(h => h.id === saveFile.hull!.id);
    if (hull) {
      const allDefenseTypes = getAllDefenseSystemTypes();
      for (const def of saveFile.defenses) {
        const defType = allDefenseTypes.find(t => t.id === def.typeId);
        if (defType && defType.coverageMultiples && defType.coverage > 0) {
          const unitsPerSet = Math.ceil(hull.hullPoints / defType.coverage);
          if (unitsPerSet > 1 && def.quantity >= unitsPerSet) {
            const oldQuantity = def.quantity;
            def.quantity = Math.max(1, Math.round(def.quantity / unitsPerSet));
            migrations.push(`Migrated countermeasure "${defType.name}" quantity ${oldQuantity} → ${def.quantity} (${unitsPerSet} units per full coverage set)`);
          }
        }
      }
    }
  }

  // Update the version to current
  if (saveFile.version !== SAVE_FILE_VERSION) {
    saveFile.version = SAVE_FILE_VERSION;
  }

  return migrations;
}

/**
 * Deserialize a save file back to warship state
 */
export function deserializeWarship(saveFile: WarshipSaveFile): LoadResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check version
  if (!saveFile.version) {
    errors.push('Save file is missing version information');
    return { success: false, errors };
  }
  
  const [major] = saveFile.version.split('.').map(Number);
  const [currentMajor] = SAVE_FILE_VERSION.split('.').map(Number);
  if (major !== currentMajor) {
    errors.push(`Incompatible save file version: ${saveFile.version} (current: ${SAVE_FILE_VERSION})`);
    return { success: false, errors };
  }
  
  // Apply migrations for older save files
  if (saveFile.version !== SAVE_FILE_VERSION) {
    const originalVersion = saveFile.version;
    const migrationMessages = migrateSaveFile(saveFile);
    if (migrationMessages.length > 0) {
      warnings.push(`Save file migrated from version ${originalVersion} to ${SAVE_FILE_VERSION}:`);
      warnings.push(...migrationMessages);
    } else {
      warnings.push(`Save file upgraded from version ${originalVersion} to ${SAVE_FILE_VERSION}.`);
    }
  }
  
  // Note: Mod matching is now handled by the caller (App.tsx loadFromFile)
  // which calls reloadWithSpecificMods() before deserializeWarship().
  // The check below is a safety net for any edge cases.
  
  // Load design type and station settings
  const designType: DesignType = (saveFile.designType as DesignType) || 'warship';
  const stationType: StationType | null = (saveFile.stationType as StationType) || null;
  const surfaceProvidesLifeSupport = saveFile.surfaceProvidesLifeSupport ?? false;
  const surfaceProvidesGravity = saveFile.surfaceProvidesGravity ?? false;
  
  // Load hull
  let hull: Hull | null = null;
  if (saveFile.hull?.id) {
    // Search both ship hulls and station hulls
    const allHulls = [...getAllHulls(), ...getAllStationHulls()];
    hull = allHulls.find(h => h.id === saveFile.hull!.id) ?? null;
    if (!hull) {
      errors.push(`Hull type not found: ${saveFile.hull.id}`);
    }
  }
  
  // Load armor layers (new format: armorLayers array; old format: single armor object)
  const armorLayers: ShipArmor[] = [];
  const allArmors = getAllArmorTypes();
  const savedArmorLayers = saveFile.armorLayers;
  
  if (savedArmorLayers && Array.isArray(savedArmorLayers) && savedArmorLayers.length > 0) {
    // New format: armorLayers array
    for (const savedLayer of savedArmorLayers) {
      const armorType = allArmors.find(a => a.id === savedLayer.id) ?? null;
      if (armorType && hull) {
        armorLayers.push(buildShipArmor(hull, armorType));
      } else if (armorType) {
        // No hull to calculate, store minimal
        armorLayers.push({ weight: armorType.armorWeight, type: armorType, hullPointsUsed: 0, cost: 0 });
      } else {
        warnings.push(`Armor type not found: ${savedLayer.id}`);
      }
    }
  } else if (saveFile.armor?.id) {
    // Old format: single armor object — migrate to single-element array
    const armorType = allArmors.find(a => a.id === saveFile.armor!.id) ?? null;
    if (armorType && hull) {
      armorLayers.push(buildShipArmor(hull, armorType));
    } else if (armorType) {
      armorLayers.push({ weight: armorType.armorWeight, type: armorType, hullPointsUsed: 0, cost: 0 });
    } else {
      warnings.push(`Armor type not found: ${saveFile.armor.id}`);
    }
  }
  
  // Load power plants
  const allPowerPlantTypes = getAllPowerPlantTypes();
  const powerPlants = deserializeArray(
    saveFile.powerPlants, allPowerPlantTypes, s => s.typeId,
    (s, t) => ({ id: s.id || crypto.randomUUID(), type: t, hullPoints: s.hullPoints }),
    'Power plant type not found', warnings
  );
  
  // Load fuel tanks
  const fuelTanks = deserializeArray(
    saveFile.fuelTanks, allPowerPlantTypes, s => s.forPowerPlantTypeId,
    (s, t) => ({ id: s.id || generatePowerPlantFuelTankId(), forPowerPlantType: t, hullPoints: s.hullPoints }),
    'Power plant type not found for fuel tank', warnings
  );
  
  // Load engines
  const allEngineTypes = getAllEngineTypes();
  const engines = deserializeArray(
    saveFile.engines, allEngineTypes, s => s.typeId,
    (s, t) => ({ id: s.id || generateEngineId(), type: t, hullPoints: s.hullPoints }),
    'Engine type not found', warnings
  );
  
  // Load engine fuel tanks
  const engineFuelTanks = deserializeArray(
    saveFile.engineFuelTanks, allEngineTypes, s => s.forEngineTypeId,
    (s, t) => ({ id: s.id || generateEngineFuelTankId(), forEngineType: t, hullPoints: s.hullPoints }),
    'Engine type not found for fuel tank', warnings
  );
  
  // Load FTL drive
  let ftlDrive: InstalledFTLDrive | null = null;
  const allFTLTypes = getAllFTLDriveTypes();
  if (saveFile.ftlDrive) {
    const ftlType = allFTLTypes.find(t => t.id === saveFile.ftlDrive!.typeId);
    if (ftlType) {
      ftlDrive = {
        id: saveFile.ftlDrive.id || generateFTLDriveId(),
        type: ftlType,
        hullPoints: saveFile.ftlDrive.hullPoints,
      };
    } else {
      warnings.push(`FTL drive type not found: ${saveFile.ftlDrive.typeId}`);
    }
  }
  
  // Load FTL fuel tanks
  const ftlFuelTanks = deserializeArray(
    saveFile.ftlFuelTanks, allFTLTypes, s => s.forFTLDriveTypeId,
    (s, t) => ({ id: s.id || generateFTLFuelTankId(), forFTLDriveType: t, hullPoints: s.hullPoints }),
    'FTL drive type not found for fuel tank', warnings
  );
  
  // Load life support
  const allLifeSupportTypes = getAllLifeSupportTypes();
  const lifeSupport = deserializeArray(
    saveFile.lifeSupport, allLifeSupportTypes, s => s.typeId,
    (s, t) => ({ id: s.id || generateLifeSupportId(), type: t, quantity: s.quantity, ...(s.extraHp ? { extraHp: s.extraHp } : {}) }),
    'Life support type not found', warnings
  );
  
  // Load accommodations
  const allAccommodationTypes = getAllAccommodationTypes();
  const accommodations = deserializeArray(
    saveFile.accommodations, allAccommodationTypes, s => s.typeId,
    (s, t) => ({ id: s.id || generateAccommodationId(), type: t, quantity: s.quantity, ...(s.extraHp ? { extraHp: s.extraHp } : {}) }),
    'Accommodation type not found', warnings
  );
  
  // Load store systems
  const allStoreSystemTypes = getAllStoreSystemTypes();
  const storeSystems = deserializeArray(
    saveFile.storeSystems, allStoreSystemTypes, s => s.typeId,
    (s, t) => ({ id: s.id || generateStoreSystemId(), type: t, quantity: s.quantity, ...(s.extraHp ? { extraHp: s.extraHp } : {}) }),
    'Store system type not found', warnings
  );
  
  // Load gravity systems
  const allGravitySystemTypes = getAllGravitySystemTypes();
  const gravitySystems = deserializeArray(
    saveFile.gravitySystems, allGravitySystemTypes, s => s.typeId,
    (s, t) => ({ id: s.id || generateGravitySystemId(), type: t, hullPoints: s.hullPoints, cost: s.hullPoints * t.costPerHullPoint }),
    'Gravity system type not found', warnings
  );
  
  // Load defense systems
  const allDefenseTypes = getAllDefenseSystemTypes();
  const shipHullPoints = hull?.hullPoints || 100; // Default for calculation purposes
  const defenses = deserializeArray(
    saveFile.defenses, allDefenseTypes, s => s.typeId,
    (s, t) => ({
      id: s.id || generateDefenseId(), type: t, quantity: s.quantity,
      hullPoints: calculateDefenseHullPoints(t, shipHullPoints, s.quantity),
      powerRequired: calculateDefensePower(t, shipHullPoints, s.quantity),
      cost: calculateDefenseCost(t, shipHullPoints, s.quantity),
    }),
    'Defense system type not found', warnings
  );
  
  // Load command & control systems
  // Note: Fire Control and Sensor Control costs will be recalculated after weapons/sensors are loaded
  const allCCTypes = getAllCommandControlSystemTypes();
  const commandControl = deserializeArray(
    saveFile.commandControl, allCCTypes, s => s.typeId,
    (s, t) => ({
      id: s.id || generateCommandControlId(), type: t, quantity: s.quantity,
      hullPoints: calculateCommandControlHullPoints(t, shipHullPoints, s.quantity),
      powerRequired: calculateCommandControlPower(t, s.quantity),
      cost: calculateCommandControlCost(t, shipHullPoints, s.quantity),
      linkedWeaponBatteryKey: s.linkedWeaponBatteryKey,
      linkedSensorId: s.linkedSensorId,
    }),
    'Command & control system type not found', warnings
  );
  
  // Load sensors
  const allSensorTypes = getAllSensorTypes();
  const designPL = saveFile.designProgressLevel || 7;
  const sensors = deserializeArray(
    saveFile.sensors, allSensorTypes, s => s.typeId,
    (s, t) => {
      const sensorId = s.id || generateSensorId();
      const assignedControl = commandControl.find(cc => cc.linkedSensorId === sensorId);
      const computerQuality: ComputerQuality = assignedControl?.type.quality as ComputerQuality || 'none';
      return {
        id: sensorId, type: t, quantity: s.quantity,
        hullPoints: calculateSensorHullPoints(t, s.quantity),
        powerRequired: calculateSensorPower(t, s.quantity),
        cost: calculateSensorCost(t, s.quantity),
        arcsCovered: Math.min(s.quantity * t.arcsCovered, 4),
        trackingCapability: calculateTrackingCapability(designPL, computerQuality, s.quantity),
      };
    },
    'Sensor system type not found', warnings
  );
  
  // Load hangar & miscellaneous systems
  const allHangarMiscTypes = getAllHangarMiscSystemTypes();
  const hangarMisc = deserializeArray(
    saveFile.hangarMisc, allHangarMiscTypes, s => s.typeId,
    (s, t) => {
      const extraHp = s.extraHp || 0;
      const cap = calculateHangarMiscCapacity(t, shipHullPoints, s.quantity, extraHp);
      return {
        id: s.id || generateHangarMiscId(), type: t, quantity: s.quantity,
        hullPoints: calculateHangarMiscHullPoints(t, shipHullPoints, s.quantity, extraHp),
        powerRequired: calculateHangarMiscPower(t, shipHullPoints, s.quantity, extraHp),
        cost: calculateHangarMiscCost(t, shipHullPoints, s.quantity, extraHp),
        capacity: cap > 0 ? cap : undefined,
        extraHp: extraHp > 0 ? extraHp : undefined,
      };
    },
    'Hangar/misc system type not found', warnings
  );
  
  // Load weapons
  const weapons: InstalledWeapon[] = [];
  const allBeamWeapons = getAllBeamWeaponTypes();
  const allProjectileWeapons = getAllProjectileWeaponTypes();
  const allTorpedoWeapons = getAllTorpedoWeaponTypes();
  const allSpecialWeapons = getAllSpecialWeaponTypes();
  
  const weaponTypesByCategory: Record<string, typeof allBeamWeapons> = {
    beam: allBeamWeapons,
    projectile: allProjectileWeapons,
    torpedo: allTorpedoWeapons,
    special: allSpecialWeapons,
  };
  
  for (const savedWeapon of (saveFile.weapons || [])) {
    const typeList = weaponTypesByCategory[savedWeapon.category];
    if (!typeList) {
      warnings.push(`Weapon category not yet supported: ${savedWeapon.category}`);
      continue;
    }
    const weaponType = typeList.find(w => w.id === savedWeapon.typeId);
    if (weaponType) {
      const weapon = createInstalledWeapon(
        weaponType,
        savedWeapon.category,
        savedWeapon.mountType,
        savedWeapon.gunConfiguration,
        savedWeapon.concealed,
        savedWeapon.quantity,
        savedWeapon.arcs as FiringArc[]
      );
      if (savedWeapon.id) weapon.id = savedWeapon.id;
      weapons.push(weapon);
    } else {
      warnings.push(`Weapon type not found: ${savedWeapon.typeId}`);
    }
  }
  
  // Load ordnance designs
  const ordnanceDesigns: OrdnanceDesign[] = [];
  const allPropulsion = getPropulsionSystems();
  const allGuidance = getGuidanceSystems();
  const allWarheads = getWarheads();
  
  for (const savedDesign of (saveFile.ordnanceDesigns || [])) {
    const warhead = allWarheads.find(w => w.id === savedDesign.warheadId);
    if (!warhead) {
      warnings.push(`Warhead not found: ${savedDesign.warheadId}`);
      continue;
    }
    
    if (savedDesign.category === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === savedDesign.propulsionId);
      const guidance = allGuidance.find(g => g.id === savedDesign.guidanceId);
      if (!propulsion) {
        warnings.push(`Propulsion system not found: ${savedDesign.propulsionId}`);
        continue;
      }
      if (!guidance) {
        warnings.push(`Guidance system not found: ${savedDesign.guidanceId}`);
        continue;
      }
      const stats = calculateMissileDesign(propulsion, guidance, warhead);
      ordnanceDesigns.push({
        id: savedDesign.id,
        name: savedDesign.name,
        category: 'missile',
        size: savedDesign.size,
        propulsionId: savedDesign.propulsionId!,
        guidanceId: savedDesign.guidanceId!,
        warheadId: savedDesign.warheadId,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MissileDesign);
    } else if (savedDesign.category === 'bomb') {
      const propulsion = findPropulsionByCategory('bomb', savedDesign.size);
      if (!propulsion) {
        warnings.push(`Bomb casing not found for size: ${savedDesign.size}`);
        continue;
      }
      const stats = calculateBombDesign(propulsion, warhead);
      ordnanceDesigns.push({
        id: savedDesign.id,
        name: savedDesign.name,
        category: 'bomb',
        size: savedDesign.size,
        warheadId: savedDesign.warheadId,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as BombDesign);
    } else if (savedDesign.category === 'mine') {
      const propulsion = findPropulsionByCategory('mine', savedDesign.size);
      const guidance = allGuidance.find(g => g.id === savedDesign.guidanceId);
      if (!propulsion) {
        warnings.push(`Mine casing not found for size: ${savedDesign.size}`);
        continue;
      }
      if (!guidance) {
        warnings.push(`Guidance system not found: ${savedDesign.guidanceId}`);
        continue;
      }
      const stats = calculateMineDesign(propulsion, guidance, warhead);
      ordnanceDesigns.push({
        id: savedDesign.id,
        name: savedDesign.name,
        category: 'mine',
        size: savedDesign.size,
        guidanceId: savedDesign.guidanceId!,
        warheadId: savedDesign.warheadId,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MineDesign);
    }
  }
  
  // Load launch systems
  const launchSystemsList: InstalledLaunchSystem[] = [];
  const allLaunchSystems = getLaunchSystems();
  
  for (const savedLS of (saveFile.launchSystems || [])) {
    const launchSystem = allLaunchSystems.find(ls => ls.id === savedLS.typeId);
    if (launchSystem) {
      // Support both old (extraCapacity) and new (extraHp) save format
      const extraHp = savedLS.extraHp ?? (savedLS as { extraCapacity?: number }).extraCapacity ?? 0;
      const stats = calculateLaunchSystemStats(launchSystem, savedLS.quantity, extraHp);
      launchSystemsList.push({
        id: savedLS.id,
        launchSystemType: launchSystem.id,
        quantity: savedLS.quantity,
        extraHp: extraHp,
        loadout: savedLS.loadout || [],
        hullPoints: stats.hullPoints,
        powerRequired: stats.powerRequired,
        cost: stats.cost,
        totalCapacity: stats.totalCapacity,
      });
    } else {
      warnings.push(`Launch system type not found: ${savedLS.typeId}`);
    }
  }
  
  // Load damage diagram zones
  const damageDiagramZones: DamageZone[] = [];
  for (const savedZone of (saveFile.damageDiagramZones || [])) {
    damageDiagramZones.push({
      code: savedZone.code as ZoneCode,
      systems: savedZone.systems.map((sys) => ({
        id: sys.id,
        systemType: sys.systemType as SystemDamageCategory,
        name: sys.name,
        hullPoints: sys.hullPoints,
        installedSystemId: sys.installedSystemId,
        firepowerOrder: sys.firepowerOrder,
      })),
      totalHullPoints: savedZone.totalHullPoints,
      maxHullPoints: savedZone.maxHullPoints,
    });
  }
  
  // Load hit location chart
  let hitLocationChart: HitLocationChart | null = null;
  if (saveFile.hitLocationChart) {
    hitLocationChart = {
      hitDie: saveFile.hitLocationChart.hitDie,
      columns: saveFile.hitLocationChart.columns.map((col) => ({
        direction: col.direction,
        entries: col.entries.map((e) => ({
          minRoll: e.minRoll,
          maxRoll: e.maxRoll,
          zone: e.zone as ZoneCode,
        })),
      })),
    };
  }
  
  // If we have critical errors (no hull found when one was specified), fail
  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }
  
  // Recalculate Fire Control and Sensor Control costs based on loaded weapons/sensors
  for (const cc of commandControl) {
    if (cc.type.linkedSystemType === 'weapon' && cc.linkedWeaponBatteryKey) {
      cc.cost = calculateFireControlCost(cc.type, cc.linkedWeaponBatteryKey, weapons);
    } else if (cc.type.linkedSystemType === 'sensor' && cc.linkedSensorId) {
      cc.cost = calculateSensorControlCost(cc.type, cc.linkedSensorId, sensors);
    }
  }
  
  return {
    success: true,
    state: {
      name: saveFile.name || 'Unnamed Design',
      shipDescription: {
        lore: saveFile.lore || '',
        imageData: saveFile.imageData ?? null,
        imageMimeType: saveFile.imageMimeType ?? null,
        faction: saveFile.faction || '',
        role: saveFile.role || '',
        commissioningDate: saveFile.commissioningDate || '',
        classification: saveFile.classification || '',
        manufacturer: saveFile.manufacturer || '',
      },
      designType,
      stationType,
      surfaceProvidesLifeSupport,
      surfaceProvidesGravity,
      hull,
      armorLayers,
      powerPlants,
      fuelTanks,
      engines,
      engineFuelTanks,
      ftlDrive,
      ftlFuelTanks,
      lifeSupport,
      accommodations,
      storeSystems,
      gravitySystems,
      defenses,
      commandControl,
      sensors,
      hangarMisc,
      weapons,
      ordnanceDesigns,
      launchSystems: launchSystemsList,
      damageDiagramZones,
      hitLocationChart,
      designProgressLevel: saveFile.designProgressLevel || 7,
      designTechTracks: saveFile.designTechTracks || [],
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get default file name for a warship
 */
export function getDefaultFileName(state: WarshipState): string {
  // Sanitize the name for use as a filename
  const sanitizeName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').trim();
  
  if (state.name && state.name.trim()) {
    return `${sanitizeName(state.name)}.warship.json`;
  }
  return 'New Ship.warship.json';
}
