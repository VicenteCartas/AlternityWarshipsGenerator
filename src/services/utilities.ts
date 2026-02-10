/**
 * Shared utility functions for services
 * Contains logic functions like ID generation, filtering, etc.
 * NOT for UI formatting - use formatters.ts for that.
 */

import type { ProgressLevel, TechTrack } from '../types/common';

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
