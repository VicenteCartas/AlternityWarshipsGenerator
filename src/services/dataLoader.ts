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
import type { SensorType, TrackingTable } from '../types/sensor';
import type { HangarMiscSystemType } from '../types/hangarMisc';
import type { LaunchSystem, PropulsionSystem, Warhead, GuidanceSystem } from '../types/ordnance';
import type { BeamWeaponType, ProjectileWeaponType, TorpedoWeaponType, SpecialWeaponType, MountModifier, GunConfigModifier, MountType, GunConfiguration } from '../types/weapon';

import type { DamageDiagramData } from '../types/damageDiagram';

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

    // Load all data files in parallel
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
    cache.trackingTable = (sensorsData as { trackingTable?: TrackingTable }).trackingTable || null;
    cache.hangarMiscSystems = (hangarMiscData as { hangarMiscSystems: HangarMiscSystemType[] }).hangarMiscSystems;
    cache.launchSystems = (ordnanceData as { launchSystems: LaunchSystem[] }).launchSystems;
    cache.propulsionSystems = (ordnanceData as { propulsionSystems: PropulsionSystem[] }).propulsionSystems;
    cache.warheads = (ordnanceData as { warheads: Warhead[] }).warheads;
    cache.guidanceSystems = (ordnanceData as { guidanceSystems: GuidanceSystem[] }).guidanceSystems;
    cache.damageDiagram = damageDiagramData as DamageDiagramData;
    // Weapons data
    cache.beamWeapons = (weaponsData as { beamWeapons: BeamWeaponType[] }).beamWeapons;
    cache.projectileWeapons = (weaponsData as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons || [];
    cache.torpedoWeapons = (weaponsData as { torpedoWeapons?: TorpedoWeaponType[] }).torpedoWeapons || [];
    cache.specialWeapons = (weaponsData as { specialWeapons?: SpecialWeaponType[] }).specialWeapons || [];
    cache.mountModifiers = (weaponsData as { mountModifiers?: Record<MountType, MountModifier> }).mountModifiers || null;
    cache.gunConfigurations = (weaponsData as { gunConfigurations?: Record<GunConfiguration, GunConfigModifier> }).gunConfigurations || null;
    cache.concealmentModifier = (weaponsData as { concealmentModifier?: MountModifier }).concealmentModifier || null;

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
  cache.damageDiagram = null;
  cache.beamWeapons = null;
  cache.projectileWeapons = null;
  cache.torpedoWeapons = null;
  cache.specialWeapons = null;
  cache.mountModifiers = null;
  cache.gunConfigurations = null;
  cache.concealmentModifier = null;
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
