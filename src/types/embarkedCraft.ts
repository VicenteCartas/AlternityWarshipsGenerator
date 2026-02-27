/**
 * Types for the Carrier Complement / Embarked Craft system.
 * Allows carriers to assign saved small-craft designs to hangars and docking clamps.
 */

/**
 * Berthing type for an embarked craft assignment
 */
export type BerthingType = 'hangar' | 'docking';

/**
 * A single embarked craft assignment — references a saved .warship.json design
 */
export interface EmbarkedCraft {
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
  /** Quantity of this craft type embarked */
  quantity: number;
  /** Where the craft is berthed */
  berthing: BerthingType;
  /** Total cost of the craft design (snapshotted for carrier cost rollup) */
  designCost: number;
  /** Whether the referenced file was found during last load */
  fileValid: boolean;
}

/**
 * Aggregated stats for all embarked craft
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
