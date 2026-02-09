import type { ShipClass } from './hull';

// ============== Data File Structure ==============

export interface ZoneLimitData {
  hullPoints: number;
  zoneCount: number;
  zoneLimit: number;
}

/**
 * A single entry in a JSON hit location table
 * roll is [min] for single values or [min, max] for ranges
 */
export interface HitLocationTableEntry {
  roll: number[];
  zone: ZoneCode;
}

/**
 * A hit location table from JSON: direction -> entries
 */
export type HitLocationTableData = Record<string, HitLocationTableEntry[]>;

export interface DamageDiagramData {
  zoneConfigurations: {
    'small-craft': {
      '2-zone': { maxHullPoints: number; zones: ZoneCode[]; hitDie: 6 | 8 | 12 | 20 };
      '4-zone': { maxHullPoints: number; zones: ZoneCode[]; hitDie: 6 | 8 | 12 | 20 };
    };
    light: { zones: ZoneCode[]; hitDie: 6 | 8 | 12 | 20 };
    medium: { zones: ZoneCode[]; hitDie: 6 | 8 | 12 | 20 };
    heavy: { zones: ZoneCode[]; hitDie: 6 | 8 | 12 | 20 };
    'super-heavy': { zones: ZoneCode[]; hitDie: 6 | 8 | 12 | 20 };
  };
  zoneLimits: {
    hulls: Record<string, ZoneLimitData>;
  };
  hitLocationTables?: Record<string, HitLocationTableData>;
}

// ============== Zone Definitions ==============

/**
 * Zone code abbreviations used in the damage diagram
 * Based on Table 5-18 from Warships
 */
export type ZoneCode =
  // Basic zones (2-zone ships)
  | 'F'    // Fore
  | 'A'    // Aft
  // 4-zone ships add
  | 'FC'   // Forward Center
  | 'AC'   // Aft Center
  // 6-zone ships add
  | 'P'    // Port
  | 'S'    // Starboard
  // 8-zone ships add
  | 'FP'   // Forward Port
  | 'FS'   // Forward Starboard
  | 'AP'   // Aft Port
  | 'AS'   // Aft Starboard
  // 12-zone ships add
  | 'CF'   // Center Forward
  | 'CA'   // Center Aft
  // 20-zone ships add
  | 'FFP'  // Forward-Forward Port
  | 'FFC'  // Forward-Forward Center
  | 'FFS'  // Forward-Forward Starboard
  | 'PC'   // Port Center
  | 'SC'   // Starboard Center
  | 'AAP'  // Aft-Aft Port
  | 'AAC'  // Aft-Aft Center
  | 'AAS'; // Aft-Aft Starboard

/**
 * Full zone name for display
 */
export const ZONE_NAMES: Record<ZoneCode, string> = {
  'F': 'Fore',
  'A': 'Aft',
  'FC': 'Forward Center',
  'AC': 'Aft Center',
  'P': 'Port',
  'S': 'Starboard',
  'FP': 'Forward Port',
  'FS': 'Forward Starboard',
  'AP': 'Aft Port',
  'AS': 'Aft Starboard',
  'CF': 'Center Forward',
  'CA': 'Center Aft',
  'FFP': 'Forward-Forward Port',
  'FFC': 'Forward-Forward Center',
  'FFS': 'Forward-Forward Starboard',
  'PC': 'Port Center',
  'SC': 'Starboard Center',
  'AAP': 'Aft-Aft Port',
  'AAC': 'Aft-Aft Center',
  'AAS': 'Aft-Aft Starboard',
};

/**
 * Number of zones based on ship class
 */
export type ZoneCount = 2 | 4 | 6 | 8 | 12 | 20;

/**
 * Configuration for zones by ship class
 */
export interface ShipClassZoneConfig {
  shipClass: ShipClass;
  zoneCount: ZoneCount;
  zones: ZoneCode[];
  /** Die to roll for hit locations (d6, d8, d12, d20) */
  hitDie: 6 | 8 | 12 | 20;
}

// ============== System Assignment ==============

/**
 * Categories for ordering systems within a zone
 * Listed in order from surface (hit first) to core (hit last)
 */
