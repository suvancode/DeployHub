import React from 'react';
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { GitHubAccountStatus } from '../../types/api';
import { Button } from '../common/Button';
import { TerminalBlock } from '../common/TerminalBlock';

interface Step3Props {
  status: GitHubAccountStatus | null;
  onRefreshStatus: () => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

export const Step3GitHubAccount: React.FC<Step3Props> = ({
  status,
  onRefreshStatus,
  onNext,
  onBack,
  loading,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Step 3: GitHub Account Verification</h3>
        <p className="text-xs text-slate-400 mt-1">
          Verify your GitHub identity. DeployHub uses the official GitHub CLI to ensure zero credentials are stored locally in plain text.
        </p>
      </div>

      {status?.installed && status?.authenticated ? (
        /* Authenticated State */
        <div className="p-6 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                Verified GitHub Account
              </span>
              <div className="text-lg font-bold text-slate-100 flex items-center gap-2">
                @{status.username}
                {status.name && <span className="text-xs font-normal text-slate-400">({status.name})</span>}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            Repositories will be created under or connected to <strong>@{status.username}</strong>. If you want to use a different GitHub account, run <code className="text-emerald-300">gh auth switch</code> or <code className="text-emerald-300">gh auth login</code> in your terminal and click Re-verify.
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshStatus}
              loading={loading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Re-verify Identity
            </Button>
          </div>
        </div>
      ) : !status?.installed ? (
        /* GitHub CLI Missing */
        <div className="p-6 rounded-2xl border border-amber-800/60 bg-amber-950/30 space-y-4">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span>GitHub CLI (gh) Not Found</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            DeployHub requires GitHub CLI to securely create and configure repositories without handling passwords or tokens.
          </p>

          <TerminalBlock
            title="Install GitHub CLI on Windows (PowerShell)"
            command="winget install --id GitHub.cli"
          />

          <div className="text-xs text-slate-400">
            Alternatively, download the official installer directly from{' '}
            <a
              href="https://cli.github.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              cli.github.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onRefreshStatus}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Check Again
          </Button>
        </div>
      ) : (
        /* GitHub CLI Installed but Not Logged In */
        <div className="p-6 rounded-2xl border border-amber-800/60 bg-amber-950/30 space-y-4">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span>GitHub CLI Authentication Required</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            GitHub CLI is installed, but no active login session was found. Run the standard GitHub CLI login command in your terminal:
          </p>

          <TerminalBlock
            title="Authenticate with GitHub"
            command="gh auth login"
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onRefreshStatus}
              loading={loading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Check Login Status
            </Button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!status?.authenticated}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to Repository Setup
        </Button>
      </div>
    </div>
  );
};
