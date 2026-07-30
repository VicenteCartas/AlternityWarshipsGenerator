/**
 * Mod system type definitions
 *
 * Defines the structure of mod manifests, runtime mod state,
 * persistent mod settings, and the .altmod.json sharing format.
 */

/**
 * Modules of the suite that a mod can target.
 * Mods without an explicit module are treated as warships mods, so mods
 * authored before the battles module existed keep working unchanged.
 */
export type ModuleId = 'warships' | 'battles';

export const DEFAULT_MOD_MODULE: ModuleId = 'warships';

/**
 * Mod manifest stored as mod.json inside each mod folder.
 * Contains metadata and merge modes for the mod.
 */
export interface ModManifest {
  name: string;
  author: string;
  version: string;
  description: string;
  /** Which suite module this mod applies to. Defaults to "warships" when absent. */
  module?: ModuleId;
  /** Per-section merge mode, keyed by rootKey (e.g. "beamWeapons", "hulls").
   * "add" = merge with base; "replace" = override base. Defaults to "add" if not specified. */
  fileModes?: Partial<Record<string, 'add' | 'replace'>>;
}

/**
 * Runtime representation of an installed mod.
 * Combines the on-disk manifest with user settings.
 */
export interface Mod {
  manifest: ModManifest;
  /** Directory name inside <userData>/mods/ */
  folderName: string;
  enabled: boolean;
  /** Higher priority = loaded later = wins ID conflicts */
  priority: number;
  /** Which data files this mod provides (e.g., ["hulls.json", "weapons.json"]) */
  files: string[];
}

/**
 * Persisted mod settings stored in <userData>/mod-settings.json.
 * Tracks enabled/disabled state and priority for each mod folder.
 */
export interface ModSettings {
  mods: ModSettingsEntry[];
}

export interface ModSettingsEntry {
  folderName: string;
  enabled: boolean;
  priority: number;
}

/**
 * Source tag mixed into data items at runtime (never persisted to files).
 * Indicates whether an item comes from base data or a specific mod.
 */
export interface ModSourceTag {
  _source?: string;
}

/**
 * Valid data file names that warships mods can provide.
 * Must match the files loaded by dataLoader.ts.
 */
export const WARSHIPS_MOD_DATA_FILES = [
  'techTracks.json',
  'hulls.json',
  'armor.json',
  'powerPlants.json',
  'fuelTank.json',
  'engines.json',
  'ftlDrives.json',
  'supportSystems.json',
  'weapons.json',
  'ordnance.json',
  'defenses.json',
  'sensors.json',
  'commandControl.json',
  'hangarMisc.json',
  'damageDiagram.json',
] as const;

/**
 * Valid data file names that battles mods can provide.
 * Must match the files loaded by battlesDataLoader.ts.
 */
export const BATTLES_MOD_DATA_FILES = [
  'spaceUnits.json',
  'groundUnits.json',
  'battleRules.json',
] as const;

/** Every data file name any mod can provide, across all modules. */
export const MOD_DATA_FILES = [
  ...WARSHIPS_MOD_DATA_FILES,
  ...BATTLES_MOD_DATA_FILES,
] as const;

export type WarshipsModDataFileName = typeof WARSHIPS_MOD_DATA_FILES[number];
export type BattlesModDataFileName = typeof BATTLES_MOD_DATA_FILES[number];
export type ModDataFileName = typeof MOD_DATA_FILES[number];

/** Data files belonging to a given module. */
export const MOD_DATA_FILES_BY_MODULE: Record<ModuleId, readonly ModDataFileName[]> = {
  warships: WARSHIPS_MOD_DATA_FILES,
  battles: BATTLES_MOD_DATA_FILES,
};

/**
 * .altmod.json format for sharing mods as a single file.
 */
export interface AltmodFile {
  formatVersion: '1.0';
  manifest: ModManifest;
  /** Map of data file name → file contents (parsed JSON) */
  files: Partial<Record<ModDataFileName, unknown>>;
}

/**
 * Mod reference stored in save files to track which mods were active.
 */
export interface SavedModReference {
  name: string;
  version: string;
}
