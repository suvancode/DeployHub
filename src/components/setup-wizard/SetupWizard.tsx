import React, { useState } from 'react';
import {
  FolderOpen,
  GitBranch,
  ShieldCheck,
  GitPullRequest,
  Terminal,
  Globe,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  ProjectInspection,
  GitHubAccountStatus,
  VercelStatus,
  ManualPushInfo,
  CreateRepoOptions,
  ConnectRepoOptions,
  VercelProjectConfig,
  ProjectRecord,
} from '../../types/api';
import { Step1FolderSelect } from './Step1FolderSelect';
import { Step2GitSetup } from './Step2GitSetup';
import { Step3GitHubAccount } from './Step3GitHubAccount';
import { Step4GitHubRepo } from './Step4GitHubRepo';
import { Step5ManualPush } from './Step5ManualPush';
import { Step6VercelSetup } from './Step6VercelSetup';
import { Step7SummaryDeploy } from './Step7SummaryDeploy';

interface SetupWizardProps {
  initialProject?: ProjectRecord | null;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  onRefreshGitHubStatus: () => void;
  onRefreshVercelStatus: () => void;
  onOpenTerminal: (path: string) => void;
  onSaveProject: (project: ProjectRecord) => Promise<void>;
  onCloseWizard: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  initialProject,
  githubStatus,
  vercelStatus,
  onRefreshGitHubStatus,
  onRefreshVercelStatus,
  onOpenTerminal,
  onSaveProject,
  onCloseWizard,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Wizard state
  const [inspection, setInspection] = useState<ProjectInspection | null>(null);
  const [projectId] = useState<string>(initialProject?.id || `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>(initialProject?.name || '');
  const [configuredRepoUrl, setConfiguredRepoUrl] = useState<string | null>(initialProject?.repoUrl || null);
  const [configuredRemote, setConfiguredRemote] = useState<string>(initialProject?.remoteName || 'origin');
  const [configuredBranch, setConfiguredBranch] = useState<string>(initialProject?.branchName || 'main');
  const [pushInfo, setPushInfo] = useState<ManualPushInfo | null>(null);
  const [linkedVercelProject, setLinkedVercelProject] = useState<string | null>(
    initialProject?.vercelProjectName || null
  );

  const steps = [
    { num: 1, label: '1. Scan', icon: <FolderOpen className="w-3 h-3" /> },
    { num: 2, label: '2. Git', icon: <GitBranch className="w-3 h-3" /> },
    { num: 3, label: '3. GitHub User', icon: <ShieldCheck className="w-3 h-3" /> },
    { num: 4, label: '4. Repository', icon: <GitPullRequest className="w-3 h-3" /> },
    { num: 5, label: '5. Manual Push', icon: <Terminal className="w-3 h-3" /> },
    { num: 6, label: '6. Vercel', icon: <Globe className="w-3 h-3" /> },
    { num: 7, label: '7. Summary', icon: <Sparkles className="w-3 h-3" /> },
  ];

  // Step 1: Folder Selection & Inspection
  const handleSelectFolder = async () => {
    setLoading(true);
    try {
      const folder = await window.deployHubAPI.selectFolder();
      if (folder) {
        await runInspection(folder);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleManualPath = async (path: string) => {
    setLoading(true);
    try {
      await runInspection(path);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const runInspection = async (folderPath: string) => {
    const res = await window.deployHubAPI.inspectProject(folderPath);
    if (res.success && res.data) {
      setInspection(res.data);
      setProjectName(res.data.folderName);
      if (res.data.currentBranch) {
        setConfiguredBranch(res.data.currentBranch);
      }
      if (res.data.remotes.length > 0) {
        setConfiguredRepoUrl(res.data.remotes[0].fetchUrl);
        setConfiguredRemote(res.data.remotes[0].name);
      }
    }
  };

  // Step 2: Git Actions
  const handleInitGit = async (branch: string): Promise<boolean> => {
    if (!inspection) return false;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.initGitRepo(inspection.folderPath, branch);
      if (res.success) {
        setConfiguredBranch(branch);
        await runInspection(inspection.folderPath);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGitignore = async (content: string): Promise<boolean> => {
    if (!inspection) return false;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.applyGitignore(inspection.folderPath, content);
      return res.success;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommit = async (message: string): Promise<boolean> => {
    if (!inspection) return false;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.createInitialCommit(inspection.folderPath, message);
      if (res.success) {
        await runInspection(inspection.folderPath);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 4: GitHub Repo Creation / Connection
  const handleCreateRepo = async (options: CreateRepoOptions): Promise<string | null> => {
    if (!inspection) return null;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.createGitHubRepo(inspection.folderPath, options);
      if (res.success && res.data) {
        setConfiguredRepoUrl(res.data.repoUrl);
        setConfiguredRemote(res.data.remoteName);
        return res.data.repoUrl;
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRepo = async (options: ConnectRepoOptions): Promise<string | null> => {
    if (!inspection) return null;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.connectGitHubRepo(inspection.folderPath, options);
      if (res.success && res.data) {
        setConfiguredRepoUrl(res.data.repoUrl);
        setConfiguredRemote(res.data.remoteName);
        return res.data.repoUrl;
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleListRepos = async () => {
    const res = await window.deployHubAPI.listGitHubRepos();
    return res.success && res.data ? res.data : [];
  };

  // Step 5: Calculate manual push command
  const prepareStep5 = async () => {
    if (!inspection) return;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.getManualPushCommand(
        inspection.folderPath,
        configuredRemote,
        configuredBranch
      );
      if (res.success && res.data) {
        setPushInfo(res.data);
      }
      setCurrentStep(5);
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Vercel Link
  const handleLinkVercel = async (config: VercelProjectConfig): Promise<boolean> => {
    if (!inspection) return false;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.linkVercelProject(inspection.folderPath, config);
      if (res.success && res.data) {
        setLinkedVercelProject(res.data.projectName);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 7: Initial Deploy
  const handleDeployInitial = async (isProduction: boolean) => {
    if (!inspection) return null;
    setLoading(true);
    try {
      const res = await window.deployHubAPI.deployInitialVercel(inspection.folderPath, isProduction);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Finish setup and save project
  const handleFinish = async () => {
    if (!inspection) return;
    const record: ProjectRecord = {
      id: projectId,
      name: projectName || inspection.folderName,
      path: inspection.folderPath,
      repoUrl: configuredRepoUrl || undefined,
      remoteName: configuredRemote,
      branchName: configuredBranch,
      githubUser: githubStatus?.username,
      vercelProjectName: linkedVercelProject || undefined,
      projectRoot: '.',
      framework: inspection.framework?.name,
      productionBranch: configuredBranch,
      setupStatus: 'completed',
      createdAt: initialProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOperation: {
        name: 'Setup Wizard',
        status: 'success',
        timestamp: new Date().toISOString(),
        message: 'Completed initial Git, GitHub and Vercel configuration.',
      },
    };

    await onSaveProject(record);
    onCloseWizard();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 text-xs">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-devtoys-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-devtoys-primary">
            {inspection ? `Setup: ${inspection.folderName}` : 'Repository Setup'}
          </h2>
          <p className="text-[11px] text-devtoys-muted">
            Configure local Git repository, GitHub integration, and Vercel once per project.
          </p>
        </div>
        <button
          onClick={onCloseWizard}
          className="p-1 rounded text-devtoys-muted hover:text-devtoys-primary hover:bg-devtoys-card transition-colors"
          title="Exit Setup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Compact DevToys Stepper */}
      <div className="flex items-center justify-between border-b border-devtoys-border pb-2 gap-1 overflow-x-auto">
        {steps.map((s) => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          return (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                isCurrent
                  ? 'bg-devtoys-card text-devtoys-accent font-semibold border border-devtoys-border'
                  : isDone
                  ? 'text-devtoys-secondary hover:text-devtoys-primary'
                  : 'text-devtoys-muted opacity-60'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isCurrent
                    ? 'bg-devtoys-accent text-slate-900 font-bold'
                    : isDone
                    ? 'bg-devtoys-border text-devtoys-success'
                    : 'bg-devtoys-card text-devtoys-muted'
                }`}
              >
                {isDone ? <Check className="w-2.5 h-2.5" /> : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Active Step Container */}
      <div className="pt-1">
        {currentStep === 1 && (
          <Step1FolderSelect
            inspection={inspection}
            onSelectFolder={handleSelectFolder}
            onManualPathSubmit={handleManualPath}
            onRefreshInspection={() => inspection && runInspection(inspection.folderPath)}
            onNext={() => setCurrentStep(2)}
            loading={loading}
          />
        )}

