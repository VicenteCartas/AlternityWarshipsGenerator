import { useCallback, useState } from 'react';
import { getEnabledMods } from '@shared/services/modService';
import type { BattleState } from '../types/battle';
import {
  battleSaveFileToJson, deserializeBattle, getDefaultBattleFileName,
  jsonToBattleSaveFile, serializeBattle,
} from '../services/battleSaveService';
import '@shared/types/electron.d.ts';

export interface BattleSaveLoadResult {
  ok: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface UseBattleSaveLoad {
  /** Absolute path of the file this engagement is bound to, if any. */
  currentFilePath: string | null;
  setCurrentFilePath: (path: string | null) => void;
  /** Save to the bound file, prompting for a location the first time. */
  save: (battle: BattleState) => Promise<BattleSaveLoadResult>;
  /** Always prompt for a location. */
  saveAs: (battle: BattleState) => Promise<BattleSaveLoadResult>;
  /** Prompt for a file and load it. */
  open: () => Promise<BattleSaveLoadResult & { battle?: BattleState }>;
  /** Load a specific path (used by the battle library). */
  openPath: (filePath: string) => Promise<BattleSaveLoadResult & { battle?: BattleState }>;
}

const NO_ELECTRON: BattleSaveLoadResult = {
  ok: false,
  message: 'Saving and loading are only available in the desktop app.',
  severity: 'warning',
};

/** Save/load an engagement through the native file dialogs. */
export function useBattleSaveLoad(): UseBattleSaveLoad {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const writeTo = useCallback(async (filePath: string, battle: BattleState): Promise<BattleSaveLoadResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const mods = await getEnabledMods().catch(() => []);
    const json = battleSaveFileToJson(serializeBattle(battle, mods));
    const result = await api.saveFile(filePath, json);
    if (!result.success) {
      return { ok: false, message: result.error || 'Failed to write the file.', severity: 'error' };
    }
    setCurrentFilePath(filePath);
    return { ok: true, message: 'Battle saved.', severity: 'success' };
  }, []);

  const saveAs = useCallback(async (battle: BattleState): Promise<BattleSaveLoadResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showBattleSaveDialog(getDefaultBattleFileName(battle.scenarioName));
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { ok: false, message: 'Save canceled.', severity: 'info' };
    }
    return writeTo(dialogResult.filePath, battle);
  }, [writeTo]);

  const save = useCallback(async (battle: BattleState): Promise<BattleSaveLoadResult> => {
    if (!window.electronAPI) return NO_ELECTRON;
    if (currentFilePath) return writeTo(currentFilePath, battle);
    return saveAs(battle);
  }, [currentFilePath, saveAs, writeTo]);

  const openPath = useCallback(async (filePath: string) => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const fileResult = await api.readFile(filePath);
    if (!fileResult.success || !fileResult.content) {
      return { ok: false, message: fileResult.error || 'Failed to read the file.', severity: 'error' as const };
    }
    const saveFile = jsonToBattleSaveFile(fileResult.content);
    if (!saveFile) {
      return { ok: false, message: 'That file is not a valid battle file.', severity: 'error' as const };
    }
    const loaded = deserializeBattle(saveFile);
    if (!loaded.success || !loaded.battle) {
      return {
        ok: false,
        message: loaded.errors?.[0] || 'The battle could not be loaded.',
        severity: 'error' as const,
      };
    }
    setCurrentFilePath(filePath);
    return {
      ok: true,
      battle: loaded.battle,
      message: loaded.warnings?.length
        ? `Battle loaded with ${loaded.warnings.length} note(s): ${loaded.warnings[0]}`
        : 'Battle loaded.',
      severity: loaded.warnings?.length ? ('warning' as const) : ('success' as const),
    };
  }, []);

  const open = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showBattleOpenDialog();
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { ok: false, message: 'Open canceled.', severity: 'info' as const };
    }
    return openPath(dialogResult.filePaths[0]);
  }, [openPath]);

  return { currentFilePath, setCurrentFilePath, save, saveAs, open, openPath };
}
