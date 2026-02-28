import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// App version - keep in sync with src/constants/version.ts
const APP_VERSION = '0.2.5';
const APP_NAME = 'Alternity Warship Generator';

let mainWindow: BrowserWindow | null = null;

// Track current app mode to enable/disable menu items contextually
let currentAppMode: 'loading' | 'welcome' | 'builder' | 'mods' | 'library' = 'loading';

// Recent files management
const MAX_RECENT_FILES = 10;
const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');

function loadRecentFiles(): string[] {
  try {
    if (fs.existsSync(recentFilesPath)) {
      const content = fs.readFileSync(recentFilesPath, 'utf-8');
      const files = JSON.parse(content) as string[];
      // Filter out files that no longer exist
      return files.filter(f => fs.existsSync(f));
    }
  } catch (error) {
    console.error('Failed to load recent files:', error);
  }
  return [];
}

function saveRecentFiles(files: string[]): void {
  try {
    fs.writeFileSync(recentFilesPath, JSON.stringify(files), 'utf-8');
  } catch (error) {
    console.error('Failed to save recent files:', error);
  }
}

function addRecentFile(filePath: string): void {
  let recentFiles = loadRecentFiles();
  // Remove if already exists (will be added to front)
  recentFiles = recentFiles.filter(f => f !== filePath);
  // Add to front
  recentFiles.unshift(filePath);
  // Limit to max
  recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  saveRecentFiles(recentFiles);
  // Update menu
  createMenu();
}

