import { useCallback, useRef, useState } from 'react';
import type { CivilizationDesign } from '../types/worldbuilding';
import type {
  CivilizationSaveFile,
  StarSystemDocument,
  StarSystemSaveFile,
} from '../types/campaignSaveFile';
import {
  campaignSaveFileToJson,
  deserializeCivilization,
  deserializeStarSystem,
  getDefaultCivilizationFileName,
  getDefaultSystemFileName,
  jsonToCivilizationSaveFile,
  jsonToStarSystemSaveFile,
  serializeCivilization,
  serializeStarSystem,
  type CampaignLoadResult,
} from '../services/campaignSaveService';

export interface CampaignFileResult<T> {
  ok: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  value?: T;
}

interface CampaignSaveLoadOptions<T, TSaveFile> {
  kind: 'system' | 'civilization';
  label: string;
  defaultFileName: (value: T) => string;
  serialize: (value: T, createdAt?: string) => TSaveFile;
  parse: (json: string) => TSaveFile | null;
  deserialize: (saveFile: TSaveFile) => CampaignLoadResult<T>;
}

const NO_ELECTRON = {
  ok: false,
  message: 'Saving and loading are only available in the desktop app.',
  severity: 'warning' as const,
};

function useCampaignSaveLoad<T, TSaveFile>(options: CampaignSaveLoadOptions<T, TSaveFile>) {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const createdAtRef = useRef<string | undefined>(undefined);

  const writeTo = useCallback(async (filePath: string, value: T): Promise<CampaignFileResult<T>> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const saveFile = options.serialize(value, createdAtRef.current);
    const result = await api.saveFile(filePath, campaignSaveFileToJson(saveFile as StarSystemSaveFile | CivilizationSaveFile));
    if (!result.success) return { ok: false, message: result.error || 'Failed to write the file.', severity: 'error' };
    createdAtRef.current = (saveFile as StarSystemSaveFile | CivilizationSaveFile).createdAt;
    setCurrentFilePath(filePath);
    await api.addRecentFile(filePath);
    return { ok: true, message: `${options.label} saved.`, severity: 'success' };
  }, [options]);

  const saveAs = useCallback(async (value: T): Promise<CampaignFileResult<T>> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showCampaignSaveDialog(options.kind, options.defaultFileName(value));
    if (dialogResult.canceled || !dialogResult.filePath) return { ok: false, message: 'Save canceled.', severity: 'info' };
    return writeTo(dialogResult.filePath, value);
  }, [options, writeTo]);

  const save = useCallback(async (value: T): Promise<CampaignFileResult<T>> => {
    if (!window.electronAPI) return NO_ELECTRON;
    return currentFilePath ? writeTo(currentFilePath, value) : saveAs(value);
  }, [currentFilePath, saveAs, writeTo]);

  const openPath = useCallback(async (filePath: string): Promise<CampaignFileResult<T>> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const fileResult = await api.readFile(filePath);
    if (!fileResult.success || !fileResult.content) {
      return { ok: false, message: fileResult.error || 'Failed to read the file.', severity: 'error' };
    }
    const parsed = options.parse(fileResult.content);
    if (!parsed) return { ok: false, message: `That file is not a valid ${options.label.toLocaleLowerCase()} file.`, severity: 'error' };
    const loaded = options.deserialize(parsed);
    if (!loaded.success || !loaded.value) {
      return { ok: false, message: loaded.errors?.[0] || `The ${options.label.toLocaleLowerCase()} could not be loaded.`, severity: 'error' };
    }
    createdAtRef.current = loaded.createdAt;
    setCurrentFilePath(filePath);
    await api.addRecentFile(filePath);
    return {
      ok: true,
      value: loaded.value,
      message: loaded.warnings?.length
        ? `${options.label} loaded with ${loaded.warnings.length} note(s): ${loaded.warnings[0]}`
        : `${options.label} loaded.`,
      severity: loaded.warnings?.length ? 'warning' : 'success',
    };
  }, [options]);

  const open = useCallback(async (): Promise<CampaignFileResult<T>> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showCampaignOpenDialog(options.kind);
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) return { ok: false, message: 'Open canceled.', severity: 'info' };
    return openPath(dialogResult.filePaths[0]);
  }, [openPath, options.kind]);

  const clearFile = useCallback(() => {
    createdAtRef.current = undefined;
    setCurrentFilePath(null);
  }, []);

  return { currentFilePath, save, saveAs, open, openPath, clearFile };
}

export function useStarSystemSaveLoad() {
  return useCampaignSaveLoad<StarSystemDocument, StarSystemSaveFile>({
    kind: 'system',
    label: 'Star system',
    defaultFileName: (document) => getDefaultSystemFileName(document.name),
    serialize: serializeStarSystem,
    parse: jsonToStarSystemSaveFile,
    deserialize: deserializeStarSystem,
  });
}

export function useCivilizationSaveLoad() {
  return useCampaignSaveLoad<CivilizationDesign, CivilizationSaveFile>({
    kind: 'civilization',
    label: 'Civilization',
    defaultFileName: (civilization) => getDefaultCivilizationFileName(civilization.name),
    serialize: serializeCivilization,
    parse: jsonToCivilizationSaveFile,
    deserialize: deserializeCivilization,
  });
}
