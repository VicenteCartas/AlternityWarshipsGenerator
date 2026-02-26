import type { ScannedWarshipFile } from '../types/electron';
import type { DesignType, ProgressLevel } from '../types/common';
import type { ShipClass } from '../types/hull';
import type { LibraryEntry, LibraryFilters, LibrarySortConfig } from '../types/library';
import { getHullById } from './hullService';

/**
 * Library service — handles scanning directories for saved designs,
 * transforming scanned files into library entries, filtering, and sorting.
 */

// ============== Save/Load Library Path ==============

const LIBRARY_PATH_KEY = 'warship-library-path';

/**
 * Get the saved library directory path from localStorage.
 * Falls back to null if none is saved.
 */
export function getSavedLibraryPath(): string | null {
  try {
    return localStorage.getItem(LIBRARY_PATH_KEY);
  } catch {
    return null;
  }
}

/**
 * Save the library directory path to localStorage.
 */
export function saveLibraryPath(dirPath: string): void {
  try {
    localStorage.setItem(LIBRARY_PATH_KEY, dirPath);
  } catch {
    // Ignore localStorage errors
  }
}

// ============== Transform Scanned Files → Library Entries ==============

/**
 * Convert a scanned warship file (from IPC) into a LibraryEntry with resolved hull info.
 */
export function toLibraryEntry(file: ScannedWarshipFile): LibraryEntry {
  // Resolve hull name and ship class from game data
  let hullName: string | null = null;
  let shipClass: ShipClass | null = null;

  if (file.hullId) {
    const hull = getHullById(file.hullId);
    if (hull) {
      hullName = hull.name;
      shipClass = hull.shipClass;
    }
  }

  return {
    filePath: file.filePath,
    name: file.name,
    designType: (file.designType as DesignType) || 'warship',
    stationType: file.stationType as LibraryEntry['stationType'],
    hullId: file.hullId,
    hullName,
    shipClass,
    designProgressLevel: file.designProgressLevel as ProgressLevel | null,
    imageData: file.imageData,
    imageMimeType: file.imageMimeType,
    faction: file.faction,
    role: file.role,
    classification: file.classification,
    manufacturer: file.manufacturer,
    modifiedAt: file.modifiedAt,
    createdAt: file.createdAt,
    fileSizeBytes: file.fileSizeBytes,
  };
}

/**
 * Convert an array of scanned files to library entries.
 */
export function toLibraryEntries(files: ScannedWarshipFile[]): LibraryEntry[] {
  return (files || []).map(toLibraryEntry);
}

// ============== Filtering ==============

/**
 * Apply filters to a list of library entries.
 */
export function filterLibraryEntries(entries: LibraryEntry[], filters: LibraryFilters): LibraryEntry[] {
  return entries.filter((entry) => {
    // Design type filter
    if (filters.designType !== 'all' && entry.designType !== filters.designType) {
      return false;
    }

    // Ship class filter
    if (filters.shipClass !== null && entry.shipClass !== filters.shipClass) {
      return false;
    }

    // Progress level filter
    if (filters.progressLevel !== null && entry.designProgressLevel !== filters.progressLevel) {
      return false;
    }

    // Text search (case-insensitive across multiple fields)
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.trim().toLowerCase();
      const searchableFields = [
        entry.name,
        entry.hullName,
        entry.faction,
        entry.role,
        entry.classification,
        entry.manufacturer,
      ];
      const matchesSearch = searchableFields.some(
        (field) => field && field.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

// ============== Sorting ==============

/** Ship class sort order (lightest → heaviest) */
const SHIP_CLASS_ORDER: Record<ShipClass, number> = {
  'small-craft': 0,
  light: 1,
  medium: 2,
  heavy: 3,
  'super-heavy': 4,
};

/**
 * Sort library entries by the given sort configuration.
 * Returns a new sorted array (does not mutate).
 */
export function sortLibraryEntries(entries: LibraryEntry[], sort: LibrarySortConfig): LibraryEntry[] {
  const sorted = [...entries];
  const dir = sort.direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sort.field) {
      case 'name':
        cmp = (a.name || '').localeCompare(b.name || '');
        break;
      case 'modifiedAt':
        cmp = (a.modifiedAt || '').localeCompare(b.modifiedAt || '');
        break;
      case 'designType':
        cmp = (a.designType || '').localeCompare(b.designType || '');
        break;
      case 'shipClass': {
        const aOrder = a.shipClass ? SHIP_CLASS_ORDER[a.shipClass] ?? 99 : 99;
        const bOrder = b.shipClass ? SHIP_CLASS_ORDER[b.shipClass] ?? 99 : 99;
        cmp = aOrder - bOrder;
        break;
      }
      case 'progressLevel':
        cmp = (a.designProgressLevel ?? 0) - (b.designProgressLevel ?? 0);
        break;
    }
    return cmp * dir;
  });

  return sorted;
}

// ============== Default Filters & Sort ==============

export function getDefaultFilters(): LibraryFilters {
  return {
    searchText: '',
    designType: 'all',
    shipClass: null,
    progressLevel: null,
  };
}

export function getDefaultSort(): LibrarySortConfig {
  return {
    field: 'modifiedAt',
    direction: 'desc',
  };
}
