import type { ProgressLevel, TechTrack, InstalledSystemBase, PowerConsumingStats } from './common';

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
  /** Cost per unit (or per HP if costPerHull is true) */
  cost: number;
  /** Whether cost scales with size/quantity */
  costPerHull?: boolean;
  /** Base cost added once per installation (used with costPerHull) */
  baseCost?: number;
  /** For scalable systems: what the HP provides (e.g., "10 HP of embarked craft") */
  capacityPerHull?: string;
  /** For scalable HP-based systems: capacity per HP (e.g., hangar: 1 HP craft per 1 HP) */
  capacityMultiplier?: number;
  /** For fixed systems: cargo capacity in cubic meters per unit */
  cargoCapacity?: number;
  /** For fixed systems: evacuation capacity per unit (e.g., escape pods) */
  evacCapacity?: number;
  /** For scalable evac systems: additional capacity per extra HP */
  evacCapacityPerHP?: number;
  /** For fixed systems: prisoners capacity per unit (brig) */
  prisonersCapacity?: number;
  /** For fixed systems: scientist capacity per unit (lab section) */
  scientistCapacity?: number;
  /** For fixed systems: bed capacity per unit (sick bay) */
  bedCapacity?: number;
  /** For fixed systems: hangar capacity in HP of embarked craft per unit */
  hangarCapacity?: number;
  /** For fixed systems: docking clamp capacity in HP of embarked craft per unit */
  dockCapacity?: number;
  /** For fixed systems: ordnance capacity in size points per unit */
  ordnanceCapacity?: number;
  /** For fixed systems: fuel collection capacity in HP fuel per day per unit */
  fuelCollectionCapacity?: number;
  /** For fixed systems: power points storage capacity per unit */
  powerPointsCapacity?: number;
  /** For fixed systems: troop capacity per unit (boarding pod) */
  troopCapacity?: number;
  /** For coverage systems: HP of hull covered per HP of system (e.g., security suite) */
  coveragePerHullPoint?: number;
  /** For cargo service systems: HP of cargo serviced per unit (e.g., autocargo) */
  cargoServiceCapacity?: number;
  /** Whether this system uses a percentage of hull */
  hullPercentage?: number;
  /** Minimum quantity/HP required */
  minQuantity?: number;
  /** Maximum quantity allowed */
  maxQuantity?: number;
  /** Base HP for scalable evac systems (used in capacity calculation) */
  baseHullPoints?: number;
  /** Effect or bonus provided */
  effect?: string;
  /** Detailed description */
  description: string;
}

// ============== Installed System ==============

export interface InstalledHangarMiscSystem extends InstalledSystemBase<HangarMiscSystemType> {
  /** Calculated capacity (for hangars, cargo, etc.) */
  capacity?: number;
  /** Calculated service capacity (for autocargo, etc.) */
  serviceCapacity?: number;
}

// ============== Stats ==============

export interface HangarMiscStats extends PowerConsumingStats {
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
