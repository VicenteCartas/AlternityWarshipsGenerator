/**
 * Service for managing embarked craft (carrier complement).
 *
 * Handles validation, capacity calculations, and stats aggregation
 * for craft assigned to hangars and docking clamps.
 */

import type { EmbarkedCraft, EmbarkedCraftStats, BerthingType } from '../types/embarkedCraft';
import type { HangarMiscStats } from '../types/hangarMisc';

let nextId = 1;

/**
 * Generate a unique ID for an embarked craft assignment
 */
export function generateEmbarkedCraftId(): string {
  return `embarked-${nextId++}`;
}

/** Maximum HP for a craft to fit in a hangar (per rules) */
export const HANGAR_MAX_CRAFT_HP = 100;

/**
 * Validate whether a craft can be assigned to a specific berthing type.
 * Returns an error message if invalid, or null if valid.
 */
export function validateCraftAssignment(
  craftHullHp: number,
  craftName: string,
  quantity: number,
  berthing: BerthingType,
  carrierHullHp: number,
  hangarMiscStats: HangarMiscStats,
  existingCraft: EmbarkedCraft[],
  editingId?: string,
): string | null {
  const stats = calculateEmbarkedCraftStats(existingCraft.filter(c => c.id !== editingId));

  if (berthing === 'hangar') {
    // Rule: Ships of 100 HP or more cannot fit in any hangar
    if (craftHullHp >= HANGAR_MAX_CRAFT_HP) {
      return `${craftName} (${craftHullHp} HP) is too large for a hangar. Only craft under ${HANGAR_MAX_CRAFT_HP} HP can use hangars.`;
    }
    // Check capacity
    const totalHpNeeded = craftHullHp * quantity;
    const remainingCapacity = hangarMiscStats.totalHangarCapacity - stats.totalHangarHpUsed;
    if (totalHpNeeded > remainingCapacity) {
      return `Not enough hangar capacity. Need ${totalHpNeeded} HP but only ${remainingCapacity} HP available.`;
    }
  } else {
    // Docking clamp rules
    // Rule: Embarked ships may not exceed 10% of carrier's hull
    const maxCraftHp = Math.floor(carrierHullHp * 0.1);
    if (craftHullHp > maxCraftHp) {
      return `${craftName} (${craftHullHp} HP) exceeds the docking clamp limit of ${maxCraftHp} HP (10% of carrier's ${carrierHullHp} HP hull).`;
    }
    // Check capacity
    const totalHpNeeded = craftHullHp * quantity;
    const remainingCapacity = hangarMiscStats.totalDockingCapacity - stats.totalDockingHpUsed;
    if (totalHpNeeded > remainingCapacity) {
      return `Not enough docking capacity. Need ${totalHpNeeded} HP but only ${remainingCapacity} HP available.`;
    }
  }

  return null;
}

/**
 * Calculate aggregated stats for all embarked craft
 */
export function calculateEmbarkedCraftStats(embarkedCraft: EmbarkedCraft[]): EmbarkedCraftStats {
  let totalHangarHpUsed = 0;
  let totalDockingHpUsed = 0;
  let totalEmbarkedCost = 0;
  let invalidFileCount = 0;

  for (const craft of embarkedCraft) {
    const totalHp = craft.hullHp * craft.quantity;
    if (craft.berthing === 'hangar') {
      totalHangarHpUsed += totalHp;
    } else {
      totalDockingHpUsed += totalHp;
    }
    totalEmbarkedCost += craft.designCost * craft.quantity;
    if (!craft.fileValid) {
      invalidFileCount++;
    }
  }

  return {
    totalHangarHpUsed,
    totalDockingHpUsed,
    totalEmbarkedCost,
    invalidFileCount,
  };
}

/**
 * Create a new embarked craft assignment
 */
export function createEmbarkedCraft(
  filePath: string,
  name: string,
  hullHp: number,
  hullName: string,
  quantity: number,
  berthing: BerthingType,
  designCost: number,
): EmbarkedCraft {
  return {
    id: generateEmbarkedCraftId(),
    filePath,
    name,
    hullHp,
    hullName,
    quantity,
    berthing,
    designCost,
    fileValid: true,
  };
}

/**
 * Remove embarked craft that reference berthing types no longer available.
 * Called when hangar/docking clamp systems are removed.
 */
export function pruneEmbarkedCraft(
  embarkedCraft: EmbarkedCraft[],
  hangarMiscStats: HangarMiscStats,
): EmbarkedCraft[] {
  if (hangarMiscStats.totalHangarCapacity === 0 && hangarMiscStats.totalDockingCapacity === 0) {
    return [];
  }
  if (hangarMiscStats.totalHangarCapacity === 0) {
    return embarkedCraft.filter(c => c.berthing !== 'hangar');
  }
  if (hangarMiscStats.totalDockingCapacity === 0) {
    return embarkedCraft.filter(c => c.berthing !== 'docking');
  }
  return embarkedCraft;
}
