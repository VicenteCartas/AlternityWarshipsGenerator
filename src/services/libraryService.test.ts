import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScannedWarshipFile } from '../types/electron';
import type { LibraryEntry, LibraryFilters, LibrarySortConfig } from '../types/library';
import {
  toLibraryEntry,
  toLibraryEntries,
  filterLibraryEntries,
  sortLibraryEntries,
  getDefaultFilters,
  getDefaultSort,
} from './libraryService';

// Mock hullService — return known hull data for specific IDs
vi.mock('./hullService', () => ({
  getHullById: (id: string) => {
    const hulls: Record<string, { name: string; shipClass: string }> = {
      'destroyer': { name: 'Destroyer', shipClass: 'medium' },
      'cruiser': { name: 'Heavy Cruiser', shipClass: 'heavy' },
      'fighter': { name: 'Star Fighter', shipClass: 'small-craft' },
      'frigate': { name: 'Frigate', shipClass: 'light' },
      'dreadnought': { name: 'Dreadnought', shipClass: 'super-heavy' },
    };
    return hulls[id] || undefined;
  },
}));

// ============== Test Fixtures ==============

function makeScannedFile(overrides: Partial<ScannedWarshipFile> = {}): ScannedWarshipFile {
  return {
    filePath: '/designs/test.warship.json',
    name: 'Test Ship',
    designType: 'warship',
    stationType: null,
    hullId: 'destroyer',
    designProgressLevel: 7,
    imageData: null,
    imageMimeType: null,
    faction: 'Terran Empire',
    role: 'Patrol',
    classification: 'DD',
    manufacturer: 'Consolidated Shipyards',
    modifiedAt: '2024-06-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    fileSizeBytes: 5000,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    filePath: '/designs/test.warship.json',
    name: 'Test Ship',
    designType: 'warship',
    stationType: null,
    hullId: 'destroyer',
    hullName: 'Destroyer',
    shipClass: 'medium',
    designProgressLevel: 7,
    imageData: null,
    imageMimeType: null,
    faction: 'Terran Empire',
    role: 'Patrol',
    classification: 'DD',
    manufacturer: 'Consolidated Shipyards',
    modifiedAt: '2024-06-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    fileSizeBytes: 5000,
    ...overrides,
  };
}

// ============== toLibraryEntry ==============

describe('toLibraryEntry', () => {
  it('converts a scanned file to a library entry with resolved hull', () => {
    const scanned = makeScannedFile();
    const entry = toLibraryEntry(scanned);

    expect(entry.name).toBe('Test Ship');
    expect(entry.designType).toBe('warship');
    expect(entry.hullId).toBe('destroyer');
    expect(entry.hullName).toBe('Destroyer');
    expect(entry.shipClass).toBe('medium');
    expect(entry.designProgressLevel).toBe(7);
    expect(entry.faction).toBe('Terran Empire');
    expect(entry.filePath).toBe('/designs/test.warship.json');
  });

  it('handles unknown hull ID gracefully', () => {
    const scanned = makeScannedFile({ hullId: 'unknown-hull' });
    const entry = toLibraryEntry(scanned);

    expect(entry.hullName).toBeNull();
    expect(entry.shipClass).toBeNull();
  });

  it('handles null hull ID', () => {
    const scanned = makeScannedFile({ hullId: null });
    const entry = toLibraryEntry(scanned);

    expect(entry.hullName).toBeNull();
    expect(entry.shipClass).toBeNull();
  });

  it('defaults designType to warship when not specified', () => {
    const scanned = makeScannedFile({ designType: null });
    const entry = toLibraryEntry(scanned);

    expect(entry.designType).toBe('warship');
  });

  it('preserves station type info', () => {
    const scanned = makeScannedFile({ designType: 'station', stationType: 'space-station' });
    const entry = toLibraryEntry(scanned);

    expect(entry.designType).toBe('station');
    expect(entry.stationType).toBe('space-station');
  });
});

// ============== toLibraryEntries ==============

describe('toLibraryEntries', () => {
  it('converts an array of scanned files', () => {
    const files = [
      makeScannedFile({ name: 'Ship A' }),
      makeScannedFile({ name: 'Ship B', hullId: 'cruiser' }),
    ];
    const entries = toLibraryEntries(files);

    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('Ship A');
    expect(entries[1].hullName).toBe('Heavy Cruiser');
  });

  it('handles empty array', () => {
    expect(toLibraryEntries([])).toEqual([]);
  });

  it('handles null/undefined gracefully', () => {
    expect(toLibraryEntries(null as unknown as ScannedWarshipFile[])).toEqual([]);
    expect(toLibraryEntries(undefined as unknown as ScannedWarshipFile[])).toEqual([]);
  });
});

// ============== filterLibraryEntries ==============

