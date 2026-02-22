import type { EngineType, InstalledEngine, InstalledEngineFuelTank, EngineStats, AccelerationRatings } from '../types/engine';
import type { Hull } from '../types/hull';
import { getEnginesData, getFuelTankData } from './dataLoader';
import { generateId, interpolateByPercentage, validateMinSize, validateFuelTank } from './utilities';

/**
 * Get all engine types
 */
export function getAllEngineTypes(): EngineType[] {
  return getEnginesData();
}

/**
 * Get engine types available for a specific ship class
 * Note: Currently all engines are available for all ship classes
 */

export function getEngineTypesForShipClass(): EngineType[] {
  return getAllEngineTypes();
}

/**
 * Get an engine type by ID
 */
export function getEngineTypeById(id: string): EngineType | undefined {
  return getAllEngineTypes().find((engine) => engine.id === id);
}

/**
 * Calculate the hull percentage for an engine installation
 */
export function calculateHullPercentage(hull: Hull, engineHullPoints: number): number {
  // Use base hull points (not bonus) for percentage calculations
  return (engineHullPoints / hull.hullPoints) * 100;
}

/**
 * Get acceleration rating based on hull percentage
 * Interpolates linearly between breakpoints (0%, 5%, 10%, 15%, 20%, 30%, 40%, 50%)
 * Below 5% interpolates between 0 and 5% value, at or above 50% returns the 50% value
 */
export function getAccelerationForPercentage(
  ratings: AccelerationRatings,
  percentage: number
): number {
  return interpolateByPercentage(ratings, percentage, 'interpolate-from-zero') ?? 0;
}

/**
 * Calculate power required for an engine installation
 */
export function calculateEnginePowerRequired(engine: EngineType, hullPoints: number): number {
  return Math.ceil(engine.powerPerHullPoint * hullPoints);
}

/**
 * Calculate cost for an engine installation
 */
export function calculateEngineCost(engine: EngineType, hullPoints: number): number {
  return engine.baseCost + (engine.costPerHullPoint * hullPoints);
}

/**
 * Calculate total cost for an engine fuel tank installation
 * Cost = tank base cost + tank cost per HP + fuel cost per HP (from engine type)
 */
export function calculateEngineFuelTankCost(forEngineType: EngineType, hullPoints: number): number {
  const fuelTankType = getFuelTankData();
  const tankCost = fuelTankType.baseCost + (fuelTankType.costPerHullPoint * hullPoints);
  const fuelCost = forEngineType.fuelCostPerHullPoint * hullPoints;
  return tankCost + fuelCost;
}

/**
 * Calculate endurance in thrust-days for an engine fuel tank
 * Fuel efficiency is thrust-days per hull point of fuel for a 1-HP engine
 * Larger engines burn fuel faster proportionally
 */
export function calculateEngineFuelTankEndurance(
  forEngineType: EngineType,
  fuelTankHullPoints: number,
  engineHullPoints: number
): number {
  if (engineHullPoints === 0) return 0;
  // Fuel efficiency is for a 1-HP engine
  // Larger engines burn fuel proportionally faster
  const thrustDaysPerFuelHP = forEngineType.fuelEfficiency / engineHullPoints;
  return Math.floor(thrustDaysPerFuelHP * fuelTankHullPoints);
}

/**
 * Get total fuel tank HP for a specific engine type
 */
export function getTotalEngineFuelTankHPForEngineType(
  fuelTanks: InstalledEngineFuelTank[],
  engineTypeId: string
): number {
  return fuelTanks
    .filter(tank => tank.forEngineType.id === engineTypeId)
    .reduce((sum, tank) => sum + tank.hullPoints, 0);
}

/**
 * Get total engine HP for a specific engine type
 */
export function getTotalEngineHPForEngineType(
  engines: InstalledEngine[],
  engineTypeId: string
): number {
  return engines
    .filter(engine => engine.type.id === engineTypeId)
    .reduce((sum, engine) => sum + engine.hullPoints, 0);
}

/**
 * Get total fuel tank HP across all engine fuel tanks
 */
export function getTotalEngineFuelTankHP(fuelTanks: InstalledEngineFuelTank[]): number {
  return fuelTanks.reduce((sum, tank) => sum + tank.hullPoints, 0);
}

/**
 * Check if any installed engine requires fuel
 */