function clearRecentFiles(): void {
  saveRecentFiles([]);
  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const recentFiles = loadRecentFiles();

  // Build recent files submenu
  const recentFilesSubmenu: MenuItemConstructorOptions[] = recentFiles.length > 0
    ? [
        ...recentFiles.map((filePath, index) => ({
          label: `${index + 1}. ${path.basename(filePath)}`,
          click: () => {
            mainWindow?.webContents.send('menu-open-recent', filePath);
          },
        })),
        { type: 'separator' as const },
        {
          label: 'Clear Recent Files',
          click: () => {
            clearRecentFiles();
          },
        },
      ]
    : [
        {
          label: 'No Recent Files',
          enabled: false,
        },
      ];

  const isInMods = currentAppMode === 'mods';
  const isInBuilder = currentAppMode === 'builder';

  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Design',
          accelerator: 'CmdOrCtrl+N',
          enabled: !isInMods,
          click: () => {
            mainWindow?.webContents.send('menu-new-warship');
          },
        },
        {
          label: 'Load Design...',
          accelerator: 'CmdOrCtrl+O',
          enabled: !isInMods,
          click: () => {
            mainWindow?.webContents.send('menu-load-warship');
          },
        },
        {
          label: 'Recent Designs',
          enabled: !isInMods,
          submenu: recentFilesSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Save Design',
          accelerator: 'CmdOrCtrl+S',
          enabled: isInBuilder,
          click: () => {
            mainWindow?.webContents.send('menu-save-warship');
          },
        },
        {
          label: 'Save Design As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          enabled: isInBuilder,
          click: () => {
            mainWindow?.webContents.send('menu-save-warship-as');
          },
        },
        {
          label: 'Duplicate Design',
          accelerator: 'CmdOrCtrl+Shift+D',
          enabled: isInBuilder,
          click: () => {
            mainWindow?.webContents.send('menu-duplicate-design');
          },
        },
        { type: 'separator' },
        {
          label: 'Return to Start Screen',
          click: () => {
            mainWindow?.webContents.send('menu-return-to-start');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'View Data Files',
          click: () => {
            const dataPath = isDev
              ? path.join(__dirname, '../src/data')
              : path.join(process.resourcesPath, 'data');
            shell.openPath(dataPath);
          },
        },
        {
          label: 'View Mod Files',
          click: () => {
            const modsDir = getModsDir();
            if (!fs.existsSync(modsDir)) {
              fs.mkdirSync(modsDir, { recursive: true });
            }
            shell.openPath(modsDir);
          },
        },
        { type: 'separator' as const },
        ...(isDev ? [
          { role: 'reload' as const },
          { role: 'forceReload' as const },
          { role: 'toggleDevTools' as const },
          { type: 'separator' as const },
        ] : []),
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            mainWindow?.webContents.send('menu-show-shortcuts');
          },
        },
        { type: 'separator' as const },
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('menu-show-about');
          },
        },
        { type: 'separator' as const },
        {
          label: 'View on GitHub',
          click: () => {
            shell.openExternal('https://github.com/VicenteCartas/AlternityWarshipsGenerator');
          },
        },
        {
          label: 'Modding Guide',
          click: () => {
            shell.openExternal('https://github.com/VicenteCartas/AlternityWarshipsGenerator/wiki/Modding-Guide');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/VicenteCartas/AlternityWarshipsGenerator/issues');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  // In development, logo is in public/. In production, it's bundled into dist/
  const iconPath = isDev 
    ? path.join(__dirname, '../public/logo.png')
    : path.join(__dirname, '../dist/logo.png');
    
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `${APP_NAME} v${APP_VERSION}`,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Start maximized
  mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL('http://localhost:1537');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Save/Load
ipcMain.handle('show-save-dialog', async (_event, defaultFileName: string) => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Warship',
    defaultPath: defaultFileName,
    filters: [
      { name: 'Warship Files', extensions: ['warship.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  
  return result;
});

ipcMain.handle('show-open-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Warship',
    filters: [
      { name: 'Warship Files', extensions: ['warship.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  
  return result;
});

// IPC Handlers for Ordnance Export/Import Dialogs
ipcMain.handle('show-ordnance-save-dialog', async (_event, defaultFileName: string) => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Ordnance Designs',
    defaultPath: defaultFileName,
    filters: [
      { name: 'Ordnance Files', extensions: ['ordnance.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  
  return result;
});

ipcMain.handle('show-ordnance-open-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Ordnance Designs',
    filters: [
      { name: 'Ordnance Files', extensions: ['ordnance.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  
  return result;
});

ipcMain.handle('save-file', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Data file loading - reads JSON files from the data directory
// This allows users to edit data files externally
ipcMain.handle('read-data-file', async (_event, fileName: string) => {
  try {
    // In development, read from src/data; in production, read from resources/data
    let dataPath: string;
    if (isDev) {
      dataPath = path.join(__dirname, '../src/data', fileName);
    } else {
      // In production, data files are in resources/data alongside the app
      dataPath = path.join(process.resourcesPath, 'data', fileName);
    }
    
    const content = fs.readFileSync(dataPath, 'utf-8');
    return { success: true, content, path: dataPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get the data directory path for user reference
ipcMain.handle('get-data-path', async () => {
  if (isDev) {
    return path.join(__dirname, '../src/data');
  } else {
    return path.join(process.resourcesPath, 'data');
  }
});

// Get the Documents folder path
ipcMain.handle('get-documents-path', async () => {
  return app.getPath('documents');
});

// Save PDF file to a specific path (base64 encoded data)
ipcMain.handle('save-pdf-file', async (_event, filePath: string, base64Data: string) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Open a file with the system default application
ipcMain.handle('open-path', async (_event, filePath: string) => {
  try {
    const result = await shell.openPath(filePath);
    // openPath returns empty string on success, error message on failure
    if (result) {
      return { success: false, error: result };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Recent files management
ipcMain.handle('add-recent-file', async (_event, filePath: string) => {
  addRecentFile(filePath);
  return { success: true };
});

ipcMain.handle('get-recent-files', async () => {
  return loadRecentFiles();
});

ipcMain.handle('clear-recent-files', async () => {
  clearRecentFiles();
  return { success: true };
});

// App mode management - updates menu state
ipcMain.handle('set-builder-mode', async (_event, mode: string) => {
  currentAppMode = mode as 'loading' | 'welcome' | 'builder' | 'mods' | 'library';
  createMenu(); // Recreate menu with updated enabled state
  return { success: true };
});

// ============== Ship Library: Scan for .warship.json files ==============

/**
 * Recursively scan a directory for .warship.json files and return lightweight metadata.
 * Reads only the top-level fields needed for library cards (no full deserialization).
 */
function scanWarshipFilesSync(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Array<{
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
}> {
  const results: Array<{
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
  }> = [];

  if (currentDepth > maxDepth) return results;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanWarshipFilesSync(fullPath, maxDepth, currentDepth + 1));
    } else if (entry.isFile() && entry.name.endsWith('.warship.json')) {
      try {
        const stat = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(content);
        results.push({
          filePath: fullPath,
          name: parsed.name || entry.name.replace(/\.warship\.json$/i, ''),
          designType: parsed.designType || 'warship',
          stationType: parsed.stationType || null,
          hullId: parsed.hull?.id || null,
          designProgressLevel: parsed.designProgressLevel || null,
          imageData: parsed.imageData || null,
          imageMimeType: parsed.imageMimeType || null,
          faction: parsed.faction || null,
          role: parsed.role || null,
          classification: parsed.classification || null,
          manufacturer: parsed.manufacturer || null,
          modifiedAt: parsed.modifiedAt || null,
          createdAt: parsed.createdAt || null,
          fileSizeBytes: stat.size,
        });
      } catch {
        // Skip files that can't be read or parsed
      }
    }
  }

  return results;
}

ipcMain.handle('scan-warship-files', async (_event, directoryPath: string) => {
  try {
    if (!fs.existsSync(directoryPath)) {
      return { success: true, files: [] };
    }
    const files = scanWarshipFilesSync(directoryPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: (error as Error).message, files: [] };
  }
});

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder to scan for designs',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  return { canceled: false, filePath: result.filePaths[0] };
});

// ============== Auto-save / Crash Recovery ==============

function getAutoSavePath(): string {
  return path.join(app.getPath('userData'), 'autosave.warship.json');
}

ipcMain.handle('get-autosave-path', async () => {
  return getAutoSavePath();
});

ipcMain.handle('write-autosave', async (_event, content: string) => {
  try {
    fs.writeFileSync(getAutoSavePath(), content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('read-autosave', async () => {
  try {
    const autoSavePath = getAutoSavePath();
    if (!fs.existsSync(autoSavePath)) {
      return { success: false, error: 'No auto-save file found' };
    }
    const content = fs.readFileSync(autoSavePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('delete-autosave', async () => {
  try {
    const autoSavePath = getAutoSavePath();
    if (fs.existsSync(autoSavePath)) {
      fs.unlinkSync(autoSavePath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// ============== Mod System IPC Handlers ==============

const MOD_DATA_FILES = [
  'hulls.json', 'armor.json', 'powerPlants.json', 'fuelTank.json',
  'engines.json', 'ftlDrives.json', 'supportSystems.json', 'weapons.json',
  'ordnance.json', 'defenses.json', 'sensors.json', 'commandControl.json',
  'hangarMisc.json', 'damageDiagram.json',
];

function getModsDir(): string {
  return path.join(app.getPath('userData'), 'mods');
}

function getModSettingsPath(): string {
  return path.join(app.getPath('userData'), 'mod-settings.json');
}

function ensureModsDir(): void {
  const modsDir = getModsDir();
  if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
  }
}

interface ModSettingsEntry {
  folderName: string;
  enabled: boolean;
  priority: number;
}

interface ModSettings {
  mods: ModSettingsEntry[];
}

function readModSettings(): ModSettings {
  try {
    const settingsPath = getModSettingsPath();
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as ModSettings;
    }
  } catch (error) {
    console.error('Failed to read mod settings:', error);
  }
  return { mods: [] };
}

function writeModSettings(settings: ModSettings): void {
  try {
    fs.writeFileSync(getModSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write mod settings:', error);
  }
}

// List all installed mods by scanning the mods directory
ipcMain.handle('list-mods', async () => {
  try {
    ensureModsDir();
    const modsDir = getModsDir();
    const settings = readModSettings();
    const entries = fs.readdirSync(modsDir, { withFileTypes: true });
    const mods = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(modsDir, entry.name, 'mod.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const settingsEntry = settings.mods.find(m => m.folderName === entry.name);
        // Scan which data files the mod provides
        const files = MOD_DATA_FILES.filter(f =>
          fs.existsSync(path.join(modsDir, entry.name, f))
        );

        mods.push({
          manifest,
          folderName: entry.name,
          enabled: settingsEntry?.enabled ?? false,
          priority: settingsEntry?.priority ?? 0,
          files,
        });
      } catch (err) {
        console.warn(`Failed to read mod manifest for ${entry.name}:`, err);
      }
    }

    return { success: true, mods };
  } catch (error) {
    return { success: false, error: (error as Error).message, mods: [] };
  }
});

// Read a specific data file from a mod
ipcMain.handle('read-mod-file', async (_event, folderName: string, fileName: string) => {
  try {
    const filePath = path.join(getModsDir(), folderName, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Save a data file to a mod folder
ipcMain.handle('save-mod-file', async (_event, folderName: string, fileName: string, content: string) => {
  try {
    const modDir = path.join(getModsDir(), folderName);
    if (!fs.existsSync(modDir)) {
      return { success: false, error: `Mod folder not found: ${folderName}` };
    }
    fs.writeFileSync(path.join(modDir, fileName), content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Create a new mod with manifest
ipcMain.handle('create-mod', async (_event, folderName: string, manifest: string) => {
  try {
    ensureModsDir();
    const modDir = path.join(getModsDir(), folderName);
    if (fs.existsSync(modDir)) {
      return { success: false, error: `Mod folder already exists: ${folderName}` };
    }
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(path.join(modDir, 'mod.json'), manifest, 'utf-8');

    // Add to settings as disabled by default
    const settings = readModSettings();
    const maxPriority = settings.mods.reduce((max, m) => Math.max(max, m.priority), 0);
    settings.mods.push({ folderName, enabled: false, priority: maxPriority + 1 });
    writeModSettings(settings);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Delete a mod folder and remove from settings
ipcMain.handle('delete-mod', async (_event, folderName: string) => {
  try {
    const modDir = path.join(getModsDir(), folderName);
    if (fs.existsSync(modDir)) {
      fs.rmSync(modDir, { recursive: true, force: true });
    }
    // Remove from settings
    const settings = readModSettings();
    settings.mods = settings.mods.filter(m => m.folderName !== folderName);
    writeModSettings(settings);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Read mod settings
ipcMain.handle('read-mod-settings', async () => {
  try {
    return { success: true, settings: readModSettings() };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Update mod settings (enable/disable, priority)
ipcMain.handle('update-mod-settings', async (_event, settingsJson: string) => {
  try {
    const settings = JSON.parse(settingsJson) as ModSettings;
    writeModSettings(settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Export a mod to .altmod.json format
ipcMain.handle('export-mod', async (_event, folderName: string) => {
  try {
    if (!mainWindow) return { success: false, error: 'No main window' };

    const modDir = path.join(getModsDir(), folderName);
    const manifestPath = path.join(modDir, 'mod.json');
    if (!fs.existsSync(manifestPath)) {
      return { success: false, error: 'Mod manifest not found' };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const files: Record<string, unknown> = {};

    for (const dataFile of MOD_DATA_FILES) {
      const filePath = path.join(modDir, dataFile);
      if (fs.existsSync(filePath)) {
        files[dataFile] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

    const altmod = {
      formatVersion: '1.0',
      manifest,
      files,
    };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Mod',
      defaultPath: `${folderName}.altmod.json`,
      filters: [
        { name: 'Alternity Mod Files', extensions: ['altmod.json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export canceled' };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(altmod, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Import a mod from .altmod.json format
ipcMain.handle('import-mod', async () => {
  try {
    if (!mainWindow) return { success: false, error: 'No main window' };

    const openResult = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Mod',
      filters: [
        { name: 'Alternity Mod Files', extensions: ['altmod.json'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (openResult.canceled || openResult.filePaths.length === 0) {
      return { success: false, error: 'Import canceled' };
    }

    const content = fs.readFileSync(openResult.filePaths[0], 'utf-8');
    const altmod = JSON.parse(content);

    // Validate format
    if (!altmod.formatVersion || !altmod.manifest || !altmod.files) {
      return { success: false, error: 'Invalid .altmod.json format' };
    }
    if (!altmod.manifest.name || !altmod.manifest.mode) {
      return { success: false, error: 'Invalid mod manifest: missing name or mode' };
    }

    // Derive folder name from mod name
    let folderName = altmod.manifest.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    ensureModsDir();
    const modsDir = getModsDir();
    let targetDir = path.join(modsDir, folderName);

    // Handle name conflicts by appending a suffix
    let suffix = 1;
    while (fs.existsSync(targetDir)) {
      folderName = `${altmod.manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${suffix}`;
      targetDir = path.join(modsDir, folderName);
      suffix++;
    }

    // Extract mod files
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'mod.json'),
      JSON.stringify(altmod.manifest, null, 2),
      'utf-8'
    );

    for (const [fileName, fileData] of Object.entries(altmod.files)) {
      if (MOD_DATA_FILES.includes(fileName)) {
        fs.writeFileSync(
          path.join(targetDir, fileName),
          JSON.stringify(fileData, null, 2),
          'utf-8'
        );
      }
    }

    // Add to settings as disabled
    const settings = readModSettings();
    const maxPriority = settings.mods.reduce((max, m) => Math.max(max, m.priority), 0);
    settings.mods.push({ folderName, enabled: false, priority: maxPriority + 1 });
    writeModSettings(settings);

    return { success: true, folderName };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get the mods directory path
ipcMain.handle('get-mods-path', async () => {
  ensureModsDir();
  return getModsDir();
});
