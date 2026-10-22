import React from 'react';
import { GitBranch, Globe, RefreshCw, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
import { GitHubAccountStatus, VercelStatus } from '../../types/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  onRefreshStatus: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  githubStatus,
  vercelStatus,
  onRefreshStatus,
  onOpenSettings,
}) => {
  return (
    <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* GitHub CLI Status Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${
            githubStatus?.authenticated
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
          }`}
          title={githubStatus?.error || (githubStatus?.authenticated ? `Logged in as ${githubStatus.username}` : 'Not logged in')}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>
            {githubStatus?.authenticated ? `@${githubStatus.username}` : 'GitHub: Not Logged In'}
          </span>
          {githubStatus?.authenticated ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          )}
        </div>

        {/* Vercel CLI Status Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${
            vercelStatus?.authenticated
              ? 'bg-sky-950/40 border-sky-800/60 text-sky-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}
          title={vercelStatus?.error || (vercelStatus?.authenticated ? `Vercel user: ${vercelStatus.username}` : 'Vercel CLI not linked')}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>
            {vercelStatus?.authenticated
              ? `Vercel: ${vercelStatus.username}`
              : vercelStatus?.installed
              ? 'Vercel: Logged Out'
              : 'Vercel CLI: Missing'}
          </span>
        </div>

        {/* Refresh CLI Status */}
        <button
          onClick={onRefreshStatus}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
          title="Refresh CLI statuses"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
