/**
 * Shared utility functions for services
 * Contains logic functions like ID generation, filtering, etc.
 * NOT for UI formatting - use formatters.ts for that.
 */

import type { ProgressLevel, TechTrack } from '../types/common';
import type { Hull } from '../types/hull';

// ============== Percentage Breakpoint Interpolation ==============

/**
 * Standard percentage breakpoints used for engine acceleration and FTL rating tables.
 */
const PERCENTAGE_BREAKPOINTS = [5, 10, 15, 20, 30, 40, 50] as const;

/**
 * A ratings object mapping the standard percentage breakpoints to values.
 * Values may be null (e.g., FTL drives that have no rating at certain percentages).
 */
export interface PercentageRatings {
  at5Percent: number | null;
  at10Percent: number | null;
  at15Percent: number | null;
  at20Percent: number | null;
  at30Percent: number | null;
  at40Percent: number | null;
  at50Percent: number | null;
}

/**
 * Extract breakpoint values from a ratings object into an array of {pct, value} pairs.
 */
function extractBreakpoints(ratings: PercentageRatings): { pct: number; value: number | null }[] {
  const keys: (keyof PercentageRatings)[] = [
    'at5Percent', 'at10Percent', 'at15Percent', 'at20Percent',
    'at30Percent', 'at40Percent', 'at50Percent',
  ];
  return PERCENTAGE_BREAKPOINTS.map((pct, i) => ({ pct, value: ratings[keys[i]] }));
}

/**
 * Interpolate a value from a percentage-based ratings table.
 * Used for both engine acceleration and FTL drive ratings.
 *
 * @param ratings - The ratings object with values at standard breakpoints
 * @param percentage - The hull percentage to look up
 * @param belowMinBehavior - What to do when percentage < 5%:
 *   'interpolate-from-zero': linearly interpolate from 0 to the 5% value (engines)
 *   'null': return null (FTL drives)
 * @returns The interpolated value, or null if not applicable
 */
export function interpolateByPercentage(
  ratings: PercentageRatings,
  percentage: number,
  belowMinBehavior: 'interpolate-from-zero' | 'null' = 'null'
): number | null {
  // Below 5%
  if (percentage < 5) {
    if (belowMinBehavior === 'interpolate-from-zero') {
      const at5 = ratings.at5Percent;
      if (at5 === null) return null;
      return (percentage / 5) * at5;
    }
    return null;
  }

  // At or above 50% — cap at 50% value
  if (percentage >= 50) return ratings.at50Percent;

  const breakpoints = extractBreakpoints(ratings);

  // Find the two breakpoints to interpolate between
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const lower = breakpoints[i];
    const upper = breakpoints[i + 1];
    if (percentage >= lower.pct && percentage < upper.pct) {
      if (upper.value === null) return lower.value;
      const lowerValue = lower.value ?? 0;
      const ratio = (percentage - lower.pct) / (upper.pct - lower.pct);
      return lowerValue + ratio * (upper.value - lowerValue);
    }
  }

  return null;
}

// ============== Shared Validation ==============

/**
 * Validate that a system meets its minimum hull point size requirement.
 */
export function validateMinSize(
  systemName: string,
  hullPoints: number,
  minSize: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (hullPoints < minSize) {
    errors.push(`${systemName} requires a minimum of ${minSize} hull points.`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a fuel tank installation (shared between power plant and engine fuel tanks).
 */
export function validateFuelTank(
  hullPoints: number,
  hull: Hull,
  usedHullPoints: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (hullPoints < 1) {
    errors.push('Fuel tank requires at least 1 hull point.');
  }
  const availableHullPoints = hull.hullPoints + hull.bonusHullPoints - usedHullPoints;
  if (hullPoints > availableHullPoints) {
    errors.push(`Not enough hull points available. Need ${hullPoints}, have ${availableHullPoints}.`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Generate a unique ID with the given prefix
 * Format: prefix-timestamp-randomstring
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Interface for items that can be filtered by design constraints
 */
interface DesignConstrainedItem {
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
}

/**
 * Filter items by design constraints (Progress Level and Tech Tracks)
 * 
 * Rules:
 * - Items with progressLevel > designPL are filtered out
 * - If designTechTracks is empty, all items pass (no tech filtering)
 * - If item has no tech requirement (empty techTracks), it always passes
 * - If item has tech requirements, ALL required techs must be in designTechTracks
 * 
 * @param items - Array of items to filter
 * @param designPL - Maximum allowed Progress Level
 * @param designTechTracks - Available tech tracks (empty = no restriction)
 * @param sort - Whether to sort results by progress level (default: true)
 * @returns Filtered (and optionally sorted) array of items
 */
export function filterByDesignConstraints<T extends DesignConstrainedItem>(
  items: T[],
  designPL: ProgressLevel,
  designTechTracks: TechTrack[],
  sort: boolean = true
): T[] {
  const filtered = items.filter((item) => {
    // Filter by Progress Level
    if (item.progressLevel > designPL) return false;
    
    // Filter by Tech Tracks:
    // - If designTechTracks is empty, show all components (no tech filtering)
    // - If item has no tech requirement, always show it
    // - If item has tech requirements, show if ANY required tech is available
    if (designTechTracks.length > 0 && item.techTracks.length > 0) {
      const hasAnyTech = item.techTracks.some((tech) => designTechTracks.includes(tech));
      if (!hasAnyTech) return false;
    }
    
    return true;
  });
  
  if (sort) {
    return filtered.sort((a, b) => a.progressLevel - b.progressLevel);
  }
  
  return filtered;
}
