import React, { useState } from 'react';
import {
  GitBranch,
  Globe,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  UserPlus,
  LogIn,
  RotateCw,
  Cloud,
  DownloadCloud,
} from 'lucide-react';
import { GitHubAccountStatus, VercelStatus, NetlifyStatus } from '../../types/api';

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  netlifyStatus?: NetlifyStatus | null;
  onRefreshStatus: () => void;
  onSwitchGitHubAccount?: (username: string) => Promise<void>;
  onLoginGitHub?: () => Promise<void>;
  onLoginVercel?: () => Promise<void>;
  onLoginNetlify?: () => Promise<void>;
  onOpenUpdates?: () => void;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  breadcrumb,
  githubStatus,
  vercelStatus,
  netlifyStatus,
  onRefreshStatus,
  onSwitchGitHubAccount,
  onLoginGitHub,
  onLoginVercel,
  onLoginNetlify,
  onOpenUpdates,
  actions,
}) => {
  const [switchingGh, setSwitchingGh] = useState(false);

  const handleGitHubAccountChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetUser = e.target.value;
    if (targetUser === '__login_new__') {
      if (onLoginGitHub) await onLoginGitHub();
      return;
    }
    if (onSwitchGitHubAccount && targetUser && targetUser !== githubStatus?.username) {
      setSwitchingGh(true);
      try {
        await onSwitchGitHubAccount(targetUser);
      } finally {
        setSwitchingGh(false);
      }
    }
  };

  const hasMultipleGhAccounts =
    githubStatus?.accounts && githubStatus.accounts.length > 1;

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

        {/* GitHub CLI indicator / Multi-account Switcher */}
        {githubStatus?.authenticated ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-devtoys-border bg-devtoys-card text-[11px] font-medium text-devtoys-secondary">
            <GitBranch className="w-3 h-3 text-devtoys-accent shrink-0" />
            <ShieldCheck className="w-3 h-3 text-devtoys-success shrink-0" />

            {hasMultipleGhAccounts ? (
              <div className="flex items-center gap-1">
                <select
                  value={githubStatus.username}
                  onChange={handleGitHubAccountChange}
                  disabled={switchingGh}
                  className="bg-transparent text-devtoys-primary font-mono text-[11px] focus:outline-none cursor-pointer border-none py-0 pl-0 pr-1 truncate"
                  title="Switch active GitHub account"
                >
                  {githubStatus.accounts?.map((acc) => (
                    <option key={acc} value={acc} className="bg-devtoys-card text-devtoys-primary">
                      @{acc} {acc === githubStatus.username ? '(Active)' : ''}
                    </option>
                  ))}
                  <option value="__login_new__" className="bg-devtoys-card text-devtoys-accent">
                    + Add / Login Account...
                  </option>
                </select>
                {switchingGh && <RotateCw className="w-2.5 h-2.5 animate-spin text-devtoys-accent" />}
              </div>
            ) : (
              <span className="font-mono truncate">@{githubStatus.username}</span>
            )}

            {onLoginGitHub && !hasMultipleGhAccounts && (
              <button
                onClick={() => onLoginGitHub()}
                title="Add another GitHub account"
                className="ml-0.5 p-0.5 hover:text-devtoys-primary text-devtoys-muted transition-colors"
              >
                <UserPlus className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onLoginGitHub?.()}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-devtoys-warning/30 bg-devtoys-warning/10 text-[11px] font-medium text-devtoys-warning hover:bg-devtoys-warning/20 transition-colors"
            title="Click to authenticate GitHub CLI"
          >
            <AlertCircle className="w-3 h-3" />
            <span>gh: Login</span>
            <LogIn className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Vercel CLI indicator / Switcher */}
        {vercelStatus?.authenticated ? (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-devtoys-border bg-devtoys-card text-[11px] font-medium text-devtoys-secondary"
            title={`Active Vercel User: ${vercelStatus.username}`}
          >
            <Globe className="w-3 h-3 text-devtoys-accent shrink-0" />
            <span className="font-mono truncate">{vercelStatus.username}</span>
            {onLoginVercel && (
              <button
                onClick={() => onLoginVercel()}
                title="Switch Vercel Account / Re-login"
                className="p-0.5 hover:text-devtoys-primary text-devtoys-muted transition-colors ml-0.5"
              >
                <RotateCw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onLoginVercel?.()}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-devtoys-border bg-devtoys-card text-[11px] font-medium text-devtoys-muted hover:text-devtoys-primary transition-colors"
            title="Click to authenticate Vercel CLI via npx vercel login"
          >
            <Globe className="w-3 h-3 text-devtoys-accent" />
            <span>Vercel: Login</span>
            <LogIn className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Netlify CLI indicator */}
        {netlifyStatus?.authenticated ? (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-devtoys-border bg-devtoys-card text-[11px] font-medium text-devtoys-secondary"
            title={`Active Netlify User: ${netlifyStatus.username || netlifyStatus.email}`}
          >
            <Cloud className="w-3 h-3 text-teal-400 shrink-0" />
            <span className="font-mono truncate">{netlifyStatus.username || 'Netlify'}</span>
            {onLoginNetlify && (
              <button
                onClick={() => onLoginNetlify()}
                title="Switch Netlify Account / Re-login"
                className="p-0.5 hover:text-devtoys-primary text-devtoys-muted transition-colors ml-0.5"
              >
                <RotateCw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onLoginNetlify?.()}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-devtoys-border bg-devtoys-card text-[11px] font-medium text-devtoys-muted hover:text-devtoys-primary transition-colors"
            title="Click to authenticate Netlify CLI via npx netlify login"
          >
            <Cloud className="w-3 h-3 text-teal-400" />
            <span>Netlify: Login</span>
            <LogIn className="w-2.5 h-2.5" />
          </button>
        )}

        {/* In-App Updates Button */}
        {onOpenUpdates && (
          <button
            onClick={onOpenUpdates}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-devtoys-border bg-devtoys-card text-[11px] font-medium text-devtoys-muted hover:text-devtoys-accent hover:border-devtoys-accent/50 transition-colors"
            title="Check for application updates"
          >
            <DownloadCloud className="w-3 h-3 text-devtoys-accent" />
            <span className="hidden sm:inline">Updates</span>
          </button>
        )}

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
