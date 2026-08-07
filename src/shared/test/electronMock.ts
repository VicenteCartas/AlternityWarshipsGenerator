/**
 * Mock factory for window.electronAPI used in integration tests.
 *
 * Menu event listeners (`onXxx`) capture the callback so tests can trigger
 * menu actions via `triggerMenuEvent(name)`.
 */
import { vi } from 'vitest';
import type { ElectronAPI } from '@shared/types/electron.d.ts';

type MenuEventName =
  | 'onNewWarship'
  | 'onLoadWarship'
  | 'onSaveWarship'
  | 'onSaveWarshipAs'
  | 'onOpenRecent'
  | 'onShowAbout'
  | 'onShowShortcuts'
  | 'onDuplicateDesign'
  | 'onReturnToStart'
  | 'onReturnToHub'
  | 'onNewBattle'
  | 'onOpenBattle'
  | 'onSaveBattle'
  | 'onSaveBattleAs'
  | 'onBattleLibrary'
  | 'onExportBattleReport'
  | 'onNewCharacter'
  | 'onOpenCharacter'
  | 'onSaveCharacter'
  | 'onSaveCharacterAs'
  | 'onExportCharacterPdf'
  | 'onNewTravelDocument'
  | 'onOpenTravelDocument'
  | 'onSaveTravelDocument'
  | 'onSaveTravelDocumentAs'
  | 'onImportTravelShip'
  | 'onNewCampaignDocument'
  | 'onOpenCampaignDocument'
  | 'onSaveCampaignDocument'
  | 'onSaveCampaignDocumentAs'
  | 'onExportCampaignPdf';

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
    onReturnToHub: vi.fn((cb) => { menuCallbacks.onReturnToHub = cb; }),
    onNewBattle: vi.fn((cb) => { menuCallbacks.onNewBattle = cb; }),
    onOpenBattle: vi.fn((cb) => { menuCallbacks.onOpenBattle = cb; }),
    onSaveBattle: vi.fn((cb) => { menuCallbacks.onSaveBattle = cb; }),
    onSaveBattleAs: vi.fn((cb) => { menuCallbacks.onSaveBattleAs = cb; }),
    onBattleLibrary: vi.fn((cb) => { menuCallbacks.onBattleLibrary = cb; }),
    onExportBattleReport: vi.fn((cb) => { menuCallbacks.onExportBattleReport = cb; }),
    onNewCharacter: vi.fn((cb) => { menuCallbacks.onNewCharacter = cb; }),
    onOpenCharacter: vi.fn((cb) => { menuCallbacks.onOpenCharacter = cb; }),
    onSaveCharacter: vi.fn((cb) => { menuCallbacks.onSaveCharacter = cb; }),
    onSaveCharacterAs: vi.fn((cb) => { menuCallbacks.onSaveCharacterAs = cb; }),
    onExportCharacterPdf: vi.fn((cb) => { menuCallbacks.onExportCharacterPdf = cb; }),
    onNewTravelDocument: vi.fn((cb) => { menuCallbacks.onNewTravelDocument = cb; }),
    onOpenTravelDocument: vi.fn((cb) => { menuCallbacks.onOpenTravelDocument = cb; }),
    onSaveTravelDocument: vi.fn((cb) => { menuCallbacks.onSaveTravelDocument = cb; }),
    onSaveTravelDocumentAs: vi.fn((cb) => { menuCallbacks.onSaveTravelDocumentAs = cb; }),
    onImportTravelShip: vi.fn((cb) => { menuCallbacks.onImportTravelShip = cb; }),
    onNewCampaignDocument: vi.fn((cb) => { menuCallbacks.onNewCampaignDocument = cb; }),
    onOpenCampaignDocument: vi.fn((cb) => { menuCallbacks.onOpenCampaignDocument = cb; }),
    onSaveCampaignDocument: vi.fn((cb) => { menuCallbacks.onSaveCampaignDocument = cb; }),
    onSaveCampaignDocumentAs: vi.fn((cb) => { menuCallbacks.onSaveCampaignDocumentAs = cb; }),
    onExportCampaignPdf: vi.fn((cb) => { menuCallbacks.onExportCampaignPdf = cb; }),
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
    showPdfSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/docs/character.pdf' }),
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

    // Battle save/load, library & auto-save
    showBattleSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showBattleOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showCharacterSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showCharacterOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showCampaignSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showCampaignOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showTravelSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showTravelOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    scanBattleFiles: vi.fn().mockResolvedValue({ success: true, files: [] }),
    writeBattleAutoSave: vi.fn().mockResolvedValue({ success: true }),
    readBattleAutoSave: vi.fn().mockResolvedValue({ success: false }),
    deleteBattleAutoSave: vi.fn().mockResolvedValue({ success: true }),

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
    duplicateMod: vi.fn().mockResolvedValue({ success: true }),
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
