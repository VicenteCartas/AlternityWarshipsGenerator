/**
 * Types for the Carrier Complement / Embarked Craft system.
 * Craft are loaded into individual hangar or docking clamp systems (like ordnance in launchers).
 */

/**
 * Berthing type for an embarked craft assignment
 */
export type BerthingType = 'hangar' | 'docking';

/**
 * A craft loaded into a specific hangar or docking clamp system.
 * References a saved .warship.json design file.
 */
export interface LoadedCraft {
  /** Unique ID for this assignment */
  id: string;
  /** Absolute path to the .warship.json file */
  filePath: string;
  /** Design name (snapshotted at assignment time for display) */
  name: string;
  /** Hull HP of the craft (snapshotted for capacity validation) */
  hullHp: number;
  /** Hull name (snapshotted for display) */
  hullName: string;
  /** Quantity of this craft type loaded */
  quantity: number;
  /** Total cost of the craft design (snapshotted for carrier cost rollup) */
  designCost: number;
  /** Whether the referenced file was found during last load */
  fileValid: boolean;
}

/**
 * Aggregated stats for all embarked craft across all hangar/docking systems
 */
export interface EmbarkedCraftStats {
  /** Total HP used in hangars */
  totalHangarHpUsed: number;
  /** Total HP used in docking clamps */
  totalDockingHpUsed: number;
  /** Total cost of all embarked craft (quantity × designCost) */
  totalEmbarkedCost: number;
  /** Number of craft with invalid (missing) file references */
  invalidFileCount: number;
}
