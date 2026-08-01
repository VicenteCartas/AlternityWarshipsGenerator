import { useCallback, useState } from 'react';
import type { CharacterState } from '../types/characterState';
import {
  characterSaveFileToJson,
  deserializeCharacter,
  getDefaultCharacterFileName,
  jsonToCharacterSaveFile,
  serializeCharacter,
} from '../services/characterSaveService';
import '@shared/types/electron.d.ts';

export interface CharacterSaveLoadResult {
  ok: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

const NO_ELECTRON: CharacterSaveLoadResult = {
  ok: false,
  message: 'Saving and loading are only available in the desktop app.',
  severity: 'warning',
};

export function useCharacterSaveLoad() {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const writeTo = useCallback(async (filePath: string, character: CharacterState): Promise<CharacterSaveLoadResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const json = characterSaveFileToJson(serializeCharacter(character));
    const result = await api.saveFile(filePath, json);
    if (!result.success) {
      return { ok: false, message: result.error || 'Failed to write the character file.', severity: 'error' };
    }
    setCurrentFilePath(filePath);
    await api.addRecentFile(filePath);
    return { ok: true, message: 'Character saved.', severity: 'success' };
  }, []);

  const saveAs = useCallback(async (character: CharacterState): Promise<CharacterSaveLoadResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showCharacterSaveDialog(getDefaultCharacterFileName(character.identity.heroName));
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { ok: false, message: 'Save canceled.', severity: 'info' };
    }
    return writeTo(dialogResult.filePath, character);
  }, [writeTo]);

  const save = useCallback(async (character: CharacterState): Promise<CharacterSaveLoadResult> => {
    if (!window.electronAPI) return NO_ELECTRON;
    return currentFilePath ? writeTo(currentFilePath, character) : saveAs(character);
  }, [currentFilePath, saveAs, writeTo]);

  const openPath = useCallback(async (filePath: string) => {
    const api = window.electronAPI;
    if (!api) return { ...NO_ELECTRON, character: undefined };
    const fileResult = await api.readFile(filePath);
    if (!fileResult.success || !fileResult.content) {
      return {
        ok: false,
        message: fileResult.error || 'Failed to read the character file.',
        severity: 'error' as const,
        character: undefined,
      };
    }
    const saveFile = jsonToCharacterSaveFile(fileResult.content);
    if (!saveFile) {
      return { ok: false, message: 'That file is not a valid character file.', severity: 'error' as const, character: undefined };
    }
    const loaded = deserializeCharacter(saveFile);
    if (!loaded.success || !loaded.character) {
      return {
        ok: false,
        message: loaded.errors?.[0] || 'The character could not be loaded.',
        severity: 'error' as const,
        character: undefined,
      };
    }
    setCurrentFilePath(filePath);
    await api.addRecentFile(filePath);
    return {
      ok: true,
      character: loaded.character,
      message: loaded.warnings?.length
        ? `Character loaded with ${loaded.warnings.length} note(s): ${loaded.warnings[0]}`
        : 'Character loaded.',
      severity: loaded.warnings?.length ? ('warning' as const) : ('success' as const),
    };
  }, []);

  const open = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return { ...NO_ELECTRON, character: undefined };
    const dialogResult = await api.showCharacterOpenDialog();
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { ok: false, message: 'Open canceled.', severity: 'info' as const, character: undefined };
    }
    return openPath(dialogResult.filePaths[0]);
  }, [openPath]);

  return { currentFilePath, setCurrentFilePath, save, saveAs, open, openPath };
}