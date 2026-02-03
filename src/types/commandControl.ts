import type { ProgressLevel, TechTrack, QualityLevel, InstalledSystemBase, PowerConsumingStats } from './common';

// ============== Command and Control Categories ==============

export type CommandControlCategory =
  | 'command'       // Cockpit, Command Deck, Flag Bridge, Launch Tower
  | 'communication' // Transceivers (Radio, Laser, Mass, Drive, Psionic, Ansible)
  | 'computer';     // Computer cores, fire control, sensor control, tac control, nav control, attack computer

// ============== Command and Control System Type ==============

export interface CommandControlSystemType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  category: CommandControlCategory;
  /** Base hull points required (0 for coverage-only systems like computer cores) */
  hullPoints: number;
  /** Ship hull points covered per HP of this system. Formula: baseHP + ceil(shipHP / coveragePerHullPoint) */
  coveragePerHullPoint?: number;
  /** Maximum hull points cap for coverage-based systems */
  maxHullPoints?: number;
  /** Power required per unit */
  powerRequired: number;
  /** Base cost */
  cost: number;
  /** If true and has coveragePerHullPoint: cost × system's calculated HP */
  costPerHull?: boolean;
  /** Type of system this control links to - cost will be × linked system's HP */
  linkedSystemType?: 'weapon' | 'sensor';
  /** Maximum quantity allowed (e.g., cockpit max 4 stations) */
  maxQuantity?: number;
  /** Effect description for display (computer systems only) */
  effect?: string;
  /** Detailed description */
  description: string;
  /** Quality level for computers (Ordinary, Good, Amazing) */
  quality?: QualityLevel;
  /** Step bonus provided (for fire/sensor/tac/nav control, attack computer) */
  stepBonus?: number;
  /** Whether this is dedicated to a weapon/sensor (for Fire Control, Sensor Control) */
  isDedicated?: boolean;
  /** Whether this system is required (cockpit/command deck) */
  isRequired?: boolean;
  /** Maximum ship hull points this can be used on (cockpit only) */
  maxShipHullPoints?: number;
  /** Whether this control computer requires a core to be installed first */
  requiresCore?: boolean;
  /** Maximum quality of core this computer can work with (Ordinary can't exceed Ordinary core, etc.) */
  maxQuality?: QualityLevel;
}

// ============== Weapon Battery Key ==============

/**
 * A weapon battery is identified by weapon type + mount type.
 * Format: "weaponTypeId:mountType" (e.g., "matter-beam:turret", "plasma-cannon:fixed")
 */
export type WeaponBatteryKey = string;

// ============== Installed Command and Control System ==============

export interface InstalledCommandControlSystem extends InstalledSystemBase<CommandControlSystemType> {
  /** For Fire Control: the weapon battery this is linked to (format: "weaponTypeId:mountType") */
  linkedWeaponBatteryKey?: WeaponBatteryKey;
  /** For Sensor Control: the sensor installation ID this is linked to */
  linkedSensorId?: string;
}

// ============== Stats ==============

export interface CommandControlStats extends PowerConsumingStats {
  /** Whether ship has required command system (cockpit or command deck) */
  hasCommandSystem: boolean;
  /** Name of the installed command system (if any) */
  commandSystemName: string | null;
  /** Number of command stations installed */
  commandStations: number;
  /** Whether ship has computer core installed */
  hasComputerCore: boolean;
  /** Quality of the computer core (if any) */
  computerCoreQuality: 'Ordinary' | 'Good' | 'Amazing' | null;
  /** Number of computer core hull points required based on ship size */
  requiredComputerCoreHullPoints: number;
  /** Number of computer core hull points installed */
  installedComputerCoreHullPoints: number;
  /** Best attack bonus from attack computers */
  attackBonus: number;
  /** List of installed transceivers */
  installedTransceivers: string[];
}
