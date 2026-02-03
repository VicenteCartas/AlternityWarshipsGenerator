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
