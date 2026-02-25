import type { ProgressLevel, TechTrack, InstalledSystemBase, PowerConsumingStats, CostPer, PowerPer } from './common';

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
  /** If true, allows variable sizing even for coverage-based systems (minimum is full coverage) */
  allowVariableSize?: boolean;
  /** IDs of components that this system requires at least one of to function */
  requiresComponents?: string[];
  /** If true, coverage must exactly match full hull - no editing allowed (for screens) */
  fixedCoverage?: boolean;
  /** If true, coverage must be in multiples of full hull coverage (for countermeasures) */
  coverageMultiples?: boolean;
}

export type InstalledDefenseSystem = InstalledSystemBase<DefenseSystemType>;

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
}