export type SystemDamageCategory =
  | 'weapon'         // Weapons (lightest to heaviest firepower)
  | 'defense'        // Defensive systems
  | 'sensor'         // Sensors
  | 'communication'  // Comm systems
  | 'fuel'           // Fuel tanks (engine and FTL)
  | 'hangar'         // Hangars or cargo
  | 'accommodation'  // Crew/passenger quarters
  | 'miscellaneous'  // Misc systems
  | 'support'        // Support systems (life support, recyclers, etc.)
  | 'engine'         // Engines
  | 'powerPlant'     // Power plant
  | 'ftlDrive'       // FTL drive
  | 'command';       // Command and computers (hit last)

/**
 * The order in which system categories are hit (surface to core)
 */
export const DAMAGE_CATEGORY_ORDER: SystemDamageCategory[] = [
  'weapon',
  'defense',
  'sensor',
  'communication',
  'fuel',
  'hangar',
  'accommodation',
  'miscellaneous',
  'support',
  'engine',
  'powerPlant',
  'ftlDrive',
  'command',
];

/**
 * A reference to an installed system that can be placed in a zone
 */
export interface ZoneSystemReference {
  /** Unique ID for this reference (different from installation ID for systems that can be split) */
  id: string;
  /** The type of system (for categorization) */
  systemType: SystemDamageCategory;
  /** Display name of the system */
  name: string;
  /** Hull points allocated to this zone (may be partial for distributed systems) */
  hullPoints: number;
  /** Reference to the original installed system ID */
  installedSystemId: string;
  /** For weapons: the firepower rating for ordering (lighter first) */
  firepowerOrder?: number;
}

/**
 * A zone with its assigned systems
 */
export interface DamageZone {
  /** Zone code (e.g., 'F', 'FC', 'P') */
  code: ZoneCode;
  /** Systems assigned to this zone, ordered by damage priority */
  systems: ZoneSystemReference[];
  /** Total hull points of systems in this zone */
  totalHullPoints: number;
  /** Maximum hull points allowed in this zone (from hull type) */
  maxHullPoints: number;
}

// ============== Hit Location Chart ==============

/**
 * Attack direction for hit location tables
 */
export type AttackDirection = 'forward' | 'port' | 'starboard' | 'aft' | 'high' | 'low';

/**
 * A single entry in the hit location chart
 * Maps a die roll range to a zone for a specific attack direction
 */
export interface HitLocationEntry {
  /** Minimum die roll (inclusive) */
  minRoll: number;
  /** Maximum die roll (inclusive) */
  maxRoll: number;
  /** Zone that is hit on this roll */
  zone: ZoneCode;
}

/**
 * Hit location chart for one attack direction
 */
export interface HitLocationColumn {
  direction: AttackDirection;
  entries: HitLocationEntry[];
}

/**
 * Complete hit location chart for a ship
 */
export interface HitLocationChart {
  /** Die type used for hit rolls */
  hitDie: 6 | 8 | 12 | 20;
  /** Hit location columns by attack direction */
  columns: HitLocationColumn[];
}

// ============== Complete Damage Diagram ==============

/**
 * Complete damage diagram state for a ship
 */
export interface DamageDiagram {
  /** All zones with their assigned systems */
  zones: DamageZone[];
  /** Hit location chart */
  hitLocationChart: HitLocationChart;
  /** Whether the diagram is complete and valid */
  isComplete: boolean;
  /** Validation errors if any */
  validationErrors: string[];
}

/**
 * Stats summary for the damage diagram
 */
export interface DamageDiagramStats {
  /** Total zones */
  zoneCount: number;
  /** Zones with at least one system */
  zonesWithSystems: number;
  /** Zones that are over their HP limit */
  zonesOverLimit: number;
  /** Zones that are empty (warning) */
  emptyZones: number;
  /** Total systems assigned */
  totalSystemsAssigned: number;
  /** Total HP assigned to zones */
  totalHullPointsAssigned: number;
  /** Systems not yet assigned to any zone */
  unassignedSystems: number;
}
