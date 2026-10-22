import React from 'react';
import { GitBranch, Globe, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { GitHubAccountStatus, VercelStatus } from '../../types/api';

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  onRefreshStatus: () => void;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  breadcrumb,
  githubStatus,
  vercelStatus,
  onRefreshStatus,
  actions,
}) => {
  return (
    <header className="h-11 px-4 bg-devtoys-content border-b border-devtoys-border flex items-center justify-between shrink-0 select-none z-10">
      {/* Title & Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb && (
          <>
            <span className="text-xs text-devtoys-muted">{breadcrumb}</span>
            <span className="text-devtoys-muted text-xs">/</span>
          </>
        )}
        <h2 className="text-xs font-semibold text-devtoys-primary truncate tracking-tight">
          {title}
        </h2>
      </div>

      {/* Contextual actions & CLI Status */}
      <div className="flex items-center gap-2">
        {actions && <div className="flex items-center gap-1.5 mr-2">{actions}</div>}

        {/* GitHub CLI indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
            githubStatus?.authenticated
              ? 'bg-devtoys-card border-devtoys-border text-devtoys-secondary'
              : 'bg-devtoys-warning/10 border-devtoys-warning/30 text-devtoys-warning'
          }`}
          title={githubStatus?.error || (githubStatus?.authenticated ? `GitHub user: @${githubStatus.username}` : 'GitHub CLI not logged in')}
        >
          <GitBranch className="w-3 h-3 text-devtoys-accent" />
          <span>{githubStatus?.authenticated ? `@${githubStatus.username}` : 'gh: Logged out'}</span>
          {githubStatus?.authenticated ? (
            <ShieldCheck className="w-3 h-3 text-devtoys-success" />
          ) : (
            <AlertCircle className="w-3 h-3 text-devtoys-warning" />
          )}
        </div>

        {/* Vercel CLI indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
            vercelStatus?.authenticated
              ? 'bg-devtoys-card border-devtoys-border text-devtoys-secondary'
              : 'bg-devtoys-card border-devtoys-border text-devtoys-muted'
          }`}
          title={vercelStatus?.error || (vercelStatus?.authenticated ? `Vercel user: ${vercelStatus.username}` : 'Vercel CLI not linked')}
        >
          <Globe className="w-3 h-3 text-devtoys-accent" />
          <span>
            {vercelStatus?.authenticated ? vercelStatus.username : vercelStatus?.installed ? 'Vercel Ready' : 'Vercel Missing'}
          </span>
        </div>

        {/* Quick Refresh Status */}
        <button
          onClick={onRefreshStatus}
          className="p-1 rounded text-devtoys-muted hover:text-devtoys-primary hover:bg-devtoys-card transition-colors"
          title="Refresh CLI tool statuses"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
