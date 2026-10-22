import React, { useState } from 'react';
import {
  Folder,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  Globe,
  AlertTriangle,
  Trash2,
  Play,
  RotateCw,
} from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { Badge } from '../common/Badge';

interface ProjectCardProps {
  project: ProjectRecord;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onResumeSetup: (project: ProjectRecord) => void;
  onDeleteProject: (id: string, name: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onResumeSetup,
  onDeleteProject,
}) => {
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

  const getStatusBadge = () => {
    switch (project.setupStatus) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'vercel_linked':
        return <Badge variant="purple">Vercel Linked</Badge>;
      case 'github_connected':
        return <Badge variant="info">GitHub Connected</Badge>;
      case 'git_configured':
        return <Badge variant="neutral">Git Ready</Badge>;
      default:
        return <Badge variant="warning">Setup Pending</Badge>;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-all p-5 flex flex-col justify-between group">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-base group-hover:text-emerald-400 transition-colors">
                {project.name}
              </h3>
              {getStatusBadge()}
            </div>
            <div
              className="text-xs text-slate-400 font-mono mt-1 truncate max-w-sm"
              title={project.path}
            >
              {project.path}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onResumeSetup(project)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Resume / Reconfigure Setup"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteProject(project.id, project.name)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Remove from registry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integration details */}
        <div className="space-y-2 py-2 border-y border-slate-800/60 my-3 text-xs">
          {/* Git & Branch */}
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-400">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Branch</span>
            </div>
            <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-200">
              {project.branchName || 'main'}
            </span>
          </div>

          {/* GitHub Repo */}
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">GitHub</span>
            {project.repoUrl ? (
              <button
                onClick={() => onOpenUrl(project.repoUrl!)}
                className="text-emerald-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                title={project.repoUrl}
              >
                <span className="truncate">{project.repoUrl.replace('https://github.com/', '')}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            ) : (
              <span className="text-slate-500 italic">Not connected</span>
            )}
          </div>

          {/* Vercel */}
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Vercel</span>
            </div>
            {project.vercelProductionUrl ? (
              <button
                onClick={() => onOpenUrl(project.vercelProductionUrl!)}
                className="text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                title={project.vercelProductionUrl}
              >
                <span className="truncate">{project.vercelProductionUrl.replace('https://', '')}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            ) : project.vercelProjectName ? (
              <span className="text-slate-300 font-medium">{project.vercelProjectName}</span>
            ) : (
              <span className="text-slate-500 italic">Not linked</span>
            )}
          </div>

          {/* Framework */}
          {project.framework && (
            <div className="flex items-center justify-between text-slate-400">
              <span>Framework</span>
              <span className="text-slate-300">{project.framework}</span>
            </div>
          )}
        </div>

        {/* Warnings if any */}
        {project.warnings && project.warnings.length > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{project.warnings[0]}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="space-y-2 pt-2">
        {/* Copy manual push command */}
        <button
          onClick={handleCopyPush}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          title="Click to copy manual git push command"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-500 select-none">$</span>
            <span className="truncate">{pushCommand}</span>
          </div>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenFolder(project.path)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Folder</span>
          </button>
          <button
            onClick={() => onOpenTerminal(project.path)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>
          {project.setupStatus !== 'completed' && (
            <button
              onClick={() => onResumeSetup(project)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
