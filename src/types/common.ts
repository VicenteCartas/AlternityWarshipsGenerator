/**
 * Common types shared across multiple modules
 */

import type { ShipClass } from './hull';

/**
 * Ship class order from smallest to largest
 * Used for sorting and filtering throughout the app
 */
export const SHIP_CLASS_ORDER: ShipClass[] = ['small-craft', 'light', 'medium', 'heavy', 'super-heavy'];

/**
 * Firepower class sort order from weakest to strongest
 * Gd = Guide (point defense), S = Small, L = Light, M = Medium, H = Heavy, SH = Super-Heavy
 */
export const FIREPOWER_ORDER: Record<string, number> = { 'Gd': 0, 'S': 1, 'L': 2, 'M': 3, 'H': 4, 'SH': 5 };

/**
 * Progress Level for technology
 * PL 6 = Fusion Age
 * PL 7 = Gravity Age
 * PL 8 = Energy Age
 * PL 9 = Matter Age
 */
export type ProgressLevel = 6 | 7 | 8 | 9;

/**
 * Technology tracks representing different fields of advancement
 * '-': 'None',
 * 'G': 'Gravity Manipulation',
 * 'D': 'Dark Matter Tech',
 * 'A': 'Antimatter Tech',
 * 'M': 'Matter Coding',
 * 'F': 'Fusion Tech',
 * 'Q': 'Quantum Manipulation',
 * 'T': 'Matter Transmission',
 * 'S': 'Super-Materials',
 * 'P': 'Psi-tech',
 * 'X': 'Energy Transformation',
 * 'C': 'Computer Tech',
 */
export type TechTrack = '-' | 'G' | 'D' | 'A' | 'M' | 'F' | 'Q' | 'T' | 'S' | 'P' | 'X' | 'C';

/**
 * Damage types for weapons and armor
 * LI = Low Impact (mass-based, kinetic)
 * HI = High Impact (high-velocity projectiles)
 * En = Energy (lasers, plasma, etc.)
 */
export type DamageType = 'LI' | 'HI' | 'En';

/**
 * Quality levels used for computer cores and control systems
 */
export type QualityLevel = 'Ordinary' | 'Good' | 'Amazing';

/**
 * Cost calculation mode for systems
 * 'unit' = cost × quantity (flat per-unit cost)
 * 'systemHp' = cost × system's own calculated HP
 * 'linkedHp' = cost × linked system's HP (fire/sensor control)
 */
export type CostPer = 'unit' | 'systemHp' | 'linkedHp';

/**
 * Power calculation mode for systems
 * 'unit' = power × quantity (flat per-unit power)
 * 'systemHp' = power × system's own calculated HP
 */
export type PowerPer = 'unit' | 'systemHp';

/**
 * Generic type for filter values that include an 'all' option
 * Used for category filters in selection components
 */
export type FilterWithAll<T extends string> = 'all' | T;

// ============== Base Stats Interfaces ==============

/**
 * Base interface for system stats that all systems share
 * All systems have hull points and cost
 */
export interface BaseSystemStats {
  totalHullPoints: number;
  totalCost: number;
}

/**
 * Extended stats interface for systems that consume power
 * Most systems except power plants consume power
 */
export interface PowerConsumingStats extends BaseSystemStats {
  totalPowerRequired: number;
}

// ============== Base Installed Item Interfaces ==============

/**
 * Base interface for all installed items
 * All installed items have a unique ID
 */
export interface InstalledItemBase {
  id: string;
}

/**
 * Extended interface for installed items with a type and quantity
 * Most systems follow this pattern
 */
export interface InstalledQuantityItem<T> extends InstalledItemBase {
  type: T;
  quantity: number;
}

/**
 * Extended interface for installed items with calculated values
 * Includes pre-calculated HP, power, and cost for display
 */
export interface InstalledItemWithCalcs extends InstalledItemBase {
  /** Calculated hull points used */
  hullPoints: number;
  /** Calculated power required */
  powerRequired: number;
  /** Calculated cost */
  cost: number;
}

/**
 * Combined interface for standard installed items
 * Combines type, quantity, and calculated values
 */
export interface InstalledSystemBase<T> extends InstalledQuantityItem<T>, InstalledItemWithCalcs {}