        {currentStep === 2 && inspection && (
          <Step2GitSetup
            inspection={inspection}
            onInitGit={handleInitGit}
            onApplyGitignore={handleApplyGitignore}
            onCreateInitialCommit={handleCreateCommit}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            loading={loading}
          />
        )}

        {currentStep === 3 && (
          <Step3GitHubAccount
            status={githubStatus}
            onRefreshStatus={onRefreshGitHubStatus}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
            loading={loading}
          />
        )}

        {currentStep === 4 && inspection && (
          <Step4GitHubRepo
            inspection={inspection}
            defaultRepoName={projectName}
            onCreateRepo={handleCreateRepo}
            onConnectRepo={handleConnectRepo}
            onListRepos={handleListRepos}
            onNext={prepareStep5}
            onBack={() => setCurrentStep(3)}
            loading={loading}
            configuredRepoUrl={configuredRepoUrl}
          />
        )}

        {currentStep === 5 && pushInfo && inspection && (
          <Step5ManualPush
            pushInfo={pushInfo}
            projectPath={inspection.folderPath}
            onOpenTerminal={onOpenTerminal}
            onNext={() => setCurrentStep(6)}
            onBack={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 6 && inspection && (
          <Step6VercelSetup
            status={vercelStatus}
            inspection={inspection}
            defaultProjectName={projectName}
            onRefreshStatus={onRefreshVercelStatus}
            onLinkProject={handleLinkVercel}
            onNext={() => setCurrentStep(7)}
            onBack={() => setCurrentStep(5)}
            loading={loading}
            linkedProjectName={linkedVercelProject}
          />
        )}

        {currentStep === 7 && (
          <Step7SummaryDeploy
            projectName={projectName}
            repoUrl={configuredRepoUrl || ''}
            branchName={configuredBranch}
            vercelProjectName={linkedVercelProject || projectName}
            onDeployInitial={handleDeployInitial}
            onFinish={handleFinish}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};
