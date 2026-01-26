import type { EngineType, InstalledEngine, EngineStats, AccelerationRatings } from '../types/engine';
import type { Hull, ShipClass } from '../types/hull';
import { getEnginesData } from './dataLoader';

/**
 * Get all engine types
 */
export function getAllEngineTypes(): EngineType[] {
  return getEnginesData();
}

/**
 * Get engine types available for a specific ship class
 */
export function getEngineTypesForShipClass(shipClass: ShipClass): EngineType[] {
  const classOrder: ShipClass[] = ['small-craft', 'light', 'medium', 'heavy', 'super-heavy'];
  const classIndex = classOrder.indexOf(shipClass);
  
  return getAllEngineTypes().filter((engine) => {
    const minIndex = classOrder.indexOf(engine.minShipClass);
    return classIndex >= minIndex;
  });
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
 * Returns the acceleration for the nearest lower percentage bracket
 */
export function getAccelerationForPercentage(
  ratings: AccelerationRatings,
  percentage: number
): number {
  // Percentage brackets from the rulebook
  if (percentage >= 50) return ratings.at50Percent;
  if (percentage >= 40) return ratings.at40Percent;
  if (percentage >= 30) return ratings.at30Percent;
  if (percentage >= 20) return ratings.at20Percent;
  if (percentage >= 15) return ratings.at15Percent;
  if (percentage >= 10) return ratings.at10Percent;
  if (percentage >= 5) return ratings.at5Percent;
  return 0; // Below 5% - no meaningful acceleration
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
 * Calculate fuel cost for an engine
 */
export function calculateEngineFuelCost(engine: EngineType, fuelHullPoints: number): number {
  if (!engine.requiresFuel || fuelHullPoints === 0) return 0;
  return engine.fuelCostPerHullPoint * fuelHullPoints;
}

/**
 * Calculate endurance in thrust-days for an engine with fuel
 * Fuel efficiency is thrust-days per hull point of fuel for a 1-HP engine
 * Larger engines burn fuel faster proportionally
 */
export function calculateEngineEndurance(
  engine: EngineType,
  engineHullPoints: number,
  fuelHullPoints: number
): number | null {
  if (!engine.requiresFuel || fuelHullPoints === 0) return null;
  
  // Fuel efficiency is for a 1-HP engine
  // Larger engines burn fuel proportionally faster
  const thrustDaysPerFuelHP = engine.fuelEfficiency / engineHullPoints;
  return Math.floor(thrustDaysPerFuelHP * fuelHullPoints);
}

/**
 * Calculate total stats for an installed engine
 */
export function calculateEngineStats(installation: InstalledEngine, hull: Hull): EngineStats {
  const { type, hullPoints, fuelHullPoints } = installation;
  
  const hullPercentage = calculateHullPercentage(hull, hullPoints);
  const acceleration = getAccelerationForPercentage(type.accelerationRatings, hullPercentage);
  
  return {
    powerRequired: calculateEnginePowerRequired(type, hullPoints),
    totalHullPoints: hullPoints + fuelHullPoints,
    totalCost: calculateEngineCost(type, hullPoints) + calculateEngineFuelCost(type, fuelHullPoints),
    hullPercentage,
    acceleration,
    enduranceDays: calculateEngineEndurance(type, hullPoints, fuelHullPoints),
  };
}

/**
 * Calculate total stats for all installed engines
 */
export function calculateTotalEngineStats(installations: InstalledEngine[], hull: Hull): {
  totalPowerRequired: number;
  totalHullPoints: number;
  totalCost: number;
  totalAcceleration: number;
  minEnduranceDays: number | null;
} {
  let totalPowerRequired = 0;
  let totalHullPoints = 0;
  let totalCost = 0;
  let totalAcceleration = 0;
  let minEnduranceDays: number | null = null;
  
  for (const installation of installations) {
    const stats = calculateEngineStats(installation, hull);
    totalPowerRequired += stats.powerRequired;
    totalHullPoints += stats.totalHullPoints;
    totalCost += stats.totalCost;
    totalAcceleration += stats.acceleration;
    
    // Track minimum endurance (fuel-limited engines)
    if (stats.enduranceDays !== null) {
      if (minEnduranceDays === null || stats.enduranceDays < minEnduranceDays) {
        minEnduranceDays = stats.enduranceDays;
      }
    }
  }
  
  return {
    totalPowerRequired,
    totalHullPoints,
    totalCost,
    totalAcceleration,
    minEnduranceDays,
  };
}

/**
 * Validate an engine installation
 */
export function validateEngineInstallation(
  engine: EngineType,
  hullPoints: number,
  fuelHullPoints: number,
  hull: Hull,
  usedHullPoints: number,
  availablePower: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check minimum size
  if (hullPoints < engine.minSize) {
    errors.push(`${engine.name} requires a minimum of ${engine.minSize} hull points.`);
  }
  
  // Check ship class
  const classOrder: ShipClass[] = ['small-craft', 'light', 'medium', 'heavy', 'super-heavy'];
  const shipClassIndex = classOrder.indexOf(hull.shipClass);
  const minClassIndex = classOrder.indexOf(engine.minShipClass);
  if (shipClassIndex < minClassIndex) {
    errors.push(`${engine.name} cannot be installed on ${hull.shipClass} ships.`);
  }
  
  // Check available hull points
  const totalHullPointsNeeded = hullPoints + fuelHullPoints;
  const availableHullPoints = hull.hullPoints + hull.bonusHullPoints - usedHullPoints;
  if (totalHullPointsNeeded > availableHullPoints) {
    errors.push(`Not enough hull points available. Need ${totalHullPointsNeeded}, have ${availableHullPoints}.`);
  }
  
  // Check power requirement
  const powerRequired = calculateEnginePowerRequired(engine, hullPoints);
  if (powerRequired > availablePower) {
    errors.push(`Not enough power available. Need ${powerRequired}, have ${availablePower}.`);
  }
  
  // Check fuel requirement
  if (engine.requiresFuel && fuelHullPoints === 0) {
    errors.push(`${engine.name} requires fuel. Please allocate fuel hull points.`);
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
  return `eng-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format cost for display
 */
export function formatEngineCost(cost: number): string {
  if (cost >= 1_000_000_000) {
    return `$${(cost / 1_000_000_000).toFixed(1)}B`;
  } else if (cost >= 1_000_000) {
    return `$${(cost / 1_000_000).toFixed(1)}M`;
  } else if (cost >= 1_000) {
    return `$${(cost / 1_000).toFixed(0)}K`;
  }
  return `$${cost}`;
}

/**
 * Get the percentage bracket labels for display
 */
export function getPercentageBrackets(): string[] {
  return ['5%', '10%', '15%', '20%', '30%', '40%', '50%'];
}
