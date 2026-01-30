import type { ProgressLevel, TechTrack } from './common';

// ============== Defense System Types ==============

export type DefenseCategory =
  | 'screen'        // Deflection Inducer, Particle Screen, Magnetic Screen, Ablative Shield
  | 'countermeasure' // Chaff, Jammer, Decoy Drone, Stealth systems
  | 'repair'        // Damage Control, Repair Bots, Nanite Repair Array
  | 'shield-component'; // Capacitor, Energy Compiler (for Ablative Shield)

export interface DefenseSystemType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  category: DefenseCategory;
  /** Hull points per unit (fixed size systems) - only used when hullPercentage is false */
  hullPoints: number;
  /** If true, hull points are calculated as percentage of ship hull using hullPercentageValue */
  hullPercentage: boolean;
  /** Percentage of ship hull points required (only used when hullPercentage is true) */
  hullPercentageValue?: number;
  /** Power required per unit */
  powerRequired: number;
  /** If true, power is calculated as per hull point of coverage */
  powerPerHull: boolean;
  /** Cost per unit */
  cost: number;
  /** If true, cost is calculated as per hull point of coverage */
  costPerHull: boolean;
  /** Hull points covered by one unit of this system (0 if not applicable) */
  coverage: number;
  /** Effect description for display */
  effect: string;
  /** Detailed description */
  description: string;
  /** Shield points provided (for capacitors/compilers) */
  shieldPoints?: number;
  /** IDs of other defense systems that are incompatible with this one */
  incompatibleWith?: string[];
  /** ID of another defense system that must be installed before this one can be installed */
  requiresInstalled?: string;
  /** If true, allows variable sizing even for coverage-based systems (minimum is full coverage) */
  allowVariableSize?: boolean;
  /** IDs of components that this system requires at least one of to function */
  requiresComponents?: string[];
}

export interface InstalledDefenseSystem {
  id: string;
  type: DefenseSystemType;
  /** Number of units installed (for fixed-size systems) */
  quantity: number;
  /** Calculated hull points used */
  hullPoints: number;
  /** Calculated power required */
  powerRequired: number;
  /** Calculated cost */
  cost: number;
}

// ============== Stats ==============

export interface DefenseStats {
  totalHullPoints: number;
  totalPowerRequired: number;
  totalCost: number;
  /** Hull points covered by screens */
  screenCoverage: number;
  /** Hull points covered by countermeasures */
  countermeasureCoverage: number;
  /** Total shield points from capacitors/compilers */
  totalShieldPoints: number;
  /** Damage check bonus from repair systems */
  damageCheckBonus: number;
  /** Whether ship has any screen type active */
  hasActiveScreen: boolean;
  /** The active screen type name (if any) */
  activeScreenType: string | null;
}
