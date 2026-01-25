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
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Alternity Warship Generator loaded');
});
