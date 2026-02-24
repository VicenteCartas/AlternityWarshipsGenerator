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

const cache: DataCache = {
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
  // Weapons
  beamWeapons: null,
  projectileWeapons: null,
  torpedoWeapons: null,
  specialWeapons: null,
  mountModifiers: null,
  gunConfigurations: null,
  concealmentModifier: null,
};

const pureBaseCache: DataCache = {
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
  // Weapons
  beamWeapons: null,
  projectileWeapons: null,
  torpedoWeapons: null,
  specialWeapons: null,
  mountModifiers: null,
  gunConfigurations: null,
  concealmentModifier: null,
};

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

const rawBaseData: RawBaseDataCache = {
  hulls: null, armor: null, powerPlants: null, fuelTank: null,
  engines: null, ftlDrives: null, supportSystems: null, defenses: null,
  commandControl: null, sensors: null, hangarMisc: null, ordnance: null,
  damageDiagram: null, weapons: null,
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
      console.warn(`[DataLoader] Skipping invalid mod data: ${mod.folderName}/${fileName}`);
      continue;
    }

    const sectionModes = resolveSectionModes(mod.manifest.fileModes, Object.keys(modFileData as Record<string, unknown>));
    const modeDesc = Object.keys(sectionModes).length > 0
      ? Object.entries(sectionModes).map(([k, m]) => `${k}:${m}`).join(', ')
      : 'add (default)';
    console.log(`[DataLoader] Applying mod "${mod.manifest.name}" [${modeDesc}] to ${fileName}`);
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
export function getHullsData(pureBase = false): Hull[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (hullsDataFallback as { hulls: Hull[] }).hulls;
  }
  return pureBase ? pureBaseCache.hulls! : cache.hulls!;
}

/**
 * Get all station hulls (must call loadAllGameData first)
 */
export function getStationHullsData(pureBase = false): Hull[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (hullsDataFallback as { stationHulls?: Hull[] }).stationHulls || [];
  }
  return pureBase ? pureBaseCache.stationHulls! : cache.stationHulls!;
}

/**
 * Get all armor types (must call loadAllGameData first)
 */
export function getArmorTypesData(pureBase = false): ArmorType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (armorDataFallback as { armors: ArmorType[] }).armors;
  }
  return pureBase ? pureBaseCache.armors! : cache.armors!;
}

/**
 * Get all armor weight configs (must call loadAllGameData first)
 */
export function getArmorWeightsData(pureBase = false): ArmorWeightConfig[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (armorDataFallback as { armorWeights: ArmorWeightConfig[] }).armorWeights;
  }
  return pureBase ? pureBaseCache.armorWeights! : cache.armorWeights!;
}

/**
 * Get whether multiple armor layers are allowed (must call loadAllGameData first)
 */
export function getArmorAllowMultipleLayers(pureBase = false): boolean {
  if (!dataLoaded) {
    return (armorDataFallback as { allowMultipleLayers?: boolean }).allowMultipleLayers ?? false;
  }
  return pureBase ? pureBaseCache.armorAllowMultipleLayers : cache.armorAllowMultipleLayers;
}

/**
 * Get all power plant types (must call loadAllGameData first)
 */
export function getPowerPlantsData(pureBase = false): PowerPlantType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (powerPlantDataFallback as { powerPlants: PowerPlantType[] }).powerPlants;
  }
  return pureBase ? pureBaseCache.powerPlants! : cache.powerPlants!;
}

/**
 * Get the fuel tank type (must call loadAllGameData first)
 */
export function getFuelTankData(pureBase = false): FuelTankType {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (fuelTankDataFallback as { fuelTank: FuelTankType }).fuelTank;
  }
  return pureBase ? pureBaseCache.fuelTank! : cache.fuelTank!;
}

/**
 * Get all engine types (must call loadAllGameData first)
 */
export function getEnginesData(pureBase = false): EngineType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (enginesDataFallback as { engines: EngineType[] }).engines;
  }
  return pureBase ? pureBaseCache.engines! : cache.engines!;
}

/**
 * Get all FTL drive types (must call loadAllGameData first)
 */
export function getFTLDrivesData(pureBase = false): FTLDriveType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ftlDrivesDataFallback as { ftlDrives: FTLDriveType[] }).ftlDrives;
  }
  return pureBase ? pureBaseCache.ftlDrives! : cache.ftlDrives!;
}

