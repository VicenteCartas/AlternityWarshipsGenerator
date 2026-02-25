import type { Hull, HullStats, ShipClass, HullCategory } from '../types/hull';
import { SHIP_CLASS_ORDER } from '../types/common';
import { getHullsData, getStationHullsData } from './dataLoader';

/**
 * Get all ship hulls from the data file
 */
export function getAllHulls(): Hull[] {
  return getHullsData();
}

/**
 * Get all station hulls from the data file
 */
export function getAllStationHulls(): Hull[] {
  return getStationHullsData();
}

/**
 * Get hulls filtered by ship class
 */
export function getHullsByClass(shipClass: ShipClass): Hull[] {
  return getAllHulls().filter((hull) => hull.shipClass === shipClass);
}

/**
 * Get hulls filtered by category (military/civilian)
 */
export function getHullsByCategory(category: HullCategory): Hull[] {
  return getAllHulls().filter((hull) => hull.category === category);
}

/**
 * Get hulls filtered by both class and category
 */
export function getHullsByClassAndCategory(
  shipClass: ShipClass,
  category: HullCategory
): Hull[] {
  return getAllHulls().filter(
    (hull) => hull.shipClass === shipClass && hull.category === category
  );
}

/**
 * Get a single hull by ID
 */
export function getHullById(id: string): Hull | undefined {
  return getAllHulls().find((hull) => hull.id === id);
}

/**
 * Get all unique ship classes
 */
export function getShipClasses(): readonly ShipClass[] {
  return [...SHIP_CLASS_ORDER];
}

/**
 * Calculate derived hull statistics
 */
export function calculateHullStats(hull: Hull): HullStats {
  return {
    totalHullPoints: hull.hullPoints + hull.bonusHullPoints,
    lightArmorCost: 0,
    mediumArmorCost: Math.ceil(hull.hullPoints * 0.05),
    heavyArmorCost: Math.ceil(hull.hullPoints * 0.1),
    superHeavyArmorCost: Math.ceil(hull.hullPoints * 0.2),
  };
}
