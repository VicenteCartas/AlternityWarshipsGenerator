import type { HangarMiscSystemType, InstalledHangarMiscSystem, HangarMiscStats } from '../types/hangarMisc';
import { generateId } from './utilities';
import { getHangarMiscSystemsData } from './dataLoader';

/**
 * Get all hangar/misc system types
 */
export function getAllHangarMiscSystemTypes(): HangarMiscSystemType[] {
  return getHangarMiscSystemsData();
}

/**
 * Generate unique ID for an installed system
 */
export function generateHangarMiscId(): string {
  return generateId('hangmisc');
}

/**
 * Calculate hull points for a system installation
 */
export function calculateHangarMiscHullPoints(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number,
  extraHp: number = 0
): number {
  if (type.hullPercentage) {
    // Percentage-based systems (like stabilizer)
    return Math.ceil((shipHullPoints * type.hullPercentage) / 100) * quantity;
  }
  // Fixed or scalable systems + extra HP for expandable
  return type.hullPoints * quantity + extraHp;
}

/**
 * Calculate power required for a system installation
 */
export function calculateHangarMiscPower(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number,
  extraHp: number = 0
): number {
  if (type.powerPer === 'systemHp') {
    const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity, extraHp);
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
  quantity: number,
  extraHp: number = 0
): number {
  if (type.costPer === 'systemHp') {
    // Base cost + cost per hull point
    const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity, extraHp);
    const base = type.baseCost || 0;
    return base + (type.cost * hullPts);
  }
  // Base cost × quantity + expansion cost for extra HP
  const baseCost = type.cost * quantity;
  const expansionCost = type.expandable && type.expansionCostPerHp ? extraHp * type.expansionCostPerHp : 0;
  return baseCost + expansionCost;
}

/**
 * Calculate capacity for a system (hangars, cargo, etc.)
 */
export function calculateHangarMiscCapacity(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number,
  extraHp: number = 0
): number {
  // Fixed cargo capacity per unit (additive)
  if (type.cargoCapacity) {
    return type.cargoCapacity * quantity;
  }
  // Evacuation capacity - can be fixed per unit or expandable with extra HP
  if (type.evacCapacity) {
    if (type.expandable && type.evacCapacityPerHP) {
      // Expandable evac system: base capacity × quantity + extra capacity per extra HP
      return (type.evacCapacity * quantity) + (extraHp * type.evacCapacityPerHP);
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
  return 0;
}

/**
 * Create an installed hangar/misc system
 */
export function createInstalledHangarMiscSystem(
  type: HangarMiscSystemType,
  shipHullPoints: number,
  quantity: number,
  extraHp: number = 0
): InstalledHangarMiscSystem {
  const hullPts = calculateHangarMiscHullPoints(type, shipHullPoints, quantity, extraHp);
  const power = calculateHangarMiscPower(type, shipHullPoints, quantity, extraHp);
  const cost = calculateHangarMiscCost(type, shipHullPoints, quantity, extraHp);
  const capacity = calculateHangarMiscCapacity(type, shipHullPoints, quantity, extraHp);
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
    extraHp: extraHp > 0 ? extraHp : undefined,
  };
}

/**
 * Update an installed hangar/misc system with new quantity
 */
export function updateInstalledHangarMiscSystem(
  installed: InstalledHangarMiscSystem,
  shipHullPoints: number,
  quantity: number,
  extraHp: number = 0
): InstalledHangarMiscSystem {
  const hullPts = calculateHangarMiscHullPoints(installed.type, shipHullPoints, quantity, extraHp);
  const power = calculateHangarMiscPower(installed.type, shipHullPoints, quantity, extraHp);
  const cost = calculateHangarMiscCost(installed.type, shipHullPoints, quantity, extraHp);
  const capacity = calculateHangarMiscCapacity(installed.type, shipHullPoints, quantity, extraHp);
  const serviceCapacity = installed.type.cargoServiceCapacity ? installed.type.cargoServiceCapacity * quantity : undefined;
  
  return {
    ...installed,
    quantity,
    hullPoints: hullPts,
    powerRequired: power,
    cost,
    capacity: capacity || undefined,
    serviceCapacity,
    extraHp: extraHp > 0 ? extraHp : undefined,
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

    // Accumulate capacities based on system type capabilities
    if (system.type.hangarCapacity) {
      totalHangarCapacity += system.capacity || 0;
    } else if (system.type.dockCapacity) {
      totalDockingCapacity += system.capacity || 0;
    } else if (system.type.ordnanceCapacity) {
      totalMagazineCapacity += system.capacity || 0;
    } else if (system.type.cargoCapacity) {
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