/**
 * Apply a set of mods to the merged cache using the stored raw base data.
 * Updates activeMods and the cache; does NOT touch pureBaseCache.
 */
async function applyModsToCache(mods: Mod[]): Promise<void> {
  activeMods = mods;

  if (!rawBaseData.hulls) {
    console.warn('[DataLoader] applyModsToCache called before base data loaded');
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
    console.warn('[DataLoader] Cannot reload with specific mods — base data not loaded yet');
    return;
  }
  console.log(`[DataLoader] Reloading cache with ${mods.length} specific mod(s)...`);
  await applyModsToCache(mods);
  console.log('[DataLoader] Cache reloaded with specific mods');
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

  pureBaseCache.hulls = null;
  pureBaseCache.armors = null;
  pureBaseCache.armorWeights = null;
  pureBaseCache.armorAllowMultipleLayers = false;
  pureBaseCache.powerPlants = null;
  pureBaseCache.fuelTank = null;
  pureBaseCache.engines = null;
  pureBaseCache.ftlDrives = null;
  pureBaseCache.supportSystems = null;
  pureBaseCache.defenseSystems = null;
  pureBaseCache.commandControlSystems = null;
  pureBaseCache.sensors = null;
  pureBaseCache.trackingTable = null;
  pureBaseCache.hangarMiscSystems = null;
  pureBaseCache.launchSystems = null;
  pureBaseCache.propulsionSystems = null;
  pureBaseCache.warheads = null;
  pureBaseCache.guidanceSystems = null;
  pureBaseCache.damageDiagram = null;
  pureBaseCache.beamWeapons = null;
  pureBaseCache.projectileWeapons = null;
  pureBaseCache.torpedoWeapons = null;
  pureBaseCache.specialWeapons = null;
  pureBaseCache.mountModifiers = null;
  pureBaseCache.gunConfigurations = null;
  pureBaseCache.concealmentModifier = null;

  // Reset raw base data so it gets re-loaded from disk
  rawBaseData.hulls = null;
  rawBaseData.armor = null;
  rawBaseData.powerPlants = null;
  rawBaseData.fuelTank = null;
  rawBaseData.engines = null;
  rawBaseData.ftlDrives = null;
  rawBaseData.supportSystems = null;
  rawBaseData.defenses = null;
  rawBaseData.commandControl = null;
  rawBaseData.sensors = null;
  rawBaseData.hangarMisc = null;
  rawBaseData.ordnance = null;
  rawBaseData.damageDiagram = null;
  rawBaseData.weapons = null;

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
export function getSensorsData(pureBase = false): SensorType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (sensorsDataFallback as { sensors: SensorType[] }).sensors;
  }
  return pureBase ? pureBaseCache.sensors! : cache.sensors!;
}

/**
 * Get all hangar/misc system types (must call loadAllGameData first)
 */
export function getHangarMiscSystemsData(pureBase = false): HangarMiscSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (hangarMiscDataFallback as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems;
  }
  return pureBase ? pureBaseCache.hangarMiscSystems! : cache.hangarMiscSystems!;
}

/**
 * Get all launch systems (must call loadAllGameData first)
 */
export function getLaunchSystemsData(pureBase = false): LaunchSystem[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { launchSystems: LaunchSystem[] }).launchSystems;
  }
  return pureBase ? pureBaseCache.launchSystems! : cache.launchSystems!;
}

/**
 * Get all propulsion systems (must call loadAllGameData first)
 */
export function getPropulsionSystemsData(pureBase = false): PropulsionSystem[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { propulsionSystems: PropulsionSystem[] }).propulsionSystems;
  }
  return pureBase ? pureBaseCache.propulsionSystems! : cache.propulsionSystems!;
}

/**
 * Get all warheads (must call loadAllGameData first)
 */
export function getWarheadsData(pureBase = false): Warhead[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { warheads: Warhead[] }).warheads;
  }
  return pureBase ? pureBaseCache.warheads! : cache.warheads!;
}

/**
 * Get all guidance systems (must call loadAllGameData first)
 */
export function getGuidanceSystemsData(pureBase = false): GuidanceSystem[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (ordnanceDataFallback as { guidanceSystems: GuidanceSystem[] }).guidanceSystems;
  }
  return pureBase ? pureBaseCache.guidanceSystems! : cache.guidanceSystems!;
}

