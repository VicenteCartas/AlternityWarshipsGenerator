import type { FTLDriveType, InstalledFTLDrive } from '../types/ftlDrive';
import type { Hull } from '../types/hull';
import { getFTLDrivesData } from './dataLoader';

/**
 * Get all FTL drive types
 */
export function getAllFTLDriveTypes(): FTLDriveType[] {
  return getFTLDrivesData();
}

/**
 * Calculate hull percentage for an FTL drive installation
 */
export function calculateFTLHullPercentage(hull: Hull, driveHullPoints: number): number {
  return (driveHullPoints / hull.hullPoints) * 100;
}

/**
 * Get FTL rating based on hull percentage (with linear interpolation)
 */
export function getFTLRatingForPercentage(
  drive: FTLDriveType,
  percentage: number
): number | null {
  if (!drive.ftlRatings) return null;
  
  const ratings = drive.ftlRatings;
  
  // Below 5% - no rating
  if (percentage < 5) return null;
  
  // At or above 50% - cap at 50% value
  if (percentage >= 50) return ratings.at50Percent;
  
  // Define breakpoints and their values
  const breakpoints = [
    { pct: 5, value: ratings.at5Percent },
    { pct: 10, value: ratings.at10Percent },
    { pct: 15, value: ratings.at15Percent },
    { pct: 20, value: ratings.at20Percent },
    { pct: 30, value: ratings.at30Percent },
    { pct: 40, value: ratings.at40Percent },
    { pct: 50, value: ratings.at50Percent },
  ];
  
  // Find the two breakpoints to interpolate between
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const lower = breakpoints[i];
    const upper = breakpoints[i + 1];
    if (percentage >= lower.pct && percentage < upper.pct) {
      // If either value is null, return the non-null one or null
      if (lower.value === null) return null;
      if (upper.value === null) return lower.value;
      
      // Linear interpolation
      const ratio = (percentage - lower.pct) / (upper.pct - lower.pct);
      return lower.value + ratio * (upper.value - lower.value);
    }
  }
  
  return null;
}

/**
 * Calculate power required for an FTL drive installation
 */
export function calculateFTLPowerRequired(drive: FTLDriveType, hullPoints: number): number {
  return Math.ceil(drive.powerPerHullPoint * hullPoints);
}

/**
 * Calculate cost for an FTL drive installation
 */
export function calculateFTLCost(drive: FTLDriveType, hullPoints: number): number {
  return drive.baseCost + (drive.costPerHullPoint * hullPoints);
}

/**
 * Calculate the minimum hull points required for a drive based on fixed percentage
 */
export function calculateMinHullPointsForDrive(drive: FTLDriveType, hull: Hull): number {
  if (drive.fixedHullPercentage) {
    const percentageHP = Math.ceil((drive.fixedHullPercentage / 100) * hull.hullPoints);
    return Math.max(drive.minSize, percentageHP);
  }
  return drive.minSize;
}

/**
 * Calculate total FTL stats for installed drive
 */
export function calculateTotalFTLStats(
  installedDrive: InstalledFTLDrive | null,
  hull: Hull
): {
  totalHullPoints: number;
  totalPowerRequired: number;
  totalCost: number;
  ftlRating: number | null;
  hullPercentage: number;
} {
  if (!installedDrive) {
    return {
      totalHullPoints: 0,
      totalPowerRequired: 0,
      totalCost: 0,
      ftlRating: null,
      hullPercentage: 0,
    };
  }
  
  const hullPercentage = calculateFTLHullPercentage(hull, installedDrive.hullPoints);
  
  return {
    totalHullPoints: installedDrive.hullPoints,
    totalPowerRequired: calculateFTLPowerRequired(installedDrive.type, installedDrive.hullPoints),
    totalCost: calculateFTLCost(installedDrive.type, installedDrive.hullPoints),
    ftlRating: getFTLRatingForPercentage(installedDrive.type, hullPercentage),
    hullPercentage,
  };
}

/**
 * Validate an FTL drive installation
 */
export function validateFTLInstallation(
  drive: FTLDriveType,
  hullPoints: number,
  hull: Hull
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check minimum size
  const minHP = calculateMinHullPointsForDrive(drive, hull);
  if (hullPoints < minHP) {
    if (drive.fixedHullPercentage) {
      errors.push(`${drive.name} requires at least ${minHP} hull points (${drive.fixedHullPercentage}% of hull).`);
    } else {
      errors.push(`${drive.name} requires a minimum of ${minHP} hull points.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a unique installation ID
 */
export function generateFTLInstallationId(): string {
  return `ftl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format FTL rating for display
 */
export function formatFTLRating(rating: number | null, unit: string): string {
  if (rating === null) return 'Variable';
  // Round to 1 decimal place if needed
  const displayRating = Number.isInteger(rating) ? rating : rating.toFixed(1);
  return `${displayRating} ${unit}`;
}
