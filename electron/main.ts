import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// App version - keep in sync with src/constants/version.ts
const APP_VERSION = '0.2.0';
const APP_NAME = 'Alternity Warship Generator';

let mainWindow: BrowserWindow | null = null;

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
          label: 'New Warship',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-warship');
          },
        },
        {
          label: 'Load Warship...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-load-warship');
          },
        },
        {
          label: 'Recent Files',
          submenu: recentFilesSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Save Warship',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-save-warship');
          },
        },
        {
          label: 'Save Warship As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu-save-warship-as');
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
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
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
    mainWindow.loadURL('http://localhost:4200');
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
