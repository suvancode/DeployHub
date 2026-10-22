import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Copy,
  Check,
  GitBranch,
  ShieldAlert,
  Info,
  FolderGit2,
  UploadCloud,
} from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface ManualPushPageProps {
  projects: ProjectRecord[];
  selectedProject: ProjectRecord | null;
  onOpenTerminal: (path: string) => void;
}

export const ManualPushPage: React.FC<ManualPushPageProps> = ({
  projects,
  selectedProject,
  onOpenTerminal,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(
    selectedProject?.id || (projects.length > 0 ? projects[0].id : '')
  );
  const [copiedInitial, setCopiedInitial] = useState(false);
  const [copiedSubsequent, setCopiedSubsequent] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (selectedProject) {
      setActiveProjectId(selectedProject.id);
    } else if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [selectedProject, projects, activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const initialPushCmd = activeProject
    ? `git push -u ${activeProject.remoteName || 'origin'} ${activeProject.branchName || 'main'}`
    : 'git push -u origin main';

  const subsequentPushCmd = 'git push';

  const handleAutoPush = async () => {
    if (!activeProject) return;
    setIsPushing(true);
    setPushStatus(null);
    try {
      const res = await window.deployHubAPI.pushRepo(
        activeProject.path,
        activeProject.remoteName || 'origin',
        activeProject.branchName || 'main'
      );
      if (res.success) {
        setPushStatus({
          success: true,
          message: `Code pushed successfully to ${activeProject.remoteName || 'origin'}/${activeProject.branchName || 'main'}!`,
        });
      } else {
        setPushStatus({
          success: false,
          message: res.error?.why || res.error?.message || 'Git push failed.',
        });
      }
    } catch (err: unknown) {
      setPushStatus({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsPushing(false);
    }
  };

  const copyCommand = async (cmd: string, isInitial: boolean) => {
    try {
      await navigator.clipboard.writeText(cmd);
      if (isInitial) {
        setCopiedInitial(true);
        setTimeout(() => setCopiedInitial(false), 2000);
      } else {
        setCopiedSubsequent(true);
        setTimeout(() => setCopiedSubsequent(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-xs">
      {/* Page Title & Rule */}
      <div className="border-b border-devtoys-border pb-3">
        <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
          <Terminal className="w-4 h-4 text-devtoys-accent" /> Manual Push Command Center
        </h2>
        <p className="text-xs text-devtoys-muted mt-0.5">
          DeployHub follows a strict non-negotiable policy: code is <strong>never pushed automatically</strong>.
        </p>
      </div>

      {/* Security Rule Notice */}
      <div className="p-3 rounded-md border border-devtoys-accent/30 bg-devtoys-accent/10 flex items-start gap-2.5 text-devtoys-primary">
        <ShieldAlert className="w-4 h-4 text-devtoys-accent shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-devtoys-accent">Manual-Push Guarantee:</strong> You maintain 100% control over commits and releases.
          DeployHub prepares and validates the commands, while you execute the push in your terminal.
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-4">
          {/* Project Selector */}
          <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <label className="font-medium text-devtoys-secondary flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-devtoys-accent" /> Select Project:
            </label>
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent min-w-[220px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.branchName || 'main'})
                </option>
              ))}
            </select>
          </div>

          {activeProject && (
            <>
              {/* Project Metadata Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-md border border-devtoys-border bg-devtoys-card">
                  <span className="text-devtoys-muted block">Active Branch</span>
                  <span className="font-mono text-devtoys-primary font-semibold">
                    {activeProject.branchName || 'main'}
                  </span>
                </div>
                <div className="p-2.5 rounded-md border border-devtoys-border bg-devtoys-card">
                  <span className="text-devtoys-muted block">Configured Remote</span>
                  <span className="font-mono text-devtoys-primary font-semibold">
                    {activeProject.remoteName || 'origin'}
                  </span>
                </div>
                <div className="p-2.5 rounded-md border border-devtoys-border bg-devtoys-card">
                  <span className="text-devtoys-muted block">Repository Link</span>
                  <span className="font-mono text-devtoys-accent truncate block">
                    {activeProject.repoUrl ? activeProject.repoUrl.replace('https://github.com/', '') : 'Unlinked'}
                  </span>
                </div>
              </div>

              {/* Direct Automatic Push Action */}
              <div className="p-3.5 rounded-md border border-devtoys-accent/40 bg-devtoys-accent/10 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-devtoys-accent shrink-0" />
                    <div>
                      <div className="font-semibold text-devtoys-primary">Push Code to GitHub Automatically</div>
                      <div className="text-[11px] text-devtoys-muted">
                        Pushes local commits to <span className="font-mono text-devtoys-accent">{activeProject.remoteName || 'origin'}/{activeProject.branchName || 'main'}</span> directly.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAutoPush}
                    loading={isPushing}
                    icon={<UploadCloud className="w-3.5 h-3.5" />}
                  >
                    {isPushing ? 'Pushing...' : 'Push to GitHub Now'}
                  </Button>
                </div>

                {pushStatus && (
                  <Alert
                    variant={pushStatus.success ? 'success' : 'error'}
                    title={pushStatus.success ? 'Push Successful' : 'Push Failed'}
                    onClose={() => setPushStatus(null)}
                  >
                    {pushStatus.message}
                  </Alert>
                )}
              </div>

              {/* Command 1: Initial Push */}
              <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary">1. Initial Push (Sets Upstream Tracking)</span>
                  <span className="text-[11px] text-devtoys-muted">Run once when connecting a new repository</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-7 px-3 rounded bg-devtoys-sidebar border border-devtoys-border font-mono text-xs text-devtoys-accent flex items-center select-all">
                    <span className="text-devtoys-muted mr-1.5 select-none">$</span>
                    <span>{initialPushCmd}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => copyCommand(initialPushCmd, true)}
                    icon={copiedInitial ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedInitial ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenTerminal(activeProject.path)}
                    icon={<Terminal className="w-3.5 h-3.5" />}
                  >
                    Terminal
                  </Button>
                </div>
              </div>

              {/* Command 2: Subsequent Pushes */}
              <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary">2. Subsequent Pushes (Daily Updates)</span>
                  <span className="text-[11px] text-devtoys-muted">After committing new local changes</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-7 px-3 rounded bg-devtoys-sidebar border border-devtoys-border font-mono text-xs text-devtoys-primary flex items-center select-all">
                    <span className="text-devtoys-muted mr-1.5 select-none">$</span>
                    <span>{subsequentPushCmd}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyCommand(subsequentPushCmd, false)}
                    icon={copiedSubsequent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedSubsequent ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="text-[11px] text-devtoys-muted flex items-start gap-1.5 pt-1">
                  <Info className="w-3 h-3 text-devtoys-muted shrink-0 mt-0.5" />
                  <span>
                    Remember: You must commit your changes locally first (<code className="text-devtoys-secondary">git commit -m &quot;...&quot;</code>) before pushing to GitHub.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-devtoys-muted bg-devtoys-card/30 rounded-md border border-devtoys-border">
          No projects configured yet. Use &quot;Repository Setup&quot; in the sidebar to configure a project folder.
        </div>
      )}
    </div>
  );
};
