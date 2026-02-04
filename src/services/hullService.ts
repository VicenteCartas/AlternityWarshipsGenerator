import type { Hull, ShipClass, HullCategory } from '../types/hull';
import { SHIP_CLASS_ORDER } from '../types/common';
import { getHullsData } from './dataLoader';

/**
 * Get all hulls from the data file
 */
export function getAllHulls(): Hull[] {
  return getHullsData();
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
