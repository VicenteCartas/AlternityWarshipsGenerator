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
import type { LifeSupportType, AccommodationType, StoreSystemType } from '../types/supportSystem';

// Bundled data as fallback (imported at build time)
import hullsDataFallback from '../data/hulls.json';
import armorDataFallback from '../data/armor.json';
import powerPlantDataFallback from '../data/powerPlants.json';
import fuelTankDataFallback from '../data/fuelTank.json';
import enginesDataFallback from '../data/engines.json';
import ftlDrivesDataFallback from '../data/ftlDrives.json';
import supportSystemsDataFallback from '../data/supportSystems.json';

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
  } | null;
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

    // Load all data files in parallel
    const [hullsData, armorData, powerPlantsData, fuelTankData, enginesData, ftlDrivesData, supportSystemsData] = await Promise.all([
      loadDataFile('hulls.json', hullsDataFallback),
      loadDataFile('armor.json', armorDataFallback),
      loadDataFile('powerPlants.json', powerPlantDataFallback),
      loadDataFile('fuelTank.json', fuelTankDataFallback),
      loadDataFile('engines.json', enginesDataFallback),
      loadDataFile('ftlDrives.json', ftlDrivesDataFallback),
      loadDataFile('supportSystems.json', supportSystemsDataFallback),
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
    };

    // Load data into services
    loadSupportSystemsData(cache.supportSystems);

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
