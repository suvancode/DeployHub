import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc';
import { logger } from './logger';

// Process-level exception handling
process.on('uncaughtException', (error) => {
  logger.error('main', 'Uncaught Exception', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('main', 'Unhandled Rejection', reason);
});

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  logger.init();
  logger.info('main', 'Starting DeployHub desktop application...');

  const preloadPath = path.join(__dirname, '../preload/index.js');

  mainWindow = new BrowserWindow({
    title: 'DeployHub',
    width: 1240,
    height: 840,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#0a0f1d',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for custom IPC preload
      webSecurity: true,
    },
  });

  // Strict CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*;",
        ],
      },
    });
  });

  // Prevent opening untrusted windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  setupIpcHandlers();

  // Load URL or local index
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
