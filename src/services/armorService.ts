import type { ArmorType, ArmorWeight, ArmorWeightConfig, ShipArmor } from '../types/armor';
import type { Hull, ShipClass } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import { SHIP_CLASS_ORDER } from '../types/common';
import { getArmorTypesData, getArmorWeightsData, getArmorAllowMultipleLayers } from './dataLoader';
import { filterByDesignConstraints as filterByConstraints } from './utilities';

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
  const shipClassIndex = SHIP_CLASS_ORDER.indexOf(shipClass);
  const armorWeights = getArmorWeights();
  
  return getAllArmorTypes().filter((armor) => {
    // Find the weight config for this armor's weight
    const weightConfig = armorWeights.find(w => w.id === armor.armorWeight);
    if (!weightConfig) return true; // If weight config is missing, assume it's allowed
    
    // Check if ship class meets minimum requirement for this armor weight
    const minClassIndex = SHIP_CLASS_ORDER.indexOf(weightConfig.minShipClass);
    return shipClassIndex >= minClassIndex;
  });
}

/**
 * Get armor types filtered by weight category
 */
// ============== Filtering ==============

export function filterByDesignConstraints(
  items: ArmorType[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): ArmorType[] {
  return filterByConstraints(items, designProgressLevel, designTechTracks);
}

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
  const classIndex = SHIP_CLASS_ORDER.indexOf(shipClass);
  
  return getArmorWeights().filter((weight) => {
    const minIndex = SHIP_CLASS_ORDER.indexOf(weight.minShipClass);
    return classIndex >= minIndex;
  });
}

/**
 * Calculate hull points required for armor weight
 */
export function calculateArmorHullPoints(hull: Hull, weight: ArmorWeight): number {
  const weightConfig = getArmorWeights().find((w) => w.id === weight);
  if (!weightConfig) return 0;
  
  // Use base hull points (not including bonus) for percentage calculations
  // Always round up per the rules
  return Math.ceil(hull.hullPoints * (weightConfig.hullPercentage / 100));
}

/**
 * Calculate the cost basis hull points for armor (may differ from actual HP consumed)
 * For example, light armor uses 0 HP but costs as if it used 2.5% of hull
 */
export function calculateArmorCostHullPoints(hull: Hull, weight: ArmorWeight): number {
  const weightConfig = getArmorWeights().find((w) => w.id === weight);
  if (!weightConfig) return 0;
  
  return Math.max(1, Math.ceil(hull.hullPoints * (weightConfig.costHullPercentage / 100)));
}

/**
 * Calculate armor cost
 */
export function calculateArmorCost(hull: Hull, weight: ArmorWeight, armorType: ArmorType): number {
  const costHullPoints = calculateArmorCostHullPoints(hull, weight);
  return costHullPoints * armorType.costPerHullPoint;
}

/**
 * Check if multiple armor layers are allowed
 */
export function isMultipleArmorLayersAllowed(): boolean {
  return getArmorAllowMultipleLayers();
}

/**
 * Calculate total hull points for multiple armor layers
 */
export function calculateMultiLayerArmorHP(hull: Hull, layers: ShipArmor[]): number {
  return layers.reduce((sum, layer) => sum + calculateArmorHullPoints(hull, layer.weight), 0);
}

/**
 * Calculate total cost for multiple armor layers
 */
export function calculateMultiLayerArmorCost(hull: Hull, layers: ShipArmor[]): number {
  return layers.reduce((sum, layer) => sum + calculateArmorCost(hull, layer.weight, layer.type), 0);
}

/**
 * Build a ShipArmor from a hull and armor type
 */
export function buildShipArmor(hull: Hull, armorType: ArmorType): ShipArmor {
  return {
    weight: armorType.armorWeight,
    type: armorType,
    hullPointsUsed: calculateArmorHullPoints(hull, armorType.armorWeight),
    cost: calculateArmorCost(hull, armorType.armorWeight, armorType),
  };
}

/** Weight ordering for display: light → heavy */
const ARMOR_WEIGHT_ORDER: ArmorWeight[] = ['light', 'medium', 'heavy', 'super-heavy'];

/**
 * Sort armor layers by weight category (light → super-heavy)
 */
export function sortArmorLayers(layers: ShipArmor[]): ShipArmor[] {
  return [...layers].sort(
    (a, b) => ARMOR_WEIGHT_ORDER.indexOf(a.weight) - ARMOR_WEIGHT_ORDER.indexOf(b.weight)
  );
}
