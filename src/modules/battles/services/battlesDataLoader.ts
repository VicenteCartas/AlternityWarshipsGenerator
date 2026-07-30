/**
 * Battles Data Loader
 *
 * Runtime loading of the battle resolution data files, with the same
 * externally-editable + moddable pipeline the warships module uses:
 * base JSON is read from the module's data directory via Electron IPC
 * (falling back to bundled data in dev/web), then enabled battles mods are
 * merged in priority order.
 */

import type { Mod, ModuleId } from '@shared/types/mod';
import { BATTLES_MOD_DATA_FILES, DEFAULT_MOD_MODULE } from '@shared/types/mod';
import { applyModsToFile } from '@shared/services/modMerge';
import { logger } from '@shared/services/utilities';
import type { BattleRules, BattleUnitType } from '../types/battle';

import spaceUnitsFallback from '../data/spaceUnits.json';
import groundUnitsFallback from '../data/groundUnits.json';
import battleRulesFallback from '../data/battleRules.json';

const MODULE: ModuleId = 'battles';

export interface BattlesDataLoadResult {
  failedFiles: { fileName: string; reason: string }[];
}

interface BattlesCache {
  ships: BattleUnitType[];
  troops: BattleUnitType[];
  armorUnits: BattleUnitType[];
  artillery: BattleUnitType[];
  fortifications: BattleUnitType[];
  rules: BattleRules;
}

function fallbackCache(): BattlesCache {
  return {
    ships: (spaceUnitsFallback as { ships: BattleUnitType[] }).ships,
    troops: (groundUnitsFallback as { troops: BattleUnitType[] }).troops,
    armorUnits: (groundUnitsFallback as { armorUnits: BattleUnitType[] }).armorUnits,
    artillery: (groundUnitsFallback as { artillery: BattleUnitType[] }).artillery,
    fortifications: (groundUnitsFallback as { fortifications: BattleUnitType[] }).fortifications,
    rules: battleRulesFallback as BattleRules,
  };
}

async function loadDataFile<T>(
  fileName: string,
  fallbackData: T,
  failedFiles: { fileName: string; reason: string }[],
): Promise<T> {
  if (!window.electronAPI) return fallbackData;

  try {
    const result = await window.electronAPI.readDataFile(fileName, MODULE);
    if (result.success && result.content) {
      return JSON.parse(result.content) as T;
    }
    failedFiles.push({ fileName, reason: result.error || 'Unknown error' });
    return fallbackData;
  } catch (error) {
    failedFiles.push({ fileName, reason: error instanceof Error ? error.message : 'Unknown error' });
    return fallbackData;
  }
}

/** Mods that target the battles module. */
export function filterBattlesMods(mods: Mod[]): Mod[] {
  return mods.filter(
    (m) => (m.manifest.module ?? DEFAULT_MOD_MODULE) === MODULE
           && m.files.some((f) => (BATTLES_MOD_DATA_FILES as readonly string[]).includes(f)),
  );
}

export interface BattlesDataStore {
  loadBattlesData(mods?: Mod[]): Promise<BattlesDataLoadResult>;
  isLoaded(): boolean;
  reloadWithMods(mods: Mod[]): Promise<void>;
  getShips(): BattleUnitType[];
  getTroops(): BattleUnitType[];
  getArmorUnits(): BattleUnitType[];
  getArtillery(): BattleUnitType[];
  getFortifications(): BattleUnitType[];
  getRules(): BattleRules;
}

export function createBattlesDataStore(): BattlesDataStore {
  let cache: BattlesCache = fallbackCache();
  let raw: {
    spaceUnits: Record<string, unknown>;
    groundUnits: Record<string, unknown>;
    battleRules: Record<string, unknown>;
  } | null = null;
  let loaded = false;
  let loadPromise: Promise<BattlesDataLoadResult> | null = null;

  function populate(
    spaceUnits: Record<string, unknown>,
    groundUnits: Record<string, unknown>,
    rules: Record<string, unknown>,
  ): void {
    cache = {
      ships: (spaceUnits.ships as BattleUnitType[]) || [],
      troops: (groundUnits.troops as BattleUnitType[]) || [],
      armorUnits: (groundUnits.armorUnits as BattleUnitType[]) || [],
      artillery: (groundUnits.artillery as BattleUnitType[]) || [],
      fortifications: (groundUnits.fortifications as BattleUnitType[]) || [],
      rules: rules as unknown as BattleRules,
    };
  }

  async function applyMods(mods: Mod[]): Promise<void> {
    if (!raw) return;
    const battlesMods = filterBattlesMods(mods);
    const [spaceUnits, groundUnits, rules] = await Promise.all([
      applyModsToFile('spaceUnits.json', raw.spaceUnits, battlesMods),
      applyModsToFile('groundUnits.json', raw.groundUnits, battlesMods),
      applyModsToFile('battleRules.json', raw.battleRules, battlesMods),
    ]);
    populate(spaceUnits, groundUnits, rules);
  }

  async function load(mods: Mod[] = []): Promise<BattlesDataLoadResult> {
    const failedFiles: { fileName: string; reason: string }[] = [];

    const [spaceUnits, groundUnits, battleRules] = await Promise.all([
      loadDataFile('spaceUnits.json', spaceUnitsFallback as Record<string, unknown>, failedFiles),
      loadDataFile('groundUnits.json', groundUnitsFallback as Record<string, unknown>, failedFiles),
      loadDataFile('battleRules.json', battleRulesFallback as Record<string, unknown>, failedFiles),
    ]);

    raw = { spaceUnits, groundUnits, battleRules };
    populate(spaceUnits, groundUnits, battleRules);
    await applyMods(mods);
    loaded = true;

    if (failedFiles.length > 0 && import.meta.env.DEV) {
      logger.warn('[BattlesDataLoader] Some files fell back to bundled data:', failedFiles);
    }
    return { failedFiles };
  }

  return {
    loadBattlesData(mods: Mod[] = []) {
      if (!loadPromise) loadPromise = load(mods);
      return loadPromise;
    },
    isLoaded: () => loaded,
    reloadWithMods: (mods: Mod[]) => applyMods(mods),
    getShips: () => cache.ships,
    getTroops: () => cache.troops,
    getArmorUnits: () => cache.armorUnits,
    getArtillery: () => cache.artillery,
    getFortifications: () => cache.fortifications,
    getRules: () => cache.rules,
  };
}

const defaultStore = createBattlesDataStore();

export const loadBattlesData = defaultStore.loadBattlesData;
export const isBattlesDataLoaded = defaultStore.isLoaded;
export const reloadBattlesDataWithMods = defaultStore.reloadWithMods;
export const getShipsData = defaultStore.getShips;
export const getTroopsData = defaultStore.getTroops;
export const getArmorUnitsData = defaultStore.getArmorUnits;
export const getArtilleryData = defaultStore.getArtillery;
export const getFortificationsData = defaultStore.getFortifications;
export const getBattleRules = defaultStore.getRules;

/** Every ground-domain unit in one list, in catalogue order. */
export function getAllGroundUnits(): BattleUnitType[] {
  return [
    ...defaultStore.getTroops(),
    ...defaultStore.getArmorUnits(),
    ...defaultStore.getArtillery(),
    ...defaultStore.getFortifications(),
  ];
}