export function hasFuelRequiringEngines(installations: InstalledEngine[]): boolean {
  return installations.some(inst => inst.type.requiresFuel);
}

/**
 * Get installed engines that require fuel
 */
export function getFuelRequiringInstallations(installations: InstalledEngine[]): InstalledEngine[] {
  return installations.filter(inst => inst.type.requiresFuel);
}

/**
 * Get unique engine types that require fuel (from installed engines)
 */
export function getUniqueFuelRequiringEngineTypes(installations: InstalledEngine[]): EngineType[] {
  const uniqueTypes = new Map<string, EngineType>();
  for (const inst of installations) {
    if (inst.type.requiresFuel && !uniqueTypes.has(inst.type.id)) {
      uniqueTypes.set(inst.type.id, inst.type);
    }
  }
  return Array.from(uniqueTypes.values());
}

/**
 * Calculate total stats for an installed engine
 */
export function calculateEngineStats(installation: InstalledEngine, hull: Hull): EngineStats {
  const { type, hullPoints } = installation;
  
  const hullPercentage = calculateHullPercentage(hull, hullPoints);
  const acceleration = getAccelerationForPercentage(type.accelerationRatings, hullPercentage);
  
  return {
    powerRequired: calculateEnginePowerRequired(type, hullPoints),
    totalHullPoints: hullPoints,
    totalCost: calculateEngineCost(type, hullPoints),
    hullPercentage,
    acceleration,
  };
}

/**
 * Calculate total stats for all installed engines and fuel tanks
 */
export function calculateTotalEngineStats(
  installations: InstalledEngine[],
  fuelTanks: InstalledEngineFuelTank[],
  hull: Hull
): {
  totalPowerRequired: number;
  totalHullPoints: number;
  totalCost: number;
  totalAcceleration: number;
} {
  let totalPowerRequired = 0;
  let totalHullPoints = 0;
  let totalCost = 0;
  let totalAcceleration = 0;
  
  // Add engine stats
  for (const installation of installations) {
    const stats = calculateEngineStats(installation, hull);
    totalPowerRequired += stats.powerRequired;
    totalHullPoints += stats.totalHullPoints;
    totalCost += stats.totalCost;
    totalAcceleration += stats.acceleration;
  }
  
  // Add fuel tank stats
  for (const tank of fuelTanks) {
    totalHullPoints += tank.hullPoints;
    totalCost += calculateEngineFuelTankCost(tank.forEngineType, tank.hullPoints);
  }
  
  return {
    totalPowerRequired,
    totalHullPoints,
    totalCost,
    totalAcceleration,
  };
}

/**
 * Validate an engine installation
 */
export function validateEngineInstallation(
  engine: EngineType,
  hullPoints: number
): { valid: boolean; errors: string[] } {
  return validateMinSize(engine.name, hullPoints, engine.minSize);
}

/**
 * Validate an engine fuel tank installation
 */
export function validateEngineFuelTankInstallation(
  hullPoints: number,
  hull: Hull,
  usedHullPoints: number
): { valid: boolean; errors: string[] } {
  return validateFuelTank(hullPoints, hull, usedHullPoints);
}

/**
 * Validate all engine installations together (design-level validation)
 */
export function validateEngineDesign(
  installations: InstalledEngine[],
  fuelTanks: InstalledEngineFuelTank[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if fuel-requiring engines exist without fuel tanks
  // Skip engines where fuel is optional (they can use power instead)
  const uniqueFuelRequiringTypes = getUniqueFuelRequiringEngineTypes(installations);
  
  for (const engineType of uniqueFuelRequiringTypes) {
    if (engineType.fuelOptional) continue; // Fuel is optional, no error needed
    const fuelTankHP = getTotalEngineFuelTankHPForEngineType(fuelTanks, engineType.id);
    if (fuelTankHP === 0) {
      errors.push(`Engine "${engineType.name}" requires fuel. Install at least one fuel tank for it.`);
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
export function generateEngineInstallationId(): string {
  return generateId('eng');
}

/**
 * Generate a unique installation ID for engine fuel tanks
 */
export function generateEngineFuelTankId(): string {
  return generateId('eft');
}

/**
 * Get the percentage bracket labels for display
 */
export function getPercentageBrackets(): string[] {
  return ['5%', '10%', '15%', '20%', '30%', '40%', '50%'];
}
