import type { ProgressLevel, TechTrack } from '../types/common';
import type { HangarMiscSystemType, InstalledHangarMiscSystem, HangarMiscStats } from '../types/hangarMisc';
import hangarMiscData from '../data/hangarMisc.json';

let hangarMiscSystemTypes: HangarMiscSystemType[] | null = null;

/**
 * Initialize hangar/misc data from JSON
 */
export function initializeHangarMiscData(data: typeof hangarMiscData): void {
  hangarMiscSystemTypes = data.hangarMiscSystems as HangarMiscSystemType[];
}

// Initialize with bundled data
initializeHangarMiscData(hangarMiscData);

/**
 * Get all hangar/misc system types
 */
export function getAllHangarMiscSystemTypes(): HangarMiscSystemType[] {
  return hangarMiscSystemTypes || [];
}

/**
 * Filter system types by design constraints (Progress Level and Tech Tracks)
 */
export function filterByDesignConstraints(
  systems: HangarMiscSystemType[],
  designPL: ProgressLevel,
  designTechTracks: TechTrack[]
): HangarMiscSystemType[] {
  return systems.filter((system) => {
    // Filter by Progress Level
    if (system.progressLevel > designPL) return false;
    // Filter by Tech Tracks:
    // - If designTechTracks is empty, show all components (no tech filtering)
    // - If system has no tech requirement, always show it
    // - If system has tech requirements, only show if all required techs are available
    if (designTechTracks.length > 0 && system.techTracks.length > 0) {
      const hasAllTechs = system.techTracks.every((tech) => designTechTracks.includes(tech));
      if (!hasAllTechs) return false;
    }
    return true;
  });
}

/**
 * Generate unique ID for an installed system
 */
