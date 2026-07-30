/**
 * Battle library service — scanning, filtering and sorting saved engagements.
 */

import type { ScannedBattleFile } from '@shared/types/electron';

const LIBRARY_PATH_KEY = 'battle-library-path';

export type BattleSortField = 'name' | 'modified' | 'created' | 'strength' | 'rounds';
export type SortDirection = 'asc' | 'desc';

export interface BattleSortConfig {
  field: BattleSortField;
  direction: SortDirection;
}

export interface BattleLibraryEntry extends ScannedBattleFile {
  /** File name without the .battle.json extension, used when metadata is missing. */
  fileName: string;
}

/** Directory the user last browsed for engagements. */
export function getSavedBattleLibraryPath(): string | null {
  try {
    return localStorage.getItem(LIBRARY_PATH_KEY);
  } catch {
    return null;
  }
}

export function saveBattleLibraryPath(dirPath: string): void {
  try {
    localStorage.setItem(LIBRARY_PATH_KEY, dirPath);
  } catch {
    // Ignore localStorage errors
  }
}

export function toBattleLibraryEntries(files: ScannedBattleFile[]): BattleLibraryEntry[] {
  return (files || []).map((f) => ({
    ...f,
    fileName: f.filePath.split(/[\\/]/).pop()?.replace(/\.battle\.json$/i, '') ?? f.scenarioName,
  }));
}

/** Case-insensitive search across scenario name, side names and file name. */
export function filterBattleEntries(entries: BattleLibraryEntry[], searchText: string): BattleLibraryEntry[] {
  const query = searchText.trim().toLowerCase();
  if (!query) return entries;
  return entries.filter((e) =>
    [e.scenarioName, e.sideAName, e.sideBName, e.fileName]
      .some((field) => field?.toLowerCase().includes(query)),
  );
}

function compareBy(field: BattleSortField, a: BattleLibraryEntry, b: BattleLibraryEntry): number {
  switch (field) {
    case 'name':
      return a.scenarioName.localeCompare(b.scenarioName);
    case 'strength':
      return a.totalCombatStrength - b.totalCombatStrength;
    case 'rounds':
      return a.roundCount - b.roundCount;
    case 'created':
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    case 'modified':
    default:
      return (a.modifiedAt ?? '').localeCompare(b.modifiedAt ?? '');
  }
}

export function sortBattleEntries(
  entries: BattleLibraryEntry[],
  sort: BattleSortConfig,
): BattleLibraryEntry[] {
  const sorted = [...entries].sort((a, b) => compareBy(sort.field, a, b));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

/** Human-readable file size for library cards. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Short local date for library cards. Returns an em dash when unknown. */
export function formatLibraryDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
