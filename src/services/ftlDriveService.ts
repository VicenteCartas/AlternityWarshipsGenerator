import type { FTLDriveType, InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
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
      // If upper value is null, return lower value (or null if also null)
      if (upper.value === null) return lower.value;
      // If lower value is null, treat it as 0 for interpolation
      const lowerValue = lower.value ?? 0;
      
      // Linear interpolation
      const ratio = (percentage - lower.pct) / (upper.pct - lower.pct);
      return lowerValue + ratio * (upper.value - lowerValue);
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
 * Check if a drive has a fixed size (cannot be resized)
 */
export function isFixedSizeDrive(drive: FTLDriveType): boolean {
  return drive.isFixedSize;
}

/**
 * Calculate the hull points for a fixed-size drive
 */
export function calculateFixedSizeHullPoints(drive: FTLDriveType, hull: Hull): number {
  const percentageHP = Math.ceil((drive.hullPercentage / 100) * hull.hullPoints);
  return Math.max(drive.minSize, percentageHP);
}

/**
 * Calculate the minimum hull points required for a drive
 */
export function calculateMinHullPointsForDrive(drive: FTLDriveType, hull: Hull): number {
  // Both fixed and variable drives use hullPercentage
  // For fixed: it's the exact size, for variable: it's the minimum
  const percentageHP = Math.ceil((drive.hullPercentage / 100) * hull.hullPoints);
  return Math.max(drive.minSize, percentageHP);
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

// ============== FTL Fuel Tank Functions ==============

/**
 * Generate a unique FTL fuel tank ID
 */
let ftlFuelTankCounter = 0;
export function generateFTLFuelTankId(): string {
  return `ftl-fuel-${Date.now()}-${++ftlFuelTankCounter}`;
}

/**
 * Calculate the minimum fuel tank HP required for a drive
 */
export function calculateMinFuelTankHP(driveType: FTLDriveType, hull: Hull): number {
  if (!driveType.minFuelHullPercentage) return 1;
  return Math.max(1, Math.ceil((driveType.minFuelHullPercentage / 100) * hull.hullPoints));
}

/**
 * Calculate the cost of an FTL fuel tank
 */
export function calculateFTLFuelTankCost(driveType: FTLDriveType, hullPoints: number): number {
  if (!driveType.fuelCostPerHullPoint) return 0;
  return driveType.fuelCostPerHullPoint * hullPoints;
}

/**
 * Get total fuel tank HP for a specific FTL drive type
 */
export function getTotalFTLFuelTankHP(
  fuelTanks: InstalledFTLFuelTank[],
  driveTypeId: string
): number {
  return fuelTanks
    .filter((tank) => tank.forFTLDriveType.id === driveTypeId)
    .reduce((sum, tank) => sum + tank.hullPoints, 0);
}

/**
 * Calculate total FTL fuel tank stats
 */
export function calculateTotalFTLFuelTankStats(
  fuelTanks: InstalledFTLFuelTank[]
): {
  totalHullPoints: number;
  totalCost: number;
} {
  let totalHullPoints = 0;
  let totalCost = 0;
  
  for (const tank of fuelTanks) {
    totalHullPoints += tank.hullPoints;
    totalCost += calculateFTLFuelTankCost(tank.forFTLDriveType, tank.hullPoints);
  }
  
  return {
    totalHullPoints,
    totalCost,
  };
}

/**
 * Calculate Jump Drive max distance based on fuel tank percentage of hull.
 * Jump Drive: 1 LY per 5% of hull in fuel, minimum 1 LY (5%), maximum 10 LY (50%).
 * Uses linear interpolation based on the ftlRatings table.
 */
export function calculateJumpDriveMaxDistance(
  driveType: FTLDriveType,
  fuelTankHP: number,
  hullHP: number
): number | null {
  if (!driveType.requiresFuel || !driveType.ftlRatings) return null;
  if (fuelTankHP <= 0 || hullHP <= 0) return 0;
  
  const fuelPercentage = (fuelTankHP / hullHP) * 100;
  return getFTLRatingForPercentage(driveType, fuelPercentage);
}
