import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createMenu() {
  const isMac = process.platform === 'darwin';

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
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const },
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const },
        ]),
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
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

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