export function generateHangarMiscId(): string {
  return `hangmisc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate hull points for a system installation
 */
export function calculateHangarMiscHullPoints(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  if (type.hullPercentage) {
    // Percentage-based systems (like stabilizer)
    return Math.ceil((shipHullPoints * type.hullPercentage) / 100) * quantity;
  }
  // Fixed or scalable systems
  return type.hullPoints * quantity;
}

/**
 * Calculate power required for a system installation
 */
export function calculateHangarMiscPower(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  if (type.hullPercentage) {
    // Power per HP for percentage-based systems
    const hullPts = Math.ceil((shipHullPoints * type.hullPercentage) / 100) * quantity;
    return type.powerRequired * hullPts;
  }
  return type.powerRequired * quantity;
}

/**
 * Calculate cost for a system installation
 */
export function calculateHangarMiscCost(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  if (type.costPerHull) {
    // Base cost + cost per hull point
    const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity);
    const base = type.baseCost || 0;
    return base + (type.cost * hullPts);
  }
  return type.cost * quantity;
}

/**
 * Calculate capacity for a system (hangars, cargo, etc.)
 */
export function calculateHangarMiscCapacity(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  // Fixed cargo capacity per unit (additive)
  if (type.cargoCapacity) {
    return type.cargoCapacity * quantity;
  }
  // Evacuation capacity - can be fixed per unit or scalable with extra HP
  if (type.evacCapacity) {
    if (type.evacCapacityPerHP) {
      // Scalable evac system: base capacity + extra capacity per HP beyond base
      // quantity = HP installed, baseHullPoints = minimum HP (4)
      // Base 4 HP = 40 people, each extra HP = 20 more people
      const baseHP = type.baseHullPoints || type.hullPoints;
      const extraHP = Math.max(0, quantity - baseHP);
      return type.evacCapacity + (extraHP * type.evacCapacityPerHP);
    }
    // Fixed evacuation capacity per unit (escape pods, reentry capsules)
    return type.evacCapacity * quantity;
  }
  // Fixed prisoners capacity per unit (brig)
  if (type.prisonersCapacity) {
    return type.prisonersCapacity * quantity;
  }
  // Fixed scientist capacity per unit (lab section)
  if (type.scientistCapacity) {
    return type.scientistCapacity * quantity;
  }
  // Fixed bed capacity per unit (sick bay)
  if (type.bedCapacity) {
    return type.bedCapacity * quantity;
  }
  // Fixed hangar capacity per unit
  if (type.hangarCapacity) {
    return type.hangarCapacity * quantity;
  }
  // Fixed docking clamp capacity per unit
  if (type.dockCapacity) {
    return type.dockCapacity * quantity;
  }
  // Fixed ordnance capacity per unit (magazine)
  if (type.ordnanceCapacity) {
    return type.ordnanceCapacity * quantity;
  }
  // Fixed fuel collection capacity per unit (fuel collector)
  if (type.fuelCollectionCapacity) {
    return type.fuelCollectionCapacity * quantity;
  }
  // Fixed power points storage capacity per unit (accumulator)
  if (type.powerPointsCapacity) {
    return type.powerPointsCapacity * quantity;
  }
  // Fixed troop capacity per unit (boarding pod)
  if (type.troopCapacity) {
    return type.troopCapacity * quantity;
  }
  // Coverage-based systems (security suite) - HP of hull covered per HP installed
  if (type.coveragePerHullPoint) {
    const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity);
    return hullPts * type.coveragePerHullPoint;
  }
  // HP-based capacity (hangars, docking clamps, magazines)
  if (type.capacityMultiplier) {
    const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity);
    return hullPts * type.capacityMultiplier;
  }
  return 0;
}

/**
 * Create an installed hangar/misc system
 */
export function createInstalledHangarMiscSystem(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number
): InstalledHangarMiscSystem {
  const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity);
  const power = calculateHangarMiscPower(type, shipHullPoints, quantity);
  const cost = calculateHangarMiscCost(type, shipHullPoints, quantity);
  const capacity = calculateHangarMiscCapacity(type, shipHullPoints, quantity);
  const serviceCapacity = type.cargoServiceCapacity ? type.cargoServiceCapacity * quantity : undefined;
  
  return {
    id: generateHangarMiscId(),
    type,
    quantity,
    hullPoints: hullPts,
    powerRequired: power,
    cost,
    capacity: capacity || undefined,
    serviceCapacity,
  };
}

/**
 * Update an installed hangar/misc system with new quantity
 */
export function updateInstalledHangarMiscSystem(
  installed: InstalledHangarMiscSystem,
  shipHullPoints: number,
  quantity: number
): InstalledHangarMiscSystem {
  const hullPts = calculateHangarMiscHullPoints(installed.type, shipHullPoints, quantity);
  const power = calculateHangarMiscPower(installed.type, shipHullPoints, quantity);
  const cost = calculateHangarMiscCost(installed.type, shipHullPoints, quantity);
  const capacity = calculateHangarMiscCapacity(installed.type, shipHullPoints, quantity);
  const serviceCapacity = installed.type.cargoServiceCapacity ? installed.type.cargoServiceCapacity * quantity : undefined;
  
  return {
    ...installed,
    quantity,
    hullPoints: hullPts,
    powerRequired: power,
    cost,
    capacity: capacity || undefined,
    serviceCapacity,
  };
}

/**
 * Calculate stats for all installed hangar/misc systems
 */
export function calculateHangarMiscStats(installedSystems: InstalledHangarMiscSystem[]): HangarMiscStats {
  let totalHullPoints = 0;
  let totalPowerRequired = 0;
  let totalCost = 0;
  let totalHangarCapacity = 0;
  let totalDockingCapacity = 0;
  let totalCargoCapacity = 0;
  let totalEvacCapacity = 0;
  let totalMagazineCapacity = 0;

  for (const system of installedSystems) {
    totalHullPoints += system.hullPoints;
    totalPowerRequired += system.powerRequired;
    totalCost += system.cost;

    // Accumulate capacities based on system type
    if (system.type.id === 'hangar') {
      totalHangarCapacity += system.capacity || 0;
    } else if (system.type.id === 'docking-clamp') {
      totalDockingCapacity += system.capacity || 0;
    } else if (system.type.id === 'magazine') {
      totalMagazineCapacity += system.capacity || 0;
    } else if (system.type.category === 'cargo' && system.type.id !== 'autocargo') {
      totalCargoCapacity += system.capacity || 0;
    } else if (system.type.category === 'emergency') {
      totalEvacCapacity += system.capacity || 0;
    }
  }

  return {
    totalHullPoints,
    totalPowerRequired,
    totalCost,
    totalHangarCapacity,
    totalDockingCapacity,
    totalCargoCapacity,
    totalEvacCapacity,
    totalMagazineCapacity,
  };
}
