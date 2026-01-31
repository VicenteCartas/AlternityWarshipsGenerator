import type { ProgressLevel, TechTrack } from './common';

// ============== Weapon Categories ==============

export type WeaponCategory = 'beam' | 'projectile' | 'torpedo' | 'ordnance';

// ============== Mount Types ==============

export type MountType = 'standard' | 'fixed' | 'turret' | 'sponson' | 'bank';

// ============== Gun Configuration ==============

export type GunConfiguration = 'single' | 'twin' | 'triple' | 'quadruple';

// ============== Firing Arcs ==============

/**
 * Standard firing arcs (non-zero range)
 */
export type StandardArc = 'forward' | 'starboard' | 'port' | 'aft';

/**
 * Zero-range firing arcs (same hex as the ship)
 * Zero arcs are for engaging targets in the same hex (fighters, missiles, etc.)
 */
export type ZeroArc = 'zero-forward' | 'zero-starboard' | 'zero-port' | 'zero-aft';

/**
 * All possible firing arcs
 */
export type FiringArc = StandardArc | ZeroArc;

/**
 * Special constant for "all zero arcs" (all four zero arcs together)
 */
export const ALL_ZERO_ARCS: ZeroArc[] = ['zero-forward', 'zero-starboard', 'zero-port', 'zero-aft'];

/**
 * All standard arcs
 */
export const ALL_STANDARD_ARCS: StandardArc[] = ['forward', 'starboard', 'port', 'aft'];

// ============== Damage Type ==============

export type DamageType = 'En' | 'HI' | 'LI'; // Energy, High Impact, Low Impact

// ============== Firepower Rating ==============

export type FirepowerRating = 'S' | 'L' | 'M' | 'H' | 'SH'; // Small, Light, Medium, Heavy, Super-Heavy

// ============== Fire Mode ==============

export type FireMode = 'F' | 'F*' | 'F/G' | 'G' | 'F/A'; // Fire modes: F=single fire, G=burst, A=autofire

// ============== Beam Weapon Type ==============

export interface BeamWeaponType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  /** Hull points required for a single standard mount */
  hullPoints: number;
  /** Power required per hull point */
  powerRequired: number;
  /** Cost for a single standard mount */
  cost: number;
  /** Accuracy modifier (attack roll bonus/penalty) */
  accuracyModifier: number;
  /** Short range in megameters */
  rangeShort: number;
  /** Medium range in megameters */
  rangeMedium: number;
  /** Long range in megameters */
  rangeLong: number;
  /** Damage type: En (Energy), LI (Low-Impact), HI (High-Impact) */
  damageType: string;
  /** Firepower rating: S (Small), L (Light), H (Heavy), SH (Super-Heavy), C (Capital) */
  firepower: FirepowerRating;
  /** Damage for Ordinary/Good/Amazing hits */
  damage: string;
  /** Fire modes available */
  fireMode: FireMode;
  /** Description */
  description: string;
}

// ============== Mount Modifiers ==============

/**
 * Mount type modifiers for cost and hull points
 * - Standard: base values (1x cost, 1x HP)
 * - Fixed: 0.75x cost, 0.75x HP (25% less)
 * - Turret: 1.5x cost, 1.5x HP (50% more)
 * - Sponson: 1.25x cost, 1x HP (25% more cost, same HP)
 * - Bank: 1.25x cost, 1x HP (PL8+ beams only, 25% more cost, same HP)
 */
export const MOUNT_MODIFIERS: Record<MountType, { costMultiplier: number; hpMultiplier: number; minPL?: ProgressLevel; beamOnly?: boolean }> = {
  standard: { costMultiplier: 1, hpMultiplier: 1 },
  fixed: { costMultiplier: 0.75, hpMultiplier: 0.75 },
  turret: { costMultiplier: 1.5, hpMultiplier: 1.5 },
  sponson: { costMultiplier: 1.25, hpMultiplier: 1 },
  bank: { costMultiplier: 1.25, hpMultiplier: 1, minPL: 8, beamOnly: true },
};

/**
 * Gun configuration modifiers for cost and hull points
 * Power consumption is NOT affected by gun configuration
 * - Single: base values (1x cost, 1x HP)
 * - Twin: 1.5x cost, 1.5x HP
 * - Triple: 1.75x cost, 1.75x HP
 * - Quadruple: 2x cost, 2x HP
 */
export const GUN_CONFIGURATION_MODIFIERS: Record<GunConfiguration, { costMultiplier: number; hpMultiplier: number; gunCount: number }> = {
  single: { costMultiplier: 1, hpMultiplier: 1, gunCount: 1 },
  twin: { costMultiplier: 1.5, hpMultiplier: 1.5, gunCount: 2 },
  triple: { costMultiplier: 1.75, hpMultiplier: 1.75, gunCount: 3 },
  quadruple: { costMultiplier: 2, hpMultiplier: 2, gunCount: 4 },
};

/**
 * Concealment modifier
 * Concealed weapons take 1.5x space and cost 1.5x
 */
export const CONCEALMENT_MODIFIER = {
  costMultiplier: 1.5,
  hpMultiplier: 1.5,
};

// ============== Installed Weapon ==============

export interface InstalledWeapon {
  id: string;
  weaponType: BeamWeaponType; // Will expand to union type later for other weapon categories
  category: WeaponCategory;
  mountType: MountType;
  gunConfiguration: GunConfiguration;
  concealed: boolean;
  /** Number of identical mounts */
  quantity: number;
  /** Selected firing arcs */
  arcs: FiringArc[];
  /** Calculated hull points used (per mount) */
  hullPoints: number;
  /** Calculated power required (per mount) */
  powerRequired: number;
  /** Calculated cost (per mount) */
  cost: number;
}

// ============== Weapon Stats ==============

export interface WeaponStats {
  totalHullPoints: number;
  totalPowerRequired: number;
  totalCost: number;
  beamCount: number;
  projectileCount: number;
  torpedoCount: number;
  ordnanceCount: number;
}
