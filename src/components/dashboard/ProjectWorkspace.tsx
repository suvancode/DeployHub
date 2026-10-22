import React, { useState } from 'react';
import {
  ArrowLeft,
  Folder,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  Globe,
  ShieldCheck,
  FileCode,
  RotateCw,
  FolderGit2,
  AlertTriangle,
} from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface ProjectWorkspaceProps {
  project: ProjectRecord;
  onBack: () => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onReconfigure: (project: ProjectRecord) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  onBack,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onReconfigure,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'git' | 'github' | 'vercel'>('overview');
  const [copied, setCopied] = useState(false);

  const pushCommand = project.branchName
    ? `git push -u ${project.remoteName || 'origin'} ${project.branchName}`
    : 'git push';

  const handleCopyPush = async () => {
    try {
      await navigator.clipboard.writeText(pushCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto text-xs">
      {/* Top Header: Back + Name + Actions Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-devtoys-border pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back
          </Button>

          <div className="w-7 h-7 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-center text-devtoys-accent shrink-0">
            <FolderGit2 className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-devtoys-primary truncate">{project.name}</h2>
              <Badge variant={project.setupStatus === 'completed' ? 'success' : 'warning'}>
                {project.setupStatus === 'completed' ? 'Configured' : 'Setup Incomplete'}
              </Badge>
            </div>
            <div className="text-[11px] text-devtoys-muted font-mono truncate" title={project.path}>
              {project.path}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenFolder(project.path)}
            icon={<Folder className="w-3.5 h-3.5" />}
          >
            Folder
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenTerminal(project.path)}
            icon={<Terminal className="w-3.5 h-3.5" />}
          >
            Terminal
          </Button>

          {project.repoUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenUrl(project.repoUrl!)}
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              GitHub
            </Button>
          )}

          {project.vercelProductionUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenUrl(project.vercelProductionUrl!)}
              icon={<Globe className="w-3.5 h-3.5" />}
            >
              Site
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onReconfigure(project)}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Reconfigure
          </Button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-devtoys-border gap-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'git', label: 'Local Git' },
          { id: 'github', label: 'GitHub Repository' },
          { id: 'vercel', label: 'Vercel Deployment' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-devtoys-accent text-devtoys-primary'
                : 'border-transparent text-devtoys-muted hover:text-devtoys-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick Manual Push Command Banner */}
          <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-devtoys-primary flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-devtoys-accent" /> Manual Push Command
              </span>
              <span className="text-[11px] text-devtoys-muted">Run this command to publish your commits</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-7 px-3 rounded bg-devtoys-sidebar border border-devtoys-border font-mono text-xs text-devtoys-accent flex items-center select-all overflow-x-auto">
                <span className="text-devtoys-muted mr-1.5 select-none">$</span>
                <span>{pushCommand}</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyPush}
                icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-devtoys-muted">
              DeployHub will never automatically push code. Run this command manually in your terminal when you are ready to publish.
            </p>
          </div>

          {/* Properties Grid */}
          <div className="border border-devtoys-border rounded-md bg-devtoys-card divide-y divide-devtoys-border/60">
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Local Directory</span>
              <span className="font-mono text-devtoys-primary truncate max-w-md">{project.path}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Active Branch</span>
              <span className="font-mono text-devtoys-primary font-medium">{project.branchName || 'main'}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Remote Name</span>
              <span className="font-mono text-devtoys-primary">{project.remoteName || 'origin'}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">GitHub Repository</span>
              {project.repoUrl ? (
                <button
                  onClick={() => onOpenUrl(project.repoUrl!)}
                  className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono"
                >
                  <span>{project.repoUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">Not connected</span>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Verified GitHub Account</span>
              <span className="text-devtoys-primary">
                {project.githubUser ? `@${project.githubUser}` : '—'}
              </span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Vercel Project</span>
              <span className="text-devtoys-primary">{project.vercelProjectName || 'Not linked'}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Production URL</span>
              {project.vercelProductionUrl ? (
                <button
                  onClick={() => onOpenUrl(project.vercelProductionUrl!)}
                  className="text-devtoys-accent hover:underline flex items-center gap-1"
                >
                  <span>{project.vercelProductionUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">None yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Local Git */}
      {activeTab === 'git' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <GitBranch className="w-4 h-4 text-devtoys-accent" />
            <span>Local Git Configuration</span>
          </div>

          <div className="space-y-2 text-devtoys-secondary">
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Configured Branch:</span>
              <span className="font-mono text-devtoys-primary">{project.branchName || 'main'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Remote:</span>
              <span className="font-mono text-devtoys-primary">{project.remoteName || 'origin'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-devtoys-muted">Push Tracking:</span>
              <span className="text-devtoys-success font-medium">Upstream configured</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: GitHub */}
      {activeTab === 'github' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-devtoys-success" />
            <span>GitHub Integration</span>
          </div>

          {project.repoUrl ? (
            <div className="space-y-2 text-devtoys-secondary">
              <div className="flex justify-between py-1 border-b border-devtoys-border/60">
                <span className="text-devtoys-muted">Repository URL:</span>
                <span className="font-mono text-devtoys-accent">{project.repoUrl}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-devtoys-border/60">
                <span className="text-devtoys-muted">Owner Identity:</span>
                <span>@{project.githubUser || 'Verified'}</span>
              </div>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenUrl(project.repoUrl!)}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open on GitHub
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-devtoys-muted py-4 text-center">
              No GitHub repository connected for this project.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Vercel */}
      {activeTab === 'vercel' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <Globe className="w-4 h-4 text-devtoys-accent" />
            <span>Vercel Integration</span>
          </div>

          <div className="space-y-2 text-devtoys-secondary">
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Project Name:</span>
              <span className="text-devtoys-primary">{project.vercelProjectName || 'Unlinked'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Production Branch:</span>
              <span className="font-mono text-devtoys-primary">{project.productionBranch || project.branchName || 'main'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-devtoys-muted">Live URL:</span>
              {project.vercelProductionUrl ? (
                <button
                  onClick={() => onOpenUrl(project.vercelProductionUrl!)}
                  className="text-devtoys-accent hover:underline flex items-center gap-1"
                >
                  <span>{project.vercelProductionUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">No deployment recorded</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
