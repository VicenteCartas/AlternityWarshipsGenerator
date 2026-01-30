import type { ArmorType, ArmorWeight, ArmorWeightConfig } from '../types/armor';
import type { Hull, ShipClass } from '../types/hull';
import { getArmorTypesData, getArmorWeightsData } from './dataLoader';

/**
 * Get all armor weight configurations
 */
export function getArmorWeights(): ArmorWeightConfig[] {
  return getArmorWeightsData();
}

/**
 * Get all armor types
 */
export function getAllArmorTypes(): ArmorType[] {
  return getArmorTypesData();
}

/**
 * Get armor types available for a specific ship class
 * Filters based on the armor weight's minShipClass requirement
 */
export function getArmorTypesForShipClass(shipClass: ShipClass): ArmorType[] {
  const classOrder: ShipClass[] = ['small-craft', 'light', 'medium', 'heavy', 'super-heavy'];
  const shipClassIndex = classOrder.indexOf(shipClass);
  const armorWeights = getArmorWeights();
  
  return getAllArmorTypes().filter((armor) => {
    // Find the weight config for this armor's weight
    const weightConfig = armorWeights.find(w => w.weight === armor.armorWeight);
    if (!weightConfig) return false;
    
    // Check if ship class meets minimum requirement for this armor weight
    const minClassIndex = classOrder.indexOf(weightConfig.minShipClass);
    return shipClassIndex >= minClassIndex;
  });
}

/**
 * Get armor types filtered by weight category
 */
export function getArmorTypesByWeight(shipClass: ShipClass, weight: ArmorWeight | 'all'): ArmorType[] {
  const availableTypes = getArmorTypesForShipClass(shipClass);
  if (weight === 'all') {
    return availableTypes;
  }
  return availableTypes.filter((armor) => armor.armorWeight === weight);
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
 * Calculate hull points required for a specific armor type
 * Uses the hullPercentage from the armor type directly
 */
export function calculateArmorHullPointsForType(hull: Hull, armorType: ArmorType): number {
  // Use base hull points (not including bonus) for percentage calculations
  // Always round up per the rules
  return Math.ceil(hull.hullPoints * (armorType.hullPercentage / 100));
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
