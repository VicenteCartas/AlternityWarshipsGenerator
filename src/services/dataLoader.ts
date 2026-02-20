/**
 * Data Loader Service
 * 
 * Handles runtime loading of game data files, allowing users to edit
 * the JSON data files externally. Uses Electron IPC to read files from
 * the data directory, with fallback to bundled data for web/dev mode.
 * 
 * Supports mod system: after loading base data, enabled mods are merged
 * in priority order. "add" mods merge items by ID (last-write-wins),
 * "replace" mods replace entire files.
 */

import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeightConfig } from '../types/armor';
import type { PowerPlantType, FuelTankType } from '../types/powerPlant';
import type { EngineType } from '../types/engine';
import type { FTLDriveType } from '../types/ftlDrive';
import type { LifeSupportType, AccommodationType, StoreSystemType, GravitySystemType } from '../types/supportSystem';
import type { DefenseSystemType } from '../types/defense';
import type { CommandControlSystemType } from '../types/commandControl';
import type { SensorType, TrackingTable } from '../types/sensor';
import type { HangarMiscSystemType } from '../types/hangarMisc';
import type { LaunchSystem, PropulsionSystem, Warhead, GuidanceSystem } from '../types/ordnance';
import type { BeamWeaponType, ProjectileWeaponType, TorpedoWeaponType, SpecialWeaponType, MountModifier, GunConfigModifier, MountType, GunConfiguration } from '../types/weapon';

import type { DamageDiagramData } from '../types/damageDiagram';
import type { Mod, ModDataFileName } from '../types/mod';
import { getEnabledMods, getModFileData } from './modService';

// Bundled data as fallback (imported at build time)
import hullsDataFallback from '../data/hulls.json';
import armorDataFallback from '../data/armor.json';
import powerPlantDataFallback from '../data/powerPlants.json';
import fuelTankDataFallback from '../data/fuelTank.json';
import enginesDataFallback from '../data/engines.json';
import ftlDrivesDataFallback from '../data/ftlDrives.json';
import supportSystemsDataFallback from '../data/supportSystems.json';
import defensesDataFallback from '../data/defenses.json';
import commandControlDataFallback from '../data/commandControl.json';
import sensorsDataFallback from '../data/sensors.json';
import hangarMiscDataFallback from '../data/hangarMisc.json';
import ordnanceDataFallback from '../data/ordnance.json';
import damageDiagramDataFallback from '../data/damageDiagram.json';
import weaponsDataFallback from '../data/weapons.json';

// Cache for loaded data
interface DataCache {
  hulls: Hull[] | null;
  armors: ArmorType[] | null;
  armorWeights: ArmorWeightConfig[] | null;
  armorAllowMultipleLayers: boolean;
  powerPlants: PowerPlantType[] | null;
  fuelTank: FuelTankType | null;
  engines: EngineType[] | null;
  ftlDrives: FTLDriveType[] | null;
  supportSystems: {
    lifeSupport: LifeSupportType[];
    accommodations: AccommodationType[];
    storeSystems: StoreSystemType[];
    gravitySystems: GravitySystemType[];
  } | null;
  defenseSystems: DefenseSystemType[] | null;
  commandControlSystems: CommandControlSystemType[] | null;
  sensors: SensorType[] | null;
  trackingTable: TrackingTable | null;
  hangarMiscSystems: HangarMiscSystemType[] | null;
  launchSystems: LaunchSystem[] | null;
  propulsionSystems: PropulsionSystem[] | null;
  warheads: Warhead[] | null;
  guidanceSystems: GuidanceSystem[] | null;
  damageDiagram: DamageDiagramData | null;
  // Weapons data
  beamWeapons: BeamWeaponType[] | null;
  projectileWeapons: ProjectileWeaponType[] | null;
  torpedoWeapons: TorpedoWeaponType[] | null;
  specialWeapons: SpecialWeaponType[] | null;
  mountModifiers: Record<MountType, MountModifier> | null;
  gunConfigurations: Record<GunConfiguration, GunConfigModifier> | null;
  concealmentModifier: MountModifier | null;
}

