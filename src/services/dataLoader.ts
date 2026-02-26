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
import { getModFileData } from './modService';
import { logger } from './utilities';

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
  stationHulls: Hull[] | null;
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

// ============== Cache Factories ==============

function createEmptyCache(): DataCache {
  return {
    hulls: null,
    stationHulls: null,
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
    beamWeapons: null,
    projectileWeapons: null,
    torpedoWeapons: null,
    specialWeapons: null,
    mountModifiers: null,
    gunConfigurations: null,
    concealmentModifier: null,
  };
}

function createEmptyRawBaseData(): RawBaseDataCache {
  return {
    hulls: null, armor: null, powerPlants: null, fuelTank: null,
    engines: null, ftlDrives: null, supportSystems: null, defenses: null,
    commandControl: null, sensors: null, hangarMisc: null, ordnance: null,
    damageDiagram: null, weapons: null,
  };
}

const cache: DataCache = createEmptyCache();
const pureBaseCache: DataCache = createEmptyCache();

// Cache for the raw base JSON data (pre-parsing) so we can re-merge mods without reloading from disk
interface RawBaseDataCache {
  hulls: Record<string, unknown> | null;
  armor: Record<string, unknown> | null;
  powerPlants: Record<string, unknown> | null;
  fuelTank: Record<string, unknown> | null;
  engines: Record<string, unknown> | null;
  ftlDrives: Record<string, unknown> | null;
  supportSystems: Record<string, unknown> | null;
  defenses: Record<string, unknown> | null;
  commandControl: Record<string, unknown> | null;
  sensors: Record<string, unknown> | null;
  hangarMisc: Record<string, unknown> | null;
  ordnance: Record<string, unknown> | null;
  damageDiagram: Record<string, unknown> | null;
  weapons: Record<string, unknown> | null;
}

