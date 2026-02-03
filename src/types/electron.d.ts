// Type declarations for Electron API exposed via preload

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface FileOperationResult {
  success: boolean;
  error?: string;
  content?: string;
  filePath?: string;
}

export interface DataFileResult {
  success: boolean;
  error?: string;
  content?: string;
  path?: string;
}

export interface ElectronAPI {
  // Menu event listeners
  onNewWarship: (callback: () => void) => void;
  onLoadWarship: (callback: () => void) => void;
  onSaveWarship: (callback: () => void) => void;
  onSaveWarshipAs: (callback: () => void) => void;
  onOpenRecent: (callback: (filePath: string) => void) => void;
  removeAllListeners: (channel: string) => void;
  
  // File operations
  showSaveDialog: (defaultFileName: string) => Promise<SaveDialogResult>;
  showOpenDialog: () => Promise<OpenDialogResult>;
  saveFile: (filePath: string, content: string) => Promise<FileOperationResult>;
  readFile: (filePath: string) => Promise<FileOperationResult>;
  
  // Data file operations (for externally editable game data)
  readDataFile: (fileName: string) => Promise<DataFileResult>;
  getDataPath: () => Promise<string>;
  
  // PDF export operations
  getDocumentsPath: () => Promise<string>;
  savePdfFile: (filePath: string, base64Data: string) => Promise<FileOperationResult>;
  
  // Recent files operations
  addRecentFile: (filePath: string) => Promise<FileOperationResult>;
  getRecentFiles: () => Promise<string[]>;
  clearRecentFiles: () => Promise<FileOperationResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
