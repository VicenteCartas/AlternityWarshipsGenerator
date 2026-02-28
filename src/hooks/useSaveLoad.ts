import { useState, useCallback } from 'react';
import type { Mod } from '../types/mod';
import type { Hull } from '../types/hull';
import type { AppMode } from '../types/common';
import {
  serializeWarship,
  saveFileToJson,
  jsonToSaveFile,
  deserializeWarship,
  getDefaultFileName,
  type WarshipState,
} from '../services/saveService';
import { reloadWithSpecificMods } from '../services/dataLoader';
import { getInstalledMods } from '../services/modService';
import type { ShowNotificationFn } from './useNotification';
import type { UndoRedoControls } from './useUndoHistory';
import '../types/electron.d.ts';

export interface SaveLoadDeps {
  showNotification: ShowNotificationFn;
  buildCurrentState: () => WarshipState;
  applyState: (state: WarshipState) => void;
  undoHistory: UndoRedoControls<WarshipState>;
  selectedHull: Hull | null;
  setMode: (mode: AppMode) => void;
  setActiveStep: (step: number) => void;
  skipDirtyCheckRef: React.MutableRefObject<boolean>;
  setDesignActiveMods: React.Dispatch<React.SetStateAction<Mod[]>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Manages file save/load operations, file path tracking,
 * and the duplicate-design workflow.
 */
export function useSaveLoad({
  showNotification,
  buildCurrentState,
  applyState,
  undoHistory,
  selectedHull,
  setMode,
  setActiveStep,
  skipDirtyCheckRef,
  setDesignActiveMods,
  setHasUnsavedChanges,
}: SaveLoadDeps) {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  // Helper function to load a warship from a file path
  const loadFromFile = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.electronAPI) {
      showNotification('Load functionality requires Electron', 'error');
      return false;
    }

