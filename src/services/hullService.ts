import type { Hull, ShipClass, HullCategory } from '../types/hull';
import hullsData from '../data/hulls.json';

/**
 * Get all hulls from the data file
 */
export function getAllHulls(): Hull[] {
  return hullsData.hulls as Hull[];
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
export function getShipClasses(): ShipClass[] {
  return ['small-craft', 'light', 'medium', 'heavy', 'super-heavy'];
}

/**
 * Get display name for a ship class
 */
export function getShipClassDisplayName(shipClass: ShipClass): string {
  const names: Record<ShipClass, string> = {
    'small-craft': 'Small Craft',
    light: 'Light Ships',
    medium: 'Medium Ships',
    heavy: 'Heavy Ships',
    'super-heavy': 'Super-Heavy Ships',
  };
  return names[shipClass];
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost >= 1_000_000_000) {
    return `$${(cost / 1_000_000_000).toFixed(1)} B`;
  } else if (cost >= 1_000_000) {
    return `$${(cost / 1_000_000).toFixed(0)} M`;
  } else if (cost >= 1_000) {
    return `$${(cost / 1_000).toFixed(0)} K`;
  }
  return `$${cost}`;
}
