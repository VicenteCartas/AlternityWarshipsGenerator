/**
 * Mock factory for window.electronAPI used in integration tests.
 *
 * Menu event listeners (`onXxx`) capture the callback so tests can trigger
 * menu actions via `triggerMenuEvent(name)`.
 */
import { vi } from 'vitest';
import type { ElectronAPI } from '../types/electron.d.ts';

type MenuEventName =
  | 'onNewWarship'
  | 'onLoadWarship'
  | 'onSaveWarship'
  | 'onSaveWarshipAs'
  | 'onOpenRecent'
  | 'onShowAbout'
  | 'onShowShortcuts'
  | 'onDuplicateDesign'
  | 'onReturnToStart';

/**
 * Creates a complete mock ElectronAPI. Menu event listeners store their
 * callbacks so they can be invoked from tests.
 */
export function createMockElectronAPI() {
  const menuCallbacks: Partial<Record<MenuEventName, (...args: unknown[]) => void>> = {};

  const api: ElectronAPI = {
    // Menu event listeners — store the callback
    onNewWarship: vi.fn((cb) => { menuCallbacks.onNewWarship = cb; }),
    onLoadWarship: vi.fn((cb) => { menuCallbacks.onLoadWarship = cb; }),
    onSaveWarship: vi.fn((cb) => { menuCallbacks.onSaveWarship = cb; }),
    onSaveWarshipAs: vi.fn((cb) => { menuCallbacks.onSaveWarshipAs = cb; }),
    onOpenRecent: vi.fn((cb) => { menuCallbacks.onOpenRecent = cb; }),
    onShowAbout: vi.fn((cb) => { menuCallbacks.onShowAbout = cb; }),
    onShowShortcuts: vi.fn((cb) => { menuCallbacks.onShowShortcuts = cb; }),
    onDuplicateDesign: vi.fn((cb) => { menuCallbacks.onDuplicateDesign = cb; }),
    onReturnToStart: vi.fn((cb) => { menuCallbacks.onReturnToStart = cb; }),
    removeAllListeners: vi.fn(),

    // File operations
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    saveFile: vi.fn().mockResolvedValue({ success: true }),
    readFile: vi.fn().mockResolvedValue({ success: true, content: '{}' }),

    // Data file operations
    readDataFile: vi.fn().mockResolvedValue({ success: false, error: 'test-mode' }),
    getDataPath: vi.fn().mockResolvedValue('/mock/data'),

    // PDF export
    getDocumentsPath: vi.fn().mockResolvedValue('/mock/docs'),
    savePdfFile: vi.fn().mockResolvedValue({ success: true }),
    openPath: vi.fn().mockResolvedValue({ success: true }),

    // Recent files
    addRecentFile: vi.fn().mockResolvedValue({ success: true }),
    getRecentFiles: vi.fn().mockResolvedValue([]),
    clearRecentFiles: vi.fn().mockResolvedValue({ success: true }),

    // App settings
    readAppSettings: vi.fn().mockResolvedValue({ success: true, settings: {} }),
    updateAppSettings: vi.fn().mockResolvedValue({ success: true }),

    // App mode
    setBuilderMode: vi.fn().mockResolvedValue({ success: true }),

    // Ship Library
    scanWarshipFiles: vi.fn().mockResolvedValue({ success: true, files: [] }),
    selectDirectory: vi.fn().mockResolvedValue({ canceled: true }),

    // Auto-save / crash recovery
    getAutoSavePath: vi.fn().mockResolvedValue('/mock/autosave'),
    writeAutoSave: vi.fn().mockResolvedValue({ success: true }),
    readAutoSave: vi.fn().mockResolvedValue({ success: false }),
    deleteAutoSave: vi.fn().mockResolvedValue({ success: true }),

    // Ordnance export/import
    showOrdnanceSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showOrdnanceOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),

    // Mod system
    listMods: vi.fn().mockResolvedValue({ success: true, mods: [] }),
    readModFile: vi.fn().mockResolvedValue({ success: true, content: '{}' }),
    saveModFile: vi.fn().mockResolvedValue({ success: true }),
    createMod: vi.fn().mockResolvedValue({ success: true }),
    deleteMod: vi.fn().mockResolvedValue({ success: true }),
    readModSettings: vi.fn().mockResolvedValue({ success: true, settings: { enabledMods: [], modOrder: [] } }),
    updateModSettings: vi.fn().mockResolvedValue({ success: true }),
    exportMod: vi.fn().mockResolvedValue({ success: true }),
    importMod: vi.fn().mockResolvedValue({ success: true }),
    getModsPath: vi.fn().mockResolvedValue('/mock/mods'),
  };

  /** Trigger a menu event as if the user clicked a native Electron menu item. */
  function triggerMenuEvent(name: MenuEventName, ...args: unknown[]) {
    const cb = menuCallbacks[name];
    if (cb) cb(...args);
  }

  return { api, triggerMenuEvent, menuCallbacks };
}

/** Install the mock on `window.electronAPI` and return helpers. */
export function installMockElectronAPI() {
  const mock = createMockElectronAPI();
  Object.defineProperty(window, 'electronAPI', {
    value: mock.api,
    writable: true,
    configurable: true,
  });
  return mock;
}
