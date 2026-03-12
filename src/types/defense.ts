import type { ProgressLevel, TechTrack, InstalledSystemBase, PowerConsumingStats, CostPer, PowerPer } from './common';
import type { ToughnessRating } from './hull';

// ============== Toughness Threshold ==============

/**
 * A threshold defining the minimum number of generators needed
 * to achieve a given shield toughness rating.
 * Used by ablative shields to upgrade shield toughness beyond the hull default.
 */
export interface ToughnessThreshold {
  /** Minimum number of generators required */
  generators: number;
  /** Toughness rating achieved at this threshold */
  toughness: ToughnessRating;
}

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
  /** Hull points per unit (fixed size systems) - only used when hullPercentage is 0 */
  hullPoints: number;
  /** Percentage of ship hull points required (0 = not percentage-based, >0 = percentage value) */
  hullPercentage: number;
  /** Power required per unit (or per system HP if powerPer is 'systemHp') */
  powerRequired: number;
  /** How power scales: 'unit' = power × quantity, 'systemHp' = power × system's own HP */
  powerPer: PowerPer;
  /** Cost per unit (or per system HP if costPer is 'systemHp') */
  cost: number;
  /** How cost scales: 'unit' = cost × quantity, 'systemHp' = cost × system's own HP */
  costPer: CostPer;
  /** Hull points covered by one unit of this system (0 if not applicable) */
  coverage: number;
  /** Effect description for display */
  effect: string;
  /** Bonus (in steps) applied to damage checks; 0 if not applicable */
  damageCheckBonus: number;
  /** Detailed description */
  description: string;
  /** Shield points provided (for capacitors/compilers) */
  shieldPoints?: number;
  /** IDs of other defense systems that are incompatible with this one */
  incompatibleWith?: string[];
  /** ID of another defense system that must be installed before this one can be installed */
  requiresInstalled?: string;
  /** IDs of components that this system requires at least one of to function */
  requiresComponents?: string[];
  /** If true, coverage must exactly match full hull - no editing allowed (for screens) */
  fixedCoverage?: boolean;
  /** If true, coverage must be in multiples of full hull coverage (for countermeasures) */
  coverageMultiples?: boolean;
  /** If true, extra units beyond full coverage are allowed (for ablative shield toughness upgrades) */
  allowExtraUnits?: boolean;
  /** Toughness thresholds for extra units — shield toughness = max(hull toughness, highest matched threshold) */
  toughnessThresholds?: ToughnessThreshold[];
}

// ============== Sub-Systems (for zone splitting) ==============

/**
 * A sub-system created when a defense system is split for zone assignment.
 * Each sub-system represents a portion of the parent defense that can be
 * independently assigned to a damage zone.
 */
export interface DefenseSubSystem {
  /** Unique identifier for this sub-system */
  id: string;
  /** Display label (e.g., "Section 1", "Section 2") */
  label: string;
  /** Hull points allocated to this sub-system */
  hullPoints: number;
}

// ============== Installed Defense System ==============

export interface InstalledDefenseSystem extends InstalledSystemBase<DefenseSystemType> {
  /**
   * Optional sub-systems for zone assignment.
   * When present, the damage diagram shows these instead of the parent system.
   * The parent system's total HP is the sum of all sub-system HP.
   */
  subSystems?: DefenseSubSystem[];
}

// ============== Stats ==============

export interface DefenseStats extends PowerConsumingStats {
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
  /** The effective toughness of the ablative shield (null if no ablative shield installed) */
  shieldToughness: ToughnessRating | null;
  /** Number of extra generators beyond full coverage (0 if none) */
  extraShieldGenerators: number;
}
