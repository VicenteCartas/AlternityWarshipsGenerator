import type { ProgressLevel, TechTrack } from './common';
import type { ShipClass } from './hull';

// Re-export for convenience
export type { ProgressLevel, TechTrack, ShipClass };

/**
 * Fuel tank type definition (the generic fuel tank, not an installation)
 */
export interface FuelTankType {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Progress Level required */
  progressLevel: ProgressLevel;
  
  /** Technology tracks required (empty array means no special tech needed) */
  techTracks: TechTrack[];
  
  /** Base cost for each fuel tank installed */
  baseCost: number;
  
  /** Cost per hull point of the fuel tank */
  costPerHullPoint: number;
  
  /** Minimum size in hull points (0 = no minimum) */
  minSize: number;
  
  /** Description */
  description: string;
}

/**
 * Power plant type definition
 */
export interface PowerPlantType {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Progress Level required */
  progressLevel: ProgressLevel;
  
  /** Technology tracks required (empty array means no special tech needed) */
  techTracks: TechTrack[];
  
  /** Power produced per hull point */
  powerPerHullPoint: number;
  
  /** Base cost for each power plant installed */
  baseCost: number;
  
  /** Cost per hull point of the power plant */
  costPerHullPoint: number;
  
  /** Minimum size in hull points */
  minSize: number;
  
  /** Whether fuel is required */
  requiresFuel: boolean;
  
  /** Cost per hull point of fuel (if fuel required) */
  fuelCostPerHullPoint: number;
  
  /** Efficiency: power-days per hull point of fuel */
  fuelEfficiency: number;
  
  /** Description of the power plant */
  description: string;
}

/**
 * An installed power plant on a ship
 */
export interface InstalledPowerPlant {
  /** Unique ID for this installation */
  id: string;
  
  /** The power plant type */
  type: PowerPlantType;
  
  /** Size in hull points */
  hullPoints: number;
}

/**
 * An installed fuel tank on a ship
 */
export interface InstalledFuelTank {
  /** Unique ID for this fuel tank installation */
  id: string;
  
  /** The power plant type this fuel is for (determines fuel cost and efficiency) */
  forPowerPlantType: PowerPlantType;
  
  /** Size in hull points */
  hullPoints: number;
}

/**
 * Calculated values for an installed power plant
 */
export interface PowerPlantStats {
  /** Total power generated */
  powerGenerated: number;
  
  /** Total hull points used */
  totalHullPoints: number;
  
  /** Total cost */
  totalCost: number;
}
