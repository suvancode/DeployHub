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
  const [projectId, setProjectId] = useState<string>(initialProject?.id || `proj_${Date.now()}`);
  const [projectName, setProjectName] = useState<string>(initialProject?.name || '');
  const [configuredRepoUrl, setConfiguredRepoUrl] = useState<string | null>(initialProject?.repoUrl || null);
  const [configuredRemote, setConfiguredRemote] = useState<string>(initialProject?.remoteName || 'origin');
  const [configuredBranch, setConfiguredBranch] = useState<string>(initialProject?.branchName || 'main');
  const [pushInfo, setPushInfo] = useState<ManualPushInfo | null>(null);
  const [linkedVercelProject, setLinkedVercelProject] = useState<string | null>(
    initialProject?.vercelProjectName || null
  );

  const steps = [
    { num: 1, label: 'Folder & Scan', icon: <FolderOpen className="w-3.5 h-3.5" /> },
    { num: 2, label: 'Git Setup', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { num: 3, label: 'GitHub Account', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { num: 4, label: 'Repository', icon: <GitPullRequest className="w-3.5 h-3.5" /> },
    { num: 5, label: 'Manual Push', icon: <Terminal className="w-3.5 h-3.5" /> },
    { num: 6, label: 'Vercel Setup', icon: <Globe className="w-3.5 h-3.5" /> },
    { num: 7, label: 'Summary', icon: <Sparkles className="w-3.5 h-3.5" /> },
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            Project Onboarding Wizard
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {inspection ? `Configuring: ${inspection.folderName}` : 'Configure Project'}
          </h2>
        </div>
        <button
          onClick={onCloseWizard}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Exit Wizard"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Breadcrumb Steps Stepper */}
      <div className="flex items-center justify-between overflow-x-auto py-2 gap-2 border-b border-slate-800/80">
        {steps.map((s) => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          return (
            <div
              key={s.num}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isCurrent
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : isDone
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950'
                    : isDone
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-900 text-slate-600 border border-slate-800'
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Step Components */}
      <div className="pt-2">
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
