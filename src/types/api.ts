// TypeScript type definitions for DeployHub IPC API and Domain Models

export interface SensitiveFileWarning {
  path: string;
  reason: string;
  severity: 'warning' | 'critical';
}

export interface GitFileInfo {
  path: string;
  status: string; // e.g., 'M', '??', 'A', 'D'
}

export interface GitRemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl: string;
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
  customSlug?: string; // Shortest domain slug (e.g. "3d-engine")
  repoUrl?: string;
  remoteName?: string;
  branchName?: string;
  githubUser?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  vercelProductionUrl?: string;
  netlifySiteName?: string;
  netlifyProductionUrl?: string;
  githubPagesUrl?: string;
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
  accounts?: string[];
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

export interface NetlifyStatus {
  installed: boolean;
  authenticated: boolean;
  username?: string;
  email?: string;
  error?: string;
}

export interface GitHubPagesStatus {
  enabled: boolean;
  url?: string;
  status?: string;
  customDomain?: string;
  sourceBranch?: string;
  sourcePath?: string;
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

export interface GitErrorDiagnosis {
  title: string;
  whatIsError: string;
  suggestion: string;
  rawError: string;
  canAutoFix: boolean;
  autoFixLabel?: string;
  autoFixType?: 'FIX_MALFORMED_URL' | 'SWITCH_SSH' | 'RECREATE_REMOTE';
  suggestedUrl?: string;
}

export interface PushRepoResult {
  output: string;
  autoFixed?: boolean;
  fixedUrl?: string;
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
    diagnosis?: GitErrorDiagnosis;
  };
}

export interface DeployResultItem {
  platform: 'vercel' | 'netlify' | 'github-pages';
  success: boolean;
  url?: string; // shortest canonical domain (e.g. https://slug.vercel.app)
  inspectUrl?: string;
  error?: string;
}

export interface PipelineResult {
  pushSuccess: boolean;
  pushOutput?: string;
  deploySuccess: boolean;
  deployUrl?: string;
  inspectUrl?: string;
  error?: string;
  results?: {
    vercel?: DeployResultItem;
    netlify?: DeployResultItem;
    githubPages?: DeployResultItem;
  };
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
}

export interface DownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export interface MultiDeployPipelineOptions {
  folderPath: string;
  remoteName?: string;
  branchName?: string;
  customSlug?: string;
  targets: Array<'vercel' | 'netlify' | 'github-pages'>;
  isProduction?: boolean;
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
  pushRepo: (folderPath: string, remoteName?: string, branchName?: string) => Promise<ActionResult<PushRepoResult>>;
  fixGitRemote: (folderPath: string, remoteName: string, fixedUrl: string) => Promise<ActionResult<void>>;
  diagnoseGitError: (rawError: string, currentRemoteUrl?: string) => Promise<GitErrorDiagnosis>;
  
  // GitHub CLI Actions
  checkGitHubStatus: () => Promise<GitHubAccountStatus>;
  switchGitHubAccount: (username: string) => Promise<ActionResult<void>>;
  loginGitHub: () => Promise<ActionResult<void>>;
  listGitHubRepos: () => Promise<ActionResult<GitHubRepoItem[]>>;
  createGitHubRepo: (folderPath: string, options: CreateRepoOptions) => Promise<ActionResult<{ repoUrl: string; remoteName: string }>>;
  connectGitHubRepo: (folderPath: string, options: ConnectRepoOptions) => Promise<ActionResult<{ repoUrl: string; remoteName: string }>>;
  
  // Vercel CLI Actions
  checkVercelStatus: () => Promise<VercelStatus>;
  linkVercelProject: (folderPath: string, config: VercelProjectConfig) => Promise<ActionResult<{ projectId: string; projectName: string }>>;
  deployInitialVercel: (folderPath: string, isProduction: boolean, customSlug?: string) => Promise<ActionResult<{ url: string; inspectUrl?: string }>>;
  deployVercel: (folderPath: string, isProduction?: boolean, customSlug?: string) => Promise<ActionResult<{ url: string; inspectUrl?: string }>>;
  switchVercelAccount: (scope: string) => Promise<ActionResult<void>>;
  loginVercel: () => Promise<ActionResult<void>>;

  // Netlify CLI Actions
  checkNetlifyStatus: () => Promise<NetlifyStatus>;
  loginNetlify: () => Promise<ActionResult<void>>;
  deployNetlify: (folderPath: string, siteName?: string, isProduction?: boolean) => Promise<ActionResult<{ url: string; deployUrl?: string }>>;

  // GitHub Pages Actions
  checkGhPagesStatus: (folderPath: string) => Promise<GitHubPagesStatus>;
  deployGhPages: (folderPath: string, branchName?: string) => Promise<ActionResult<{ url: string }>>;

  // Automated Multi-Target Pipeline
  pushAndDeploy: (
    folderPath: string,
    remoteName?: string,
    branchName?: string,
    isProduction?: boolean,
    customSlug?: string,
    targets?: Array<'vercel' | 'netlify' | 'github-pages'>
  ) => Promise<ActionResult<PipelineResult>>;
  
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

  // In-App Auto-Updates
  checkForUpdates: () => Promise<ActionResult<UpdateInfo>>;
  downloadAndInstallUpdate: (downloadUrl: string) => Promise<ActionResult<void>>;
  onUpdateProgress: (callback: (progress: DownloadProgress) => void) => () => void;
}

declare global {
  interface Window {
    deployHubAPI: DeployHubAPI;
  }
}
