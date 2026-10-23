import { contextBridge, ipcRenderer } from 'electron';
import {
  DeployHubAPI,
  CreateRepoOptions,
  ConnectRepoOptions,
  VercelProjectConfig,
  ProjectRecord,
  AppSettings,
} from '../../src/types/api';

const api: DeployHubAPI = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  inspectProject: (folderPath: string) => ipcRenderer.invoke('inspect-project', folderPath),

  initGitRepo: (folderPath: string, branch: string) => ipcRenderer.invoke('init-git-repo', folderPath, branch),
  applyGitignore: (folderPath: string, content: string) => ipcRenderer.invoke('apply-gitignore', folderPath, content),
  createInitialCommit: (folderPath: string, message: string) => ipcRenderer.invoke('create-initial-commit', folderPath, message),
  getManualPushCommand: (folderPath: string, remoteName: string, branchName: string) =>
    ipcRenderer.invoke('get-manual-push-command', folderPath, remoteName, branchName),
  pushRepo: (folderPath: string, remoteName?: string, branchName?: string) =>
    ipcRenderer.invoke('push-repo', folderPath, remoteName, branchName),
  fixGitRemote: (folderPath: string, remoteName: string, fixedUrl: string) =>
    ipcRenderer.invoke('fix-git-remote', folderPath, remoteName, fixedUrl),
  diagnoseGitError: (rawError: string, currentRemoteUrl?: string) =>
    ipcRenderer.invoke('diagnose-git-error', rawError, currentRemoteUrl),

  checkGitHubStatus: () => ipcRenderer.invoke('check-github-status'),
  switchGitHubAccount: (username: string) => ipcRenderer.invoke('switch-github-account', username),
  loginGitHub: () => ipcRenderer.invoke('login-github'),
  listGitHubRepos: () => ipcRenderer.invoke('list-github-repos'),
  createGitHubRepo: (folderPath: string, options: CreateRepoOptions) =>
    ipcRenderer.invoke('create-github-repo', folderPath, options),
  connectGitHubRepo: (folderPath: string, options: ConnectRepoOptions) =>
    ipcRenderer.invoke('connect-github-repo', folderPath, options),

  checkVercelStatus: () => ipcRenderer.invoke('check-vercel-status'),
  linkVercelProject: (folderPath: string, config: VercelProjectConfig) =>
    ipcRenderer.invoke('link-vercel-project', folderPath, config),
  deployInitialVercel: (folderPath: string, isProduction: boolean, customSlug?: string) =>
    ipcRenderer.invoke('deploy-initial-vercel', folderPath, isProduction, customSlug),
  deployVercel: (folderPath: string, isProduction?: boolean, customSlug?: string) =>
    ipcRenderer.invoke('deploy-vercel', folderPath, isProduction, customSlug),
  switchVercelAccount: (scope: string) =>
    ipcRenderer.invoke('switch-vercel-account', scope),
  loginVercel: () =>
    ipcRenderer.invoke('login-vercel'),

  checkNetlifyStatus: () => ipcRenderer.invoke('check-netlify-status'),
  loginNetlify: () => ipcRenderer.invoke('login-netlify'),
  deployNetlify: (folderPath: string, siteName?: string, isProduction?: boolean) =>
    ipcRenderer.invoke('deploy-netlify', folderPath, siteName, isProduction),

  checkGhPagesStatus: (folderPath: string) =>
    ipcRenderer.invoke('check-gh-pages-status', folderPath),
  deployGhPages: (folderPath: string, branchName?: string) =>
    ipcRenderer.invoke('deploy-gh-pages', folderPath, branchName),

  pushAndDeploy: (
    folderPath: string,
    remoteName?: string,
    branchName?: string,
    isProduction?: boolean,
    customSlug?: string,
    targets?: Array<'vercel' | 'netlify' | 'github-pages'>
  ) =>
    ipcRenderer.invoke('push-and-deploy', folderPath, remoteName, branchName, isProduction, customSlug, targets),

  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (id: string) => ipcRenderer.invoke('get-project', id),
  saveProject: (project: ProjectRecord) => ipcRenderer.invoke('save-project', project),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  exportRegistry: () => ipcRenderer.invoke('export-registry'),
  importRegistry: (jsonString: string) => ipcRenderer.invoke('import-registry', jsonString),

  openInExplorer: (path: string) => ipcRenderer.invoke('open-in-explorer', path),
  openInTerminal: (path: string) => ipcRenderer.invoke('open-in-terminal', path),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('save-settings', settings),

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadAndInstallUpdate: (downloadUrl: string) => ipcRenderer.invoke('download-and-install-update', downloadUrl),
  onUpdateProgress: (callback: (progress: any) => void) => {
    const listener = (_: any, progress: any) => callback(progress);
    ipcRenderer.on('update-progress', listener);
    return () => {
      ipcRenderer.removeListener('update-progress', listener);
    };
  },
};

contextBridge.exposeInMainWorld('deployHubAPI', api);