const rawBaseData: RawBaseDataCache = createEmptyRawBaseData();

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
    logger.log(`[DataLoader] No Electron API, using bundled ${fileName}`);
    return fallbackData;
  }

  try {
    const result = await window.electronAPI.readDataFile(fileName);
    if (result.success && result.content) {
      logger.log(`[DataLoader] Loaded ${fileName} from ${result.path}`);
      return JSON.parse(result.content) as T;
    } else {
      const reason = result.error || 'Unknown error';
      logger.warn(`[DataLoader] Failed to load ${fileName}: ${reason}, using bundled data`);
      failedFiles.push({ fileName, reason });
      return fallbackData;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[DataLoader] Error loading ${fileName}:`, error);
    failedFiles.push({ fileName, reason });
    return fallbackData;
  }
}

// ============== Mod Merge Utilities ==============

/**
 * Merge two arrays of items by ID. Mod items override base items with the
 * same ID; new IDs are appended. Each item is tagged with _source.
 */
function mergeArraysById<T extends Record<string, unknown>>(
  base: T[],
  mod: T[],
  sourceName: string
): T[] {
  const map = new Map<string, T>();
  for (const item of base) {
    const key = (item.id as string) || JSON.stringify(item);
    map.set(key, item);
  }
  for (const item of mod) {
    const key = (item.id as string) || JSON.stringify(item);
    map.set(key, { ...item, _source: sourceName });
  }
  return Array.from(map.values());
}

/**
 * Tag all items in an array with a _source field.
 */
function tagArraySource<T extends Record<string, unknown>>(items: T[], source: string): T[] {
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
 * Resolve per-section (rootKey) modes from a mod's fileModes map.
 */
function resolveSectionModes(
  fileModes: Partial<Record<string, 'add' | 'replace'>> | undefined,
  rootKeys: string[]
): Record<string, 'add' | 'replace'> {
  if (!fileModes) return {};

  const result: Record<string, 'add' | 'replace'> = {};
  for (const key of rootKeys) {
    if (fileModes[key]) {
      result[key] = fileModes[key];
    }
  }
  return result;
}

/**
 * Apply a single mod's data for a specific file to the current file data.
 * Each section (rootKey) can have its own merge mode:
 * - "replace": mod data replaces that section entirely
 * - "add" (default): arrays merged by ID; objects deep-merged
 */
function applyModToFileData(
  baseData: Record<string, unknown>,
  modData: Record<string, unknown>,
  sectionModes: Record<string, 'add' | 'replace'>,
  modName: string
): Record<string, unknown> {
  const result = { ...baseData };

  for (const key of Object.keys(modData)) {
    const baseVal = result[key];
    const modVal = modData[key];
    const mode = sectionModes[key] ?? 'add';

    if (mode === 'replace') {
      // Replace this section entirely with mod data
      if (Array.isArray(modVal)) {
        result[key] = tagArraySource(modVal as Record<string, unknown>[], modName);
      } else {
        result[key] = modVal;
      }
    } else {
      // "add" mode: merge
      if (Array.isArray(baseVal) && Array.isArray(modVal)) {
        result[key] = mergeArraysById(baseVal as Record<string, unknown>[], modVal as Record<string, unknown>[], modName);
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
      data[key] = tagArraySource(val as Record<string, unknown>[], 'base');
    }
  }

  for (const mod of enabledMods) {
    if (!mod.files.includes(fileName)) continue;

    const modFileData = await getModFileData(mod.folderName, fileName);
    if (!modFileData || typeof modFileData !== 'object') {
      logger.warn(`[DataLoader] Skipping invalid mod data: ${mod.folderName}/${fileName}`);
      continue;
    }

    const sectionModes = resolveSectionModes(mod.manifest.fileModes, Object.keys(modFileData as Record<string, unknown>));
    const modeDesc = Object.keys(sectionModes).length > 0
      ? Object.entries(sectionModes).map(([k, m]) => `${k}:${m}`).join(', ')
      : 'add (default)';
    logger.log(`[DataLoader] Applying mod "${mod.manifest.name}" [${modeDesc}] to ${fileName}`);
    data = applyModToFileData(data, modFileData as Record<string, unknown>, sectionModes, mod.manifest.name);
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
    logger.log('[DataLoader] Loading game data...');
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

    // Store raw base data for re-merging mods later (without reloading from disk)
    rawBaseData.hulls = hullsData as Record<string, unknown>;
    rawBaseData.armor = armorData as Record<string, unknown>;
    rawBaseData.powerPlants = powerPlantsData as Record<string, unknown>;
    rawBaseData.fuelTank = fuelTankData as Record<string, unknown>;
    rawBaseData.engines = enginesData as Record<string, unknown>;
    rawBaseData.ftlDrives = ftlDrivesData as Record<string, unknown>;
    rawBaseData.supportSystems = supportSystemsData as Record<string, unknown>;
    rawBaseData.defenses = defensesData as Record<string, unknown>;
    rawBaseData.commandControl = commandControlData as Record<string, unknown>;
    rawBaseData.sensors = sensorsData as Record<string, unknown>;
    rawBaseData.hangarMisc = hangarMiscData as Record<string, unknown>;
    rawBaseData.ordnance = ordnanceData as Record<string, unknown>;
    rawBaseData.damageDiagram = damageDiagramData as Record<string, unknown>;
    rawBaseData.weapons = weaponsData as Record<string, unknown>;

    // Store pure base data in pureBaseCache
    pureBaseCache.hulls = (hullsData as { hulls: Hull[] }).hulls;
    pureBaseCache.stationHulls = (hullsData as { stationHulls?: Hull[] }).stationHulls || [];
    pureBaseCache.armors = (armorData as { armors: ArmorType[] }).armors;
    pureBaseCache.armorWeights = (armorData as { armorWeights: ArmorWeightConfig[] }).armorWeights;
    pureBaseCache.armorAllowMultipleLayers = (armorData as { allowMultipleLayers?: boolean }).allowMultipleLayers ?? false;
    pureBaseCache.powerPlants = (powerPlantsData as { powerPlants: PowerPlantType[] }).powerPlants;
    pureBaseCache.fuelTank = (fuelTankData as { fuelTank: FuelTankType }).fuelTank;
    pureBaseCache.engines = (enginesData as { engines: EngineType[] }).engines;
    pureBaseCache.ftlDrives = (ftlDrivesData as { ftlDrives: FTLDriveType[] }).ftlDrives;
    pureBaseCache.supportSystems = supportSystemsData as {
      lifeSupport: LifeSupportType[];
      accommodations: AccommodationType[];
      storeSystems: StoreSystemType[];
      gravitySystems: GravitySystemType[];
    };
    pureBaseCache.defenseSystems = (defensesData as { defenseSystems: DefenseSystemType[] }).defenseSystems;
    pureBaseCache.commandControlSystems = (commandControlData as { commandSystems: CommandControlSystemType[] }).commandSystems;
    pureBaseCache.sensors = (sensorsData as { sensors: SensorType[] }).sensors;
    pureBaseCache.trackingTable = (sensorsData as { trackingTable?: TrackingTable }).trackingTable || null;
    pureBaseCache.hangarMiscSystems = (hangarMiscData as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems;
    pureBaseCache.launchSystems = (ordnanceData as { launchSystems: LaunchSystem[] }).launchSystems;
    pureBaseCache.propulsionSystems = (ordnanceData as { propulsionSystems: PropulsionSystem[] }).propulsionSystems;
    pureBaseCache.warheads = (ordnanceData as { warheads: Warhead[] }).warheads;
    pureBaseCache.guidanceSystems = (ordnanceData as { guidanceSystems: GuidanceSystem[] }).guidanceSystems;
    pureBaseCache.damageDiagram = damageDiagramData as unknown as DamageDiagramData;
    pureBaseCache.beamWeapons = (weaponsData as { beamWeapons: BeamWeaponType[] }).beamWeapons;
    pureBaseCache.projectileWeapons = (weaponsData as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || [];
    pureBaseCache.torpedoWeapons = (weaponsData as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || [];
    pureBaseCache.specialWeapons = (weaponsData as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || [];
    pureBaseCache.mountModifiers = (weaponsData as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null;
    pureBaseCache.gunConfigurations = (weaponsData as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null;
    pureBaseCache.concealmentModifier = (weaponsData as { concealmentModifier?: MountModifier }).concealmentModifier || null;

    // Initially load with no mods — mods are applied per-design when
    // creating a new design or loading a save file.
    await applyModsToCache([]);

    dataLoaded = true;
    logger.log('[DataLoader] Game data loaded successfully');
    
    if (failedFiles.length > 0) {
      logger.warn('[DataLoader] Some files failed to load from external sources:', failedFiles);
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

// ============== Getter Factory ==============

/**
 * Factory for creating data getter functions.
 * Standardizes the pattern: check dataLoaded → fallback or cache lookup.
 */
function createGetter<T>(
  accessor: (source: DataCache) => T,
  fallback: () => T
): (pureBase?: boolean) => T {
  return (pureBase = false): T => {
    if (!dataLoaded) {
      logger.warn('[DataLoader] Data not loaded, using fallback');
      return fallback();
    }
    return accessor(pureBase ? pureBaseCache : cache);
  };
}

// ============== Data Getters ==============

/** Get all hulls (must call loadAllGameData first) */
export const getHullsData = createGetter<Hull[]>(
  (c) => c.hulls!, () => (hullsDataFallback as { hulls: Hull[] }).hulls
);

/** Get all station hulls (must call loadAllGameData first) */
export const getStationHullsData = createGetter<Hull[]>(
  (c) => c.stationHulls!, () => (hullsDataFallback as { stationHulls?: Hull[] }).stationHulls || []
);

/** Get all armor types (must call loadAllGameData first) */
export const getArmorTypesData = createGetter<ArmorType[]>(
  (c) => c.armors!, () => (armorDataFallback as { armors: ArmorType[] }).armors
);

/** Get all armor weight configs (must call loadAllGameData first) */
export const getArmorWeightsData = createGetter<ArmorWeightConfig[]>(
  (c) => c.armorWeights!, () => (armorDataFallback as { armorWeights: ArmorWeightConfig[] }).armorWeights
);

/** Get whether multiple armor layers are allowed (must call loadAllGameData first) */
export const getArmorAllowMultipleLayers = createGetter<boolean>(
  (c) => c.armorAllowMultipleLayers, () => (armorDataFallback as { allowMultipleLayers?: boolean }).allowMultipleLayers ?? false
);

/** Get all power plant types (must call loadAllGameData first) */
export const getPowerPlantsData = createGetter<PowerPlantType[]>(
  (c) => c.powerPlants!, () => (powerPlantDataFallback as { powerPlants: PowerPlantType[] }).powerPlants
);

/** Get the fuel tank type (must call loadAllGameData first) */
export const getFuelTankData = createGetter<FuelTankType>(
  (c) => c.fuelTank!, () => (fuelTankDataFallback as { fuelTank: FuelTankType }).fuelTank
);

/** Get all engine types (must call loadAllGameData first) */
export const getEnginesData = createGetter<EngineType[]>(
  (c) => c.engines!, () => (enginesDataFallback as { engines: EngineType[] }).engines
);

/** Get all FTL drive types (must call loadAllGameData first) */
export const getFTLDrivesData = createGetter<FTLDriveType[]>(
  (c) => c.ftlDrives!, () => (ftlDrivesDataFallback as { ftlDrives: FTLDriveType[] }).ftlDrives
);

/**
 * Apply a set of mods to the merged cache using the stored raw base data.
 * Updates activeMods and the cache; does NOT touch pureBaseCache.
 */
async function applyModsToCache(mods: Mod[]): Promise<void> {
  activeMods = mods;

  if (!rawBaseData.hulls) {
    logger.warn('[DataLoader] applyModsToCache called before base data loaded');
    return;
  }

  const [
    mergedHulls, mergedArmor, mergedPowerPlants, mergedFuelTank,
    mergedEngines, mergedFtlDrives, mergedSupportSystems,
    mergedDefenses, mergedCommandControl, mergedSensors,
    mergedHangarMisc, mergedOrdnance, mergedDamageDiagram, mergedWeapons,
  ] = await Promise.all([
    applyModsToFile('hulls.json', rawBaseData.hulls!, mods),
    applyModsToFile('armor.json', rawBaseData.armor!, mods),
    applyModsToFile('powerPlants.json', rawBaseData.powerPlants!, mods),
    applyModsToFile('fuelTank.json', rawBaseData.fuelTank!, mods),
    applyModsToFile('engines.json', rawBaseData.engines!, mods),
    applyModsToFile('ftlDrives.json', rawBaseData.ftlDrives!, mods),
    applyModsToFile('supportSystems.json', rawBaseData.supportSystems!, mods),
    applyModsToFile('defenses.json', rawBaseData.defenses!, mods),
    applyModsToFile('commandControl.json', rawBaseData.commandControl!, mods),
    applyModsToFile('sensors.json', rawBaseData.sensors!, mods),
    applyModsToFile('hangarMisc.json', rawBaseData.hangarMisc!, mods),
    applyModsToFile('ordnance.json', rawBaseData.ordnance!, mods),
    applyModsToFile('damageDiagram.json', rawBaseData.damageDiagram!, mods),
    applyModsToFile('weapons.json', rawBaseData.weapons!, mods),
  ]);

  cache.hulls = (mergedHulls as { hulls: Hull[] }).hulls;
  cache.stationHulls = (mergedHulls as { stationHulls?: Hull[] }).stationHulls || [];
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
  cache.beamWeapons = (mergedWeapons as { beamWeapons: BeamWeaponType[] }).beamWeapons;
  cache.projectileWeapons = (mergedWeapons as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || [];
  cache.torpedoWeapons = (mergedWeapons as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || [];
  cache.specialWeapons = (mergedWeapons as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || [];
  cache.mountModifiers = (mergedWeapons as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null;
  cache.gunConfigurations = (mergedWeapons as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null;
  cache.concealmentModifier = (mergedWeapons as { concealmentModifier?: MountModifier }).concealmentModifier || null;
}

/**
 * Re-apply a specific set of mods to the cached base data.
 * Used for per-design mod selection — avoids reloading base data from disk.
 * Base data must already be loaded via loadAllGameData().
 */
export async function reloadWithSpecificMods(mods: Mod[]): Promise<void> {
  if (!dataLoaded || !rawBaseData.hulls) {
    logger.warn('[DataLoader] Cannot reload with specific mods — base data not loaded yet');
    return;
  }
  logger.log(`[DataLoader] Reloading cache with ${mods.length} specific mod(s)...`);
  await applyModsToCache(mods);
  logger.log('[DataLoader] Cache reloaded with specific mods');
}

/**
 * Reload all game data (e.g., after user edits data files or changes mods)
 */
export async function reloadAllGameData(): Promise<DataLoadResult> {
  dataLoaded = false;
  loadPromise = null;
  activeMods = [];
  Object.assign(cache, createEmptyCache());
  Object.assign(pureBaseCache, createEmptyCache());
  Object.assign(rawBaseData, createEmptyRawBaseData());

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

/** Get all sensor types (must call loadAllGameData first) */
export const getSensorsData = createGetter<SensorType[]>(
  (c) => c.sensors!, () => (sensorsDataFallback as { sensors: SensorType[] }).sensors
);

/** Get all hangar/misc system types (must call loadAllGameData first) */
export const getHangarMiscSystemsData = createGetter<HangarMiscSystemType[]>(
  (c) => c.hangarMiscSystems!, () => (hangarMiscDataFallback as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems
);

/** Get all launch systems (must call loadAllGameData first) */
export const getLaunchSystemsData = createGetter<LaunchSystem[]>(
  (c) => c.launchSystems!, () => (ordnanceDataFallback as { launchSystems: LaunchSystem[] }).launchSystems
);

/** Get all propulsion systems (must call loadAllGameData first) */
export const getPropulsionSystemsData = createGetter<PropulsionSystem[]>(
  (c) => c.propulsionSystems!, () => (ordnanceDataFallback as { propulsionSystems: PropulsionSystem[] }).propulsionSystems
);

/** Get all warheads (must call loadAllGameData first) */
export const getWarheadsData = createGetter<Warhead[]>(
  (c) => c.warheads!, () => (ordnanceDataFallback as { warheads: Warhead[] }).warheads
);

/** Get all guidance systems (must call loadAllGameData first) */
export const getGuidanceSystemsData = createGetter<GuidanceSystem[]>(
  (c) => c.guidanceSystems!, () => (ordnanceDataFallback as { guidanceSystems: GuidanceSystem[] }).guidanceSystems
);

/** Get all beam weapon types (must call loadAllGameData first) */
export const getBeamWeaponsData = createGetter<BeamWeaponType[]>(
  (c) => c.beamWeapons!, () => (weaponsDataFallback as { beamWeapons: BeamWeaponType[] }).beamWeapons
);

/** Get all projectile weapon types (must call loadAllGameData first) */
export const getProjectileWeaponsData = createGetter<ProjectileWeaponType[]>(
  (c) => c.projectileWeapons!, () => (weaponsDataFallback as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || []
);

/** Get all torpedo weapon types (must call loadAllGameData first) */
export const getTorpedoWeaponsData = createGetter<TorpedoWeaponType[]>(
  (c) => c.torpedoWeapons!, () => (weaponsDataFallback as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || []
);

/** Get all special weapon types (must call loadAllGameData first) */
export const getSpecialWeaponsData = createGetter<SpecialWeaponType[]>(
  (c) => c.specialWeapons!, () => (weaponsDataFallback as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || []
);

/** Get mount modifiers (must call loadAllGameData first) */
export const getMountModifiersData = createGetter<Record<MountType, MountModifier> | null>(
  (c) => c.mountModifiers, () => (weaponsDataFallback as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null
);

/** Get gun configurations (must call loadAllGameData first) */
export const getGunConfigurationsData = createGetter<Record<GunConfiguration, GunConfigModifier> | null>(
  (c) => c.gunConfigurations, () => (weaponsDataFallback as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null
);

/** Get concealment modifier (must call loadAllGameData first) */
export const getConcealmentModifierData = createGetter<MountModifier | null>(
  (c) => c.concealmentModifier, () => (weaponsDataFallback as { concealmentModifier?: MountModifier }).concealmentModifier || null
);

/** Get all life support types (must call loadAllGameData first) */
export const getLifeSupportData = createGetter<LifeSupportType[]>(
  (c) => c.supportSystems?.lifeSupport || [], () => (supportSystemsDataFallback as { lifeSupport: LifeSupportType[] }).lifeSupport
);

/** Get all accommodation types (must call loadAllGameData first) */
export const getAccommodationsData = createGetter<AccommodationType[]>(
  (c) => c.supportSystems?.accommodations || [], () => (supportSystemsDataFallback as { accommodations: AccommodationType[] }).accommodations
);

/** Get all store system types (must call loadAllGameData first) */
export const getStoreSystemsData = createGetter<StoreSystemType[]>(
  (c) => c.supportSystems?.storeSystems || [], () => (supportSystemsDataFallback as { storeSystems: StoreSystemType[] }).storeSystems
);

/** Get all gravity system types (must call loadAllGameData first) */
export const getGravitySystemsData = createGetter<GravitySystemType[]>(
  (c) => c.supportSystems?.gravitySystems || [], () => (supportSystemsDataFallback as { gravitySystems?: GravitySystemType[] }).gravitySystems || []
);

/** Get all defense system types (must call loadAllGameData first) */
export const getDefenseSystemsData = createGetter<DefenseSystemType[]>(
  (c) => c.defenseSystems!, () => (defensesDataFallback as { defenseSystems: DefenseSystemType[] }).defenseSystems
);

/** Get all command control system types (must call loadAllGameData first) */
export const getCommandControlSystemsData = createGetter<CommandControlSystemType[]>(
  (c) => c.commandControlSystems!, () => (commandControlDataFallback as { commandSystems: CommandControlSystemType[] }).commandSystems
);

/** Get the tracking table (must call loadAllGameData first) */
export function getTrackingTableData(): TrackingTable | null {
  if (!dataLoaded) {
    logger.warn('[DataLoader] Data not loaded, using fallback');
    return (sensorsDataFallback as { trackingTable?: TrackingTable }).trackingTable || null;
  }
  return cache.trackingTable;
}

/** Get damage diagram data (must call loadAllGameData first) */
export function getDamageDiagramDataGetter(): DamageDiagramData | null {
  if (!dataLoaded) {
    logger.warn('[DataLoader] Data not loaded, using fallback');
    return damageDiagramDataFallback as unknown as DamageDiagramData;
  }
  return cache.damageDiagram;
}
