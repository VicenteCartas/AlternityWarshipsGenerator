import type { ProgressLevel, TechTrack } from './common';
import type { ZoneCode, AttackDirection } from './damageDiagram';

/**
 * Save file format for Alternity Warships
 */

/**
 * Installed power plant in save file (stores only IDs and config)
 */
export interface SavedPowerPlant {
  /** Installation ID */
  id: string;
  /** The power plant type ID */
  typeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed fuel tank in save file
 */
export interface SavedFuelTank {
  /** Installation ID */
  id: string;
  /** The power plant type ID this fuel is for */
  forPowerPlantTypeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed engine in save file (stores only IDs and config)
 */
export interface SavedEngine {
  /** Installation ID */
  id: string;
  /** The engine type ID */
  typeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed engine fuel tank in save file
 */
export interface SavedEngineFuelTank {
  /** Installation ID */
  id: string;
  /** The engine type ID this fuel is for */
  forEngineTypeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed FTL drive in save file
 */
export interface SavedFTLDrive {
  /** Installation ID */
  id: string;
  /** The FTL drive type ID */
  typeId: string;
  /** Size in hull points (determines hull percentage) */
  hullPoints: number;
}

/**
 * Installed FTL fuel tank in save file
 */
export interface SavedFTLFuelTank {
  /** Installation ID */
  id: string;
  /** The FTL drive type ID this fuel is for */
  forFTLDriveTypeId: string;
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Installed life support in save file
 */
export interface SavedLifeSupport {
  /** Installation ID */
  id: string;
  /** The life support type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed accommodation in save file
 */
export interface SavedAccommodation {
  /** Installation ID */
  id: string;
  /** The accommodation type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed store system in save file
 */
export interface SavedStoreSystem {
  /** Installation ID */
  id: string;
  /** The store system type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed gravity system in save file
 */
export interface SavedGravitySystem {
  /** Installation ID */
  id: string;
  /** The gravity system type ID */
  typeId: string;
  /** Calculated hull points used */
  hullPoints: number;
}

/**
 * Installed defense system in save file
 */
export interface SavedDefenseSystem {
  /** Installation ID */
  id: string;
  /** The defense system type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed command & control system in save file
 */
export interface SavedCommandControlSystem {
  /** Installation ID (used for sensor control assignment references) */
  id: string;
  /** The C&C system type ID */
  typeId: string;
  /** Quantity installed (stations for cockpit, HP for computer core, etc.) */
  quantity: number;
  /** For Fire Control: the weapon battery this is linked to (format: "weaponTypeId:mountType") */
  linkedWeaponBatteryKey?: string;
  /** For Sensor Control: the sensor installation ID this is linked to */
  linkedSensorId?: string;
}

/**
 * Installed sensor system in save file
 */
export interface SavedSensor {
  /** Installation ID */
  id: string;
  /** The sensor type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed hangar/misc system in save file
 */
export interface SavedHangarMiscSystem {
  /** Installation ID */
  id: string;
  /** The hangar/misc system type ID */
  typeId: string;
  /** Quantity installed */
  quantity: number;
}

/**
 * Installed weapon in save file
 */
export interface SavedWeapon {
  /** Installation ID */
  id: string;
  /** The weapon type ID */
  typeId: string;
  /** Weapon category */
  category: 'beam' | 'projectile' | 'torpedo' | 'special' | 'ordnance';
  /** Mount type */
  mountType: 'standard' | 'fixed' | 'turret' | 'sponson' | 'bank';
  /** Gun configuration */
  gunConfiguration: 'single' | 'twin' | 'triple' | 'quadruple';
  /** Whether concealed */
  concealed: boolean;
  /** Number of mounts */
  quantity: number;
  /** Firing arcs */
  arcs: string[];
}

/**
 * Saved ordnance design (missile, bomb, or mine blueprint)
 */
export interface SavedOrdnanceDesign {
  /** Unique design ID */
  id: string;
  /** User-defined name */
  name: string;
  /** Design category */
  category: 'missile' | 'bomb' | 'mine';
  /** Ordnance size */
  size: 'light' | 'medium' | 'heavy';
  /** Propulsion system ID (missiles only) */
  propulsionId?: string;
  /** Guidance system ID (missiles and mines) */
  guidanceId?: string;
  /** Warhead ID */
  warheadId: string;
}

/**
 * Loaded ordnance in a launch system
 */
export interface SavedLoadedOrdnance {
  /** Design ID (references SavedOrdnanceDesign.id) */
  designId: string;
  /** Quantity loaded */
  quantity: number;
}

/**
 * Installed launch system in save file
 */
export interface SavedLaunchSystem {
  /** Installation ID */
  id: string;
  /** Launch system type ID */
  typeId: string;
  /** Number of launchers */
  quantity: number;
  /** Extra HP allocated for expansion */
  extraHp: number;
  /** Loaded ordnance */
  loadout: SavedLoadedOrdnance[];
}

// ============== Damage Diagram ==============

/**
 * A system reference in a damage zone
 */
export interface SavedZoneSystemRef {
  /** Reference ID */
  id: string;
  /** System type category */
  systemType: string;
  /** Display name */
  name: string;
  /** Hull points in this zone */
  hullPoints: number;
  /** Original installed system ID */
  installedSystemId: string;
  /** Firepower order for weapons */
  firepowerOrder?: number;
}

/**
 * A damage zone in save file
 */
export interface SavedDamageZone {
  /** Zone code */
  code: ZoneCode;
  /** Systems in this zone */
  systems: SavedZoneSystemRef[];
  /** Total HP in zone */
  totalHullPoints: number;
  /** Max HP for zone */
  maxHullPoints: number;
}

/**
 * Hit location entry in save file
 */
export interface SavedHitLocationEntry {
  minRoll: number;
  maxRoll: number;
  zone: ZoneCode;
}

/**
 * Hit location column in save file
 */
export interface SavedHitLocationColumn {
  direction: AttackDirection;
  entries: SavedHitLocationEntry[];
}

/**
 * Hit location chart in save file
 */
export interface SavedHitLocationChart {
  hitDie: 6 | 8 | 12 | 20;
  columns: SavedHitLocationColumn[];
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
  
  /** Ship lore/description text */
  lore?: string;
  
  /** Ship image (base64 encoded) */
  imageData?: string | null;
  
  /** Ship image MIME type */
  imageMimeType?: string | null;
  
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
  
  /** Installed hangar & miscellaneous systems */
  hangarMisc: SavedHangarMiscSystem[];
  
  /** Installed weapons */
  weapons: SavedWeapon[];
  
  /** Ordnance designs (missile, bomb, mine blueprints) */
  ordnanceDesigns: SavedOrdnanceDesign[];
  
  /** Installed launch systems */
  launchSystems: SavedLaunchSystem[];
  
  /** Damage diagram zones */
  damageDiagramZones: SavedDamageZone[];
  
  /** Hit location chart */
  hitLocationChart: SavedHitLocationChart | null;
  
  /** Installed systems (future) */
  systems: unknown[];
}

/** Current save file version */
export const SAVE_FILE_VERSION = '1.0';
