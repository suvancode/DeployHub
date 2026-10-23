import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import path from 'path';
import { scanProjectFolder } from './projectScanner';
import { gitManager } from './gitManager';
import { githubManager } from './githubManager';
import { vercelManager } from './vercelManager';
import { netlifyManager } from './netlifyManager';
import { ghPagesManager } from './ghPagesManager';
import { pushAndDeployPipeline } from './deploymentPipeline';
import { configManager } from './configManager';
import { openInTerminal } from './terminalHelper';
import { logger } from './logger';
import { diagnoseGitError } from './errorDiagnostics';
import { updateManager } from './updateManager';
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
  ipcMain.handle('select-folder', async (event) => {
    logger.info('ipc', 'select-folder IPC invoked');
    try {
      const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const options: Electron.OpenDialogOptions = {
        title: 'Select Project Folder',
        properties: ['openDirectory'],
      };

      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);

      logger.info('ipc', `dialog result: canceled=${result.canceled}, filePaths=${JSON.stringify(result.filePaths)}`);

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }

      const selectedPath = path.resolve(result.filePaths[0]);
      logger.info('ipc', `Resolved project folder: ${selectedPath}`);
      return selectedPath;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('ipc', 'Error opening folder dialog', msg);
      return null;
    }
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

  ipcMain.handle('push-repo', async (_, folderPath: string, remoteName?: string, branchName?: string) => {
    return gitManager.pushRepo(folderPath, remoteName, branchName);
  });

  ipcMain.handle('fix-git-remote', async (_, folderPath: string, remoteName: string, fixedUrl: string) => {
    return gitManager.fixRemote(folderPath, remoteName, fixedUrl);
  });

  ipcMain.handle('diagnose-git-error', async (_, rawError: string, currentRemoteUrl?: string) => {
    return diagnoseGitError(rawError, currentRemoteUrl);
  });

  // GitHub Setup
  ipcMain.handle('check-github-status', async () => {
    return githubManager.checkStatus();
  });

  ipcMain.handle('switch-github-account', async (_, username: string) => {
    return githubManager.switchAccount(username);
  });

  ipcMain.handle('login-github', async () => {
    return githubManager.loginAccount();
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

  // Vercel Setup & Automation Pipeline
  ipcMain.handle('check-vercel-status', async () => {
    return vercelManager.checkStatus();
  });

  ipcMain.handle('switch-vercel-account', async (_, scope: string) => {
    return vercelManager.switchAccount(scope);
  });

  ipcMain.handle('login-vercel', async () => {
    return vercelManager.loginAccount();
  });

  ipcMain.handle('link-vercel-project', async (_, folderPath: string, config: VercelProjectConfig) => {
    return vercelManager.linkProject(folderPath, config);
  });

  ipcMain.handle('deploy-initial-vercel', async (_, folderPath: string, isProduction: boolean, customSlug?: string) => {
    return vercelManager.deployInitial(folderPath, isProduction, customSlug);
  });

  ipcMain.handle('deploy-vercel', async (_, folderPath: string, isProduction?: boolean, customSlug?: string) => {
    return vercelManager.deployInitial(folderPath, isProduction ?? true, customSlug);
  });

  // Netlify Setup & Actions
  ipcMain.handle('check-netlify-status', async () => {
    return netlifyManager.checkStatus();
  });

  ipcMain.handle('login-netlify', async () => {
    return netlifyManager.loginAccount();
  });

  ipcMain.handle('deploy-netlify', async (_, folderPath: string, siteName?: string, isProduction?: boolean) => {
    return netlifyManager.deploy(folderPath, { siteName, isProduction: isProduction ?? true });
  });

  // GitHub Pages Setup & Actions
  ipcMain.handle('check-gh-pages-status', async (_, folderPath: string) => {
    return ghPagesManager.checkStatus(folderPath);
  });

  ipcMain.handle('deploy-gh-pages', async (_, folderPath: string, branchName?: string) => {
    return ghPagesManager.deploy(folderPath, branchName || 'main');
  });

  // Automated Multi-Platform Pipeline
  ipcMain.handle(
    'push-and-deploy',
    async (
      _,
      folderPath: string,
      remoteName?: string,
      branchName?: string,
      isProduction?: boolean,
      customSlug?: string,
      targets?: Array<'vercel' | 'netlify' | 'github-pages'>
    ) => {
      return pushAndDeployPipeline(
        folderPath,
        remoteName || 'origin',
        branchName,
        isProduction ?? true,
        customSlug,
        targets || ['vercel']
      );
    }
  );

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

  // In-App Auto-Updates
  ipcMain.handle('check-for-updates', async () => {
    return updateManager.checkForUpdates();
  });

  ipcMain.handle('download-and-install-update', async (_, downloadUrl: string) => {
    return updateManager.downloadAndInstallUpdate(downloadUrl);
  });
}
