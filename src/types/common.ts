/**
 * Common types shared across multiple modules
 */

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
 * G = Gravity manipulation
 * D = Dimensional technology
 * A = Antimatter technology
 * M = Matter manipulation
 * F = Fusion/Plasma technology
 * Q = Quantum technology
 * T = Teleportation/Transport
 * S = Structural/Materials science
 * P = Psionic technology
 * X = Exotic/Experimental
 * C = Computer/AI technology
 * - = No special technology required
 */
export type TechTrack = 'G' | 'D' | 'A' | 'M' | 'F' | 'Q' | 'T' | 'S' | 'P' | 'X' | 'C' | '-';

/**
 * Damage types for weapons and armor
 * LI = Low Impact (mass-based, kinetic)
 * HI = High Impact (high-velocity projectiles)
 * En = Energy (lasers, plasma, etc.)
 */
export type DamageType = 'LI' | 'HI' | 'En';
