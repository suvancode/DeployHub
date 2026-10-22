import React, { useState } from 'react';
import {
  Folder,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  Globe,
  Trash2,
  FolderGit2,
  MoreVertical,
} from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { Badge } from '../common/Badge';

interface ProjectCardProps {
  project: ProjectRecord;
  onSelectProject: (project: ProjectRecord) => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onDeleteProject: (id: string, name: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelectProject,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onDeleteProject,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const pushCommand = project.branchName
    ? `git push -u ${project.remoteName || 'origin'} ${project.branchName}`
    : 'git push';

  const handleCopyPush = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        return <Badge variant="success">Active</Badge>;
      case 'vercel_linked':
        return <Badge variant="accent">Vercel</Badge>;
      case 'github_connected':
        return <Badge variant="info">GitHub</Badge>;
      case 'git_configured':
        return <Badge variant="neutral">Git</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div
      onClick={() => onSelectProject(project)}
      className="bg-devtoys-card hover:bg-devtoys-cardHover border border-devtoys-border rounded-md p-3.5 flex flex-col justify-between transition-colors duration-100 cursor-pointer group relative"
    >
      <div>
        {/* Card Header: Icon + Name + Menu */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-devtoys-sidebar border border-devtoys-border flex items-center justify-center text-devtoys-accent shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-devtoys-primary text-xs truncate group-hover:text-devtoys-accent transition-colors">
                  {project.name}
                </h3>
                {getStatusBadge()}
              </div>
              <div className="text-[11px] text-devtoys-muted font-mono truncate" title={project.path}>
                {project.path}
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded text-devtoys-muted hover:text-devtoys-primary hover:bg-devtoys-border/40 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 w-36 bg-devtoys-content border border-devtoys-border rounded shadow-lg py-1 z-20 text-[11px]"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenFolder(project.path);
                  }}
                  className="w-full text-left px-2.5 py-1 text-devtoys-secondary hover:bg-devtoys-card hover:text-devtoys-primary flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5" /> Open Folder
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenTerminal(project.path);
                  }}
                  className="w-full text-left px-2.5 py-1 text-devtoys-secondary hover:bg-devtoys-card hover:text-devtoys-primary flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5" /> Open Terminal
                </button>
                {project.repoUrl && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenUrl(project.repoUrl!);
                    }}
                    className="w-full text-left px-2.5 py-1 text-devtoys-secondary hover:bg-devtoys-card hover:text-devtoys-primary flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View on GitHub
                  </button>
                )}
                {project.vercelProductionUrl && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenUrl(project.vercelProductionUrl!);
                    }}
                    className="w-full text-left px-2.5 py-1 text-devtoys-secondary hover:bg-devtoys-card hover:text-devtoys-primary flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" /> Open Live Site
                  </button>
                )}
                <div className="border-t border-devtoys-border my-1" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteProject(project.id, project.name);
                  }}
                  className="w-full text-left px-2.5 py-1 text-devtoys-error hover:bg-devtoys-error/10 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Details Rows */}
        <div className="space-y-1 py-1.5 border-y border-devtoys-border/60 my-2 text-[11px] text-devtoys-secondary">
          <div className="flex items-center justify-between">
            <span className="text-devtoys-muted flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-devtoys-accent" /> Branch
            </span>
            <span className="font-mono text-devtoys-primary">{project.branchName || 'main'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-devtoys-muted">GitHub</span>
            {project.repoUrl ? (
              <span className="truncate max-w-[150px] font-mono text-devtoys-accent text-right">
                {project.repoUrl.replace('https://github.com/', '')}
              </span>
            ) : (
              <span className="text-devtoys-muted italic">Unlinked</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-devtoys-muted flex items-center gap-1">
              <Globe className="w-3 h-3 text-devtoys-accent" /> Vercel
            </span>
            <span className="truncate max-w-[150px] text-devtoys-primary">
              {project.vercelProjectName || <span className="text-devtoys-muted italic">Unlinked</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Quick manual push command & open actions */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <button
          onClick={handleCopyPush}
          className="flex-1 h-6 px-2 rounded bg-devtoys-sidebar hover:bg-devtoys-border/50 border border-devtoys-border text-[11px] font-mono text-devtoys-secondary hover:text-devtoys-primary flex items-center justify-between transition-colors"
          title="Copy git push command"
        >
          <span className="truncate text-devtoys-accent">$ {pushCommand}</span>
          {copied ? (
            <Check className="w-3 h-3 text-devtoys-success shrink-0 ml-1" />
          ) : (
            <Copy className="w-3 h-3 text-devtoys-muted shrink-0 ml-1" />
          )}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder(project.path);
            }}
            className="w-6 h-6 rounded bg-devtoys-sidebar hover:bg-devtoys-border/50 border border-devtoys-border flex items-center justify-center text-devtoys-secondary hover:text-devtoys-primary transition-colors"
            title="Open in Explorer"
          >
            <Folder className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenTerminal(project.path);
            }}
            className="w-6 h-6 rounded bg-devtoys-sidebar hover:bg-devtoys-border/50 border border-devtoys-border flex items-center justify-center text-devtoys-secondary hover:text-devtoys-primary transition-colors"
            title="Open in Terminal"
          >
            <Terminal className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
