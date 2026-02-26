import type { DesignType, StationType, ProgressLevel } from './common';
import type { ShipClass } from './hull';

/**
 * Lightweight metadata for a design shown in the Ship Library.
 * Extracted from save files without full deserialization.
 */
export interface LibraryEntry {
  /** Full file path for loading */
  filePath: string;
  /** Design name */
  name: string;
  /** Design type */
  designType: DesignType;
  /** Station sub-type (only when designType is 'station') */
  stationType: StationType | null;
  /** Hull type ID */
  hullId: string | null;
  /** Resolved hull name (null if hull not found in data) */
  hullName: string | null;
  /** Resolved ship class (null if hull not found in data) */
  shipClass: ShipClass | null;
  /** Design progress level */
  designProgressLevel: ProgressLevel | null;
  /** Ship image (base64 encoded) */
  imageData: string | null;
  /** Ship image MIME type */
  imageMimeType: string | null;
  /** Faction or government */
  faction: string | null;
  /** Operational role */
  role: string | null;
  /** Design classification */
  classification: string | null;
  /** Manufacturer or shipyard */
  manufacturer: string | null;
  /** Last modified timestamp */
  modifiedAt: string | null;
  /** Created timestamp */
  createdAt: string | null;
  /** File size in bytes */
  fileSizeBytes: number;
}

/**
 * Sort options for the Ship Library
 */
export type LibrarySortField = 'name' | 'modifiedAt' | 'designType' | 'shipClass' | 'progressLevel';

export type LibrarySortDirection = 'asc' | 'desc';

export interface LibrarySortConfig {
  field: LibrarySortField;
  direction: LibrarySortDirection;
}

/**
 * Filter options for the Ship Library
 */
export interface LibraryFilters {
  /** Text search across name, faction, role, classification, manufacturer */
  searchText: string;
  /** Filter by design type ('all' means no filter) */
  designType: DesignType | 'all';
  /** Filter by ship class (null means no filter) */
  shipClass: ShipClass | null;
  /** Filter by progress level (null means no filter) */
  progressLevel: ProgressLevel | null;
}
