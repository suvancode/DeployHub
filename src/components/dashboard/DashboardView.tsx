import React, { useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  FolderPlus,
  GitBranch,
  Globe,
  ExternalLink,
  Folder,
  Terminal,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { ProjectCard } from './ProjectCard';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface DashboardViewProps {
  projects: ProjectRecord[];
  onStartNewSetup: () => void;
  onSelectProject: (project: ProjectRecord) => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onDeleteProject: (id: string) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onStartNewSetup,
  onSelectProject,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onDeleteProject,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      (p.repoUrl && p.repoUrl.toLowerCase().includes(q))
    );
  });

  const confirmDelete = () => {
    if (deleteCandidate) {
      onDeleteProject(deleteCandidate.id);
      setDeleteCandidate(null);
    }
  };

  const handleCopyPush = async (e: React.MouseEvent, project: ProjectRecord) => {
    e.stopPropagation();
    const cmd = project.branchName
      ? `git push -u ${project.remoteName || 'origin'} ${project.branchName}`
      : 'git push';
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedId(project.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Top Action & Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-devtoys-border pb-3">
        {/* Search */}
        <div className="relative w-64 sm:w-72">
          <Search className="w-3.5 h-3.5 text-devtoys-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, path..."
            className="w-full h-7 bg-devtoys-card border border-devtoys-border rounded-md pl-8 pr-2.5 text-xs text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
          />
        </div>

        {/* Actions & View Switcher */}
        <div className="flex items-center gap-2">
          {/* Grid / List Switcher */}
          <div className="flex rounded-md border border-devtoys-border bg-devtoys-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-devtoys-sidebar text-devtoys-accent'
                  : 'text-devtoys-muted hover:text-devtoys-primary'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-devtoys-sidebar text-devtoys-accent'
                  : 'text-devtoys-muted hover:text-devtoys-primary'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={onRefresh} icon={<RefreshCw className="w-3 h-3" />}>
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onStartNewSetup}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Project
          </Button>
        </div>
      </div>

      {/* Content: Grid, List or Empty State */}
      {filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View (DevToys compact tool cards) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelectProject={onSelectProject}
                onOpenFolder={onOpenFolder}
                onOpenTerminal={onOpenTerminal}
                onOpenUrl={onOpenUrl}
                onDeleteProject={(id, name) => setDeleteCandidate({ id, name })}
              />
            ))}
          </div>
        ) : (
          /* List View (Compact table layout) */
          <div className="border border-devtoys-border rounded-md overflow-hidden bg-devtoys-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-devtoys-sidebar text-devtoys-muted border-b border-devtoys-border text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2 px-3">Project</th>
                  <th className="py-2 px-3">Branch</th>
                  <th className="py-2 px-3">GitHub</th>
                  <th className="py-2 px-3">Vercel</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-devtoys-border/60">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="hover:bg-devtoys-cardHover transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-devtoys-primary">{project.name}</div>
                      <div className="text-[11px] text-devtoys-muted font-mono truncate max-w-xs">{project.path}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-devtoys-secondary">
                      {project.branchName || 'main'}
                    </td>
                    <td className="py-2.5 px-3">
                      {project.repoUrl ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenUrl(project.repoUrl!);
                          }}
                          className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>{project.repoUrl.replace('https://github.com/', '')}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-devtoys-muted italic">Unlinked</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-devtoys-secondary">
                      {project.vercelProductionUrl ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenUrl(project.vercelProductionUrl!);
                          }}
                          className="text-devtoys-accent hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>{project.vercelProjectName}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </button>
                      ) : (
                        project.vercelProjectName || <span className="text-devtoys-muted italic">Unlinked</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {project.setupStatus === 'completed' ? (
                        <Badge variant="success">Active</Badge>
                      ) : project.setupStatus === 'vercel_linked' ? (
                        <Badge variant="accent">Vercel</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleCopyPush(e, project)}
                          className="p-1 rounded text-devtoys-secondary hover:text-devtoys-primary hover:bg-devtoys-border/50"
                          title="Copy git push"
                        >
                          {copiedId === project.id ? (
                            <Check className="w-3.5 h-3.5 text-devtoys-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onOpenFolder(project.path)}
                          className="p-1 rounded text-devtoys-secondary hover:text-devtoys-primary hover:bg-devtoys-border/50"
                          title="Open Folder"
                        >
                          <Folder className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenTerminal(project.path)}
                          className="p-1 rounded text-devtoys-secondary hover:text-devtoys-primary hover:bg-devtoys-border/50"
                          title="Open Terminal"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate({ id: project.id, name: project.name })}
                          className="p-1 rounded text-devtoys-muted hover:text-devtoys-error hover:bg-devtoys-error/10"
                          title="Remove from DeployHub"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : projects.length === 0 ? (
        /* DevToys-style compact empty state */
        <div className="border border-dashed border-devtoys-border rounded-md p-8 text-center bg-devtoys-card/30 max-w-lg mx-auto my-8">
          <div className="w-10 h-10 rounded-md bg-devtoys-card border border-devtoys-border flex items-center justify-center mx-auto mb-3 text-devtoys-accent">
            <FolderPlus className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-devtoys-primary">No Projects Configured Yet</h3>
          <p className="text-xs text-devtoys-muted max-w-sm mx-auto mt-1 leading-relaxed">
            Select a project folder to inspect its Git state, link a GitHub repository, and connect Vercel.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={onStartNewSetup}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Select Project Folder
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-devtoys-muted text-xs">
          No projects matching &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteCandidate !== null}
        onClose={() => setDeleteCandidate(null)}
        title="Remove Project from DeployHub"
        maxWidth="md"
      >
        <div className="space-y-3">
          <p className="text-xs text-devtoys-secondary leading-relaxed">
            Remove <strong>{deleteCandidate?.name}</strong> from DeployHub&apos;s local registry?
            Your local files, Git repository, GitHub repo, and Vercel project will <strong>never be deleted</strong>.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteCandidate(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