describe('filterLibraryEntries', () => {
  const entries: LibraryEntry[] = [
    makeEntry({ name: 'Alpha Destroyer', designType: 'warship', shipClass: 'medium', designProgressLevel: 7, faction: 'Terran', hullName: 'Destroyer' }),
    makeEntry({ name: 'Beta Station', designType: 'station', stationType: 'space-station', shipClass: null, designProgressLevel: 8, faction: 'Vargr', hullName: null }),
    makeEntry({ name: 'Gamma Fighter', designType: 'warship', shipClass: 'small-craft', designProgressLevel: 6, faction: 'Terran', role: 'Interceptor', hullName: 'Star Fighter' }),
    makeEntry({ name: 'Delta Cruiser', designType: 'warship', shipClass: 'heavy', designProgressLevel: 9, manufacturer: 'StarForge', hullName: 'Heavy Cruiser', faction: null }),
  ];

  it('returns all entries with default filters', () => {
    const result = filterLibraryEntries(entries, getDefaultFilters());
    expect(result).toHaveLength(4);
  });

  it('filters by design type', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), designType: 'station' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Beta Station');
  });

  it('filters by ship class', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), shipClass: 'heavy' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Delta Cruiser');
  });

  it('filters by progress level', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), progressLevel: 7 };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alpha Destroyer');
  });

  it('filters by search text (name)', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: 'destroyer' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alpha Destroyer');
  });

  it('filters by search text (faction)', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: 'vargr' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Beta Station');
  });

  it('search is case-insensitive', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: 'GAMMA' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gamma Fighter');
  });

  it('searches across multiple fields', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: 'starforge' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Delta Cruiser');
  });

  it('searches by role', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: 'interceptor' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gamma Fighter');
  });

  it('combines multiple filters', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), designType: 'warship', searchText: 'terran' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.name).sort()).toEqual(['Alpha Destroyer', 'Gamma Fighter']);
  });

  it('returns empty when no matches', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: 'nonexistent' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(0);
  });

  it('trims whitespace from search text', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: '  alpha  ' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alpha Destroyer');
  });

  it('ignores empty search text', () => {
    const filters: LibraryFilters = { ...getDefaultFilters(), searchText: '   ' };
    const result = filterLibraryEntries(entries, filters);
    expect(result).toHaveLength(4);
  });
});

// ============== sortLibraryEntries ==============

describe('sortLibraryEntries', () => {
  const entries: LibraryEntry[] = [
    makeEntry({ name: 'Charlie', modifiedAt: '2024-03-01T00:00:00Z', designType: 'warship', shipClass: 'heavy', designProgressLevel: 8 }),
    makeEntry({ name: 'Alpha', modifiedAt: '2024-01-01T00:00:00Z', designType: 'station', shipClass: null, designProgressLevel: 7 }),
    makeEntry({ name: 'Bravo', modifiedAt: '2024-02-01T00:00:00Z', designType: 'warship', shipClass: 'light', designProgressLevel: 6 }),
  ];

  it('sorts by name ascending', () => {
    const result = sortLibraryEntries(entries, { field: 'name', direction: 'asc' });
    expect(result.map(e => e.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by name descending', () => {
    const result = sortLibraryEntries(entries, { field: 'name', direction: 'desc' });
    expect(result.map(e => e.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('sorts by modifiedAt ascending', () => {
    const result = sortLibraryEntries(entries, { field: 'modifiedAt', direction: 'asc' });
    expect(result.map(e => e.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by modifiedAt descending', () => {
    const result = sortLibraryEntries(entries, { field: 'modifiedAt', direction: 'desc' });
    expect(result.map(e => e.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('sorts by designType ascending', () => {
    const result = sortLibraryEntries(entries, { field: 'designType', direction: 'asc' });
    // 'station' comes after 'warship' alphabetically
    expect(result[0].designType).toBe('station');
    expect(result[1].designType).toBe('warship');
  });

  it('sorts by shipClass ascending (lightest to heaviest)', () => {
    const result = sortLibraryEntries(entries, { field: 'shipClass', direction: 'asc' });
    expect(result.map(e => e.shipClass)).toEqual(['light', 'heavy', null]);
  });

  it('sorts by progressLevel ascending', () => {
    const result = sortLibraryEntries(entries, { field: 'progressLevel', direction: 'asc' });
    expect(result.map(e => e.designProgressLevel)).toEqual([6, 7, 8]);
  });

  it('sorts by progressLevel descending', () => {
    const result = sortLibraryEntries(entries, { field: 'progressLevel', direction: 'desc' });
    expect(result.map(e => e.designProgressLevel)).toEqual([8, 7, 6]);
  });

  it('does not mutate the original array', () => {
    const original = [...entries];
    sortLibraryEntries(entries, { field: 'name', direction: 'desc' });
    expect(entries.map(e => e.name)).toEqual(original.map(e => e.name));
  });

  it('handles empty array', () => {
    const result = sortLibraryEntries([], { field: 'name', direction: 'asc' });
    expect(result).toEqual([]);
  });

  it('handles null shipClass entries (pushed to end in asc order)', () => {
    const mixedEntries = [
      makeEntry({ name: 'A', shipClass: null }),
      makeEntry({ name: 'B', shipClass: 'small-craft' }),
      makeEntry({ name: 'C', shipClass: 'super-heavy' }),
    ];
    const result = sortLibraryEntries(mixedEntries, { field: 'shipClass', direction: 'asc' });
    expect(result.map(e => e.name)).toEqual(['B', 'C', 'A']);
  });
});

// ============== getDefaultFilters / getDefaultSort ==============

describe('getDefaultFilters', () => {
  it('returns empty search text', () => {
    expect(getDefaultFilters().searchText).toBe('');
  });

  it('returns "all" for design type', () => {
    expect(getDefaultFilters().designType).toBe('all');
  });

  it('returns null for ship class', () => {
    expect(getDefaultFilters().shipClass).toBeNull();
  });

  it('returns null for progress level', () => {
    expect(getDefaultFilters().progressLevel).toBeNull();
  });
});

describe('getDefaultSort', () => {
  it('sorts by modifiedAt descending', () => {
    const sort = getDefaultSort();
    expect(sort.field).toBe('modifiedAt');
    expect(sort.direction).toBe('desc');
  });
});
