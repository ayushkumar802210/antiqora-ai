/**
 * Antiqora AI Electron Main Process
 * Manages native window, secure IPC handlers, screenshot capture, and OS bridges.
 */

const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Import server services directly for native speed
const { getRealSystemStatus } = require('../server/services/systemInfo.cjs');
const { openApplication, openFolder, openUrl } = require('../server/services/desktopAutomator.cjs');
const { parseFileContent, safeWriteFile } = require('../server/services/fileParser.cjs');
const { sanitizePath } = require('../server/ai/safety/sanitizer.cjs');
const logger = require('../server/utils/logger.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#07090e',
    title: 'ANTIQORA AI — Your Intelligent Digital Companion',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '../dist/index.html');

  if (process.env.NODE_ENV === 'development' || !fs.existsSync(prodPath)) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(prodPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('antiqora:get-system-info', async () => {
  const status = getRealSystemStatus(true, 'desktop');
  status.desktopConnected = true;
  return status;
});

ipcMain.handle('antiqora:open-app', async (_, appName) => {
  return await openApplication(appName);
});

ipcMain.handle('antiqora:open-folder', async (_, folderPath) => {
  return await openFolder(folderPath);
});

ipcMain.handle('antiqora:open-url', async (_, url) => {
  return await openUrl(url);
});

ipcMain.handle('antiqora:read-file', async (_, filePath) => {
  return await parseFileContent(filePath);
});

ipcMain.handle('antiqora:save-file', async (_, { filePath, content }) => {
  return await safeWriteFile(filePath, content, true);
});

ipcMain.handle('antiqora:list-dir', async (_, dirPath) => {
  const safeDir = sanitizePath(dirPath || process.cwd());
  const files = fs.readdirSync(safeDir);
  return { success: true, files };
});

ipcMain.handle('antiqora:capture-screen', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: primaryDisplay.size.width,
        height: primaryDisplay.size.height,
      },
    });

    if (sources.length > 0) {
      const dataUrl = sources[0].thumbnail.toDataURL();
      return { success: true, dataUrl };
    }
    return { success: false, error: 'No display screen detected.' };
  } catch (err) {
    logger.error('ELECTRON', 'Native screen capture failed', { error: err.message });
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
