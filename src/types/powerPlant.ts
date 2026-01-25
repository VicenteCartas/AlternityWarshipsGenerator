import type { ProgressLevel, TechTrack } from './common';
import type { ShipClass } from './hull';

// Re-export for convenience
export type { ProgressLevel, TechTrack, ShipClass };

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
  
  /** Maximum size in hull points (0 = no maximum) */
  maxSize: number;
  
  /** Whether fuel is required */
  requiresFuel: boolean;
  
  /** Cost per hull point of fuel (if fuel required) */
  fuelCostPerHullPoint: number;
  
  /** Efficiency: power-days per hull point of fuel */
  fuelEfficiency: number;
  
  /** Description of the power plant */
  description: string;
  
  /** Minimum ship class that can use this power plant */
  minShipClass: ShipClass;
}

/**
 * An installed power plant on a ship
 */
export interface InstalledPowerPlant {
  /** Unique ID for this installation */
  installationId: string;
  
  /** The power plant type */
  type: PowerPlantType;
  
  /** Size in hull points */
  hullPoints: number;
  
  /** Fuel tank size in hull points (0 if no fuel required) */
  fuelHullPoints: number;
}

/**
 * Calculated values for an installed power plant
 */
export interface PowerPlantStats {
  /** Total power generated */
  powerGenerated: number;
  
  /** Total hull points used (power plant + fuel) */
  totalHullPoints: number;
  
  /** Total cost (power plant + fuel) */
  totalCost: number;
  
  /** Endurance in days (if fuel required) */
  enduranceDays: number | null;
}
