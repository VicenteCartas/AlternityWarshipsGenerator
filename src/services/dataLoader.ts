/**
 * Data Loader Service
 * 
 * Handles runtime loading of game data files, allowing users to edit
 * the JSON data files externally. Uses Electron IPC to read files from
 * the data directory, with fallback to bundled data for web/dev mode.
 */

import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeightConfig } from '../types/armor';
import type { PowerPlantType } from '../types/powerPlant';
import type { EngineType } from '../types/engine';

// Bundled data as fallback (imported at build time)
import hullsDataFallback from '../data/hulls.json';
import armorDataFallback from '../data/armor.json';
import powerPlantDataFallback from '../data/powerPlants.json';
import enginesDataFallback from '../data/engines.json';

// Cache for loaded data
interface DataCache {
  hulls: Hull[] | null;
  armorTypes: ArmorType[] | null;
  armorWeights: ArmorWeightConfig[] | null;
  powerPlants: PowerPlantType[] | null;
  engines: EngineType[] | null;
}

const cache: DataCache = {
  hulls: null,
  armorTypes: null,
  armorWeights: null,
  powerPlants: null,
  engines: null,
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

    // Load all data files in parallel
    const [hullsData, armorData, powerPlantsData, enginesData] = await Promise.all([
      loadDataFile('hulls.json', hullsDataFallback),
      loadDataFile('armor.json', armorDataFallback),
      loadDataFile('powerPlants.json', powerPlantDataFallback),
      loadDataFile('engines.json', enginesDataFallback),
    ]);

    // Store in cache
    cache.hulls = (hullsData as { hulls: Hull[] }).hulls;
    cache.armorTypes = (armorData as { armorTypes: ArmorType[] }).armorTypes;
    cache.armorWeights = (armorData as { armorWeights: ArmorWeightConfig[] }).armorWeights;
    cache.powerPlants = (powerPlantsData as { powerPlants: PowerPlantType[] }).powerPlants;
    cache.engines = (enginesData as { engines: EngineType[] }).engines;

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
    return (armorDataFallback as { armorTypes: ArmorType[] }).armorTypes;
  }
  return cache.armorTypes!;
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
 * Reload all game data (e.g., after user edits data files)
 */
export async function reloadAllGameData(): Promise<void> {
  dataLoaded = false;
  loadPromise = null;
  cache.hulls = null;
  cache.armorTypes = null;
  cache.armorWeights = null;
  cache.powerPlants = null;
  cache.engines = null;
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
