import type { ProgressLevel, TechTrack } from './common';

// ============== Ordnance Categories ==============

export type OrdnanceCategory = 'missile' | 'bomb' | 'mine';

// ============== Ordnance Sizes ==============

/**
 * Ordnance sizes determine capacity requirements and warhead compatibility
 * - Light: 1 capacity point, size 1 warhead
 * - Medium: 2 capacity points, size 2 warhead
 * - Heavy: 4 capacity points, size 4 warhead (3 in some older docs, but rules say 4)
 */
export type OrdnanceSize = 'light' | 'medium' | 'heavy';

export const ORDNANCE_SIZE_CAPACITY: Record<OrdnanceSize, number> = {
  light: 1,
  medium: 2,
  heavy: 4,
};

export const ORDNANCE_SIZE_WARHEAD: Record<OrdnanceSize, number> = {
  light: 1,
  medium: 2,
  heavy: 4,
};

// ============== Launch System Types ==============

/**
 * Launch system types - each is restricted to specific ordnance categories
 */
export type LaunchSystemType = 'bomb-rack' | 'bomb-bay' | 'missile-rack' | 'missile-tube' | 'minelayer' | 'ordnance-cell';

/**
 * Which ordnance categories each launch system can use
 */
export const LAUNCH_SYSTEM_ORDNANCE_TYPES: Record<LaunchSystemType, OrdnanceCategory[]> = {
  'bomb-rack': ['bomb'],
  'bomb-bay': ['bomb'],
  'missile-rack': ['missile'],
  'missile-tube': ['missile'],
  'minelayer': ['mine'],
  'ordnance-cell': ['missile', 'mine'], // Ordnance cells can carry missiles and mines
};

// ============== Launch System Definition ==============

export interface LaunchSystem {
  id: LaunchSystemType;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  /** Hull points required */
  hullPoints: number;
  /** Power required to operate */
  powerRequired: number;
  /** Base cost */
  cost: number;
  /** Base capacity in size points */
  capacity: number;
  /** Whether capacity can be expanded */
  expandable: boolean;
  /** Capacity gained per additional HP (if expandable) */
  expansionCapacityPerHp?: number;
  /** Cost per additional HP (if expandable) */
  expansionCostPerHp?: number;
  /** Rate of fire per round */
  rateOfFire: number;
  /** Can be reloaded in space */
  spaceReload: boolean;
  /** Ordnance categories this launcher supports */
  ordnanceTypes: OrdnanceCategory[];
  description: string;
}

// ============== Propulsion System (Missiles only) ==============

export interface PropulsionSystem {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  /** Size points this propulsion takes in the launcher */
  size: number;
  /** Maximum warhead size this propulsion can carry */
  maxWarheadSize: number;
  /** Cost per unit */
  cost: number;
  /** Accuracy modifier */
  accuracyModifier: number;
  /** Endurance in rounds (null for bombs/mines) */
  endurance: number | null;
  /** Acceleration in Mpp (null for bombs/mines, PL6 uses different scale) */
  acceleration: number | null;
  /** For PL6 missiles, acceleration is on old scale */
  isPL6Scale?: boolean;
  description: string;
}

// ============== Warhead System ==============

export interface Warhead {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  /** Warhead size (1, 2, or 4) */
  size: number;
  /** Cost per unit */
  cost: number;
  /** Accuracy modifier */
  accuracyModifier: number;
  /** Damage type: En, HI, LI */
  damageType: string;
  /** Firepower rating */
  firepower: string;
  /** Damage string (Ordinary/Good/Amazing) */
  damage: string;
  /** Is area effect weapon */
  isAreaEffect: boolean;
  description: string;
}

// ============== Guidance System (Missiles and Mines only) ==============

export interface GuidanceSystem {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  /** Cost per unit */
  cost: number;
  /** Accuracy modifier */
  accuracyModifier: number;
  /** What ordnance types can use this guidance */
  applicableTo: OrdnanceCategory[];
  description: string;
}

// ============== Ordnance Design (User-created blueprints) ==============

/**
 * A missile design created by the user
 */
export interface MissileDesign {
  id: string;
  name: string;
  category: 'missile';
  size: OrdnanceSize;
  propulsionId: string;
  guidanceId: string;
  warheadId: string;
  /** Calculated total accuracy */
  totalAccuracy: number;
  /** Calculated total cost per unit */
  totalCost: number;
  /** Capacity points required (from propulsion size) */
  capacityRequired: number;
}

/**
 * A bomb design created by the user
 */
export interface BombDesign {
  id: string;
  name: string;
  category: 'bomb';
  size: OrdnanceSize;
  warheadId: string;
  /** Calculated total accuracy (from warhead only) */
  totalAccuracy: number;
  /** Calculated total cost per unit */
  totalCost: number;
  /** Capacity points required */
  capacityRequired: number;
}

/**
 * A mine design created by the user
 */
export interface MineDesign {
  id: string;
  name: string;
  category: 'mine';
  size: OrdnanceSize;
  guidanceId: string;
  warheadId: string;
  /** Calculated total accuracy */
  totalAccuracy: number;
  /** Calculated total cost per unit */
  totalCost: number;
  /** Capacity points required */
  capacityRequired: number;
}

/**
 * Union type for all ordnance designs
 */
export type OrdnanceDesign = MissileDesign | BombDesign | MineDesign;

// ============== Installed Launch System ==============

export interface LoadedOrdnance {
  designId: string;
  quantity: number;
}

export interface InstalledLaunchSystem {
  id: string;
  launchSystemType: LaunchSystemType;
  /** Number of launchers of this type */
  quantity: number;
  /** Extra HP allocated for expansion (if expandable) */
  extraHp: number;
  /** What ordnance is loaded */
  loadout: LoadedOrdnance[];
  /** Calculated total hull points */
  hullPoints: number;
  /** Calculated total power required */
  powerRequired: number;
  /** Calculated total cost (launcher only, not ordnance) */
  cost: number;
  /** Calculated total capacity */
  totalCapacity: number;
}

// ============== Ordnance Stats ==============

export interface OrdnanceStats {
  totalLauncherHullPoints: number;
  totalLauncherPower: number;
  totalLauncherCost: number;
  totalOrdnanceCost: number;
  totalCost: number;
  missileDesignCount: number;
  bombDesignCount: number;
  mineDesignCount: number;
  launchSystemCount: number;
}
