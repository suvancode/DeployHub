export interface SensitiveFileWarning {
  path: string;
  reason: string;
  severity: 'warning' | 'critical';
}

export interface GitRemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitFileInfo {
  path: string;
  status: string; // e.g., 'M', '??', 'A', 'D'
}

export interface FrameworkInfo {
  id: string;
  name: string;
  vercelCompatible: boolean;
  notes?: string;
  buildCommand?: string;
  outputDirectory?: string;
}

export interface ProjectInspection {
  folderPath: string;
  folderName: string;
  accessible: boolean;
  gitInstalled: boolean;
  gitVersion?: string;
  isGitRepo: boolean;
  currentBranch?: string;
  availableBranches: string[];
  remotes: GitRemoteInfo[];
  hasUncommittedChanges: boolean;
  uncommittedFiles: GitFileInfo[];
  hasCommits: boolean;
  commitCount: number;
  hasPackageJson: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'none';
  framework?: FrameworkInfo;
  hasGitignore: boolean;
  existingGitignoreContent?: string;
  sensitiveFiles: SensitiveFileWarning[];
  isMonorepo: boolean;
  monorepoPackages?: string[];
  suggestedGitignore?: string;
  warnings: string[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  path: string;
  repoUrl?: string;
  remoteName?: string;
  branchName?: string;
  githubUser?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  vercelProductionUrl?: string;
  projectRoot: string;
  framework?: string;
  productionBranch?: string;
  setupStatus: 'pending' | 'git_configured' | 'github_connected' | 'vercel_linked' | 'completed';
  createdAt: string;
  updatedAt: string;
  lastOperation?: {
    name: string;
    status: 'success' | 'failed' | 'in_progress';
    timestamp: string;
    message?: string;
  };
  warnings?: string[];
}

export interface GitHubAccountStatus {
  installed: boolean;
  authenticated: boolean;
  username?: string;
  name?: string;
  protocol?: string;
  scopes?: string[];
  error?: string;
}

export interface GitHubRepoItem {
  name: string;
  fullName: string;
  isPrivate: boolean;
  url: string;
  description?: string;
  defaultBranch: string;
}

export interface CreateRepoOptions {
  name: string;
  description?: string;
  isPrivate: boolean;
  remoteName?: string;
}

export interface ConnectRepoOptions {
  repoUrl: string;
  remoteName?: string;
}

export interface VercelStatus {
  installed: boolean;
  authenticated: boolean;
  username?: string;
  scope?: string;
  error?: string;
}

export interface VercelEnvVar {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
}

export interface VercelProjectConfig {
  projectName: string;
  framework?: string;
  projectRoot?: string;
  envVars?: VercelEnvVar[];
}

export interface ManualPushInfo {
  command: string;
  branch: string;
  remoteName: string;
  repoUrl: string;
  hasCommits: boolean;
  explanation: string;
  isInitialPush: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
  details?: unknown;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  preferredTerminal: 'wt' | 'pwsh' | 'powershell' | 'cmd';
  defaultBranch: string;
  autoDetectVercel: boolean;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    why?: string;
    modified: boolean;
    nextStep?: string;
    completedSteps?: string[];
  };
}

// IPC Interface exposed via contextBridge
export interface DeployHubAPI {
  // Folder & Inspection
  selectFolder: () => Promise<string | null>;
  inspectProject: (folderPath: string) => Promise<ActionResult<ProjectInspection>>;
  
  // Git Actions
  initGitRepo: (folderPath: string, branch: string) => Promise<ActionResult<{ branch: string }>>;
  applyGitignore: (folderPath: string, content: string) => Promise<ActionResult<void>>;
  createInitialCommit: (folderPath: string, message: string) => Promise<ActionResult<{ commitHash: string }>>;
  getManualPushCommand: (folderPath: string, remoteName: string, branchName: string) => Promise<ActionResult<ManualPushInfo>>;
  
  // GitHub CLI Actions
  checkGitHubStatus: () => Promise<GitHubAccountStatus>;
  listGitHubRepos: () => Promise<ActionResult<GitHubRepoItem[]>>;
  createGitHubRepo: (folderPath: string, options: CreateRepoOptions) => Promise<ActionResult<{ repoUrl: string; remoteName: string }>>;
  connectGitHubRepo: (folderPath: string, options: ConnectRepoOptions) => Promise<ActionResult<{ repoUrl: string; remoteName: string }>>;
  
  // Vercel CLI Actions
  checkVercelStatus: () => Promise<VercelStatus>;
  linkVercelProject: (folderPath: string, config: VercelProjectConfig) => Promise<ActionResult<{ projectId: string; projectName: string }>>;
  deployInitialVercel: (folderPath: string, isProduction: boolean) => Promise<ActionResult<{ url: string; inspectUrl?: string }>>;
  
  // Project Registry & Storage
  getProjects: () => Promise<ProjectRecord[]>;
  getProject: (id: string) => Promise<ProjectRecord | null>;
  saveProject: (project: ProjectRecord) => Promise<ActionResult<ProjectRecord>>;
  deleteProject: (id: string) => Promise<ActionResult<void>>;
  exportRegistry: () => Promise<ActionResult<string>>;
  importRegistry: (jsonString: string) => Promise<ActionResult<number>>;
  
  // System / Utility
  openInExplorer: (path: string) => Promise<void>;
  openInTerminal: (path: string) => Promise<ActionResult<void>>;
  openExternalUrl: (url: string) => Promise<void>;
  getLogs: () => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<ActionResult<void>>;
}

declare global {
  interface Window {
    deployHubAPI: DeployHubAPI;
  }
}
