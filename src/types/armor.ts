import type { ProgressLevel, TechTrack, DamageType } from './common';

// Re-export for convenience
export type { ProgressLevel, TechTrack, DamageType };

/**
 * Armor weight categories
 */
export type ArmorWeight = 'light' | 'medium' | 'heavy' | 'super-heavy';

/**
 * Armor type definition
 */
export interface ArmorType {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Armor weight category */
  armorWeight: ArmorWeight;
  
  /** Hull points required as percentage of ship hull (derived from armorWeight) */
  hullPercentage: number;
  
  /** Progress Level required */
  progressLevel: ProgressLevel;
  
  /** Technology tracks required (empty array means no special tech needed) */
  techTracks: TechTrack[];
  
  /** Protection vs Low Impact attacks (dice notation) */
  protectionLI: string;
  
  /** Protection vs High Impact attacks (dice notation) */
  protectionHI: string;
  
  /** Protection vs Energy attacks (dice notation) */
  protectionEn: string;
  
  /** Cost per hull point of armor */
  costPerHullPoint: number;
  
  /** Description */
  description: string;
}

/**
 * Armor weight configuration
 */
export interface ArmorWeightConfig {
  /** Weight category */
  weight: ArmorWeight;
  
  /** Display name */
  name: string;
  
  /** Hull points required as percentage of base hull (0 for light) */
  hullPercentage: number;
  
  /** Description */
  description: string;
  
  /** Minimum ship class allowed */
  minShipClass: 'small-craft' | 'light' | 'medium' | 'heavy' | 'super-heavy';
}

/**
 * Selected armor configuration for a ship
 */
export interface ShipArmor {
  /** Armor weight category */
  weight: ArmorWeight;
  
  /** Armor type */
  type: ArmorType;
  
  /** Hull points used */
  hullPointsUsed: number;
  
  /** Total cost */
  cost: number;
}
