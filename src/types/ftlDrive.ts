import type { ProgressLevel, TechTrack } from './common';
import type { ShipClass } from './hull';

// Re-export for convenience
export type { ProgressLevel, TechTrack, ShipClass };

/**
 * FTL rating at different hull percentage allocations
 * The meaning varies by drive type (light-years/day, light-years/jump, etc.)
 */
export interface FTLRatings {
  /** FTL rating at 5% hull allocation */
  at5Percent: number | null;
  /** FTL rating at 10% hull allocation */
  at10Percent: number | null;
  /** FTL rating at 15% hull allocation */
  at15Percent: number | null;
  /** FTL rating at 20% hull allocation */
  at20Percent: number | null;
  /** FTL rating at 30% hull allocation */
  at30Percent: number | null;
  /** FTL rating at 40% hull allocation */
  at40Percent: number | null;
  /** FTL rating at 50% hull allocation */
  at50Percent: number | null;
}

/**
 * FTL Drive type definition from the Warships sourcebook
 */
export interface FTLDriveType {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Progress Level required */
  progressLevel: ProgressLevel;
  
  /** Technology tracks required (empty array means no special tech needed) */
  techTracks: TechTrack[];
  
  /** Power required per hull point of drive */
  powerPerHullPoint: number;
  
  /** Whether this drive requires a specific power plant type */
  requiresPowerPlantType?: string;
  
  /** Minimum size in hull points (absolute minimum) */
  minSize: number;
  
  /** 
   * Whether the drive has a fixed size (percentage of hull). 
   * If true, the drive cannot be resized - it's always exactly hullPercentage% of the hull.
   * If false, the drive can be resized starting from hullPercentage% minimum.
   */
  isFixedSize: boolean;
  
  /** 
   * Hull percentage for the drive.
   * If isFixedSize is true: the exact percentage of hull the drive occupies.
   * If isFixedSize is false: the minimum percentage of hull required.
   */
  hullPercentage: number;
  
  /** Base cost for the drive installation */
  baseCost: number;
  
  /** Cost per hull point of the drive */
  costPerHullPoint: number;
  
  /** FTL ratings at different hull percentage allocations (if applicable) */
  ftlRatings?: FTLRatings;
  
  /** Performance unit label (e.g., "LY/day", "LY/jump", "variable") */
  performanceUnit: string;
  
  /** Description of the drive */
  description: string;
  
  /** Special notes about the drive */
  notes?: string;
  
  /** Whether fuel is required */
  requiresFuel?: boolean;
  
  /** Cost per hull point of fuel (if fuel required) */
  fuelCostPerHullPoint?: number;
  
  /** Minimum fuel tank size as percentage of hull (if fuel required) */
  minFuelHullPercentage?: number;
  
  /** Fuel efficiency description or factor (optional) */
  fuelEfficiencyNote?: string;
}

/**
 * An installed FTL fuel tank on a ship
 */
export interface InstalledFTLFuelTank {
  /** Unique ID for this fuel tank installation */
  id: string;
  
  /** The FTL drive type this fuel is for */
  forFTLDriveType: FTLDriveType;
  
  /** Size in hull points */
  hullPoints: number;
}

/**
 * An installed FTL drive on a ship
 */
export interface InstalledFTLDrive {
  /** Unique installation ID */
  id: string;
  
  /** The FTL drive type */
  type: FTLDriveType;
  
  /** Hull points allocated to this drive */
  hullPoints: number;
}
