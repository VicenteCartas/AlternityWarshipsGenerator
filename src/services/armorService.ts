import type { ArmorType, ArmorWeight, ArmorWeightConfig } from '../types/armor';
import type { Hull, ShipClass } from '../types/hull';
import armorData from '../data/armor.json';

/**
 * Get all armor weight configurations
 */
export function getArmorWeights(): ArmorWeightConfig[] {
  return armorData.armorWeights as ArmorWeightConfig[];
}

/**
 * Get all armor types
 */
export function getAllArmorTypes(): ArmorType[] {
  return armorData.armorTypes as ArmorType[];
}

/**
 * Get armor types available for a specific ship class
 */
export function getArmorTypesForShipClass(shipClass: ShipClass): ArmorType[] {
  return getAllArmorTypes().filter((armor) => {
    if (shipClass === 'small-craft') {
      return armor.allowSmallCraft;
    }
    if (shipClass === 'light') {
      return armor.allowLightShips;
    }
    // Medium, heavy, and super-heavy can use all armor types
    return true;
  });
}

/**
 * Get armor weights available for a specific ship class
 */
export function getArmorWeightsForShipClass(shipClass: ShipClass): ArmorWeightConfig[] {
  const classOrder: ShipClass[] = ['small-craft', 'light', 'medium', 'heavy', 'super-heavy'];
  const classIndex = classOrder.indexOf(shipClass);
  
  return getArmorWeights().filter((weight) => {
    const minIndex = classOrder.indexOf(weight.minShipClass);
    return classIndex >= minIndex;
  });
}

/**
 * Calculate hull points required for armor weight
 */
export function calculateArmorHullPoints(hull: Hull, weight: ArmorWeight): number {
  const weightConfig = getArmorWeights().find((w) => w.weight === weight);
  if (!weightConfig) return 0;
  
  // Use base hull points (not including bonus) for percentage calculations
  // Always round up per the rules
  return Math.ceil(hull.hullPoints * (weightConfig.hullPercentage / 100));
}

/**
 * Calculate armor cost
 */
export function calculateArmorCost(hull: Hull, weight: ArmorWeight, armorType: ArmorType): number {
  const hullPoints = calculateArmorHullPoints(hull, weight);
  // Minimum 1 hull point worth of armor for cost calculation
  const costHullPoints = Math.max(1, hullPoints);
  return costHullPoints * armorType.costPerHullPoint;
}

/**
 * Format cost for display
 */
export function formatArmorCost(cost: number): string {
  if (cost >= 1_000_000) {
    return `$${(cost / 1_000_000).toFixed(1)} M`;
  } else if (cost >= 1_000) {
    return `$${(cost / 1_000).toFixed(0)} K`;
  }
  return `$${cost}`;
}

/**
 * Get tech track display name
 */
export function getTechTrackName(track: string): string {
  const names: Record<string, string> = {
    '-': 'None',
    'G': 'Gravity Manipulation',
    'D': 'Dark Matter Tech',
    'A': 'Antimatter Tech',
    'M': 'Matter Coding',
    'F': 'Fusion Tech',
    'Q': 'Quantum Manipulation',
    'T': 'Matter Transmission',
    'S': 'Super-Materials',
    'P': 'Psi-tech',
    'X': 'Energy Transformation',
    'C': 'Computer Tech',
  };
  return names[track] || track;
}
