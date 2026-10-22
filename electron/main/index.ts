import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { setupIpcHandlers } from './ipc';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process-level exception handling with full stack formatting
process.on('uncaughtException', (error) => {
  const errMsg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
  logger.error('main', 'Uncaught Exception', errMsg);
});

process.on('unhandledRejection', (reason) => {
  const reasonMsg = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason);
  logger.error('main', 'Unhandled Rejection', reasonMsg);
});

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  logger.init();
  logger.info('main', 'Starting DeployHub desktop application...');

  const appPath = app.getAppPath();
  logger.info('main', `App path resolved: ${appPath}`);

  // Resolve preload path reliably (.cjs preferred for CommonJS execution under "type": "module")
  const candidatePreloadPaths = [
    path.join(appPath, 'dist-electron/preload/index.cjs'),
    path.join(appPath, 'dist-electron/preload/index.js'),
    path.join(__dirname, '../preload/index.cjs'),
    path.join(__dirname, '../preload/index.js'),
    path.join(__dirname, '../../preload/index.cjs'),
    path.join(__dirname, '../../preload/index.js'),
  ];

  const preloadPath = candidatePreloadPaths.find((p) => fs.existsSync(p)) || candidatePreloadPaths[0];
  logger.info('main', `Preload path resolved: ${preloadPath} (exists: ${fs.existsSync(preloadPath)})`);

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
      sandbox: false,
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
    logger.info('main', 'Main window shown successfully.');
  });

  setupIpcHandlers();

  // Load URL or local index
  if (process.env.VITE_DEV_SERVER_URL) {
    logger.info('main', `Loading dev server: ${process.env.VITE_DEV_SERVER_URL}`);
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    let indexPath = path.join(appPath, 'dist/index.html');
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(__dirname, '../../dist/index.html');
    }
    logger.info('main', `Loading local HTML file: ${indexPath} (exists: ${fs.existsSync(indexPath)})`);
    await mainWindow.loadFile(indexPath);
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
