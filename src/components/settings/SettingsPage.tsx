import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Terminal,
  GitBranch,
  ShieldCheck,
  Globe,
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  UserPlus,
  LogIn,
  RotateCw,
} from 'lucide-react';
import { AppSettings, GitHubAccountStatus, VercelStatus, NetlifyStatus } from '../../types/api';
import { Button } from '../common/Button';

interface SettingsPageProps {
  settings: AppSettings;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  netlifyStatus?: NetlifyStatus | null;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onRefreshStatuses: () => void;
  onExportRegistry: () => void;
  onImportRegistry: () => void;
  onSwitchGitHubAccount?: (username: string) => Promise<void>;
  onLoginGitHub?: () => Promise<void>;
  onLoginVercel?: () => Promise<void>;
  onLoginNetlify?: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  githubStatus,
  vercelStatus,
  netlifyStatus,
  onSaveSettings,
  onRefreshStatuses,
  onExportRegistry,
  onImportRegistry,
  onSwitchGitHubAccount,
  onLoginGitHub,
  onLoginVercel,
  onLoginNetlify,
}) => {
  const [preferredTerminal, setPreferredTerminal] = useState(settings.preferredTerminal);
  const [defaultBranch, setDefaultBranch] = useState(settings.defaultBranch);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [switchingGhUser, setSwitchingGhUser] = useState<string | null>(null);

  useEffect(() => {
    setPreferredTerminal(settings.preferredTerminal);
    setDefaultBranch(settings.defaultBranch);
  }, [settings]);

  const handleSave = async () => {
    await onSaveSettings({
      preferredTerminal,
      defaultBranch: defaultBranch.trim() || 'main',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSwitchAccount = async (username: string) => {
    if (!onSwitchGitHubAccount) return;
    setSwitchingGhUser(username);
    try {
      await onSwitchGitHubAccount(username);
    } finally {
      setSwitchingGhUser(null);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-xs">
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-devtoys-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
            <Sliders className="w-4 h-4 text-devtoys-accent" /> Settings & Preferences
          </h2>
          <p className="text-xs text-devtoys-muted mt-0.5">
            Configure application behavior, CLI integrations, and multi-account deployments.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleSave} icon={<Save className="w-3.5 h-3.5" />}>
          {savedSuccess ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* Section 1: CLI Tools Integration */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-devtoys-primary">CLI Tools & Environment</span>
          <Button variant="ghost" size="xs" onClick={onRefreshStatuses} icon={<RefreshCw className="w-3 h-3" />}>
            Check Tools
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Git */}
          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border">
            <div className="text-devtoys-muted text-[11px] mb-1">Git CLI</div>
            <div className="flex items-center gap-1.5 text-devtoys-success font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Installed
            </div>
          </div>

          {/* GitHub CLI */}
          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border">
            <div className="text-devtoys-muted text-[11px] mb-1">GitHub CLI (gh)</div>
            {githubStatus?.authenticated ? (
              <div className="flex items-center gap-1.5 text-devtoys-success font-medium truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">@{githubStatus.username}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-devtoys-warning font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Not logged in
              </div>
            )}
          </div>

          {/* Vercel CLI */}
          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border">
            <div className="text-devtoys-muted text-[11px] mb-1">Vercel CLI</div>
            {vercelStatus?.authenticated ? (
              <div className="flex items-center gap-1.5 text-devtoys-accent font-medium truncate">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{vercelStatus.username}</span>
              </div>
            ) : vercelStatus?.installed ? (
              <div className="flex items-center gap-1.5 text-devtoys-warning font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Needs login
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-devtoys-muted font-medium">
                Not in PATH
              </div>
            )}
          </div>

          {/* Netlify CLI */}
          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border">
            <div className="text-devtoys-muted text-[11px] mb-1">Netlify CLI</div>
            {netlifyStatus?.authenticated ? (
              <div className="flex items-center gap-1.5 text-teal-400 font-medium truncate">
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{netlifyStatus.username || 'Logged in'}</span>
              </div>
            ) : netlifyStatus?.installed ? (
              <div className="flex items-center gap-1.5 text-devtoys-warning font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Needs login
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-devtoys-muted font-medium">
                Ready via npx
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Multi-Account Management */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-devtoys-primary block">Multi-Account Management</span>
            <span className="text-[11px] text-devtoys-muted">
              Seamlessly switch accounts for automated Git push and Vercel/Netlify deployments.
            </span>
          </div>
        </div>

        {/* GitHub Accounts List */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-devtoys-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-devtoys-accent" />
              Authenticated GitHub Accounts
            </span>
            {onLoginGitHub && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onLoginGitHub()}
                icon={<UserPlus className="w-3 h-3" />}
              >
                + Add / Login Another Account
              </Button>
            )}
          </div>

          {githubStatus?.accounts && githubStatus.accounts.length > 0 ? (
            <div className="space-y-1.5">
              {githubStatus.accounts.map((acc) => {
                const isActive = acc === githubStatus.username;
                return (
                  <div
                    key={acc}
                    className={`flex items-center justify-between p-2.5 rounded border transition-colors ${
                      isActive
                        ? 'bg-devtoys-accent/10 border-devtoys-accent/40 text-devtoys-primary'
                        : 'bg-devtoys-sidebar border-devtoys-border text-devtoys-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-3.5 h-3.5 ${isActive ? 'text-devtoys-accent' : 'text-devtoys-muted'}`} />
                      <span className="font-mono font-medium">@{acc}</span>
                      {isActive && (
                        <span className="text-[10px] bg-devtoys-accent/20 text-devtoys-accent px-1.5 py-0.5 rounded font-medium">
                          Active Account
                        </span>
                      )}
                    </div>

                    {!isActive && onSwitchGitHubAccount && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleSwitchAccount(acc)}
                        loading={switchingGhUser === acc}
                        icon={<RotateCw className="w-3 h-3" />}
                      >
                        Switch to @{acc}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded bg-devtoys-sidebar border border-devtoys-border text-devtoys-muted text-center">
              No authenticated GitHub accounts detected. Click &quot;Add / Login Another Account&quot; to sign in.
            </div>
          )}
        </div>

        {/* Vercel Account Scope */}
        <div className="space-y-2 pt-2 border-t border-devtoys-border/60">
          <div className="text-[11px] font-semibold text-devtoys-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-devtoys-accent" />
              Vercel Account & Scope
            </span>
            {onLoginVercel && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onLoginVercel()}
                icon={<LogIn className="w-3 h-3" />}
              >
                Log In to Another Vercel Account
              </Button>
            )}
          </div>

          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-devtoys-accent" />
              <span className="font-mono text-devtoys-primary">
                {vercelStatus?.authenticated ? vercelStatus.username : 'Not Authenticated'}
              </span>
              {vercelStatus?.authenticated && (
                <span className="text-[10px] bg-devtoys-success/20 text-devtoys-success px-1.5 py-0.5 rounded font-medium">
                  Active Vercel User
                </span>
              )}
            </div>

            {onLoginVercel && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => onLoginVercel()}
                icon={<RotateCw className="w-3 h-3" />}
              >
                Switch / Re-login
              </Button>
            )}
          </div>
        </div>

        {/* Netlify Account */}
        <div className="space-y-2 pt-2 border-t border-devtoys-border/60">
          <div className="text-[11px] font-semibold text-devtoys-secondary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-teal-400" />
              Netlify Account
            </span>
            {onLoginNetlify && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onLoginNetlify()}
                icon={<LogIn className="w-3 h-3" />}
              >
                Log In to Netlify
              </Button>
            )}
          </div>

          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-mono text-devtoys-primary">
                {netlifyStatus?.authenticated ? (netlifyStatus.username || netlifyStatus.email) : 'Not Logged In'}
              </span>
              {netlifyStatus?.authenticated && (
                <span className="text-[10px] bg-devtoys-success/20 text-devtoys-success px-1.5 py-0.5 rounded font-medium">
                  Active Netlify User
                </span>
              )}
            </div>

            {onLoginNetlify && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => onLoginNetlify()}
                icon={<RotateCw className="w-3 h-3" />}
              >
                Switch / Re-login
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: General & Terminal Preferences */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
        <span className="font-semibold text-devtoys-primary block">Terminal & Git Preferences</span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-devtoys-muted block mb-1">
              Preferred Windows Terminal
            </label>
            <select
              value={preferredTerminal}
              onChange={(e) => setPreferredTerminal(e.target.value as AppSettings['preferredTerminal'])}
              className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
            >
              <option value="wt">Windows Terminal (wt.exe) — Default</option>
              <option value="pwsh">PowerShell 7 (pwsh.exe)</option>
              <option value="powershell">Windows PowerShell (powershell.exe)</option>
              <option value="cmd">Command Prompt (cmd.exe)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-devtoys-muted block mb-1">
              Default Initial Branch Name
            </label>
            <input
              type="text"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Local Storage & Backup */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
        <span className="font-semibold text-devtoys-primary block">Local Storage & Registry Backup</span>
        <p className="text-[11px] text-devtoys-muted leading-relaxed">
          All project records and settings are stored locally on your machine (%APPDATA%\DeployHub).
          No cloud database is used. You can export your registry to JSON for backup or migration:
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportRegistry}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Projects JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onImportRegistry}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Import Projects JSON
          </Button>
        </div>
      </div>
    </div>
  );
};
