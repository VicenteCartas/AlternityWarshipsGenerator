import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  DefenseSystemType,
  InstalledDefenseSystem,
  DefenseStats,
} from '../types/defense';

// ============== Data Loading ==============

let defenseSystemTypes: DefenseSystemType[] = [];

export function loadDefenseSystemsData(data: {
  defenseSystems: DefenseSystemType[];
}): void {
  defenseSystemTypes = data.defenseSystems;
}

// ============== Getters ==============

export function getAllDefenseSystemTypes(): DefenseSystemType[] {
  return defenseSystemTypes;
}

export function getDefenseSystemTypeById(id: string): DefenseSystemType | undefined {
  return defenseSystemTypes.find((t) => t.id === id);
}

// ============== Filtering ==============

export function filterByDesignConstraints(
  items: DefenseSystemType[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): DefenseSystemType[] {
  return items.filter((item) => {
    // Filter by progress level
    if (item.progressLevel > designProgressLevel) {
      return false;
    }
    // Filter by tech tracks (if any are selected)
    if (designTechTracks.length > 0 && item.techTracks.length > 0) {
      // Item needs at least one of its tech tracks to be available
      const hasAllowedTech = item.techTracks.some((track) =>
        designTechTracks.includes(track)
      );
      if (!hasAllowedTech) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => a.progressLevel - b.progressLevel);
}

// ============== ID Generation ==============

let defenseCounter = 0;

export function generateDefenseId(): string {
  return `def-${Date.now()}-${++defenseCounter}`;
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
  if (type.hullPercentage) {
    // Hull points are a percentage of ship hull
    return Math.ceil((type.hullPoints / 100) * shipHullPoints);
  }
  return type.hullPoints * quantity;
}

/**
 * Calculate the power required for a defense system based on ship hull points
 */
export function calculateDefensePower(
  type: DefenseSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  if (type.powerPerHull) {
    // Power is per hull point of the ship
    return type.powerRequired * shipHullPoints;
  }
  return type.powerRequired * quantity;
}

/**
 * Calculate the cost for a defense system based on ship hull points
 */
export function calculateDefenseCost(
  type: DefenseSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  if (type.costPerHull) {
    // Cost is per hull point of the ship
    return type.cost * shipHullPoints;
  }
  return type.cost * quantity;
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
  installedDefenses: InstalledDefenseSystem[],
  _shipHullPoints: number
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
      case 'repair':
        // Parse damage check bonus from effect string (e.g., "-2 step bonus to Damage Checks")
        const match = type.effect.match(/-(\d+)\s*step/i);
        if (match) {
          damageCheckBonus += parseInt(match[1], 10);
        }
        break;
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
