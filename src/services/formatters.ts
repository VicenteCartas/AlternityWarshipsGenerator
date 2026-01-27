import type { ShipClass } from '../types/hull';
import type { TechTrack } from '../types/common';

/**
 * Shared formatting utility functions
 */

/**
 * Format a cost number for display
 * @param cost - Cost in credits
 * @returns Formatted string like "$350 K", "$1.5 M", "$2 B"
 */
export function formatCost(cost: number): string {
  if (cost === 0) {
    return '-';
  }
  if (cost >= 1_000_000_000) {
    const value = cost / 1_000_000_000;
    // Use decimal only if needed
    return value % 1 === 0 ? `$${value} B` : `$${value.toFixed(1)} B`;
  } else if (cost >= 1_000_000) {
    const value = cost / 1_000_000;
    return value % 1 === 0 ? `$${value} M` : `$${value.toFixed(1)} M`;
  } else if (cost >= 1_000) {
    const value = cost / 1_000;
    return value % 1 === 0 ? `$${value} K` : `$${value.toFixed(1)} K`;
  }
  return `$${cost}`;
}

/**
 * Format target modifier number as display string
 * @param modifier - The target modifier value (positive = easier to hit, negative = harder)
 * @returns Formatted string like "+3 steps", "-1 step", "0"
 */
export function formatTargetModifier(modifier: number): string {
  if (modifier === 0) {
    return '0';
  }
  const sign = modifier > 0 ? '+' : '';
  const stepWord = Math.abs(modifier) === 1 ? 'step' : 'steps';
  return `${sign}${modifier} ${stepWord}`;
}

/**
 * Get tech track display name
 */
export function getTechTrackName(track: TechTrack): string {
  const names: Record<TechTrack, string> = {
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
  return names[track];
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
 * Format acceleration for display
 */
export function formatAcceleration(acceleration: number, usesPL6Scale: boolean): string {
  if (acceleration === 0) return '-';
  if (usesPL6Scale) {
    return `${acceleration} (PL6)`;
  }
  return `${acceleration} Mpp`;
}
