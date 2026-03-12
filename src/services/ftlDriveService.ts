import type { FTLDriveType, FTLSubSystem, InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { Hull } from '../types/hull';
import { getFTLDrivesData } from './dataLoader';
import { getZoneLimitForHull } from './damageDiagramService';
import { generateId, interpolateByPercentage } from './utilities';

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
  return interpolateByPercentage(drive.ftlRatings, percentage, 'null');
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
    if (drive.isFixedSize && drive.hullPercentage) {
      errors.push(`${drive.name} requires at least ${minHP} hull points (${drive.hullPercentage}% of hull).`);
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
export function generateFTLDriveId(): string {
  return generateId('ftl');
}

// ============== Zone Limit / Split Helpers ==============

/**
 * Generate a unique FTL sub-system ID
 */
export function generateFTLSubSystemId(): string {
  return generateId('ftlsub');
}

/**
 * Check whether an FTL drive's total HP exceeds the zone limit for the given hull.
 */
export function doesFTLExceedZoneLimit(
  drive: InstalledFTLDrive,
  hullId: string
): boolean {
  const zoneLimit = getZoneLimitForHull(hullId);
  return drive.hullPoints > zoneLimit;
}

/**
 * Get the zone limit for a given hull, for display purposes.
 */
export function getZoneLimitForFTLWarning(hullId: string): number {
  return getZoneLimitForHull(hullId);
}

/**
 * Split an FTL drive into N equal sub-systems for zone assignment.
 * @param drive The installed FTL drive to split
 * @param splitCount Number of sections (2 or 4)
 * @returns Updated drive with subSystems populated
 */
export function splitFTLDrive(
  drive: InstalledFTLDrive,
  splitCount: 2 | 4
): InstalledFTLDrive {
  const totalHp = drive.hullPoints;
  const baseHp = Math.floor(totalHp / splitCount);
  const remainder = totalHp % splitCount;

  const subSystems: FTLSubSystem[] = [];
  for (let i = 0; i < splitCount; i++) {
    subSystems.push({
      id: generateFTLSubSystemId(),
      label: `Section ${i + 1}`,
      // Distribute remainder: first sub-systems get +1 HP each
      hullPoints: baseHp + (i < remainder ? 1 : 0),
    });
  }

  return { ...drive, subSystems };
}

/**
 * Remove the split from an FTL drive, reverting to a single system.
 */
export function unsplitFTLDrive(
  drive: InstalledFTLDrive
): InstalledFTLDrive {
  const { subSystems: _, ...rest } = drive;
  return rest as InstalledFTLDrive;
}

// ============== FTL Fuel Tank Functions ==============

/**
 * Generate a unique FTL fuel tank ID
 */
export function generateFTLFuelTankId(): string {
  return generateId('ftl-fuel');
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
