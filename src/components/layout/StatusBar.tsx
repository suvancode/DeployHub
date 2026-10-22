import React from 'react';
import { GitBranch, Globe, ShieldCheck, AlertCircle, Circle } from 'lucide-react';
import { GitHubAccountStatus, VercelStatus } from '../../types/api';

interface StatusBarProps {
  selectedProjectName: string | null;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  selectedProjectName,
  githubStatus,
  vercelStatus,
}) => {
  return (
    <footer className="h-6 px-3 bg-devtoys-sidebar border-t border-devtoys-border flex items-center justify-between text-[11px] text-devtoys-muted select-none shrink-0 font-sans z-20">
      <div className="flex items-center gap-4">
        {/* App Readiness */}
        <div className="flex items-center gap-1.5 text-devtoys-secondary">
          <Circle className="w-2 h-2 fill-devtoys-success text-devtoys-success" />
          <span>Ready</span>
        </div>

        {/* Selected Project */}
        <div className="flex items-center gap-1.5 border-l border-devtoys-border pl-3">
          <span className="text-devtoys-muted">Selected:</span>
          <span className="text-devtoys-primary font-medium truncate max-w-[200px]">
            {selectedProjectName || 'None'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Git Status */}
        <div className="flex items-center gap-1 text-devtoys-secondary">
          <GitBranch className="w-3 h-3 text-devtoys-accent" />
          <span>Git: Active</span>
        </div>

        {/* GitHub CLI Status */}
        <div className="flex items-center gap-1 border-l border-devtoys-border pl-3">
          {githubStatus?.authenticated ? (
            <>
              <ShieldCheck className="w-3 h-3 text-devtoys-success" />
              <span className="text-devtoys-secondary">@{githubStatus.username}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-devtoys-warning" />
              <span className="text-devtoys-warning">GitHub: Not logged in</span>
            </>
          )}
        </div>

        {/* Vercel Status */}
        <div className="flex items-center gap-1 border-l border-devtoys-border pl-3">
          <Globe className="w-3 h-3 text-devtoys-accent" />
          <span className="text-devtoys-secondary">
            {vercelStatus?.authenticated ? `Vercel: ${vercelStatus.username}` : vercelStatus?.installed ? 'Vercel: CLI Ready' : 'Vercel: Missing'}
          </span>
        </div>

        {/* App Version */}
        <div className="border-l border-devtoys-border pl-3 text-devtoys-muted">
          v1.0.0
        </div>
      </div>
    </footer>
  );
};
