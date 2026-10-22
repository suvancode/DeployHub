import React from 'react';
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
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
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 3: GitHub Account Verification</h3>
        <p className="text-[11px] text-devtoys-muted">
          Verify your GitHub CLI identity before creating or linking repositories.
        </p>
      </div>

      {status?.installed && status?.authenticated ? (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-devtoys-sidebar border border-devtoys-border flex items-center justify-center text-devtoys-success">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-devtoys-primary">Verified Account: @{status.username}</div>
              <div className="text-[11px] text-devtoys-muted">
                Authenticated via official GitHub CLI (gh) keyring.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshStatus}
              loading={loading}
              icon={<RefreshCw className="w-3 h-3" />}
            >
              Re-verify
            </Button>
          </div>
        </div>
      ) : !status?.installed ? (
        <div className="p-3.5 rounded-md border border-devtoys-warning/30 bg-devtoys-warning/10 space-y-2.5">
          <div className="flex items-center gap-1.5 text-devtoys-warning font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>GitHub CLI (gh) Not Found</span>
          </div>
          <p className="text-[11px] text-devtoys-secondary">
            Install GitHub CLI via winget in PowerShell:
          </p>
          <TerminalBlock title="Install GitHub CLI" command="winget install --id GitHub.cli" />
          <Button variant="primary" size="sm" onClick={onRefreshStatus} loading={loading}>
            Check Again
          </Button>
        </div>
      ) : (
        <div className="p-3.5 rounded-md border border-devtoys-warning/30 bg-devtoys-warning/10 space-y-2.5">
          <div className="flex items-center gap-1.5 text-devtoys-warning font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>GitHub CLI Login Required</span>
          </div>
          <p className="text-[11px] text-devtoys-secondary">
            Log in to your account via PowerShell:
          </p>
          <TerminalBlock title="Log in to GitHub" command="gh auth login" />
          <Button variant="primary" size="sm" onClick={onRefreshStatus} loading={loading}>
            Check Login Status
          </Button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!status?.authenticated}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Continue to Repository
        </Button>
      </div>
    </div>
  );
};
