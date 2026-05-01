import type { SavedOrdnanceDesign } from './saveFile';

/**
 * File format for exported ordnance designs (.ordnance.json)
 * Reuses SavedOrdnanceDesign which stores only component IDs — no calculated fields.
 */
export interface OrdnanceExportFile {
  /** Format version for future compatibility */
  version: string;
  /** Exported ordnance designs */
  designs: SavedOrdnanceDesign[];
}

/** Current ordnance export file format version */
export const ORDNANCE_EXPORT_VERSION = '1.0';
