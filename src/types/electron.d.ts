// Type declarations for Electron API exposed via preload

import type { Mod, ModSettings } from './mod';

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

export interface ListModsResult {
  success: boolean;
  error?: string;
  mods: Mod[];
}

export interface ModSettingsResult {
  success: boolean;
  error?: string;
  settings?: ModSettings;
}

export interface ImportModResult {
  success: boolean;
  error?: string;
  folderName?: string;
}

export interface ScannedWarshipFile {
  filePath: string;
  name: string;
  designType: string | null;
  stationType: string | null;
  hullId: string | null;
  designProgressLevel: number | null;
  imageData: string | null;
  imageMimeType: string | null;
  faction: string | null;
  role: string | null;
  classification: string | null;
  manufacturer: string | null;
  modifiedAt: string | null;
  createdAt: string | null;
  fileSizeBytes: number;
}

export interface ScanWarshipFilesResult {
  success: boolean;
  error?: string;
  files: ScannedWarshipFile[];
}

export interface SelectDirectoryResult {
  canceled: boolean;
  filePath?: string;
}

export interface ElectronAPI {
  // Menu event listeners
  onNewWarship: (callback: () => void) => void;
  onLoadWarship: (callback: () => void) => void;
  onSaveWarship: (callback: () => void) => void;
  onSaveWarshipAs: (callback: () => void) => void;
  onOpenRecent: (callback: (filePath: string) => void) => void;
  onShowAbout: (callback: () => void) => void;
  onShowShortcuts: (callback: () => void) => void;
  onDuplicateDesign: (callback: () => void) => void;
  onReturnToStart: (callback: () => void) => void;
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
  openPath: (filePath: string) => Promise<FileOperationResult>;
  
  // Recent files operations
  addRecentFile: (filePath: string) => Promise<FileOperationResult>;
  getRecentFiles: () => Promise<string[]>;
  clearRecentFiles: () => Promise<FileOperationResult>;
  
  // App mode management
  setBuilderMode: (mode: string) => Promise<FileOperationResult>;
  
  // Ship Library operations
  scanWarshipFiles: (directoryPath: string) => Promise<ScanWarshipFilesResult>;
  selectDirectory: () => Promise<SelectDirectoryResult>;
  
  // Auto-save / crash recovery
  getAutoSavePath: () => Promise<string>;
  writeAutoSave: (content: string) => Promise<FileOperationResult>;
  readAutoSave: () => Promise<FileOperationResult>;
  deleteAutoSave: () => Promise<FileOperationResult>;
  
  // Ordnance export/import file dialogs
  showOrdnanceSaveDialog: (defaultFileName: string) => Promise<SaveDialogResult>;
  showOrdnanceOpenDialog: () => Promise<OpenDialogResult>;

  // Mod system operations
  listMods: () => Promise<ListModsResult>;
  readModFile: (folderName: string, fileName: string) => Promise<FileOperationResult>;
  saveModFile: (folderName: string, fileName: string, content: string) => Promise<FileOperationResult>;
  createMod: (folderName: string, manifest: string) => Promise<FileOperationResult>;
  deleteMod: (folderName: string) => Promise<FileOperationResult>;
  readModSettings: () => Promise<ModSettingsResult>;
  updateModSettings: (settingsJson: string) => Promise<FileOperationResult>;
  exportMod: (folderName: string) => Promise<FileOperationResult>;
  importMod: () => Promise<ImportModResult>;
  getModsPath: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
