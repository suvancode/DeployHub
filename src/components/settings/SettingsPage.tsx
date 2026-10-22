import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Terminal,
  GitBranch,
  ShieldCheck,
  Globe,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, GitHubAccountStatus, VercelStatus } from '../../types/api';
import { Button } from '../common/Button';

interface SettingsPageProps {
  settings: AppSettings;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onRefreshStatuses: () => void;
  onExportRegistry: () => void;
  onImportRegistry: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  githubStatus,
  vercelStatus,
  onSaveSettings,
  onRefreshStatuses,
  onExportRegistry,
  onImportRegistry,
}) => {
  const [preferredTerminal, setPreferredTerminal] = useState(settings.preferredTerminal);
  const [defaultBranch, setDefaultBranch] = useState(settings.defaultBranch);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-xs">
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-devtoys-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
            <Sliders className="w-4 h-4 text-devtoys-accent" /> Settings & Preferences
          </h2>
          <p className="text-xs text-devtoys-muted mt-0.5">
            Configure application behavior, CLI integrations, and local data storage.
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
        </div>
      </div>

      {/* Section 2: General & Terminal Preferences */}
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

      {/* Section 3: Local Storage & Backup */}
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
