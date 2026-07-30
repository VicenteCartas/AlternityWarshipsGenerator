import { useCallback, useEffect, useRef } from 'react';
import type { BattleState } from '../types/battle';
import { battleSaveFileToJson, serializeBattle } from '../services/battleSaveService';
import '@shared/types/electron.d.ts';

/** Auto-save interval in milliseconds (60 seconds) */
const AUTO_SAVE_INTERVAL_MS = 60_000;

export interface BattleAutoSaveDeps {
  /** Only auto-save while the builder is on screen. */
  active: boolean;
  hasUnsavedChanges: boolean;
  getBattle: () => BattleState;
}

/**
 * Periodically writes the current engagement to a recovery file.
 * The recovery file is deleted as soon as the engagement is saved normally.
 */
export function useBattleAutoSave({ active, hasUnsavedChanges, getBattle }: BattleAutoSaveDeps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doAutoSave = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const json = battleSaveFileToJson(serializeBattle(getBattle()));
      await window.electronAPI.writeBattleAutoSave(json);
    } catch {
      // Auto-save is best-effort
    }
  }, [getBattle]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (active && hasUnsavedChanges && window.electronAPI) {
      doAutoSave();
      timerRef.current = setInterval(doAutoSave, AUTO_SAVE_INTERVAL_MS);
    }

    if (!hasUnsavedChanges && window.electronAPI) {
      window.electronAPI.deleteBattleAutoSave().catch(() => {});
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, hasUnsavedChanges, doAutoSave]);
}

/** Read the recovery file, if one exists. */
export async function checkForBattleAutoSave(): Promise<string | null> {
  if (!window.electronAPI) return null;
  try {
    const result = await window.electronAPI.readBattleAutoSave();
    return result.success && result.content ? result.content : null;
  } catch {
    return null;
  }
}

/** Delete the recovery file after recovery or dismissal. */
export async function clearBattleAutoSave(): Promise<void> {
  if (!window.electronAPI) return;
  try {
    await window.electronAPI.deleteBattleAutoSave();
  } catch {
    // Ignore
  }
}
