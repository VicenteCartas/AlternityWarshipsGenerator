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
}

export interface ElectronAPI {
  // Menu event listeners
  onNewWarship: (callback: () => void) => void;
  onLoadWarship: (callback: () => void) => void;
  onSaveWarship: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
  
  // File operations
  showSaveDialog: (defaultFileName: string) => Promise<SaveDialogResult>;
  showOpenDialog: () => Promise<OpenDialogResult>;
  saveFile: (filePath: string, content: string) => Promise<FileOperationResult>;
  readFile: (filePath: string) => Promise<FileOperationResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
