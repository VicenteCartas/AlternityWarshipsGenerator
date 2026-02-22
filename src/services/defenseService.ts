import type {
  DefenseSystemType,
  InstalledDefenseSystem,
  DefenseStats,
} from '../types/defense';
import { generateId } from './utilities';
import { getDefenseSystemsData } from './dataLoader';

// ============== Getters ==============

export function getAllDefenseSystemTypes(): DefenseSystemType[] {
  return getDefenseSystemsData();
}

export function getDefenseSystemTypeById(id: string): DefenseSystemType | undefined {
  return getAllDefenseSystemTypes().find((t) => t.id === id);
}

// ============== ID Generation ==============

export function generateDefenseId(): string {
  return generateId('def');
}

// ============== Calculations ==============

/**
 * Calculate the hull points required for a defense system based on ship hull points
 */
export function calculateDefenseHullPoints(
  type: DefenseSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  if (type.hullPercentage > 0) {
    // Hull points are a percentage of ship hull
    return Math.ceil((type.hullPercentage / 100) * shipHullPoints);
  }
  // For coverageMultiples, each quantity = one full coverage set
  const effectiveUnits = type.coverageMultiples
    ? quantity * calculateUnitsForFullCoverage(type, shipHullPoints)
    : quantity;
  return type.hullPoints * effectiveUnits;
}

/**
 * Calculate the power required for a defense system based on ship hull points
 */
export function calculateDefensePower(
  type: DefenseSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  // For coverageMultiples, each quantity = one full coverage set
  const effectiveUnits = type.coverageMultiples
    ? quantity * calculateUnitsForFullCoverage(type, shipHullPoints)
    : quantity;
  if (type.powerPer === 'systemHp') {
    // Power is per hull point of the SYSTEM, not the ship
    // For percentage-based systems (like repair bots), use the system's HP
    if (type.hullPercentage > 0) {
      const systemHullPoints = Math.ceil((type.hullPercentage / 100) * shipHullPoints);
      return type.powerRequired * systemHullPoints;
    }
    // For fixed HP systems, use the system's HP * quantity
    return type.powerRequired * type.hullPoints * effectiveUnits;
  }
  return type.powerRequired * effectiveUnits;
}

/**
 * Calculate the cost for a defense system based on ship hull points
 */
export function calculateDefenseCost(
  type: DefenseSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  // For coverageMultiples, each quantity = one full coverage set
  const effectiveUnits = type.coverageMultiples
    ? quantity * calculateUnitsForFullCoverage(type, shipHullPoints)
    : quantity;
  if (type.costPer === 'systemHp') {
    // Cost is per hull point of the system itself (not the ship)
    if (type.hullPercentage > 0) {
      const systemHullPoints = Math.ceil((type.hullPercentage / 100) * shipHullPoints);
      return type.cost * systemHullPoints;
    }
    return type.cost * type.hullPoints * effectiveUnits;
  }
  return type.cost * effectiveUnits;
}

/**
 * Calculate how many units are needed to cover the entire hull
 */
export function calculateUnitsForFullCoverage(
  type: DefenseSystemType,
  shipHullPoints: number
): number {
  if (type.coverage === 0) {
    return 1; // Systems without coverage (like repair systems) need just 1
  }
  return Math.ceil(shipHullPoints / type.coverage);
}

/**
 * Calculate total coverage provided by installed units
 */
export function calculateTotalCoverage(
  type: DefenseSystemType,
  quantity: number
): number {
  return type.coverage * quantity;
}

// ============== Stats Calculation ==============

export function calculateDefenseStats(
  installedDefenses: InstalledDefenseSystem[]
): DefenseStats {
  let totalHullPoints = 0;
  let totalPowerRequired = 0;
  let totalCost = 0;
  let screenCoverage = 0;
  let countermeasureCoverage = 0;
  let totalShieldPoints = 0;
  let damageCheckBonus = 0;
  let activeScreenType: string | null = null;

  for (const defense of installedDefenses) {
    totalHullPoints += defense.hullPoints;
    totalPowerRequired += defense.powerRequired;
    totalCost += defense.cost;

    const type = defense.type;
    const coverage = calculateTotalCoverage(type, defense.quantity);

    switch (type.category) {
      case 'screen':
        screenCoverage += coverage;
        if (!activeScreenType) {
          activeScreenType = type.name;
        }
        break;
      case 'countermeasure':
        countermeasureCoverage += coverage;
        break;
      case 'repair': {
        damageCheckBonus += type.damageCheckBonus;
        break;
      }
      case 'shield-component':
        if (type.shieldPoints) {
          totalShieldPoints += type.shieldPoints * defense.quantity;
        }
        break;
    }
  }

  return {
    totalHullPoints,
    totalPowerRequired,
    totalCost,
    screenCoverage,
    countermeasureCoverage,
    totalShieldPoints,
    damageCheckBonus,
    hasActiveScreen: activeScreenType !== null,
    activeScreenType,
  };
}

/**
 * Check if adding a new screen type would conflict with existing screens
 */
export function hasScreenConflict(
  installedDefenses: InstalledDefenseSystem[],
  newType: DefenseSystemType
): boolean {
  if (newType.category !== 'screen') {
    return false;
  }

  // Check if any existing screen is installed
  for (const defense of installedDefenses) {
    if (defense.type.category === 'screen' && defense.type.id !== newType.id) {
      return true;
    }
  }

  return false;
}

/**
 * Get the names of all currently installed screen types
 */
export function getInstalledScreenNames(
  installedDefenses: InstalledDefenseSystem[]
): string[] {
  return installedDefenses
    .filter((defense) => defense.type.category === 'screen')
    .map((defense) => defense.type.name);
}

/**
 * Get the name of the currently active screen type
 */
export function getActiveScreenTypeName(
  installedDefenses: InstalledDefenseSystem[]
): string | null {
  for (const defense of installedDefenses) {
    if (defense.type.category === 'screen') {
      return defense.type.name;
    }
  }
  return null;
}
