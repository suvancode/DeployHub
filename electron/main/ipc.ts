import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import path from 'path';
import { scanProjectFolder } from './projectScanner';
import { gitManager } from './gitManager';
import { githubManager } from './githubManager';
import { vercelManager } from './vercelManager';
import { configManager } from './configManager';
import { openInTerminal } from './terminalHelper';
import { logger } from './logger';
import {
  ProjectRecord,
  CreateRepoOptions,
  ConnectRepoOptions,
  VercelProjectConfig,
  AppSettings,
} from '../../src/types/api';

export function setupIpcHandlers() {
  logger.info('ipc', 'Registering IPC handlers');

  // Folder selection
  ipcMain.handle('select-folder', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow || undefined as unknown as BrowserWindow, {
      title: 'Select Project Folder',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return path.resolve(result.filePaths[0]);
  });

  // Project Inspection
  ipcMain.handle('inspect-project', async (_, folderPath: string) => {
    if (!folderPath || typeof folderPath !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid folder path provided.',
          modified: false,
        },
      };
    }
    try {
      const inspection = await scanProjectFolder(folderPath);
      return {
        success: true,
        data: inspection,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'SCAN_FAILED',
          message: 'Project inspection failed.',
          why: msg,
          modified: false,
        },
      };
    }
  });

  // Git Setup
  ipcMain.handle('init-git-repo', async (_, folderPath: string, branch: string) => {
    return gitManager.initRepo(folderPath, branch);
  });

  ipcMain.handle('apply-gitignore', async (_, folderPath: string, content: string) => {
    return gitManager.applyGitignore(folderPath, content);
  });

  ipcMain.handle('create-initial-commit', async (_, folderPath: string, message: string) => {
    return gitManager.createInitialCommit(folderPath, message);
  });

  ipcMain.handle('get-manual-push-command', async (_, folderPath: string, remoteName: string, branchName: string) => {
    return gitManager.getManualPushCommand(folderPath, remoteName, branchName);
  });

  // GitHub Setup
  ipcMain.handle('check-github-status', async () => {
    return githubManager.checkStatus();
  });

  ipcMain.handle('list-github-repos', async () => {
    return githubManager.listUserRepositories();
  });

  ipcMain.handle('create-github-repo', async (_, folderPath: string, options: CreateRepoOptions) => {
    return githubManager.createRepository(folderPath, options);
  });

  ipcMain.handle('connect-github-repo', async (_, folderPath: string, options: ConnectRepoOptions) => {
    return githubManager.connectRepository(folderPath, options);
  });

  // Vercel Setup
  ipcMain.handle('check-vercel-status', async () => {
    return vercelManager.checkStatus();
  });

  ipcMain.handle('link-vercel-project', async (_, folderPath: string, config: VercelProjectConfig) => {
    return vercelManager.linkProject(folderPath, config);
  });

  ipcMain.handle('deploy-initial-vercel', async (_, folderPath: string, isProduction: boolean) => {
    return vercelManager.deployInitial(folderPath, isProduction);
  });

  // Project Registry Storage
  ipcMain.handle('get-projects', async () => {
    return configManager.getProjects();
  });

  ipcMain.handle('get-project', async (_, id: string) => {
    return configManager.getProject(id);
  });

  ipcMain.handle('save-project', async (_, project: ProjectRecord) => {
    try {
      const saved = configManager.saveProject(project);
      return { success: true, data: saved };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: { code: 'SAVE_FAILED', message: msg, modified: false },
      };
    }
  });

  ipcMain.handle('delete-project', async (_, id: string) => {
    try {
      configManager.deleteProject(id);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: { code: 'DELETE_FAILED', message: msg, modified: false },
      };
    }
  });

  ipcMain.handle('export-registry', async () => {
    try {
      const data = configManager.exportRegistry();
      return { success: true, data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: { code: 'EXPORT_FAILED', message: msg, modified: false },
      };
    }
  });

  ipcMain.handle('import-registry', async (_, jsonString: string) => {
    try {
      const count = configManager.importRegistry(jsonString);
      return { success: true, data: count };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: { code: 'IMPORT_FAILED', message: msg, modified: false },
      };
    }
  });

  // Utilities
  ipcMain.handle('open-in-explorer', async (_, targetPath: string) => {
    await shell.openPath(targetPath);
  });

  ipcMain.handle('open-in-terminal', async (_, folderPath: string) => {
    return openInTerminal(folderPath);
  });

  ipcMain.handle('open-external-url', async (_, url: string) => {
    // Only allow http/https protocols for security
    if (url.startsWith('https://') || url.startsWith('http://')) {
      await shell.openExternal(url);
    } else {
      logger.warn('ipc', `Blocked untrusted external URL scheme: ${url}`);
    }
  });

  ipcMain.handle('get-logs', async () => {
    return logger.getEntries();
  });

  ipcMain.handle('clear-logs', async () => {
    logger.clear();
  });

  ipcMain.handle('get-settings', async () => {
    return configManager.getSettings();
  });

  ipcMain.handle('save-settings', async (_, settings: Partial<AppSettings>) => {
    try {
      configManager.saveSettings(settings);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: { code: 'SETTINGS_FAILED', message: msg, modified: false },
      };
    }
  });
}
