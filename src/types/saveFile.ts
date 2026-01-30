import type { ProgressLevel, TechTrack } from './common';

/**
 * Save file format for Alternity Warships
 */

/**
 * Installed power plant in save file (stores only IDs and config)
 */
export interface SavedPowerPlant {
  /** The power plant type ID */
  typeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed fuel tank in save file
 */
export interface SavedFuelTank {
  /** The power plant type ID this fuel is for */
  forPowerPlantTypeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed engine in save file (stores only IDs and config)
 */
export interface SavedEngine {
  /** The engine type ID */
  typeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed engine fuel tank in save file
 */
export interface SavedEngineFuelTank {
  /** The engine type ID this fuel is for */
  forEngineTypeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed FTL drive in save file
 */
export interface SavedFTLDrive {
  /** The FTL drive type ID */
  typeId: string;
  /** Size in hull points (determines hull percentage) */
  hullPoints: number;
}

/**
 * Installed FTL fuel tank in save file
 */
export interface SavedFTLFuelTank {
  /** The FTL drive type ID this fuel is for */
  forFTLDriveTypeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed life support in save file
 */
export interface SavedLifeSupport {
  /** The life support type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed accommodation in save file
 */
export interface SavedAccommodation {
  /** The accommodation type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed store system in save file
 */
export interface SavedStoreSystem {
  /** The store system type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed gravity system in save file
 */
export interface SavedGravitySystem {
  /** The gravity system type ID */
  typeId: string;
  /** Calculated hull points used */
  hullPoints: number;
}

/**
 * Installed defense system in save file
 */
export interface SavedDefenseSystem {
  /** The defense system type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed command & control system in save file
 */
export interface SavedCommandControlSystem {
  /** The C&C system type ID */
  typeId: string;
  /** Quantity installed (stations for cockpit, HP for computer core, etc.) */
  quantity: number;
}

/**
 * Installed sensor system in save file
 */
export interface SavedSensor {
  /** The sensor type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
  /** ID of the assigned sensor control computer (references commandControl installation ID) */
  assignedSensorControlId?: string;
}

/**
 * The complete warship save file structure
 */
export interface WarshipSaveFile {
  /** File format version for future compatibility */
  version: string;
  
  /** User-defined name for this warship */
  name: string;
  
  /** ISO timestamp when the file was created */
  createdAt: string;
  
  /** ISO timestamp when the file was last modified */
  modifiedAt: string;
  
  /** Hull configuration */
  hull: {
    /** Hull type ID */
    id: string;
  } | null;
  
  /** Armor configuration */
  armor: {
    /** Armor type ID (includes weight in the ID) */
    id: string;
  } | null;
  
  /** Design progress level constraint */
  designProgressLevel: ProgressLevel;
  
  /** Design tech tracks constraint (empty means all allowed) */
  designTechTracks: TechTrack[];
  
  /** Installed power plants */
  powerPlants: SavedPowerPlant[];
  
  /** Installed fuel tanks for power plants */
  fuelTanks: SavedFuelTank[];

  /** Installed engines */
  engines: SavedEngine[];
  
  /** Installed fuel tanks for engines */
  engineFuelTanks: SavedEngineFuelTank[];

  /** FTL drive configuration */
  ftlDrive: SavedFTLDrive | null;
  
  /** Installed fuel tanks for FTL drives */
  ftlFuelTanks: SavedFTLFuelTank[];
  
  /** Installed life support units */
  lifeSupport: SavedLifeSupport[];
  
  /** Installed accommodations */
  accommodations: SavedAccommodation[];
  
  /** Installed store systems */
  storeSystems: SavedStoreSystem[];
  
  /** Installed gravity systems */
  gravitySystems: SavedGravitySystem[];
  
  /** Installed defense systems */
  defenses: SavedDefenseSystem[];
  
  /** Installed command & control systems */
  commandControl: SavedCommandControlSystem[];
  
  /** Installed sensor systems */
  sensors: SavedSensor[];
  
  /** Installed systems (future) */
  systems: unknown[];
}

/** Current save file version */
export const SAVE_FILE_VERSION = '1.0';
