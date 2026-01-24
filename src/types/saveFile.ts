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
  /** Fuel tank size in hull points */
  fuelHullPoints: number;
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
  
  /** Installed power plants */
  powerPlants: SavedPowerPlant[];
  
  /** Installed engines (future) */
  engines: unknown[];
  
  /** FTL drive configuration (future) */
  ftlDrive: unknown | null;
  
  /** Installed systems (future) */
  systems: unknown[];
}

/** Current save file version */
export const SAVE_FILE_VERSION = '1.0';
