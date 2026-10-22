import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  FolderPlus,
  Download,
  Upload,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { DashboardStats } from './DashboardStats';
import { ProjectCard } from './ProjectCard';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface DashboardViewProps {
  projects: ProjectRecord[];
  onStartNewSetup: () => void;
  onResumeSetup: (project: ProjectRecord) => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onDeleteProject: (id: string) => void;
  onExportRegistry: () => void;
  onImportRegistry: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onStartNewSetup,
  onResumeSetup,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onDeleteProject,
  onExportRegistry,
  onImportRegistry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name: string } | null>(null);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.repoUrl && p.repoUrl.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'completed') return p.setupStatus === 'completed';
    if (filterStatus === 'pending') return p.setupStatus !== 'completed';
    if (filterStatus === 'github') return !!p.repoUrl;
    if (filterStatus === 'vercel') return !!p.vercelProjectName;

    return true;
  });

  const confirmDelete = () => {
    if (deleteCandidate) {
      onDeleteProject(deleteCandidate.id);
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Project Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your Git-configured and Vercel-linked repositories locally.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportRegistry}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportRegistry}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Import
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onStartNewSetup}
            icon={<Plus className="w-4 h-4" />}
          >
            Configure New Project
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <DashboardStats projects={projects} />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, path, repo..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Projects ({projects.length})</option>
            <option value="completed">Completed Setup</option>
            <option value="pending">Awaiting Setup</option>
            <option value="github">Connected to GitHub</option>
            <option value="vercel">Linked to Vercel</option>
          </select>
        </div>
      </div>

      {/* Projects Grid or Empty State */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpenFolder={onOpenFolder}
              onOpenTerminal={onOpenTerminal}
              onOpenUrl={onOpenUrl}
              onResumeSetup={onResumeSetup}
              onDeleteProject={(id, name) => setDeleteCandidate({ id, name })}
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Zero state */
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/20">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <FolderPlus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">No Projects Configured Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Select a project folder on your computer to inspect its Git state, link a GitHub repository, and connect Vercel in just a few clicks.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartNewSetup}
              icon={<Plus className="w-4 h-4" />}
            >
              Select Project Folder
            </Button>
          </div>
        </div>
      ) : (
        /* Filter returned empty */
        <div className="border border-slate-800 rounded-2xl p-10 text-center bg-slate-900/30">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-medium text-slate-300">No matching projects found</h4>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or filter.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteCandidate !== null}
        onClose={() => setDeleteCandidate(null)}
        title="Remove Project from DeployHub"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-100">Safe Removal:</span> This will only remove{' '}
              <strong>{deleteCandidate?.name}</strong> from DeployHub&apos;s local registry. Your local code files,
              Git repository, GitHub repository, and Vercel project will <strong>never be deleted</strong>.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteCandidate(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Remove from Registry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
