import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoHistory } from './useUndoHistory';

describe('useUndoHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with canUndo and canRedo both false', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('undo returns null when empty', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBeNull();
    });

    it('redo returns null when empty', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      let redone: string | null = null;
      act(() => { redone = result.current.redo(); });
      expect(redone).toBeNull();
    });
  });

  describe('pushImmediate', () => {
    it('adds state to history', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      expect(result.current.canUndo).toBe(false); // Only one entry
      expect(result.current.canRedo).toBe(false);
    });

    it('enables canUndo after two pushes', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('truncates redo branch when pushing after undo', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.pushImmediate('C'); });
      // Undo to B
      act(() => { result.current.undo(); });
      expect(result.current.canRedo).toBe(true);
      // Push D — should truncate C
      act(() => { result.current.pushImmediate('D'); });
      expect(result.current.canRedo).toBe(false);
      // Undo should go to B, not C
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBe('B');
    });
  });

  describe('pushState (debounced)', () => {
    it('does not commit before debounce interval', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('initial'); });
      act(() => { result.current.pushState('change1'); });
      // Not yet committed
      expect(result.current.canUndo).toBe(false);
    });

    it('commits after debounce interval (500ms)', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('initial'); });
      act(() => { result.current.pushState('change1'); });
      act(() => { vi.advanceTimersByTime(500); });
      expect(result.current.canUndo).toBe(true);
    });

    it('collapses rapid changes into one entry', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('initial'); });
      // Rapid changes within debounce window
      act(() => { result.current.pushState('change1'); });
      act(() => { vi.advanceTimersByTime(200); });
      act(() => { result.current.pushState('change2'); });
      act(() => { vi.advanceTimersByTime(200); });
      act(() => { result.current.pushState('change3'); });
      act(() => { vi.advanceTimersByTime(500); });
      // Should have only 2 entries: initial + change3 (the last rapid change)
      expect(result.current.canUndo).toBe(true);
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBe('initial');
      expect(result.current.canUndo).toBe(false); // Only initial left
    });

    it('is ignored when isRestoring is true', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('initial'); });
      result.current.isRestoring.current = true;
      act(() => { result.current.pushState('should-be-ignored'); });
      act(() => { vi.advanceTimersByTime(500); });
      expect(result.current.canUndo).toBe(false);
      result.current.isRestoring.current = false;
    });
  });

  describe('undo', () => {
    it('returns the previous state', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBe('A');
    });

    it('enables canRedo after undo', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.undo(); });
      expect(result.current.canRedo).toBe(true);
    });

    it('returns null when at the beginning', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBeNull();
    });

    it('sets isRestoring to true', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.undo(); });
      expect(result.current.isRestoring.current).toBe(true);
    });

    it('flushes pending debounce before undoing', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      // Push a debounced state (not yet committed)
      act(() => { result.current.pushState('B'); });
      // Undo should flush B first, then undo to A
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBe('A');
    });

    it('supports multiple consecutive undos', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.pushImmediate('C'); });
      let state: string | null = null;
      act(() => { state = result.current.undo(); });
      expect(state).toBe('B');
      act(() => { state = result.current.undo(); });
      expect(state).toBe('A');
      act(() => { state = result.current.undo(); });
      expect(state).toBeNull(); // At beginning
    });
  });

  describe('redo', () => {
    it('returns the next state after undo', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.undo(); });
      let redone: string | null = null;
      act(() => { redone = result.current.redo(); });
      expect(redone).toBe('B');
    });

    it('returns null when at the end', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      let redone: string | null = null;
      act(() => { redone = result.current.redo(); });
      expect(redone).toBeNull();
    });

    it('disables canRedo after redoing to the end', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.undo(); });
      act(() => { result.current.redo(); });
      expect(result.current.canRedo).toBe(false);
    });

    it('sets isRestoring to true', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.undo(); });
      result.current.isRestoring.current = false;
      act(() => { result.current.redo(); });
      expect(result.current.isRestoring.current).toBe(true);
    });

    it('supports undo-redo-undo cycle', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.pushImmediate('C'); });
      let state: string | null = null;
      // Undo to B
      act(() => { state = result.current.undo(); });
      expect(state).toBe('B');
      // Redo to C
      act(() => { state = result.current.redo(); });
      expect(state).toBe('C');
      // Undo back to B
      act(() => { state = result.current.undo(); });
      expect(state).toBe('B');
    });
  });

  describe('clear', () => {
    it('resets all history', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.clear(); });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('undo returns null after clear', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.clear(); });
      let undone: string | null = null;
      act(() => { undone = result.current.undo(); });
      expect(undone).toBeNull();
    });

    it('cancels pending debounced push', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushState('B'); });
      act(() => { result.current.clear(); });
      act(() => { vi.advanceTimersByTime(500); });
      // B should NOT have been committed
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('maxHistory', () => {
    it('trims oldest entries when exceeding max', () => {
      const { result } = renderHook(() => useUndoHistory<number>(3));
      act(() => { result.current.pushImmediate(1); });
      act(() => { result.current.pushImmediate(2); });
      act(() => { result.current.pushImmediate(3); });
      act(() => { result.current.pushImmediate(4); });
      // Should have [2, 3, 4] — entry 1 trimmed
      let state: number | null = null;
      act(() => { state = result.current.undo(); });
      expect(state).toBe(3);
      act(() => { state = result.current.undo(); });
      expect(state).toBe(2);
      act(() => { state = result.current.undo(); });
      expect(state).toBeNull(); // 1 was trimmed
    });

    it('respects default maxHistory of 50', () => {
      const { result } = renderHook(() => useUndoHistory<number>());
      // Push 55 items
      for (let i = 0; i < 55; i++) {
        act(() => { result.current.pushImmediate(i); });
      }
      // Should be able to undo 49 times (50 entries, current is at index 49)
      let count = 0;
      let state: number | null = null;
      act(() => { state = result.current.undo(); });
      while (state !== null) {
        count++;
        const s = state; // capture for closure
        act(() => { state = result.current.undo(); });
        if (state !== null || s !== null) { /* continue */ }
      }
      expect(count).toBe(49);
    });
  });

  describe('complex scenarios', () => {
    it('handles push-undo-push sequence correctly', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushImmediate('B'); });
      act(() => { result.current.pushImmediate('C'); });
      // Undo to B
      act(() => { result.current.undo(); });
      // Push D — C is discarded
      act(() => { result.current.pushImmediate('D'); });
      expect(result.current.canRedo).toBe(false);
      // History is now [A, B, D]
      let state: string | null = null;
      act(() => { state = result.current.undo(); });
      expect(state).toBe('B');
      act(() => { state = result.current.undo(); });
      expect(state).toBe('A');
    });

    it('works with object state (by reference)', () => {
      interface TestState { value: number; label: string }
      const { result } = renderHook(() => useUndoHistory<TestState>());
      const s1 = { value: 1, label: 'one' };
      const s2 = { value: 2, label: 'two' };
      act(() => { result.current.pushImmediate(s1); });
      act(() => { result.current.pushImmediate(s2); });
      let undone: TestState | null = null;
      act(() => { undone = result.current.undo(); });
      // Should return the same reference (no deep clone)
      expect(undone).toBe(s1);
    });

    it('flush on undo then redo returns the flushed state', () => {
      const { result } = renderHook(() => useUndoHistory<string>());
      act(() => { result.current.pushImmediate('A'); });
      act(() => { result.current.pushState('B'); }); // pending
      // Undo flushes B, then undoes to A
      act(() => { result.current.undo(); });
      // Redo should go back to B
      let redone: string | null = null;
      act(() => { redone = result.current.redo(); });
      expect(redone).toBe('B');
    });
  });
});
