import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// App version - keep in sync with src/shared/constants/version.ts
const APP_VERSION = '2.0.0-beta.1';
const APP_NAME = 'Alternity Workshop';

let mainWindow: BrowserWindow | null = null;

// Track current app mode to enable/disable menu items contextually.
// 'hub' is the suite-level hub. 'welcome' | 'builder' | 'mods' | 'library' are
// warships-module views; 'battles-welcome' | 'battles' are battles-module views.
type AppMode =
  | 'loading'
  | 'hub'
  | 'welcome'
  | 'builder'
  | 'mods'
  | 'library'
  | 'battles-welcome'
  | 'battles'
  | 'battles-library'
  | 'battles-mods'
  | 'travel'
  | 'characters-welcome'
  | 'characters-builder';

type ModuleGroup = 'hub' | 'warships' | 'characters' | 'battles' | 'travel' | 'other';

let currentAppMode: AppMode = 'loading';

/** Which module a mode belongs to. The File menu is built per module. */
function moduleGroupOf(mode: AppMode): ModuleGroup {
  switch (mode) {
    case 'hub':
      return 'hub';
    case 'welcome':
    case 'builder':
    case 'mods':
    case 'library':
      return 'warships';
    case 'battles':
    case 'battles-welcome':
    case 'battles-library':
    case 'battles-mods':
      return 'battles';
    case 'travel':
      return 'travel';
    case 'characters-welcome':
    case 'characters-builder':
      return 'characters';
    default:
      return 'other';
  }
}

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

function isRecentFileForGroup(filePath: string, group: ModuleGroup): boolean {
  if (group === 'warships') return filePath.toLocaleLowerCase().endsWith('.warship.json');
  if (group === 'characters') return filePath.toLocaleLowerCase().endsWith('.character.json');
  if (group === 'battles') return filePath.toLocaleLowerCase().endsWith('.battle.json');
  return false;
}

function clearRecentFilesForGroup(group: ModuleGroup): void {
  saveRecentFiles(loadRecentFiles().filter((filePath) => !isRecentFileForGroup(filePath, group)));
  createMenu();
}

// App settings management
const appSettingsPath = path.join(app.getPath('userData'), 'settings.json');

interface AppSettings {
  themeMode?: 'light' | 'dark' | 'system';
}

function readAppSettings(): AppSettings {
  try {
    if (fs.existsSync(appSettingsPath)) {
      return JSON.parse(fs.readFileSync(appSettingsPath, 'utf-8')) as AppSettings;
    }
  } catch (error) {
    console.error('Failed to read app settings:', error);
  }
  return {};
}

