import { useEffect, useRef, useCallback } from 'react';
import type { AppMode } from '../types/common';
import { serializeWarship, saveFileToJson, type WarshipState } from '../services/saveService';
import '../types/electron.d.ts';

/** Auto-save interval in milliseconds (60 seconds) */
const AUTO_SAVE_INTERVAL_MS = 60_000;

export interface AutoSaveDeps {
  mode: AppMode;
  hasUnsavedChanges: boolean;
  buildCurrentState: () => WarshipState;
  selectedHull: unknown;
}

/**
 * Periodically auto-saves the current design to a temp file.
 * Only active when mode === 'builder', hasUnsavedChanges is true, and a hull is selected.
 * Clears the auto-save on successful manual save (hasUnsavedChanges goes false).
 */
export function useAutoSave({
  mode,
  hasUnsavedChanges,
  buildCurrentState,
  selectedHull,
}: AutoSaveDeps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doAutoSave = useCallback(async () => {
    if (!window.electronAPI || !selectedHull) return;
    try {
      const state = buildCurrentState();
      const saveFile = serializeWarship(state);
      const json = saveFileToJson(saveFile);
      await window.electronAPI.writeAutoSave(json);
    } catch {
      // Silently fail — auto-save is best-effort
    }
  }, [buildCurrentState, selectedHull]);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only auto-save when in builder mode with unsaved changes
    if (mode === 'builder' && hasUnsavedChanges && selectedHull && window.electronAPI) {
      // Do an immediate auto-save, then periodic
      doAutoSave();
      timerRef.current = setInterval(doAutoSave, AUTO_SAVE_INTERVAL_MS);
    }

    // When changes are saved (hasUnsavedChanges goes false), delete auto-save
    if (!hasUnsavedChanges && window.electronAPI) {
      window.electronAPI.deleteAutoSave().catch(() => {});
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mode, hasUnsavedChanges, selectedHull, doAutoSave]);
}

/**
 * Check for an auto-save file and return its content if found.
 * Returns null if no auto-save exists or if not running in Electron.
 */
export async function checkForAutoSave(): Promise<string | null> {
  if (!window.electronAPI) return null;
  try {
    const result = await window.electronAPI.readAutoSave();
    if (result.success && result.content) {
      return result.content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Delete the auto-save file (call after successful recovery or dismissal).
 */
export async function clearAutoSave(): Promise<void> {
  if (!window.electronAPI) return;
  try {
    await window.electronAPI.deleteAutoSave();
  } catch {
    // Ignore
  }
}