const cache: DataCache = {
  hulls: null,
  armors: null,
  armorWeights: null,
  armorAllowMultipleLayers: false,
  powerPlants: null,
  fuelTank: null,
  engines: null,
  ftlDrives: null,
  supportSystems: null,
  defenseSystems: null,
  commandControlSystems: null,
  sensors: null,
  trackingTable: null,
  hangarMiscSystems: null,
  launchSystems: null,
  propulsionSystems: null,
  warheads: null,
  guidanceSystems: null,
  damageDiagram: null,
  // Weapons
  beamWeapons: null,
  projectileWeapons: null,
  torpedoWeapons: null,
  specialWeapons: null,
  mountModifiers: null,
  gunConfigurations: null,
  concealmentModifier: null,
};

let dataLoaded = false;
let loadPromise: Promise<DataLoadResult> | null = null;

// Track which mods are currently active (for save file references)
let activeMods: Mod[] = [];

// Track files that failed to load from external source
interface FailedFile {
  fileName: string;
  reason: string;
}

// Result of data loading
export interface DataLoadResult {
  failedFiles: FailedFile[];
  isElectron: boolean;
}

/**
 * Load a data file using Electron IPC, with fallback to bundled data
 * Returns the data and tracks if the file failed to load externally
 */
async function loadDataFile<T>(
  fileName: string, 
  fallbackData: T, 
  failedFiles: FailedFile[]
): Promise<T> {
  // If not in Electron, use bundled data (not a failure, just development mode)
  if (!window.electronAPI) {
    console.log(`[DataLoader] No Electron API, using bundled ${fileName}`);
    return fallbackData;
  }

  try {
    const result = await window.electronAPI.readDataFile(fileName);
    if (result.success && result.content) {
      console.log(`[DataLoader] Loaded ${fileName} from ${result.path}`);
      return JSON.parse(result.content) as T;
    } else {
      const reason = result.error || 'Unknown error';
      console.warn(`[DataLoader] Failed to load ${fileName}: ${reason}, using bundled data`);
      failedFiles.push({ fileName, reason });
      return fallbackData;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DataLoader] Error loading ${fileName}:`, error);
    failedFiles.push({ fileName, reason });
    return fallbackData;
  }
}

// ============== Mod Merge Utilities ==============

interface ItemWithId {
  id: string;
  _source?: string;
}

/**
 * Merge two arrays of items by ID. Mod items override base items with the
 * same ID; new IDs are appended. Each item is tagged with _source.
 */
function mergeArraysById<T extends ItemWithId>(
  base: T[],
  mod: T[],
  sourceName: string
): T[] {
  const map = new Map<string, T>();
  for (const item of base) {
    map.set(item.id, item);
  }
  for (const item of mod) {
    map.set(item.id, { ...item, _source: sourceName });
  }
  return Array.from(map.values());
}

/**
 * Tag all items in an array with a _source field.
 */
function tagArraySource<T extends ItemWithId>(items: T[], source: string): T[] {
  return items.map(item => (item._source ? item : { ...item, _source: source }));
}

/**
 * Deep merge two plain objects. Mod values override base values at each key.
 * Arrays are replaced, not concatenated (object-level merge only).
 */
function deepMergeObjects<T extends Record<string, unknown>>(base: T, mod: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(mod) as (keyof T)[]) {
    const modVal = mod[key];
    const baseVal = result[key];
    if (
      modVal !== null && typeof modVal === 'object' && !Array.isArray(modVal) &&
      baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal)
    ) {
      result[key] = deepMergeObjects(
        baseVal as Record<string, unknown>,
        modVal as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = modVal as T[keyof T];
    }
  }
  return result;
}

/**
 * Apply a single mod's data for a specific file to the current file data.
 * For "replace" mode, the mod data fully replaces the base.
 * For "add" mode, arrays are merged by ID; objects are deep-merged.
 */
function applyModToFileData(
  baseData: Record<string, unknown>,
  modData: Record<string, unknown>,
  mode: 'add' | 'replace',
  modName: string
): Record<string, unknown> {
  if (mode === 'replace') {
    // Tag arrays in the replacement data
    const result = { ...modData };
    for (const key of Object.keys(result)) {
      const val = result[key];
      if (Array.isArray(val)) {
        result[key] = tagArraySource(val as ItemWithId[], modName);
      }
    }
    return result;
  }

  // "add" mode: merge each top-level key
  const result = { ...baseData };
  for (const key of Object.keys(modData)) {
    const baseVal = result[key];
    const modVal = modData[key];

    if (Array.isArray(baseVal) && Array.isArray(modVal)) {
      result[key] = mergeArraysById(baseVal as ItemWithId[], modVal as ItemWithId[], modName);
    } else if (
      baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal) &&
      modVal !== null && typeof modVal === 'object' && !Array.isArray(modVal)
    ) {
      result[key] = deepMergeObjects(
        baseVal as Record<string, unknown>,
        modVal as Record<string, unknown>
      );
    } else {
      // Scalar or new key — mod wins
      result[key] = modVal;
    }
  }
  return result;
}

/**
 * Load all enabled mod data for a specific file and merge it onto the base data.
 */
async function applyModsToFile(
  fileName: ModDataFileName,
  baseData: Record<string, unknown>,
  enabledMods: Mod[]
): Promise<Record<string, unknown>> {
  // Tag base data arrays with "base" source
  let data = { ...baseData };
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (Array.isArray(val)) {
      data[key] = tagArraySource(val as ItemWithId[], 'base');
    }
  }

  for (const mod of enabledMods) {
    if (!mod.files.includes(fileName)) continue;

    const modFileData = await getModFileData(mod.folderName, fileName);
    if (!modFileData || typeof modFileData !== 'object') {
      console.warn(`[DataLoader] Skipping invalid mod data: ${mod.folderName}/${fileName}`);
      continue;
    }

    const fileMode = mod.manifest.fileModes?.[fileName] ?? mod.manifest.mode;
    console.log(`[DataLoader] Applying mod "${mod.manifest.name}" (${fileMode}) to ${fileName}`);
    data = applyModToFileData(data, modFileData as Record<string, unknown>, fileMode, mod.manifest.name);
  }

  return data;
}

/**
 * Load all game data files
 * Call this once at app startup
 * Returns information about any files that failed to load from external sources
 */
export async function loadAllGameData(): Promise<DataLoadResult> {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Return immediately if already loaded
  if (dataLoaded) {
    return { failedFiles: [], isElectron: !!window.electronAPI };
  }

  loadPromise = (async () => {
    console.log('[DataLoader] Loading game data...');
    const failedFiles: FailedFile[] = [];
    const isElectron = !!window.electronAPI;

    // Load all base data files in parallel
    const [hullsData, armorData, powerPlantsData, fuelTankData, enginesData, ftlDrivesData, supportSystemsData, defensesData, commandControlData, sensorsData, hangarMiscData, ordnanceData, damageDiagramData, weaponsData] = await Promise.all([
      loadDataFile('hulls.json', hullsDataFallback, failedFiles),
      loadDataFile('armor.json', armorDataFallback, failedFiles),
      loadDataFile('powerPlants.json', powerPlantDataFallback, failedFiles),
      loadDataFile('fuelTank.json', fuelTankDataFallback, failedFiles),
      loadDataFile('engines.json', enginesDataFallback, failedFiles),
      loadDataFile('ftlDrives.json', ftlDrivesDataFallback, failedFiles),
      loadDataFile('supportSystems.json', supportSystemsDataFallback, failedFiles),
      loadDataFile('defenses.json', defensesDataFallback, failedFiles),
      loadDataFile('commandControl.json', commandControlDataFallback, failedFiles),
      loadDataFile('sensors.json', sensorsDataFallback, failedFiles),
      loadDataFile('hangarMisc.json', hangarMiscDataFallback, failedFiles),
      loadDataFile('ordnance.json', ordnanceDataFallback, failedFiles),
      loadDataFile('damageDiagram.json', damageDiagramDataFallback, failedFiles),
      loadDataFile('weapons.json', weaponsDataFallback, failedFiles),
    ]);

    // Apply mods: load enabled mods sorted by priority, merge into base data
    let enabledMods: Mod[] = [];
    try {
      enabledMods = await getEnabledMods();
      if (enabledMods.length > 0) {
        console.log(`[DataLoader] Applying ${enabledMods.length} enabled mod(s)...`);
      }
    } catch (error) {
      console.warn('[DataLoader] Failed to load mods, using base data only:', error);
    }
    activeMods = enabledMods;

    // Apply mods to each file that has enabled mods providing it
    const [
      mergedHulls, mergedArmor, mergedPowerPlants, mergedFuelTank,
      mergedEngines, mergedFtlDrives, mergedSupportSystems,
      mergedDefenses, mergedCommandControl, mergedSensors,
      mergedHangarMisc, mergedOrdnance, mergedDamageDiagram, mergedWeapons,
    ] = await Promise.all([
      applyModsToFile('hulls.json', hullsData as Record<string, unknown>, enabledMods),
      applyModsToFile('armor.json', armorData as Record<string, unknown>, enabledMods),
      applyModsToFile('powerPlants.json', powerPlantsData as Record<string, unknown>, enabledMods),
      applyModsToFile('fuelTank.json', fuelTankData as Record<string, unknown>, enabledMods),
      applyModsToFile('engines.json', enginesData as Record<string, unknown>, enabledMods),
      applyModsToFile('ftlDrives.json', ftlDrivesData as Record<string, unknown>, enabledMods),
      applyModsToFile('supportSystems.json', supportSystemsData as Record<string, unknown>, enabledMods),
      applyModsToFile('defenses.json', defensesData as Record<string, unknown>, enabledMods),
      applyModsToFile('commandControl.json', commandControlData as Record<string, unknown>, enabledMods),
      applyModsToFile('sensors.json', sensorsData as Record<string, unknown>, enabledMods),
      applyModsToFile('hangarMisc.json', hangarMiscData as Record<string, unknown>, enabledMods),
      applyModsToFile('ordnance.json', ordnanceData as Record<string, unknown>, enabledMods),
      applyModsToFile('damageDiagram.json', damageDiagramData as Record<string, unknown>, enabledMods),
      applyModsToFile('weapons.json', weaponsData as Record<string, unknown>, enabledMods),
    ]);

    // Store merged data in cache
    cache.hulls = (mergedHulls as { hulls: Hull[] }).hulls;
    cache.armors = (mergedArmor as { armors: ArmorType[] }).armors;
    cache.armorWeights = (mergedArmor as { armorWeights: ArmorWeightConfig[] }).armorWeights;
    cache.armorAllowMultipleLayers = (mergedArmor as { allowMultipleLayers?: boolean }).allowMultipleLayers ?? false;
    cache.powerPlants = (mergedPowerPlants as { powerPlants: PowerPlantType[] }).powerPlants;
    cache.fuelTank = (mergedFuelTank as { fuelTank: FuelTankType }).fuelTank;
    cache.engines = (mergedEngines as { engines: EngineType[] }).engines;
    cache.ftlDrives = (mergedFtlDrives as { ftlDrives: FTLDriveType[] }).ftlDrives;
    cache.supportSystems = mergedSupportSystems as {
      lifeSupport: LifeSupportType[];
      accommodations: AccommodationType[];
      storeSystems: StoreSystemType[];
      gravitySystems: GravitySystemType[];
    };
    cache.defenseSystems = (mergedDefenses as { defenseSystems: DefenseSystemType[] }).defenseSystems;
    cache.commandControlSystems = (mergedCommandControl as { commandSystems: CommandControlSystemType[] }).commandSystems;
    cache.sensors = (mergedSensors as { sensors: SensorType[] }).sensors;
    cache.trackingTable = (mergedSensors as { trackingTable?: TrackingTable }).trackingTable || null;
    cache.hangarMiscSystems = (mergedHangarMisc as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems;
    cache.launchSystems = (mergedOrdnance as { launchSystems: LaunchSystem[] }).launchSystems;
    cache.propulsionSystems = (mergedOrdnance as { propulsionSystems: PropulsionSystem[] }).propulsionSystems;
    cache.warheads = (mergedOrdnance as { warheads: Warhead[] }).warheads;
    cache.guidanceSystems = (mergedOrdnance as { guidanceSystems: GuidanceSystem[] }).guidanceSystems;
    cache.damageDiagram = mergedDamageDiagram as unknown as DamageDiagramData;
    // Weapons data
    cache.beamWeapons = (mergedWeapons as { beamWeapons: BeamWeaponType[] }).beamWeapons;
    cache.projectileWeapons = (mergedWeapons as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || [];
    cache.torpedoWeapons = (mergedWeapons as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || [];
    cache.specialWeapons = (mergedWeapons as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || [];
    cache.mountModifiers = (mergedWeapons as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null;
    cache.gunConfigurations = (mergedWeapons as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null;
    cache.concealmentModifier = (mergedWeapons as { concealmentModifier?: MountModifier }).concealmentModifier || null;

    dataLoaded = true;
    console.log('[DataLoader] Game data loaded successfully');
    
    if (failedFiles.length > 0) {
      console.warn('[DataLoader] Some files failed to load from external sources:', failedFiles);
    }
    
    return { failedFiles, isElectron };
  })();

  return loadPromise;
}

/**
 * Check if data has been loaded
 */
export function isDataLoaded(): boolean {
  return dataLoaded;
}

/**
 * Get all hulls (must call loadAllGameData first)
 */
export function getHullsData(): Hull[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (hullsDataFallback as { hulls: Hull[] }).hulls;
  }
  return cache.hulls!;
}

/**
 * Get all armor types (must call loadAllGameData first)
 */
export function getArmorTypesData(): ArmorType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (armorDataFallback as { armors: ArmorType[] }).armors;
  }
  return cache.armors!;
}

/**
 * Get all armor weight configs (must call loadAllGameData first)
 */
export function getArmorWeightsData(): ArmorWeightConfig[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (armorDataFallback as { armorWeights: ArmorWeightConfig[] }).armorWeights;
  }
  return cache.armorWeights!;
}

/**
 * Get whether multiple armor layers are allowed (must call loadAllGameData first)
 */
export function getArmorAllowMultipleLayers(): boolean {
  if (!dataLoaded) {
    return (armorDataFallback as { allowMultipleLayers?: boolean }).allowMultipleLayers ?? false;
  }
  return cache.armorAllowMultipleLayers;
}

/**
 * Get all power plant types (must call loadAllGameData first)
 */
export function getPowerPlantsData(): PowerPlantType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (powerPlantDataFallback as { powerPlants: PowerPlantType[] }).powerPlants;
  }
  return cache.powerPlants!;
}

/**
 * Get the fuel tank type (must call loadAllGameData first)
 */
export function getFuelTankData(): FuelTankType {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (fuelTankDataFallback as { fuelTank: FuelTankType }).fuelTank;
  }
  return cache.fuelTank!;
}

/**
 * Get all engine types (must call loadAllGameData first)
 */
export function getEnginesData(): EngineType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (enginesDataFallback as { engines: EngineType[] }).engines;
  }
  return cache.engines!;
}

/**
 * Get all FTL drive types (must call loadAllGameData first)
 */
export function getFTLDrivesData(): FTLDriveType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ftlDrivesDataFallback as { ftlDrives: FTLDriveType[] }).ftlDrives;
  }
  return cache.ftlDrives!;
}

/**
 * Reload all game data (e.g., after user edits data files or changes mods)
 */
export async function reloadAllGameData(): Promise<DataLoadResult> {
  dataLoaded = false;
  loadPromise = null;
  activeMods = [];
  cache.hulls = null;
  cache.armors = null;
  cache.armorWeights = null;
  cache.armorAllowMultipleLayers = false;
  cache.powerPlants = null;
  cache.fuelTank = null;
  cache.engines = null;
  cache.ftlDrives = null;
  cache.supportSystems = null;
  cache.defenseSystems = null;
  cache.commandControlSystems = null;
  cache.sensors = null;
  cache.trackingTable = null;
  cache.hangarMiscSystems = null;
  cache.launchSystems = null;
  cache.propulsionSystems = null;
  cache.warheads = null;
  cache.guidanceSystems = null;
  cache.damageDiagram = null;
  cache.beamWeapons = null;
  cache.projectileWeapons = null;
  cache.torpedoWeapons = null;
  cache.specialWeapons = null;
  cache.mountModifiers = null;
  cache.gunConfigurations = null;
  cache.concealmentModifier = null;
  return loadAllGameData();
}

/**
 * Get the currently active (enabled) mods that were applied during data loading.
 * Used by save service to record which mods were active when saving.
 */
export function getActiveMods(): Mod[] {
  return activeMods;
}

/**
 * Get the path to the data directory (for user reference)
 */
export async function getDataDirectoryPath(): Promise<string | null> {
  if (!window.electronAPI) {
    return null;
  }
  return window.electronAPI.getDataPath();
}

/**
 * Get all sensor types (must call loadAllGameData first)
 */
export function getSensorsData(): SensorType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (sensorsDataFallback as { sensors: SensorType[] }).sensors;
  }
  return cache.sensors!;
}

/**
 * Get all hangar/misc system types (must call loadAllGameData first)
 */
export function getHangarMiscSystemsData(): HangarMiscSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (hangarMiscDataFallback as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems;
  }
  return cache.hangarMiscSystems!;
}

/**
 * Get all launch systems (must call loadAllGameData first)
 */
export function getLaunchSystemsData(): LaunchSystem[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { launchSystems: LaunchSystem[] }).launchSystems;
  }
  return cache.launchSystems!;
}

/**
 * Get all propulsion systems (must call loadAllGameData first)
 */
export function getPropulsionSystemsData(): PropulsionSystem[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { propulsionSystems: PropulsionSystem[] }).propulsionSystems;
  }
  return cache.propulsionSystems!;
}

/**
 * Get all warheads (must call loadAllGameData first)
 */
export function getWarheadsData(): Warhead[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { warheads: Warhead[] }).warheads;
  }
  return cache.warheads!;
}

/**
 * Get all guidance systems (must call loadAllGameData first)
 */
export function getGuidanceSystemsData(): GuidanceSystem[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { guidanceSystems: GuidanceSystem[] }).guidanceSystems;
  }
  return cache.guidanceSystems!;
}

/**
 * Get all beam weapon types (must call loadAllGameData first)
 */
export function getBeamWeaponsData(): BeamWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { beamWeapons: BeamWeaponType[] }).beamWeapons;
  }
  return cache.beamWeapons!;
}

/**
 * Get all projectile weapon types (must call loadAllGameData first)
 */
export function getProjectileWeaponsData(): ProjectileWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || [];
  }
  return cache.projectileWeapons!;
}

/**
 * Get all torpedo weapon types (must call loadAllGameData first)
 */
export function getTorpedoWeaponsData(): TorpedoWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || [];
  }
  return cache.torpedoWeapons!;
}

/**
 * Get all special weapon types (must call loadAllGameData first)
 */
export function getSpecialWeaponsData(): SpecialWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || [];
  }
  return cache.specialWeapons!;
}

/**
 * Get mount modifiers (must call loadAllGameData first)
 */
export function getMountModifiersData(): Record<MountType, MountModifier> | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null;
  }
  return cache.mountModifiers;
}

/**
 * Get gun configurations (must call loadAllGameData first)
 */
export function getGunConfigurationsData(): Record<GunConfiguration, GunConfigModifier> | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null;
  }
  return cache.gunConfigurations;
}

/**
 * Get concealment modifier (must call loadAllGameData first)
 */
export function getConcealmentModifierData(): MountModifier | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { concealmentModifier?: MountModifier }).concealmentModifier || null;
  }
  return cache.concealmentModifier;
}

/**
 * Get all life support types (must call loadAllGameData first)
 */
export function getLifeSupportData(): LifeSupportType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { lifeSupport: LifeSupportType[] }).lifeSupport;
  }
  return cache.supportSystems?.lifeSupport || [];
}

/**
 * Get all accommodation types (must call loadAllGameData first)
 */
export function getAccommodationsData(): AccommodationType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { accommodations: AccommodationType[] }).accommodations;
  }
  return cache.supportSystems?.accommodations || [];
}

/**
 * Get all store system types (must call loadAllGameData first)
 */
export function getStoreSystemsData(): StoreSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { storeSystems: StoreSystemType[] }).storeSystems;
  }
  return cache.supportSystems?.storeSystems || [];
}

/**
 * Get all gravity system types (must call loadAllGameData first)
 */
export function getGravitySystemsData(): GravitySystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { gravitySystems?: GravitySystemType[] }).gravitySystems || [];
  }
  return cache.supportSystems?.gravitySystems || [];
}

/**
 * Get all defense system types (must call loadAllGameData first)
 */
export function getDefenseSystemsData(): DefenseSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (defensesDataFallback as { defenseSystems: DefenseSystemType[] }).defenseSystems;
  }
  return cache.defenseSystems!;
}

/**
 * Get all command control system types (must call loadAllGameData first)
 */
export function getCommandControlSystemsData(): CommandControlSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (commandControlDataFallback as { commandSystems: CommandControlSystemType[] }).commandSystems;
  }
  return cache.commandControlSystems!;
}

/**
 * Get the tracking table (must call loadAllGameData first)
 */
export function getTrackingTableData(): TrackingTable | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (sensorsDataFallback as { trackingTable?: TrackingTable }).trackingTable || null;
  }
  return cache.trackingTable;
}

/**
 * Get damage diagram data (must call loadAllGameData first)
 */
export function getDamageDiagramDataGetter(): DamageDiagramData | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return damageDiagramDataFallback as unknown as DamageDiagramData;
  }
  return cache.damageDiagram;
}
