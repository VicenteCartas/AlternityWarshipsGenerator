import { useCallback, useRef, useState } from 'react';
import type { TravelDocument } from '../types/travelDocument';
import {
  deserializeTravelDocument,
  getDefaultTravelFileName,
  jsonToTravelSaveFile,
  serializeTravelDocument,
  travelSaveFileToJson,
} from '../services/travelSaveService';

export interface TravelFileResult {
  ok: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  document?: TravelDocument;
}

const NO_ELECTRON: TravelFileResult = {
  ok: false,
  message: 'Saving and loading are only available in the desktop app.',
  severity: 'warning',
};

export function useTravelSaveLoad() {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const createdAtRef = useRef<string | undefined>(undefined);

  const writeTo = useCallback(async (
    filePath: string,
    document: TravelDocument,
  ): Promise<TravelFileResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const saveFile = serializeTravelDocument(document, createdAtRef.current);
    const result = await api.saveFile(filePath, travelSaveFileToJson(saveFile));
    if (!result.success) {
      return { ok: false, message: result.error || 'Failed to write the trip file.', severity: 'error' };
    }
    createdAtRef.current = saveFile.createdAt;
    setCurrentFilePath(filePath);
    await api.addRecentFile(filePath);
    return { ok: true, message: 'Trip saved.', severity: 'success' };
  }, []);

  const saveAs = useCallback(async (document: TravelDocument): Promise<TravelFileResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showTravelSaveDialog(getDefaultTravelFileName(document.name));
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { ok: false, message: 'Save canceled.', severity: 'info' };
    }
    return writeTo(dialogResult.filePath, document);
  }, [writeTo]);

  const save = useCallback(async (document: TravelDocument): Promise<TravelFileResult> => {
    if (!window.electronAPI) return NO_ELECTRON;
    return currentFilePath ? writeTo(currentFilePath, document) : saveAs(document);
  }, [currentFilePath, saveAs, writeTo]);

  const openPath = useCallback(async (filePath: string): Promise<TravelFileResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const result = await api.readFile(filePath);
    if (!result.success || !result.content) {
      return { ok: false, message: result.error || 'Failed to read the trip file.', severity: 'error' };
    }
    const saveFile = jsonToTravelSaveFile(result.content);
    if (!saveFile) return { ok: false, message: 'That file is not a valid trip file.', severity: 'error' };
    const loaded = deserializeTravelDocument(saveFile);
    if (!loaded.success || !loaded.document) {
      return { ok: false, message: loaded.errors?.[0] || 'The trip could not be loaded.', severity: 'error' };
    }
    createdAtRef.current = loaded.createdAt;
    setCurrentFilePath(filePath);
    await api.addRecentFile(filePath);
    return {
      ok: true,
      document: loaded.document,
      message: loaded.warnings?.length
        ? `Trip loaded with ${loaded.warnings.length} note(s): ${loaded.warnings[0]}`
        : 'Trip loaded.',
      severity: loaded.warnings?.length ? 'warning' : 'success',
    };
  }, []);

  const open = useCallback(async (): Promise<TravelFileResult> => {
    const api = window.electronAPI;
    if (!api) return NO_ELECTRON;
    const dialogResult = await api.showTravelOpenDialog();
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { ok: false, message: 'Open canceled.', severity: 'info' };
    }
    return openPath(dialogResult.filePaths[0]);
  }, [openPath]);

  const clearFile = useCallback(() => {
    createdAtRef.current = undefined;
    setCurrentFilePath(null);
  }, []);

  return { currentFilePath, save, saveAs, open, openPath, clearFile };
}
