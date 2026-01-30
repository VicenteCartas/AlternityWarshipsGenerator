import type { ProgressLevel, TechTrack } from './common';

// ============== Categories ==============

export type HangarMiscCategory =
  | 'hangar'       // Hangars, docking clamps, magazines
  | 'cargo'        // Cargo spaces, bays, holds
  | 'emergency'    // Escape pods, evac systems, reentry capsules
  | 'facility'     // Labs, workshops, sick bays, brigs
  | 'utility';     // Airlocks, fuel collectors, accumulators, etc.

// ============== System Type ==============

export interface HangarMiscSystemType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  category: HangarMiscCategory;
  /** Hull points per unit (or base HP for scalable systems) */
  hullPoints: number;
  /** Power required per unit (or per HP for percentage-based) */
  powerRequired: number;
  /** Cost per unit */
  cost: number;
  /** Whether cost scales with size/quantity */
  costPerHull?: boolean;
  /** For scalable systems: what the HP provides (e.g., "10 HP of embarked craft") */
  capacityPerHull?: string;
  /** For scalable systems: capacity multiplier */
  capacityMultiplier?: number;
  /** Whether this system uses a percentage of hull */
  hullPercentage?: number;
  /** Maximum quantity allowed */
  maxQuantity?: number;
  /** Effect or bonus provided */
  effect?: string;
  /** Detailed description */
  description: string;
}

// ============== Installed System ==============

export interface InstalledHangarMiscSystem {
  id: string;
  type: HangarMiscSystemType;
  /** For scalable systems: size in hull points; for fixed systems: quantity */
  quantity: number;
  /** Calculated hull points used */
  hullPoints: number;
  /** Calculated power required */
  powerRequired: number;
  /** Calculated cost */
  cost: number;
  /** Calculated capacity (for hangars, cargo, etc.) */
  capacity?: number;
}

// ============== Stats ==============

export interface HangarMiscStats {
  totalHullPoints: number;
  totalPowerRequired: number;
  totalCost: number;
  /** Total hangar capacity in HP of embarked craft */
  totalHangarCapacity: number;
  /** Total docking clamp capacity in HP */
  totalDockingCapacity: number;
  /** Total cargo capacity in cubic meters */
  totalCargoCapacity: number;
  /** Total emergency evacuation capacity (people) */
  totalEvacCapacity: number;
  /** Total magazine capacity (ordnance size points) */
  totalMagazineCapacity: number;
}
