// Preload script for exposing safe APIs to the renderer process
// Must use CommonJS - Electron preload doesn't support ES modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

// Expose electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu event listeners
  onNewWarship: (callback: () => void) => {
    ipcRenderer.on('menu-new-warship', callback);
  },
  onLoadWarship: (callback: () => void) => {
    ipcRenderer.on('menu-load-warship', callback);
  },
  onSaveWarship: (callback: () => void) => {
    ipcRenderer.on('menu-save-warship', callback);
  },
  onSaveWarshipAs: (callback: () => void) => {
    ipcRenderer.on('menu-save-warship-as', callback);
  },
  onOpenRecent: (callback: (filePath: string) => void) => {
    ipcRenderer.on('menu-open-recent', (_event: unknown, filePath: string) => callback(filePath));
  },
  onShowAbout: (callback: () => void) => {
    ipcRenderer.on('menu-show-about', callback);
  },
  onShowShortcuts: (callback: () => void) => {
    ipcRenderer.on('menu-show-shortcuts', callback);
  },
  onDuplicateDesign: (callback: () => void) => {
    ipcRenderer.on('menu-duplicate-design', callback);
  },
  onReturnToStart: (callback: () => void) => {
    ipcRenderer.on('menu-return-to-start', callback);
  },
  onReturnToHub: (callback: () => void) => {
    ipcRenderer.on('menu-return-to-hub', callback);
  },
  onNewBattle: (callback: () => void) => {
    ipcRenderer.on('menu-new-battle', callback);
  },
  onOpenBattle: (callback: () => void) => {
    ipcRenderer.on('menu-open-battle', callback);
  },
  onSaveBattle: (callback: () => void) => {
    ipcRenderer.on('menu-save-battle', callback);
  },
  onSaveBattleAs: (callback: () => void) => {
    ipcRenderer.on('menu-save-battle-as', callback);
  },
  onBattleLibrary: (callback: () => void) => {
    ipcRenderer.on('menu-battle-library', callback);
  },
  onExportBattleReport: (callback: () => void) => {
    ipcRenderer.on('menu-export-battle-report', callback);
  },
  onNewCharacter: (callback: () => void) => {
    ipcRenderer.on('menu-new-character', callback);
  },
  onOpenCharacter: (callback: () => void) => {
    ipcRenderer.on('menu-open-character', callback);
  },
  onSaveCharacter: (callback: () => void) => {
    ipcRenderer.on('menu-save-character', callback);
  },
  onSaveCharacterAs: (callback: () => void) => {
    ipcRenderer.on('menu-save-character-as', callback);
  },
  onExportCharacterPdf: (callback: () => void) => {
    ipcRenderer.on('menu-export-character-pdf', callback);
  },
  onNewTravelDocument: (callback: () => void) => {
    ipcRenderer.on('menu-new-travel-document', callback);
  },
  onOpenTravelDocument: (callback: () => void) => {
    ipcRenderer.on('menu-open-travel-document', callback);
  },
  onSaveTravelDocument: (callback: () => void) => {
    ipcRenderer.on('menu-save-travel-document', callback);
  },
  onSaveTravelDocumentAs: (callback: () => void) => {
    ipcRenderer.on('menu-save-travel-document-as', callback);
  },
  onImportTravelShip: (callback: () => void) => {
    ipcRenderer.on('menu-import-travel-ship', callback);
  },
  onNewCampaignDocument: (callback: () => void) => {
    ipcRenderer.on('menu-new-campaign-document', callback);
  },
  onOpenCampaignDocument: (callback: () => void) => {
    ipcRenderer.on('menu-open-campaign-document', callback);
  },
  onSaveCampaignDocument: (callback: () => void) => {
    ipcRenderer.on('menu-save-campaign-document', callback);
  },
  onSaveCampaignDocumentAs: (callback: () => void) => {
    ipcRenderer.on('menu-save-campaign-document-as', callback);
  },
  onExportCampaignPdf: (callback: () => void) => {
    ipcRenderer.on('menu-export-campaign-pdf', callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // File operations
  showSaveDialog: (defaultFileName: string, defaultDirectory?: string) => 
    ipcRenderer.invoke('show-save-dialog', defaultFileName, defaultDirectory),
  showOpenDialog: () => 
    ipcRenderer.invoke('show-open-dialog'),
  saveFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('save-file', filePath, content),
  readFile: (filePath: string) => 
    ipcRenderer.invoke('read-file', filePath),
  
  // Ordnance export/import file dialogs
  showOrdnanceSaveDialog: (defaultFileName: string) =>
    ipcRenderer.invoke('show-ordnance-save-dialog', defaultFileName),
  showOrdnanceOpenDialog: () =>
    ipcRenderer.invoke('show-ordnance-open-dialog'),

  // Battle save/load file dialogs
  showBattleSaveDialog: (defaultFileName: string, defaultDirectory?: string) =>
    ipcRenderer.invoke('show-battle-save-dialog', defaultFileName, defaultDirectory),
  showBattleOpenDialog: () =>
    ipcRenderer.invoke('show-battle-open-dialog'),

  // Character save/load file dialogs
  showCharacterSaveDialog: (defaultFileName: string, defaultDirectory?: string) =>
    ipcRenderer.invoke('show-character-save-dialog', defaultFileName, defaultDirectory),
  showCharacterOpenDialog: () =>
    ipcRenderer.invoke('show-character-open-dialog'),

  showCampaignSaveDialog: (kind: 'system' | 'civilization' | 'artifact' | 'sector', defaultFileName: string, defaultDirectory?: string) =>
    ipcRenderer.invoke('show-campaign-save-dialog', kind, defaultFileName, defaultDirectory),
  showCampaignOpenDialog: (kind: 'system' | 'civilization' | 'artifact' | 'sector') =>
    ipcRenderer.invoke('show-campaign-open-dialog', kind),
  showTravelSaveDialog: (defaultFileName: string, defaultDirectory?: string) =>
    ipcRenderer.invoke('show-travel-save-dialog', defaultFileName, defaultDirectory),
  showTravelOpenDialog: () =>
    ipcRenderer.invoke('show-travel-open-dialog'),

  // Battle library & auto-save
  scanBattleFiles: (directoryPath: string) =>
    ipcRenderer.invoke('scan-battle-files', directoryPath),
  writeBattleAutoSave: (content: string) =>
    ipcRenderer.invoke('write-battle-autosave', content),
  readBattleAutoSave: () =>
    ipcRenderer.invoke('read-battle-autosave'),
  deleteBattleAutoSave: () =>
    ipcRenderer.invoke('delete-battle-autosave'),

  // Data file operations (for externally editable game data)
  readDataFile: (fileName: string, module?: string) =>
    ipcRenderer.invoke('read-data-file', fileName, module),
  getDataPath: (module?: string) =>
    ipcRenderer.invoke('get-data-path', module),
  
  // PDF export operations
  getDocumentsPath: () =>
    ipcRenderer.invoke('get-documents-path'),
  showPdfSaveDialog: (defaultFileName: string, defaultDirectory?: string) =>
    ipcRenderer.invoke('show-pdf-save-dialog', defaultFileName, defaultDirectory),
  savePdfFile: (filePath: string, base64Data: string) =>
    ipcRenderer.invoke('save-pdf-file', filePath, base64Data),
  openPath: (filePath: string) =>
    ipcRenderer.invoke('open-path', filePath),
  
  // Recent files operations
  addRecentFile: (filePath: string) =>
    ipcRenderer.invoke('add-recent-file', filePath),
  getRecentFiles: () =>
    ipcRenderer.invoke('get-recent-files'),
  clearRecentFiles: () =>
    ipcRenderer.invoke('clear-recent-files'),
  
  // App settings
  readAppSettings: () =>
    ipcRenderer.invoke('read-app-settings'),
  updateAppSettings: (settingsJson: string) =>
    ipcRenderer.invoke('update-app-settings', settingsJson),

  // App mode management
  setBuilderMode: (mode: string) =>
    ipcRenderer.invoke('set-builder-mode', mode),
  
  // Ship Library operations
  scanWarshipFiles: (directoryPath: string) =>
    ipcRenderer.invoke('scan-warship-files', directoryPath),
  selectDirectory: (defaultPath?: string) =>
    ipcRenderer.invoke('select-directory', defaultPath),
  
  // Auto-save / crash recovery
  getAutoSavePath: () =>
    ipcRenderer.invoke('get-autosave-path'),
  writeAutoSave: (content: string) =>
    ipcRenderer.invoke('write-autosave', content),
  readAutoSave: () =>
    ipcRenderer.invoke('read-autosave'),
  deleteAutoSave: () =>
    ipcRenderer.invoke('delete-autosave'),
  
  // Mod system operations
  listMods: () =>
    ipcRenderer.invoke('list-mods'),
  readModFile: (folderName: string, fileName: string) =>
    ipcRenderer.invoke('read-mod-file', folderName, fileName),
  saveModFile: (folderName: string, fileName: string, content: string) =>
    ipcRenderer.invoke('save-mod-file', folderName, fileName, content),
  createMod: (folderName: string, manifest: string) =>
    ipcRenderer.invoke('create-mod', folderName, manifest),
  deleteMod: (folderName: string) =>
    ipcRenderer.invoke('delete-mod', folderName),
  readModSettings: () =>
    ipcRenderer.invoke('read-mod-settings'),
  updateModSettings: (settingsJson: string) =>
    ipcRenderer.invoke('update-mod-settings', settingsJson),
  exportMod: (folderName: string) =>
    ipcRenderer.invoke('export-mod', folderName),
  importMod: () =>
    ipcRenderer.invoke('import-mod'),
  duplicateMod: (folderName: string) =>
    ipcRenderer.invoke('duplicate-mod', folderName),
  getModsPath: () =>
    ipcRenderer.invoke('get-mods-path'),
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Alternity Warship Generator loaded');
});
