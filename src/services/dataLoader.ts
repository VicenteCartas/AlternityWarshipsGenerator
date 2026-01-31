/**
 * Data Loader Service
 * 
 * Handles runtime loading of game data files, allowing users to edit
 * the JSON data files externally. Uses Electron IPC to read files from
 * the data directory, with fallback to bundled data for web/dev mode.
 */

import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeightConfig } from '../types/armor';
import type { PowerPlantType, FuelTankType } from '../types/powerPlant';
import type { EngineType } from '../types/engine';
import type { FTLDriveType } from '../types/ftlDrive';
import type { LifeSupportType, AccommodationType, StoreSystemType, GravitySystemType } from '../types/supportSystem';
import type { DefenseSystemType } from '../types/defense';
import type { CommandControlSystemType } from '../types/commandControl';
import type { SensorType } from '../types/sensor';
import type { HangarMiscSystemType } from '../types/hangarMisc';
import type { LaunchSystem, PropulsionSystem, Warhead, GuidanceSystem } from '../types/ordnance';

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

// Cache for loaded data
interface DataCache {
  hulls: Hull[] | null;
  armors: ArmorType[] | null;
  armorWeights: ArmorWeightConfig[] | null;
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
  hangarMiscSystems: HangarMiscSystemType[] | null;
  launchSystems: LaunchSystem[] | null;
  propulsionSystems: PropulsionSystem[] | null;
  warheads: Warhead[] | null;
  guidanceSystems: GuidanceSystem[] | null;
}

const cache: DataCache = {
  hulls: null,
  armors: null,
  armorWeights: null,
  powerPlants: null,
  fuelTank: null,
  engines: null,
  ftlDrives: null,
  supportSystems: null,
  defenseSystems: null,
  commandControlSystems: null,
  sensors: null,
  hangarMiscSystems: null,
  launchSystems: null,
  propulsionSystems: null,
  warheads: null,
  guidanceSystems: null,
};

let dataLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load a data file using Electron IPC, with fallback to bundled data
 */
async function loadDataFile<T>(fileName: string, fallbackData: T): Promise<T> {
  // If not in Electron, use bundled data
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
      console.warn(`[DataLoader] Failed to load ${fileName}: ${result.error}, using bundled data`);
      return fallbackData;
    }
  } catch (error) {
    console.error(`[DataLoader] Error loading ${fileName}:`, error);
    return fallbackData;
  }
}

/**
 * Load all game data files
 * Call this once at app startup
 */
export async function loadAllGameData(): Promise<void> {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Return immediately if already loaded
  if (dataLoaded) {
    return;
  }

  loadPromise = (async () => {
    console.log('[DataLoader] Loading game data...');

    // Import services that need data
    const { loadSupportSystemsData } = await import('./supportSystemService');
    const { loadDefenseSystemsData } = await import('./defenseService');
    const { loadCommandControlSystemsData } = await import('./commandControlService');
    const { loadSensorsData } = await import('./sensorService');
    const { initializeHangarMiscData } = await import('./hangarMiscService');

    // Load all data files in parallel
    const [hullsData, armorData, powerPlantsData, fuelTankData, enginesData, ftlDrivesData, supportSystemsData, defensesData, commandControlData, sensorsData, hangarMiscData, ordnanceData] = await Promise.all([
      loadDataFile('hulls.json', hullsDataFallback),
      loadDataFile('armor.json', armorDataFallback),
      loadDataFile('powerPlants.json', powerPlantDataFallback),
      loadDataFile('fuelTank.json', fuelTankDataFallback),
      loadDataFile('engines.json', enginesDataFallback),
      loadDataFile('ftlDrives.json', ftlDrivesDataFallback),
      loadDataFile('supportSystems.json', supportSystemsDataFallback),
      loadDataFile('defenses.json', defensesDataFallback),
      loadDataFile('commandControl.json', commandControlDataFallback),
      loadDataFile('sensors.json', sensorsDataFallback),
      loadDataFile('hangarMisc.json', hangarMiscDataFallback),
      loadDataFile('ordnance.json', ordnanceDataFallback),
    ]);

    // Store in cache
    cache.hulls = (hullsData as { hulls: Hull[] }).hulls;
    cache.armors = (armorData as { armors: ArmorType[] }).armors;
    cache.armorWeights = (armorData as { armorWeights: ArmorWeightConfig[] }).armorWeights;
    cache.powerPlants = (powerPlantsData as { powerPlants: PowerPlantType[] }).powerPlants;
    cache.fuelTank = (fuelTankData as { fuelTank: FuelTankType }).fuelTank;
    cache.engines = (enginesData as { engines: EngineType[] }).engines;
    cache.ftlDrives = (ftlDrivesData as { ftlDrives: FTLDriveType[] }).ftlDrives;
    cache.supportSystems = supportSystemsData as {
      lifeSupport: LifeSupportType[];
      accommodations: AccommodationType[];
      storeSystems: StoreSystemType[];
      gravitySystems: GravitySystemType[];
    };
    cache.defenseSystems = (defensesData as { defenseSystems: DefenseSystemType[] }).defenseSystems;
    cache.commandControlSystems = (commandControlData as { commandSystems: CommandControlSystemType[] }).commandSystems;
    cache.sensors = (sensorsData as { sensors: SensorType[] }).sensors;
    cache.hangarMiscSystems = (hangarMiscData as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems;
    cache.launchSystems = (ordnanceData as { launchSystems: LaunchSystem[] }).launchSystems;
    cache.propulsionSystems = (ordnanceData as { propulsionSystems: PropulsionSystem[] }).propulsionSystems;
    cache.warheads = (ordnanceData as { warheads: Warhead[] }).warheads;
    cache.guidanceSystems = (ordnanceData as { guidanceSystems: GuidanceSystem[] }).guidanceSystems;

    // Load data into services
    loadSupportSystemsData(cache.supportSystems);
    loadDefenseSystemsData({ defenseSystems: cache.defenseSystems });
    loadCommandControlSystemsData({ commandSystems: cache.commandControlSystems });
    loadSensorsData({ sensors: cache.sensors });
    initializeHangarMiscData({ hangarMiscSystems: cache.hangarMiscSystems });

    dataLoaded = true;
    console.log('[DataLoader] Game data loaded successfully');
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
 * Reload all game data (e.g., after user edits data files)
 */
export async function reloadAllGameData(): Promise<void> {
  dataLoaded = false;
  loadPromise = null;
  cache.hulls = null;
  cache.armors = null;
  cache.armorWeights = null;
  cache.powerPlants = null;
  cache.fuelTank = null;
  cache.engines = null;
  cache.ftlDrives = null;
  cache.supportSystems = null;
  cache.defenseSystems = null;
  cache.commandControlSystems = null;
  cache.sensors = null;
  cache.hangarMiscSystems = null;
  cache.launchSystems = null;
  cache.propulsionSystems = null;
  cache.warheads = null;
  cache.guidanceSystems = null;
  await loadAllGameData();
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