/**
 * Get all beam weapon types (must call loadAllGameData first)
 */
export function getBeamWeaponsData(pureBase = false): BeamWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { beamWeapons: BeamWeaponType[] }).beamWeapons;
  }
  return pureBase ? pureBaseCache.beamWeapons! : cache.beamWeapons!;
}

/**
 * Get all projectile weapon types (must call loadAllGameData first)
 */
export function getProjectileWeaponsData(pureBase = false): ProjectileWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || [];
  }
  return pureBase ? pureBaseCache.projectileWeapons! : cache.projectileWeapons!;
}

/**
 * Get all torpedo weapon types (must call loadAllGameData first)
 */
export function getTorpedoWeaponsData(pureBase = false): TorpedoWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || [];
  }
  return pureBase ? pureBaseCache.torpedoWeapons! : cache.torpedoWeapons!;
}

/**
 * Get all special weapon types (must call loadAllGameData first)
 */
export function getSpecialWeaponsData(pureBase = false): SpecialWeaponType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || [];
  }
  return pureBase ? pureBaseCache.specialWeapons! : cache.specialWeapons!;
}

/**
 * Get mount modifiers (must call loadAllGameData first)
 */
export function getMountModifiersData(pureBase = false): Record<MountType, MountModifier> | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null;
  }
  return pureBase ? pureBaseCache.mountModifiers : cache.mountModifiers;
}

/**
 * Get gun configurations (must call loadAllGameData first)
 */
export function getGunConfigurationsData(pureBase = false): Record<GunConfiguration, GunConfigModifier> | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null;
  }
  return pureBase ? pureBaseCache.gunConfigurations : cache.gunConfigurations;
}

/**
 * Get concealment modifier (must call loadAllGameData first)
 */
export function getConcealmentModifierData(pureBase = false): MountModifier | null {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (weaponsDataFallback as { concealmentModifier?: MountModifier }).concealmentModifier || null;
  }
  return pureBase ? pureBaseCache.concealmentModifier : cache.concealmentModifier;
}

/**
 * Get all life support types (must call loadAllGameData first)
 */
export function getLifeSupportData(pureBase = false): LifeSupportType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { lifeSupport: LifeSupportType[] }).lifeSupport;
  }
  return (pureBase ? pureBaseCache.supportSystems?.lifeSupport : cache.supportSystems?.lifeSupport) || [];
}

/**
 * Get all accommodation types (must call loadAllGameData first)
 */
export function getAccommodationsData(pureBase = false): AccommodationType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { accommodations: AccommodationType[] }).accommodations;
  }
  return (pureBase ? pureBaseCache.supportSystems?.accommodations : cache.supportSystems?.accommodations) || [];
}

/**
 * Get all store system types (must call loadAllGameData first)
 */
export function getStoreSystemsData(pureBase = false): StoreSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { storeSystems: StoreSystemType[] }).storeSystems;
  }
  return (pureBase ? pureBaseCache.supportSystems?.storeSystems : cache.supportSystems?.storeSystems) || [];
}

/**
 * Get all gravity system types (must call loadAllGameData first)
 */
export function getGravitySystemsData(pureBase = false): GravitySystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (supportSystemsDataFallback as { gravitySystems?: GravitySystemType[] }).gravitySystems || [];
  }
  return (pureBase ? pureBaseCache.supportSystems?.gravitySystems : cache.supportSystems?.gravitySystems) || [];
}

/**
 * Get all defense system types (must call loadAllGameData first)
 */
export function getDefenseSystemsData(pureBase = false): DefenseSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (defensesDataFallback as { defenseSystems: DefenseSystemType[] }).defenseSystems;
  }
  return pureBase ? pureBaseCache.defenseSystems! : cache.defenseSystems!;
}

/**
 * Get all command control system types (must call loadAllGameData first)
 */
export function getCommandControlSystemsData(pureBase = false): CommandControlSystemType[] {
  if (!dataLoaded) {
    console.warn('[DataLoader] Data not loaded, using fallback');
    return (commandControlDataFallback as { commandSystems: CommandControlSystemType[] }).commandSystems;
  }
  return pureBase ? pureBaseCache.commandControlSystems! : cache.commandControlSystems!;
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
