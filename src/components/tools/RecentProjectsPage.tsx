import React from 'react';
import { Clock, FolderGit2, ArrowRight } from 'lucide-react';
import { ProjectRecord } from '../../types/api';
import { ProjectCard } from '../dashboard/ProjectCard';

interface RecentProjectsPageProps {
  projects: ProjectRecord[];
  onSelectProject: (project: ProjectRecord) => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onDeleteProject: (id: string, name: string) => void;
}

export const RecentProjectsPage: React.FC<RecentProjectsPageProps> = ({
  projects,
  onSelectProject,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onDeleteProject,
}) => {
  // Sort projects by updatedAt descending
  const recent = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 6);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-xs">
      <div className="border-b border-devtoys-border pb-3">
        <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
          <Clock className="w-4 h-4 text-devtoys-accent" /> Recent Projects
        </h2>
        <p className="text-xs text-devtoys-muted mt-0.5">
          Quickly access your recently configured and updated repositories.
        </p>
      </div>

      {recent.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recent.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelectProject={onSelectProject}
              onOpenFolder={onOpenFolder}
              onOpenTerminal={onOpenTerminal}
              onOpenUrl={onOpenUrl}
              onDeleteProject={onDeleteProject}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-devtoys-muted bg-devtoys-card/30 rounded-md border border-devtoys-border">
          No recent projects found.
        </div>
      )}
    </div>
  );
};
