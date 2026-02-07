import type { ProgressLevel, TechTrack, InstalledItemBase, InstalledItemWithCalcs, PowerConsumingStats } from './common';

// ============== Weapon Categories ==============

export type WeaponCategory = 'beam' | 'projectile' | 'torpedo' | 'special' | 'ordnance';

// ============== Mount Types ==============

export type MountType = 'standard' | 'fixed' | 'turret' | 'sponson' | 'bank' | 'launcher';

/**
 * Mount modifier configuration loaded from JSON
 */
export interface MountModifier {
  costMultiplier: number;
  hpMultiplier: number;
}

// ============== Gun Configuration ==============

export type GunConfiguration = 'single' | 'twin' | 'triple' | 'quadruple';

/**
 * Gun configuration modifier loaded from JSON
 */
export interface GunConfigModifier {
  effectiveGunCount: number;
  actualGunCount: number;
}

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

// DamageType is already defined in common.ts: 'En' | 'HI' | 'LI' (Energy, High Impact, Low Impact)

// ============== Firepower Rating ==============

export type FirepowerRating = 'S' | 'L' | 'M' | 'H' | 'SH' | 'Gd'; // Small, Light, Medium, Heavy, Super-Heavy, Good (Point Defense)

// ============== Fire Mode ==============

export type FireMode = 'F' | 'G' | 'B' | 'A'; // Fire modes: F=single fire, G=burst, B=burst, A=autofire

// ============== Area Effect ==============

/**
 * Area effect information for weapons that affect an area
 */
export interface AreaEffect {
  /** Area of effect radius for Amazing hits */
  rangeAmazing: string;
  /** Area of effect radius for Good hits */
  rangeGood: string;
  /** Area of effect radius for Ordinary hits */
  rangeOrdinary: string;
  /** Notes: TA (Tactical Arms), MD (Mass Destruction), SA (Strategic Arms) */
  notes?: string;
}

// ============== Base Weapon Type ==============

/**
 * Base interface for all weapon types
 */
export interface BaseWeaponType {
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
  /** Firepower rating: S (Small), L (Light), H (Heavy), SH (Super-Heavy), Gd (Good/Point Defense) */
  firepower: FirepowerRating;
  /** Damage for Ordinary/Good/Amazing hits */
  damage: string;
  /** Fire modes available (array of individual modes) */
  fireModes: FireMode[];
  /** Description */
  description: string;
  /** Area effect information (if weapon has area effect) */
  area?: AreaEffect;
}

// ============== Beam Weapon Type ==============

/**
 * Beam weapons extend the base weapon type
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BeamWeaponType extends BaseWeaponType {}

// ============== Projectile Weapon Type ==============

/**
 * Projectile weapons extend the base weapon type
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProjectileWeaponType extends BaseWeaponType {}

// ============== Torpedo Weapon Type ==============

/**
 * Torpedo weapons extend the base weapon type
 * Torpedoes can use standard, fixed, or turret mounts
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TorpedoWeaponType extends BaseWeaponType {}

// ============== Special Weapon Type ==============

/**
 * Special weapons with unique abilities (tractor beams, cable guns, etc.)
 * Some special weapons have no damage (tractor, cable gun, boarding transporter)
 */
export interface SpecialWeaponType extends BaseWeaponType {
  /** Special effect description for weapons with non-standard behavior */
  specialEffect?: string;
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

// ============== Weapon Type Union ==============

/**
 * Union type for all weapon types (beam, projectile, torpedo, special)
 */
export type WeaponType = BeamWeaponType | ProjectileWeaponType | TorpedoWeaponType | SpecialWeaponType;

// ============== Installed Weapon ==============

export interface InstalledWeapon extends InstalledItemBase, InstalledItemWithCalcs {
  weaponType: WeaponType;
  category: WeaponCategory;
  mountType: MountType;
  gunConfiguration: GunConfiguration;
  concealed: boolean;
  /** Number of identical mounts */
  quantity: number;
  /** Selected firing arcs */
  arcs: FiringArc[];
}

// ============== Weapon Stats ==============

export interface WeaponStats extends PowerConsumingStats {
  beamCount: number;
  projectileCount: number;
  torpedoCount: number;
  specialCount: number;
  ordnanceCount: number;
}
