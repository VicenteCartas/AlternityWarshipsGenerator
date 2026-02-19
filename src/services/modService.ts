/**
 * Mod Service
 *
 * Provides a renderer-side API for managing mods.
 * Wraps Electron IPC calls and handles mod settings persistence.
 */

import type { Mod, ModManifest, ModSettings } from '../types/mod';

/**
 * Get all installed mods with their settings (enabled/disabled, priority).
 */
export async function getInstalledMods(): Promise<Mod[]> {
  if (!window.electronAPI) return [];
  const result = await window.electronAPI.listMods();
  if (!result.success) {
    console.error('[ModService] Failed to list mods:', result.error);
    return [];
  }
  return result.mods || [];
}

/**
 * Get only enabled mods, sorted by priority (lowest first → highest last).
 * Higher priority mods are applied later and win ID conflicts.
 */
export async function getEnabledMods(): Promise<Mod[]> {
  const mods = await getInstalledMods();
  return mods
    .filter(m => m.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Update mod settings (enabled/disabled state and priorities).
 */
export async function updateModSettings(settings: ModSettings): Promise<boolean> {
  if (!window.electronAPI) return false;
  const result = await window.electronAPI.updateModSettings(JSON.stringify(settings));
  if (!result.success) {
    console.error('[ModService] Failed to update mod settings:', result.error);
  }
  return result.success;
}

/**
 * Enable or disable a specific mod by folder name.
 */
export async function setModEnabled(folderName: string, enabled: boolean): Promise<boolean> {
  const mods = await getInstalledMods();
  const settings: ModSettings = {
    mods: mods.map(m => ({
      folderName: m.folderName,
      enabled: m.folderName === folderName ? enabled : m.enabled,
      priority: m.priority,
    })),
  };
  return updateModSettings(settings);
}

/**
 * Update the priority of a specific mod.
 */
export async function setModPriority(folderName: string, priority: number): Promise<boolean> {
  const mods = await getInstalledMods();
  const settings: ModSettings = {
    mods: mods.map(m => ({
      folderName: m.folderName,
      enabled: m.enabled,
      priority: m.folderName === folderName ? priority : m.priority,
    })),
  };
  return updateModSettings(settings);
}

/**
 * Create a new mod with the given manifest.
 * Returns true on success.
 */
export async function createMod(manifest: ModManifest): Promise<boolean> {
  if (!window.electronAPI) return false;
  const folderName = manifest.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const result = await window.electronAPI.createMod(folderName, JSON.stringify(manifest, null, 2));
  if (!result.success) {
    console.error('[ModService] Failed to create mod:', result.error);
  }
  return result.success;
}

/**
 * Delete a mod by folder name.
 * Returns true on success.
 */
export async function deleteMod(folderName: string): Promise<boolean> {
  if (!window.electronAPI) return false;
  const result = await window.electronAPI.deleteMod(folderName);
  if (!result.success) {
    console.error('[ModService] Failed to delete mod:', result.error);
  }
  return result.success;
}

/**
 * Read a specific data file from a mod folder.
 * Returns parsed JSON data or null on failure.
 */
export async function getModFileData(folderName: string, fileName: string): Promise<unknown | null> {
  if (!window.electronAPI) return null;
  const result = await window.electronAPI.readModFile(folderName, fileName);
  if (!result.success || !result.content) {
    return null;
  }
  try {
    return JSON.parse(result.content);
  } catch {
    console.error(`[ModService] Failed to parse ${fileName} from mod ${folderName}`);
    return null;
  }
}

/**
 * Save a data file to a mod folder.
 * Data should be the object to serialize as JSON.
 */
export async function saveModFileData(folderName: string, fileName: string, data: unknown): Promise<boolean> {
  if (!window.electronAPI) return false;
  const result = await window.electronAPI.saveModFile(folderName, fileName, JSON.stringify(data, null, 2));
  if (!result.success) {
    console.error(`[ModService] Failed to save ${fileName} to mod ${folderName}:`, result.error);
  }
  return result.success;
}

/**
 * Export a mod to .altmod.json file via save dialog.
 */
export async function exportMod(folderName: string): Promise<boolean> {
  if (!window.electronAPI) return false;
  const result = await window.electronAPI.exportMod(folderName);
  return result.success;
}

/**
 * Import a mod from .altmod.json file via open dialog.
 * Returns the folder name of the imported mod, or null on failure/cancel.
 */
export async function importMod(): Promise<string | null> {
  if (!window.electronAPI) return null;
  const result = await window.electronAPI.importMod();
  if (!result.success) return null;
  return result.folderName || null;
}

/**
 * Get the path to the mods directory.
 */
export async function getModsDirectoryPath(): Promise<string | null> {
  if (!window.electronAPI) return null;
  return window.electronAPI.getModsPath();
}
