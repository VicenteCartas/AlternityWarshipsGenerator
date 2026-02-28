import { useRef, useState, useCallback } from 'react';

/** Debounce interval in ms — rapid changes within this window collapse into one undo entry */
const DEBOUNCE_MS = 500;

export interface UndoRedoControls<T> {
  /** Push a new state snapshot (debounced). Ignored while isRestoring is true. */
  pushState: (state: T) => void;
  /** Push a state snapshot immediately (no debounce). Use for initial state on new/load. */
  pushImmediate: (state: T) => void;
  /** Undo to previous state. Flushes any pending debounce first. Returns the state to restore, or null. */
  undo: () => T | null;
  /** Redo to next state. Flushes any pending debounce first. Returns the state to restore, or null. */
  redo: () => T | null;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Clear all history (call on new design or file load) */
  clear: () => void;
  /** Ref that is true during undo/redo restoration — callers should check this to skip re-capturing */
  isRestoringRef: React.MutableRefObject<boolean>;
}

/**
 * Generic undo/redo history hook using snapshot-based approach.
 *
 * Design:
 * - History is an array of state snapshots with a current-index pointer.
 * - `pushState` debounces captures so rapid changes (e.g. typing) collapse into one entry.
 * - `undo`/`redo` flush any pending debounce before navigating, so no changes are lost.
 * - `isRestoring` ref is set to `true` by undo/redo — callers must check it to avoid
 *   re-capturing the restored state as a new entry.
 * - No deep cloning is performed — relies on React's immutable-state convention so
 *   snapshot properties remain valid references.
 *
 * @param maxHistory Maximum number of snapshots to keep (oldest are trimmed). Default 50.
 */
export function useUndoHistory<T>(maxHistory: number = 50): UndoRedoControls<T> {
  const historyRef = useRef<T[]>([]);
  const indexRef = useRef(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<T | null>(null);
  const isRestoringRef = useRef(false);

  // Reactive state so undo/redo buttons re-render on availability change
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateReactiveState = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  /** Push a snapshot immediately, truncating any redo branch and enforcing max history. */
  const pushImmediate = useCallback((state: T) => {
    // Cancel any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingRef.current = null;

    // Truncate redo branch
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    // Push
    historyRef.current.push(state);
    // Trim oldest if over max
    if (historyRef.current.length > maxHistory) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - maxHistory);
    }
    indexRef.current = historyRef.current.length - 1;
    updateReactiveState();
  }, [maxHistory, updateReactiveState]);

  /** Flush any pending debounced push immediately. */
  const flushPending = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (pendingRef.current !== null) {
      pushImmediate(pendingRef.current);
      pendingRef.current = null;
    }
  }, [pushImmediate]);

  /** Push a snapshot with debouncing. Consecutive calls within DEBOUNCE_MS collapse into one entry. */
  const pushState = useCallback((state: T) => {
    if (isRestoringRef.current) return;

    pendingRef.current = state;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (pendingRef.current !== null) {
        pushImmediate(pendingRef.current);
        pendingRef.current = null;
      }
    }, DEBOUNCE_MS);
  }, [pushImmediate]);

  const undo = useCallback((): T | null => {
    // Flush any pending debounce so the current (uncommitted) state is saved first
    flushPending();
    if (indexRef.current <= 0) return null;
    isRestoringRef.current = true;
    indexRef.current--;
    updateReactiveState();
    return historyRef.current[indexRef.current];
  }, [flushPending, updateReactiveState]);

  const redo = useCallback((): T | null => {
    flushPending();
    if (indexRef.current >= historyRef.current.length - 1) return null;
    isRestoringRef.current = true;
    indexRef.current++;
    updateReactiveState();
    return historyRef.current[indexRef.current];
  }, [flushPending, updateReactiveState]);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingRef.current = null;
    historyRef.current = [];
    indexRef.current = -1;
    updateReactiveState();
  }, [updateReactiveState]);

  return {
    pushState,
    pushImmediate,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    isRestoringRef: isRestoringRef,
  };
}
