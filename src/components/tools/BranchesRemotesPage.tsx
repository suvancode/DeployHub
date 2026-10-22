import React, { useState, useEffect } from 'react';
import { GitBranch, FolderGit2, ExternalLink, Globe } from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { Button } from '../common/Button';

interface BranchesRemotesPageProps {
  projects: ProjectRecord[];
  selectedProject: ProjectRecord | null;
  onOpenUrl: (url: string) => void;
}

export const BranchesRemotesPage: React.FC<BranchesRemotesPageProps> = ({
  projects,
  selectedProject,
  onOpenUrl,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(
    selectedProject?.id || (projects.length > 0 ? projects[0].id : '')
  );

  useEffect(() => {
    if (selectedProject) {
      setActiveProjectId(selectedProject.id);
    } else if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [selectedProject, projects, activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-xs">
      <div className="border-b border-devtoys-border pb-3">
        <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-devtoys-warning" /> Branches & Remotes Inspector
        </h2>
        <p className="text-xs text-devtoys-muted mt-0.5">
          Inspect branch configuration, tracking branches, and remote URLs.
        </p>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-4">
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
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {activeProject && (
            <div className="border border-devtoys-border rounded-md bg-devtoys-card divide-y divide-devtoys-border/60">
              <div className="p-3 flex items-center justify-between">
                <span className="text-devtoys-muted">Active Branch</span>
                <span className="font-mono text-devtoys-primary font-semibold">{activeProject.branchName || 'main'}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-devtoys-muted">Remote Name</span>
                <span className="font-mono text-devtoys-primary">{activeProject.remoteName || 'origin'}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-devtoys-muted">Remote URL</span>
                {activeProject.repoUrl ? (
                  <button
                    onClick={() => onOpenUrl(activeProject.repoUrl!)}
                    className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>{activeProject.repoUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-devtoys-muted italic">No remote configured</span>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-devtoys-muted">Local Path</span>
                <span className="font-mono text-devtoys-secondary truncate max-w-sm">{activeProject.path}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-devtoys-muted bg-devtoys-card/30 rounded-md border border-devtoys-border">
          No projects configured.
        </div>
      )}
    </div>
  );
};