    try {
      const readResult = await window.electronAPI.readFile(filePath);

      if (!readResult.success || !readResult.content) {
        showNotification(`Failed to read file: ${readResult.error}`, 'error');
        return false;
      }

      const saveFile = jsonToSaveFile(readResult.content);
      if (!saveFile) {
        showNotification('Invalid warship file format', 'error');
        return false;
      }

      // Match saved mods against installed mods and apply them before deserializing
      const savedModRefs = saveFile.activeMods || [];
      const modWarnings: string[] = [];
      if (savedModRefs.length > 0) {
        const installed = await getInstalledMods();
        const matchedMods: Mod[] = [];
        for (const ref of savedModRefs) {
          const match = installed.find(m => m.manifest.name === ref.name);
          if (!match) {
            modWarnings.push(`Mod "${ref.name}" (v${ref.version}) was active when saved but is not installed. Some items may be missing.`);
          } else {
            if (match.manifest.version !== ref.version) {
              modWarnings.push(`Mod "${ref.name}" version differs: saved with v${ref.version}, currently v${match.manifest.version}.`);
            }
            matchedMods.push(match);
          }
        }
        // Sort matched mods by priority
        matchedMods.sort((a, b) => a.priority - b.priority);
        await reloadWithSpecificMods(matchedMods);
        setDesignActiveMods(matchedMods);
      } else {
        // No mods in save — apply empty mod set (base data only)
        await reloadWithSpecificMods([]);
        setDesignActiveMods([]);
      }

      const loadResult = deserializeWarship(saveFile);
      if (!loadResult.success || !loadResult.state) {
        showNotification(`Failed to load warship: ${loadResult.errors?.join(', ')}`, 'error');
        return false;
      }

      // Apply loaded state
      skipDirtyCheckRef.current = true;
      applyState(loadResult.state);
      setCurrentFilePath(filePath);
      // Add to recent files list
      window.electronAPI.addRecentFile(filePath);
      setHasUnsavedChanges(false);
      setActiveStep(0);
      // Initialize undo history with the loaded state
      undoHistory.clear();
      undoHistory.pushImmediate(loadResult.state);
      setMode('builder');

      if (loadResult.warnings && loadResult.warnings.length > 0) {
        // Combine mod match warnings with deserialize warnings, dedup
        const allWarnings = [...modWarnings, ...loadResult.warnings];
        const uniqueWarnings = [...new Set(allWarnings)];
        showNotification(`Loaded with warnings: ${uniqueWarnings.join(', ')}`, 'warning');
      } else if (modWarnings.length > 0) {
        showNotification(`Loaded with warnings: ${modWarnings.join(', ')}`, 'warning');
      } else {
        showNotification(`Loaded: ${loadResult.state.name}`, 'success');
      }
      return true;
    } catch (error) {
      showNotification(`Error loading file: ${error}`, 'error');
      return false;
    }
  }, [applyState, showNotification, setActiveStep, setDesignActiveMods, setHasUnsavedChanges, setMode, skipDirtyCheckRef, undoHistory]);

  const handleLoadWarship = useCallback(async () => {
    if (!window.electronAPI) {
      showNotification('Load functionality requires Electron', 'error');
      return;
    }

    try {
      const dialogResult = await window.electronAPI.showOpenDialog();
      if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
        return;
      }

      await loadFromFile(dialogResult.filePaths[0]);
    } catch (error) {
      showNotification(`Error loading file: ${error}`, 'error');
    }
  }, [loadFromFile, showNotification]);

  // Helper function to perform the actual save to a file path
  const saveToFile = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.electronAPI || !selectedHull) return false;

    const state = buildCurrentState();

    try {
      const saveFile = serializeWarship(state);
      const json = saveFileToJson(saveFile);
      const saveResult = await window.electronAPI.saveFile(filePath, json);

      if (saveResult.success) {
        setCurrentFilePath(filePath);
        // Add to recent files list
        window.electronAPI.addRecentFile(filePath);
        setHasUnsavedChanges(false);
        showNotification('Warship saved successfully', 'success');
        return true;
      } else {
        showNotification(`Failed to save: ${saveResult.error}`, 'error');
        return false;
      }
    } catch (error) {
      showNotification(`Error saving file: ${error}`, 'error');
      return false;
    }
  }, [selectedHull, buildCurrentState, showNotification, setCurrentFilePath, setHasUnsavedChanges]);

  // Save As - always prompts for file location
  const handleSaveWarshipAs = useCallback(async () => {
    if (!window.electronAPI) {
      showNotification('Save functionality requires Electron', 'error');
      return;
    }

    if (!selectedHull) {
      showNotification('Please select a hull before saving', 'warning');
      return;
    }

    const state = buildCurrentState();

    try {
      const defaultFileName = getDefaultFileName(state);
      const dialogResult = await window.electronAPI.showSaveDialog(defaultFileName);

      if (dialogResult.canceled || !dialogResult.filePath) {
        return;
      }

      await saveToFile(dialogResult.filePath);
    } catch (error) {
      showNotification(`Error saving file: ${error}`, 'error');
    }
  }, [selectedHull, buildCurrentState, saveToFile, showNotification]);

  // Save - saves to current file or prompts if no file yet
  const handleSaveWarship = useCallback(async () => {
    if (!window.electronAPI) {
      showNotification('Save functionality requires Electron', 'error');
      return;
    }

    if (!selectedHull) {
      showNotification('Please select a hull before saving', 'warning');
      return;
    }

    // If we have a current file path, save directly to it
    if (currentFilePath) {
      await saveToFile(currentFilePath);
      return;
    }

    // Otherwise, behave like Save As
    await handleSaveWarshipAs();
  }, [selectedHull, currentFilePath, saveToFile, handleSaveWarshipAs, showNotification]);

  // Duplicate the current design: copy state with new name, clear file path, mark unsaved
  const handleDuplicateDesign = useCallback(() => {
    if (!selectedHull) {
      showNotification('Please select a hull before duplicating', 'warning');
      return;
    }

    const state = buildCurrentState();
    const duplicatedState: WarshipState = {
      ...state,
      name: `Copy of ${state.name}`,
    };
    applyState(duplicatedState);
    setCurrentFilePath(null);
    setHasUnsavedChanges(true);
    undoHistory.clear();
    undoHistory.pushImmediate(duplicatedState);
    showNotification('Design duplicated', 'success');
  }, [selectedHull, buildCurrentState, applyState, showNotification, setCurrentFilePath, setHasUnsavedChanges, undoHistory]);

  return {
    currentFilePath,
    setCurrentFilePath,
    loadFromFile,
    handleLoadWarship,
    saveToFile,
    handleSaveWarship,
    handleSaveWarshipAs,
    handleDuplicateDesign,
  };
}
