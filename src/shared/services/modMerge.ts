/**
 * Mod merge utilities
 *
 * Generic, module-agnostic helpers for merging mod data onto base game data.
 * Extracted from dataLoader.ts so that every module (warships, battles, ...)
 * can share the same merge semantics:
 *  - "replace": the mod's section replaces the base section entirely
 *  - "add" (default): arrays are merged by id, objects are deep-merged
 */

import type { Mod } from '../types/mod';
import { getModFileData } from './modService';
import { logger } from './utilities';

/** Stable key used to match a base item against a mod item. */
function itemKey(item: Record<string, unknown>): string {
  return (item.id as string) || (item.code as string) || JSON.stringify(item);
}

/**
 * Merge two arrays of items by ID. Mod items override base items with the
 * same ID; new IDs are appended. Each mod item is tagged with _source.
 */
export function mergeArraysById<T extends Record<string, unknown>>(
  base: T[],
  mod: T[],
  sourceName: string
): T[] {
  const map = new Map<string, T>();
  for (const item of base) {
    map.set(itemKey(item), item);
  }
  for (const item of mod) {
    map.set(itemKey(item), { ...item, _source: sourceName });
  }
  return Array.from(map.values());
}

/** Tag all items in an array with a _source field. */
export function tagArraySource<T extends Record<string, unknown>>(items: T[], source: string): T[] {
  return items.map(item => (item._source ? item : { ...item, _source: source }));
}

/**
 * Deep merge two plain objects. Mod values override base values at each key.
 * Arrays are replaced, not concatenated (object-level merge only).
 */
export function deepMergeObjects<T extends Record<string, unknown>>(base: T, mod: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(mod) as (keyof T)[]) {
    const modVal = mod[key];
    const baseVal = result[key];
    if (
      modVal !== null && typeof modVal === 'object' && !Array.isArray(modVal) &&
      baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal)
    ) {
      result[key] = deepMergeObjects(
        baseVal as Record<string, unknown>,
        modVal as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = modVal as T[keyof T];
    }
  }
  return result;
}

/** Resolve per-section (rootKey) modes from a mod's fileModes map. */
export function resolveSectionModes(
  fileModes: Partial<Record<string, 'add' | 'replace'>> | undefined,
  rootKeys: string[]
): Record<string, 'add' | 'replace'> {
  if (!fileModes) return {};

  const result: Record<string, 'add' | 'replace'> = {};
  for (const key of rootKeys) {
    if (fileModes[key]) {
      result[key] = fileModes[key];
    }
  }
  return result;
}

/**
 * Apply a single mod's data for a specific file to the current file data.
 * Each section (rootKey) can have its own merge mode.
 */
export function applyModToFileData(
  baseData: Record<string, unknown>,
  modData: Record<string, unknown>,
  sectionModes: Record<string, 'add' | 'replace'>,
  modName: string
): Record<string, unknown> {
  const result = { ...baseData };

  for (const key of Object.keys(modData)) {
    const baseVal = result[key];
    const modVal = modData[key];
    const mode = sectionModes[key] ?? 'add';

    if (mode === 'replace') {
      // Replace this section entirely with mod data
      if (Array.isArray(modVal)) {
        result[key] = tagArraySource(modVal as Record<string, unknown>[], modName);
      } else {
        result[key] = modVal;
      }
    } else {
      // "add" mode: merge
      if (Array.isArray(baseVal) && Array.isArray(modVal)) {
        result[key] = mergeArraysById(baseVal as Record<string, unknown>[], modVal as Record<string, unknown>[], modName);
      } else if (
        baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal) &&
        modVal !== null && typeof modVal === 'object' && !Array.isArray(modVal)
      ) {
        result[key] = deepMergeObjects(
          baseVal as Record<string, unknown>,
          modVal as Record<string, unknown>
        );
      } else {
        // Scalar or new key — mod wins
        result[key] = modVal;
      }
    }
  }
  return result;
}

/**
 * Load all enabled mod data for a specific file and merge it onto the base data.
 */
export async function applyModsToFile(
  fileName: string,
  baseData: Record<string, unknown>,
  enabledMods: Mod[]
): Promise<Record<string, unknown>> {
  // Tag base data arrays with "base" source
  let data = { ...baseData };
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (Array.isArray(val)) {
      data[key] = tagArraySource(val as Record<string, unknown>[], 'base');
    }
  }

  for (const mod of enabledMods) {
    if (!mod.files.includes(fileName)) continue;

    const modFileData = await getModFileData(mod.folderName, fileName);
    if (!modFileData || typeof modFileData !== 'object') {
      if (import.meta.env.DEV) logger.warn(`[ModMerge] Skipping invalid mod data: ${mod.folderName}/${fileName}`);
      continue;
    }

    const sectionModes = resolveSectionModes(mod.manifest.fileModes, Object.keys(modFileData as Record<string, unknown>));
    const modeDesc = Object.keys(sectionModes).length > 0
      ? Object.entries(sectionModes).map(([k, m]) => `${k}:${m}`).join(', ')
      : 'add (default)';
    if (import.meta.env.DEV) logger.log(`[ModMerge] Applying mod "${mod.manifest.name}" [${modeDesc}] to ${fileName}`);
    data = applyModToFileData(data, modFileData as Record<string, unknown>, sectionModes, mod.manifest.name);
  }

  return data;
}
