import React from 'react';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import { ProjectRecord, VercelStatus } from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface VercelProjectsPageProps {
  projects: ProjectRecord[];
  vercelStatus: VercelStatus | null;
  onRefreshStatus: () => void;
  onOpenUrl: (url: string) => void;
  onSelectProject: (project: ProjectRecord) => void;
}

export const VercelProjectsPage: React.FC<VercelProjectsPageProps> = ({
  projects,
  vercelStatus,
  onRefreshStatus,
  onOpenUrl,
  onSelectProject,
}) => {
  const vercelProjects = projects.filter((p) => !!p.vercelProjectName);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-xs">
      <div className="flex items-center justify-between border-b border-devtoys-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
            <Globe className="w-4 h-4 text-devtoys-accent" /> Vercel Projects & Deployment Status
          </h2>
          <p className="text-xs text-devtoys-muted mt-0.5">
            Overview of repositories linked to Vercel and their production status.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefreshStatus} icon={<RefreshCw className="w-3 h-3" />}>
          Refresh
        </Button>
      </div>

      {/* Vercel CLI Status Banner */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-devtoys-sidebar border border-devtoys-border flex items-center justify-center text-devtoys-accent">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-devtoys-primary">Vercel CLI Integration</div>
            <div className="text-[11px] text-devtoys-muted">
              {vercelStatus?.authenticated
                ? `Authenticated as ${vercelStatus.username}`
                : vercelStatus?.installed
                ? 'Installed (Run vercel login to connect account)'
                : 'Not found in PATH (Install via npm i -g vercel)'}
            </div>
          </div>
        </div>
        <Badge variant={vercelStatus?.authenticated ? 'success' : 'warning'}>
          {vercelStatus?.authenticated ? 'Connected' : 'Action Needed'}
        </Badge>
      </div>

      {/* Projects List */}
      <div className="space-y-2">
        <div className="font-semibold text-devtoys-secondary text-xs">Linked Projects ({vercelProjects.length})</div>

        {vercelProjects.length > 0 ? (
          <div className="border border-devtoys-border rounded-md bg-devtoys-card divide-y divide-devtoys-border/60">
            {vercelProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="p-3 flex items-center justify-between hover:bg-devtoys-cardHover transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-devtoys-primary">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-devtoys-sidebar border border-devtoys-border text-devtoys-muted font-mono">
                      {p.branchName || 'main'}
                    </span>
                  </div>
                  <div className="text-[11px] text-devtoys-muted mt-0.5">
                    Vercel Project: <strong className="text-devtoys-secondary">{p.vercelProjectName}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {p.vercelProductionUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenUrl(p.vercelProductionUrl!)}
                      icon={<ExternalLink className="w-3 h-3" />}
                    >
                      Open Live Site
                    </Button>
                  ) : (
                    <span className="text-devtoys-muted text-[11px] italic">Not deployed yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-devtoys-muted bg-devtoys-card/30 rounded-md border border-devtoys-border">
            No projects have been linked to Vercel yet.
          </div>
        )}
      </div>

      {/* Ongoing Workflow Callout */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-sidebar text-xs text-devtoys-secondary space-y-1.5">
        <span className="font-semibold text-devtoys-primary flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-devtoys-success" />
          Continuous Automatic Deployment
        </span>
        <p className="text-[11px] text-devtoys-muted leading-relaxed">
          Once your GitHub repository is connected to Vercel, you never need to run manual deploy commands again.
          Every time you commit and run <code className="text-devtoys-accent">git push</code>, Vercel will build and deploy automatically.
        </p>
      </div>
    </div>
  );
};
