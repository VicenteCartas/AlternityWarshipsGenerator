/**
 * Service for managing embarked craft (carrier complement).
 *
 * Craft are loaded into individual hangar/docking clamp systems (like ordnance in launchers).
 * Handles validation, capacity calculations, and stats aggregation.
 */

import type { LoadedCraft, EmbarkedCraftStats, BerthingType } from '../types/embarkedCraft';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';

let nextId = 1;

/**
 * Generate a unique ID for a loaded craft assignment
 */
export function generateLoadedCraftId(): string {
  return `craft-${nextId++}`;
}

/** Maximum HP for a craft to fit in a hangar (per rules) */
export const HANGAR_MAX_CRAFT_HP = 100;

/**
 * Determine the berthing type of a hangar/misc system.
 * Returns null if the system is not a hangar or docking clamp.
 */
export function getSystemBerthingType(system: InstalledHangarMiscSystem): BerthingType | null {
  if (system.type.hangarCapacity) return 'hangar';
  if (system.type.dockCapacity) return 'docking';
  return null;
}

/**
 * Check if a system is a magazine (stores ordnance).
 */
export function isSystemMagazine(system: InstalledHangarMiscSystem): boolean {
  return !!system.type.ordnanceCapacity;
}

/**
 * Get the craft capacity of a system in HP.
 */
export function getSystemCraftCapacity(system: InstalledHangarMiscSystem): number {
  return system.capacity || 0;
}

/**
 * Get used capacity (HP) of a system's loadout.
 */
export function getSystemUsedCapacity(system: InstalledHangarMiscSystem): number {
  return (system.loadout || []).reduce((sum, c) => sum + c.hullHp * c.quantity, 0);
}

/**
 * Get remaining capacity (HP) of a system's loadout.
 */
export function getSystemRemainingCapacity(system: InstalledHangarMiscSystem): number {
  return getSystemCraftCapacity(system) - getSystemUsedCapacity(system);
}

/**
 * Validate whether a craft can be loaded into a specific system.
 * Returns an error message if invalid, or null if valid.
 */
export function validateCraftForSystem(
  craftHullHp: number,
  craftName: string,
  quantity: number,
  system: InstalledHangarMiscSystem,
  carrierHullHp: number,
): string | null {
  const berthing = getSystemBerthingType(system);
  if (!berthing) return 'This system cannot hold craft.';

  if (berthing === 'hangar') {
    if (craftHullHp >= HANGAR_MAX_CRAFT_HP) {
      return `${craftName} (${craftHullHp} HP) is too large for a hangar. Only craft under ${HANGAR_MAX_CRAFT_HP} HP can use hangars.`;
    }
  } else {
    const maxCraftHp = Math.floor(carrierHullHp * 0.1);
    if (craftHullHp > maxCraftHp) {
      return `${craftName} (${craftHullHp} HP) exceeds the docking clamp limit of ${maxCraftHp} HP (10% of carrier's ${carrierHullHp} HP hull).`;
    }
  }

  const totalHpNeeded = craftHullHp * quantity;
  const remaining = getSystemRemainingCapacity(system);
  if (totalHpNeeded > remaining) {
    return `Not enough capacity. Need ${totalHpNeeded} HP but only ${remaining} HP available.`;
  }

  return null;
}

/**
 * Create a new loaded craft entry.
 */
export function createLoadedCraft(
  filePath: string,
  name: string,
  hullHp: number,
  hullName: string,
  quantity: number,
  designCost: number,
): LoadedCraft {
  return {
    id: generateLoadedCraftId(),
    filePath,
    name,
    hullHp,
    hullName,
    quantity,
    designCost,
    fileValid: true,
  };
}

/**
 * Add a craft to a system's loadout. Returns updated system.
 */
export function addCraftToSystem(
  system: InstalledHangarMiscSystem,
  craft: LoadedCraft,
): InstalledHangarMiscSystem {
  return {
    ...system,
    loadout: [...(system.loadout || []), craft],
  };
}

/**
 * Remove a craft from a system's loadout. Returns updated system.
 */
export function removeCraftFromSystem(
  system: InstalledHangarMiscSystem,
  craftId: string,
): InstalledHangarMiscSystem {
  return {
    ...system,
    loadout: (system.loadout || []).filter(c => c.id !== craftId),
  };
}

/**
 * Update a craft's quantity in a system's loadout. Returns updated system.
 */
export function updateCraftQuantity(
  system: InstalledHangarMiscSystem,
  craftId: string,
  newQuantity: number,
): InstalledHangarMiscSystem {
  return {
    ...system,
    loadout: (system.loadout || []).map(c =>
      c.id === craftId ? { ...c, quantity: newQuantity } : c
    ),
  };
}

/**
 * Calculate aggregated stats for all embarked craft across all hangar/misc systems.
 */
export function calculateEmbarkedCraftStats(systems: InstalledHangarMiscSystem[]): EmbarkedCraftStats {
  let totalHangarHpUsed = 0;
  let totalDockingHpUsed = 0;
  let totalEmbarkedCost = 0;
  let invalidFileCount = 0;

  for (const system of systems) {
    const berthing = getSystemBerthingType(system);
    if (!berthing) continue;
    for (const craft of system.loadout || []) {
      const totalHp = craft.hullHp * craft.quantity;
      if (berthing === 'hangar') {
        totalHangarHpUsed += totalHp;
      } else {
        totalDockingHpUsed += totalHp;
      }
      totalEmbarkedCost += craft.designCost * craft.quantity;
      if (!craft.fileValid) {
        invalidFileCount++;
      }
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
 * Get all loaded craft from all hangar/misc systems as a flat list.
 * Useful for summary display and PDF export.
 */
export function getAllLoadedCraft(systems: InstalledHangarMiscSystem[]): Array<LoadedCraft & { berthing: BerthingType; systemName: string }> {
  const result: Array<LoadedCraft & { berthing: BerthingType; systemName: string }> = [];
  for (const system of systems) {
    const berthing = getSystemBerthingType(system);
    if (!berthing) continue;
    for (const craft of system.loadout || []) {
      result.push({ ...craft, berthing, systemName: system.type.name });
    }
  }
  return result;
}
