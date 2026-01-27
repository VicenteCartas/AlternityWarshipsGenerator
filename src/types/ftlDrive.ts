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
 * FTL Drive performance type - how the drive's speed is measured
 */
export type FTLPerformanceType = 
  | 'ly-per-day'       // Light-years per day (Hyperdrive)
  | 'ly-per-hour'      // Light-years per hour (Warpdrive)
  | 'ly-per-jump'      // Light-years per jump (Jump Drive - fuel-based)
  | 'ly-per-power'     // Light-years per power point (Spacefold)
  | 'fixed-distance'   // Fixed distance based on ship class (Stardrive, Drivewave)
  | 'variable'         // Variable/special (Wormhole, Gate, Psionic drives)
  ;

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
  
  /** Minimum size in hull points */
  minSize: number;
  
  /** Whether size is fixed as percentage of hull (e.g., 5%, 10%) */
  fixedHullPercentage?: number;
  
  /** Base cost for the drive installation */
  baseCost: number;
  
  /** Cost per hull point of the drive */
  costPerHullPoint: number;
  
  /** How the FTL performance is measured */
  performanceType: FTLPerformanceType;
  
  /** FTL ratings at different hull percentage allocations (if applicable) */
  ftlRatings?: FTLRatings;
  
  /** Performance unit label (e.g., "LY/day", "LY/jump") */
  performanceUnit: string;
  
  /** Description of the drive */
  description: string;
  
  /** Special notes about the drive */
  notes?: string;
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
