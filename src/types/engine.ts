import type { ProgressLevel, TechTrack } from './common';
import type { ShipClass } from './hull';

// Re-export for convenience
export type { ProgressLevel, TechTrack, ShipClass };

/**
 * Acceleration ratings at different hull percentage allocations
 * Values are in Mpp (megameters per phase per phase) unless noted
 */
export interface AccelerationRatings {
  /** Acceleration at 5% hull allocation */
  at5Percent: number;
  /** Acceleration at 10% hull allocation */
  at10Percent: number;
  /** Acceleration at 15% hull allocation */
  at15Percent: number;
  /** Acceleration at 20% hull allocation */
  at20Percent: number;
  /** Acceleration at 30% hull allocation */
  at30Percent: number;
  /** Acceleration at 40% hull allocation */
  at40Percent: number;
  /** Acceleration at 50% hull allocation */
  at50Percent: number;
}

/**
 * Engine type definition from the Warships sourcebook
 */
export interface EngineType {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Progress Level required */
  progressLevel: ProgressLevel;
  
  /** Technology tracks required (empty array means no special tech needed) */
  techTracks: TechTrack[];
  
  /** Power required per hull point of engine */
  powerPerHullPoint: number;
  
  /** Minimum size in hull points */
  minSize: number;
  
  /** Base cost for each engine installation */
  baseCost: number;
  
  /** Cost per hull point of the engine */
  costPerHullPoint: number;
  
  /** Acceleration ratings at different hull percentage allocations */
  accelerationRatings: AccelerationRatings;
  
  /** Whether this engine uses PL6 scale (slower, for early tech) */
  usesPL6Scale: boolean;
  
  /** Whether fuel is required */
  requiresFuel: boolean;
  
  /** Whether fuel is optional (can use power instead) */
  fuelOptional?: boolean;
  
  /** Fuel efficiency: thrust-days per hull point of fuel (for 1 HP engine) */
  fuelEfficiency: number;
  
  /** Cost per hull point of fuel (if fuel required) */
  fuelCostPerHullPoint: number;
  
  /** Description of the engine */
  description: string;
  
  /** Whether engine is safe for atmospheric use */
  atmosphereSafe: boolean;
  
  /** Special notes about the engine */
  notes?: string;
}

/**
 * An installed engine on a ship
 */
export interface InstalledEngine {
  /** Unique installation ID */
  id: string;
  
  /** The engine type */
  type: EngineType;
  
  /** Size in hull points */
  hullPoints: number;
}

/**
 * An installed fuel tank for an engine
 */
export interface InstalledEngineFuelTank {
  /** Unique ID for this fuel tank installation */
  id: string;
  
  /** The engine type this fuel is for (determines fuel cost and efficiency) */
  forEngineType: EngineType;
  
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Calculated stats for an installed engine
 */
export interface EngineStats {
  /** Total power required */
  powerRequired: number;
  
  /** Total hull points used (engine only, not fuel) */
  totalHullPoints: number;
  
  /** Total cost (engine only, not fuel) */
  totalCost: number;
  
  /** Hull percentage this engine represents */
  hullPercentage: number;
  
  /** Acceleration rating based on hull percentage */
  acceleration: number;
}