function writeAppSettings(settings: AppSettings): void {
  try {
    fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write app settings:', error);
  }
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const group = moduleGroupOf(currentAppMode);
  const recentFiles = loadRecentFiles().filter((filePath) => isRecentFileForGroup(filePath, group));
  const recentFilesSubmenu: MenuItemConstructorOptions[] = recentFiles.length > 0
    ? [
        ...recentFiles.map((filePath, index) => ({
          label: `${index + 1}. ${path.basename(filePath)}`,
          click: () => mainWindow?.webContents.send('menu-open-recent', filePath),
        })),
        { type: 'separator' as const },
        {
          label: group === 'characters' ? 'Clear Recent Characters'
            : group === 'battles' ? 'Clear Recent Battles'
              : 'Clear Recent Designs',
          click: () => clearRecentFilesForGroup(group),
        },
      ]
    : [{ label: 'No Recent Files', enabled: false }];

  const isInBuilder = currentAppMode === 'builder';
  const isInBattleBuilder = currentAppMode === 'battles';
  const isInCharacterBuilder = currentAppMode === 'characters-builder';

  const warshipsFileItems: MenuItemConstructorOptions[] = [
    {
      id: 'new-design',
      label: 'New Design',
      accelerator: 'CmdOrCtrl+N',
      click: () => mainWindow?.webContents.send('menu-new-warship'),
    },
    {
      id: 'load-design',
      label: 'Load Design...',
      accelerator: 'CmdOrCtrl+O',
      click: () => mainWindow?.webContents.send('menu-load-warship'),
    },
    {
      id: 'recent-designs',
      label: 'Recent Designs',
      submenu: recentFilesSubmenu,
    },
    { type: 'separator' },
    {
      id: 'save-design',
      label: 'Save Design',
      accelerator: 'CmdOrCtrl+S',
      enabled: isInBuilder,
      click: () => mainWindow?.webContents.send('menu-save-warship'),
    },
    {
      id: 'save-design-as',
      label: 'Save Design As...',
      accelerator: 'CmdOrCtrl+Shift+S',
      enabled: isInBuilder,
      click: () => mainWindow?.webContents.send('menu-save-warship-as'),
    },
    {
      id: 'duplicate-design',
      label: 'Duplicate Design',
      accelerator: 'CmdOrCtrl+Shift+D',
      enabled: isInBuilder,
      click: () => mainWindow?.webContents.send('menu-duplicate-design'),
    },
  ];

  const charactersFileItems: MenuItemConstructorOptions[] = [
    {
      id: 'new-character',
      label: 'New Character',
      accelerator: 'CmdOrCtrl+N',
      click: () => mainWindow?.webContents.send('menu-new-character'),
    },
    {
      id: 'open-character',
      label: 'Open Character...',
      accelerator: 'CmdOrCtrl+O',
      click: () => mainWindow?.webContents.send('menu-open-character'),
    },
    {
      id: 'recent-characters',
      label: 'Recent Characters',
      enabled: currentAppMode === 'characters-welcome',
      submenu: recentFilesSubmenu,
    },
    { type: 'separator' },
    {
      id: 'save-character',
      label: 'Save Character',
      accelerator: 'CmdOrCtrl+S',
      enabled: isInCharacterBuilder,
      click: () => mainWindow?.webContents.send('menu-save-character'),
    },
    {
      id: 'save-character-as',
      label: 'Save Character As...',
      accelerator: 'CmdOrCtrl+Shift+S',
      enabled: isInCharacterBuilder,
      click: () => mainWindow?.webContents.send('menu-save-character-as'),
    },
    {
      id: 'export-character-pdf',
      label: 'Export Character PDF...',
      enabled: isInCharacterBuilder,
      click: () => mainWindow?.webContents.send('menu-export-character-pdf'),
    },
  ];

  const battlesFileItems: MenuItemConstructorOptions[] = [
    {
      id: 'new-battle',
      label: 'New Battle',
      accelerator: 'CmdOrCtrl+N',
      click: () => mainWindow?.webContents.send('menu-new-battle'),
    },
    {
      id: 'open-battle',
      label: 'Open Battle...',
      accelerator: 'CmdOrCtrl+O',
      click: () => mainWindow?.webContents.send('menu-open-battle'),
    },
    {
      id: 'recent-battles',
      label: 'Recent Battles',
      enabled: currentAppMode === 'battles-welcome',
      submenu: recentFilesSubmenu,
    },
    {
      id: 'battle-library',
      label: 'Battle Library',
      click: () => mainWindow?.webContents.send('menu-battle-library'),
    },
    { type: 'separator' },
    {
      id: 'save-battle',
      label: 'Save Battle',
      accelerator: 'CmdOrCtrl+S',
      enabled: isInBattleBuilder,
      click: () => mainWindow?.webContents.send('menu-save-battle'),
    },
    {
      id: 'save-battle-as',
      label: 'Save Battle As...',
      accelerator: 'CmdOrCtrl+Shift+S',
      enabled: isInBattleBuilder,
      click: () => mainWindow?.webContents.send('menu-save-battle-as'),
    },
    {
      id: 'export-battle-report',
      label: 'Export Battle Report...',
      enabled: isInBattleBuilder,
      click: () => mainWindow?.webContents.send('menu-export-battle-report'),
    },
  ];

  const travelFileItems: MenuItemConstructorOptions[] = [
    {
      id: 'import-travel-ship',
      label: 'Import Warship Design...',
      accelerator: 'CmdOrCtrl+O',
      click: () => mainWindow?.webContents.send('menu-import-travel-ship'),
    },
  ];

  const contextualFileItems = group === 'warships' ? warshipsFileItems
    : group === 'characters' ? charactersFileItems
      : group === 'battles' ? battlesFileItems
        : group === 'travel' ? travelFileItems
          : [];

  const startScreen = group === 'warships'
    ? { label: 'Warships Start Screen', enabled: currentAppMode !== 'welcome' }
    : group === 'characters'
      ? { label: 'Character Creator Start Screen', enabled: currentAppMode !== 'characters-welcome' }
      : group === 'battles'
        ? { label: 'Battle Resolution Start Screen', enabled: currentAppMode !== 'battles-welcome' }
        : null;

  const navigationItems: MenuItemConstructorOptions[] = [
    ...(startScreen ? [{
      id: 'return-to-start',
      label: startScreen.label,
      enabled: startScreen.enabled,
      click: () => mainWindow?.webContents.send('menu-return-to-start'),
    }] : []),
    ...(group !== 'hub' && group !== 'other' ? [{
      id: 'return-to-hub',
      label: 'Workshop Home',
      click: () => mainWindow?.webContents.send('menu-return-to-hub'),
    }] : []),
  ];

  const fileMenuItems: MenuItemConstructorOptions[] = [
    ...contextualFileItems,
    ...(contextualFileItems.length > 0 && navigationItems.length > 0 ? [{ type: 'separator' as const }] : []),
    ...navigationItems,
    ...(contextualFileItems.length > 0 || navigationItems.length > 0 ? [{ type: 'separator' as const }] : []),
    isMac ? { role: 'close' as const } : { role: 'quit' as const },
  ];

  const contextualViewItems: MenuItemConstructorOptions[] = group === 'warships' || group === 'battles'
    ? [
        {
          label: group === 'warships' ? 'Open Warships Data Folder' : 'Open Battle Data Folder',
          click: () => { void shell.openPath(getModuleDataDir(group)); },
        },
        {
          label: 'Open Mod Folder',
          click: () => {
            const modsDir = getModsDir();
            if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
            void shell.openPath(modsDir);
          },
        },
        { type: 'separator' },
      ]
    : [];

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
      submenu: fileMenuItems,
    },
    // View menu
    {
      label: 'View',
      submenu: [
        ...contextualViewItems,
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
          enabled: group !== 'hub' && group !== 'other',
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
        ...(group === 'warships' || group === 'battles' ? [{
          label: 'Modding Guide',
          click: () => { void shell.openExternal('https://github.com/VicenteCartas/AlternityWarshipsGenerator/wiki/Modding-Guide'); },
        }] : []),
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
ipcMain.handle('show-save-dialog', async (_event, defaultFileName: string, defaultDirectory?: string) => {
  if (!mainWindow) return { canceled: true };
  
  const defaultPath = defaultDirectory
    ? path.join(defaultDirectory, defaultFileName)
    : defaultFileName;
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Warship',
    defaultPath,
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

// IPC Handlers for Battle Save/Load
ipcMain.handle('show-battle-save-dialog', async (_event, defaultFileName: string, defaultDirectory?: string) => {
  if (!mainWindow) return { canceled: true };

  const defaultPath = defaultDirectory
    ? path.join(defaultDirectory, defaultFileName)
    : defaultFileName;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Battle',
    defaultPath,
    filters: [
      { name: 'Battle Files', extensions: ['battle.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  return result;
});

ipcMain.handle('show-battle-open-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Battle',
    filters: [
      { name: 'Battle Files', extensions: ['battle.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  return result;
});

// IPC Handlers for Character Save/Load
ipcMain.handle('show-character-save-dialog', async (_event, defaultFileName: string, defaultDirectory?: string) => {
  if (!mainWindow) return { canceled: true };

  const defaultPath = defaultDirectory
    ? path.join(defaultDirectory, defaultFileName)
    : defaultFileName;

  return dialog.showSaveDialog(mainWindow, {
    title: 'Save Character',
    defaultPath,
    filters: [
      { name: 'Character Files', extensions: ['character.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
});

ipcMain.handle('show-character-open-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };

  return dialog.showOpenDialog(mainWindow, {
    title: 'Open Character',
    filters: [
      { name: 'Character Files', extensions: ['character.json'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
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
// This allows users to edit data files externally.
// Warships data lives at the root of the data folder (unchanged for existing
// installs); every other module gets its own subfolder.
function getModuleDataDir(module: string): string {
  const isWarships = module === 'warships';
  if (isDev) {
    return path.join(__dirname, '../src/modules', isWarships ? 'warships' : module, 'data');
  }
  return isWarships
    ? path.join(process.resourcesPath, 'data')
    : path.join(process.resourcesPath, 'data', module);
}

ipcMain.handle('read-data-file', async (_event, fileName: string, module: string = 'warships') => {
  try {
    const dataPath = path.join(getModuleDataDir(module), fileName);
    const content = fs.readFileSync(dataPath, 'utf-8');
    return { success: true, content, path: dataPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get the data directory path for user reference
ipcMain.handle('get-data-path', async (_event, module: string = 'warships') => {
  return getModuleDataDir(module);
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

// App settings
ipcMain.handle('read-app-settings', async () => {
  return { success: true, settings: readAppSettings() };
});

ipcMain.handle('update-app-settings', async (_event, settingsJson: string) => {
  try {
    const settings = JSON.parse(settingsJson) as AppSettings;
    writeAppSettings(settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// App mode management - updates menu state
ipcMain.handle('set-builder-mode', async (_event, mode: string) => {
  currentAppMode = mode as AppMode;
  createMenu();
  return { success: true };
});

// ============== Ship Library: Scan for .warship.json files ==============

/**
 * Recursively scan a directory for .warship.json files and return lightweight metadata.
 * Reads only the top-level fields needed for library cards (no full deserialization).
 */
async function scanWarshipFiles(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<Array<{
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
}>> {
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
    entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...await scanWarshipFiles(fullPath, maxDepth, currentDepth + 1));
    } else if (entry.isFile() && entry.name.endsWith('.warship.json')) {
      try {
        const stat = await fsPromises.stat(fullPath);
        const content = await fsPromises.readFile(fullPath, 'utf-8');
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
    try {
      await fsPromises.access(directoryPath);
    } catch {
      return { success: true, files: [] };
    }
    const files = await scanWarshipFiles(directoryPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: (error as Error).message, files: [] };
  }
});

ipcMain.handle('select-directory', async (_event, defaultPath?: string) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder to scan for designs',
    ...(defaultPath && fs.existsSync(defaultPath) ? { defaultPath } : {}),
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

// ============== Battle Library & Auto-save ==============

/**
 * Recursively scan a directory for .battle.json files and return lightweight metadata
 * for the battle library cards (no full deserialization).
 */
async function scanBattleFiles(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<Array<{
  filePath: string;
  scenarioName: string;
  sideAName: string;
  sideBName: string;
  theatreCount: number;
  roundCount: number;
  totalCombatStrength: number;
  modifiedAt: string | null;
  createdAt: string | null;
  fileSizeBytes: number;
}>> {
  const results: Array<{
    filePath: string;
    scenarioName: string;
    sideAName: string;
    sideBName: string;
    theatreCount: number;
    roundCount: number;
    totalCombatStrength: number;
    modifiedAt: string | null;
    createdAt: string | null;
    fileSizeBytes: number;
  }> = [];

  if (currentDepth > maxDepth) return results;

  let entries: fs.Dirent[];
  try {
    entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...await scanBattleFiles(fullPath, maxDepth, currentDepth + 1));
    } else if (entry.isFile() && entry.name.endsWith('.battle.json')) {
      try {
        const stat = await fsPromises.stat(fullPath);
        const content = await fsPromises.readFile(fullPath, 'utf-8');
        const parsed = JSON.parse(content);
        const battle = parsed.battle || {};
        const theatres: Array<{ rounds?: unknown[] }> = Array.isArray(battle.theatres) ? battle.theatres : [];
        const stacks = [
          ...(Array.isArray(battle.sideA?.stacks) ? battle.sideA.stacks : []),
          ...(Array.isArray(battle.sideB?.stacks) ? battle.sideB.stacks : []),
        ];
        results.push({
          filePath: fullPath,
          scenarioName: battle.scenarioName || entry.name.replace(/\.battle\.json$/i, ''),
          sideAName: battle.sideA?.name || 'Side A',
          sideBName: battle.sideB?.name || 'Side B',
          theatreCount: theatres.length,
          roundCount: theatres.reduce((sum, t) => sum + (Array.isArray(t.rounds) ? t.rounds.length : 0), 0),
          totalCombatStrength: stacks.reduce(
            (sum: number, s: { combatStrengthPerUnit?: number; initialQuantity?: number }) =>
              sum + (Number(s?.combatStrengthPerUnit) || 0) * (Number(s?.initialQuantity) || 0),
            0,
          ),
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

ipcMain.handle('scan-battle-files', async (_event, directoryPath: string) => {
  try {
    try {
      await fsPromises.access(directoryPath);
    } catch {
      return { success: true, files: [] };
    }
    const files = await scanBattleFiles(directoryPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: (error as Error).message, files: [] };
  }
});

function getBattleAutoSavePath(): string {
  return path.join(app.getPath('userData'), 'autosave.battle.json');
}

ipcMain.handle('write-battle-autosave', async (_event, content: string) => {
  try {
    fs.writeFileSync(getBattleAutoSavePath(), content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('read-battle-autosave', async () => {
  try {
    const autoSavePath = getBattleAutoSavePath();
    if (!fs.existsSync(autoSavePath)) {
      return { success: false, error: 'No auto-save file found' };
    }
    const content = fs.readFileSync(autoSavePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('delete-battle-autosave', async () => {
  try {
    const autoSavePath = getBattleAutoSavePath();
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
  // Warships module
  'techTracks.json',
  'hulls.json', 'armor.json', 'powerPlants.json', 'fuelTank.json',
  'engines.json', 'ftlDrives.json', 'supportSystems.json', 'weapons.json',
  'ordnance.json', 'defenses.json', 'sensors.json', 'commandControl.json',
  'hangarMisc.json', 'damageDiagram.json',
  // Battles module
  'spaceUnits.json', 'groundUnits.json', 'battleRules.json',
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
    if (!altmod.manifest.name) {
      return { success: false, error: 'Invalid mod manifest: missing name' };
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

// Duplicate a mod (copy all files to a new folder)
ipcMain.handle('duplicate-mod', async (_event, folderName: string) => {
  try {
    const modsDir = getModsDir();
    const sourceDir = path.join(modsDir, folderName);
    const manifestPath = path.join(sourceDir, 'mod.json');
    if (!fs.existsSync(manifestPath)) {
      return { success: false, error: 'Source mod not found' };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const copyName = `${manifest.name} (Copy)`;
    const baseSlug = copyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Find a unique folder name
    let targetSlug = baseSlug;
    let targetDir = path.join(modsDir, targetSlug);
    let suffix = 1;
    while (fs.existsSync(targetDir)) {
      targetSlug = `${baseSlug}-${suffix}`;
      targetDir = path.join(modsDir, targetSlug);
      suffix++;
    }

    // Create folder and write updated manifest
    fs.mkdirSync(targetDir, { recursive: true });
    const newManifest = { ...manifest, name: copyName };
    fs.writeFileSync(path.join(targetDir, 'mod.json'), JSON.stringify(newManifest, null, 2), 'utf-8');

    // Copy all data files
    for (const dataFile of MOD_DATA_FILES) {
      const srcFile = path.join(sourceDir, dataFile);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDir, dataFile));
      }
    }

    // Add to settings as disabled
    const settings = readModSettings();
    const maxPriority = settings.mods.reduce((max, m) => Math.max(max, m.priority), 0);
    settings.mods.push({ folderName: targetSlug, enabled: false, priority: maxPriority + 1 });
    writeModSettings(settings);

    return { success: true, folderName: targetSlug };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Get the mods directory path
ipcMain.handle('get-mods-path', async () => {
  ensureModsDir();
  return getModsDir();
});
