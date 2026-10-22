import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Terminal,
  GitBranch,
  Shield,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { AppSettings, GitHubAccountStatus, VercelStatus } from '../../types/api';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  githubStatus: GitHubAccountStatus | null;
  vercelStatus: VercelStatus | null;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onExportRegistry: () => void;
  onImportRegistry: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  githubStatus,
  vercelStatus,
  onSaveSettings,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Settings"
      description="Configure local environment preferences and storage options"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* CLI Integration Status */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            CLI Tools & Authentication
          </span>

          <div className="space-y-2 text-xs">
            {/* GitHub CLI */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">GitHub CLI (gh)</span>
              {githubStatus?.authenticated ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Logged in as @{githubStatus.username}
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Not logged in
                </span>
              )}
            </div>

            {/* Vercel CLI */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300">Vercel CLI</span>
              {vercelStatus?.authenticated ? (
                <span className="text-sky-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Logged in as {vercelStatus.username}
                </span>
              ) : vercelStatus?.installed ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Installed (Run vercel login)
                </span>
              ) : (
                <span className="text-slate-400">Not installed in PATH</span>
              )}
            </div>
          </div>
        </div>

        {/* Preferred Terminal */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Preferred Windows Terminal
          </label>
          <select
            value={preferredTerminal}
            onChange={(e) => setPreferredTerminal(e.target.value as AppSettings['preferredTerminal'])}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="wt">Windows Terminal (wt.exe) — Recommended</option>
            <option value="pwsh">PowerShell 7 (pwsh.exe)</option>
            <option value="powershell">Windows PowerShell (powershell.exe)</option>
            <option value="cmd">Command Prompt (cmd.exe)</option>
          </select>
          <span className="text-[11px] text-slate-500 block">
            Launched when clicking &quot;Open Terminal&quot; on any project card.
          </span>
        </div>

        {/* Default Git Branch */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            Default Initial Branch Name
          </label>
          <input
            type="text"
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            placeholder="main"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Local Storage & Registry Management */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Local Storage & Backup
          </span>
          <p className="text-xs text-slate-400 leading-relaxed">
            DeployHub stores all configuration and logs locally in AppData. No cloud database is used. You can backup or transfer projects between computers:
          </p>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportRegistry}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export Registry JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onImportRegistry}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Import Registry JSON
            </Button>
          </div>
        </div>

        {/* Save & Status */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div>
            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} icon={<Save className="w-3.5 h-3.5" />}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
