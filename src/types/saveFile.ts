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
  
  /** Installed systems (future) */
  systems: unknown[];
}

/** Current save file version */
export const SAVE_FILE_VERSION = '1.0';
