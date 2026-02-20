// Preload script for exposing safe APIs to the renderer process
// Must use CommonJS - Electron preload doesn't support ES modules
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
  onReturnToStart: (callback: () => void) => {
    ipcRenderer.on('menu-return-to-start', callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // File operations
  showSaveDialog: (defaultFileName: string) => 
    ipcRenderer.invoke('show-save-dialog', defaultFileName),
  showOpenDialog: () => 
    ipcRenderer.invoke('show-open-dialog'),
  saveFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('save-file', filePath, content),
  readFile: (filePath: string) => 
    ipcRenderer.invoke('read-file', filePath),
  
  // Data file operations (for externally editable game data)
  readDataFile: (fileName: string) => 
    ipcRenderer.invoke('read-data-file', fileName),
  getDataPath: () => 
    ipcRenderer.invoke('get-data-path'),
  
  // PDF export operations
  getDocumentsPath: () =>
    ipcRenderer.invoke('get-documents-path'),
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
  
  // App mode management
  setBuilderMode: (isBuilder: boolean) =>
    ipcRenderer.invoke('set-builder-mode', isBuilder),
  
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
  getModsPath: () =>
    ipcRenderer.invoke('get-mods-path'),
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Alternity Warship Generator loaded');
});
