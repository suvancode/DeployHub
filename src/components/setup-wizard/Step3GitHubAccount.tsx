import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  ArrowLeftRight,
  Check,
  Terminal,
} from 'lucide-react';
import { GitHubAccountStatus } from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';
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
  const [switching, setSwitching] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const accounts = status?.accounts || (status?.username ? [status.username] : []);

  const handleSwitchAccount = async (user: string) => {
    setSwitching(true);
    setActionError(null);
    try {
      const res = await window.deployHubAPI.switchGitHubAccount(user);
      if (res.success) {
        onRefreshStatus();
      } else {
        setActionError(res.error?.message || 'Failed to switch GitHub account.');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitching(false);
    }
  };

  const handleLaunchLogin = async () => {
    setLoginPromptOpen(true);
    setActionError(null);
    try {
      await window.deployHubAPI.loginGitHub();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 3: GitHub Account Verification</h3>
        <p className="text-[11px] text-devtoys-muted">
          Verify your GitHub CLI identity or switch to another account before creating or linking repositories.
        </p>
      </div>

      {actionError && (
        <Alert variant="error" title="Account Action Failed" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {status?.installed && status?.authenticated ? (
        <div className="space-y-3">
          {/* Active Account Card */}
          <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-devtoys-sidebar border border-devtoys-border flex items-center justify-center text-devtoys-success">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-devtoys-primary flex items-center gap-1.5">
                    Active Account: <span className="font-mono text-devtoys-accent">@{status.username}</span>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <div className="text-[11px] text-devtoys-muted">
                    Authenticated via official GitHub CLI (gh) keyring.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={onRefreshStatus}
                  loading={loading || switching}
                  icon={<RefreshCw className="w-3 h-3" />}
                >
                  Re-verify
                </Button>
              </div>
            </div>

            {/* Multiple accounts detected or switch options */}
            {accounts.length > 1 && (
              <div className="pt-2 border-t border-devtoys-border/70 space-y-2">
                <div className="text-[11px] font-semibold text-devtoys-secondary flex items-center gap-1">
                  <ArrowLeftRight className="w-3 h-3 text-devtoys-accent" />
                  Detected Logged-in Accounts ({accounts.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {accounts.map((acc) => {
                    const isActive = acc.toLowerCase() === status.username?.toLowerCase();
                    return (
                      <div
                        key={acc}
                        className={`flex items-center justify-between p-2 rounded border text-xs ${
                          isActive
                            ? 'border-devtoys-accent/50 bg-devtoys-accent/10 text-devtoys-primary'
                            : 'border-devtoys-border bg-devtoys-sidebar text-devtoys-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-devtoys-accent shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 inline-block shrink-0" />
                          )}
                          <span className="font-mono font-medium truncate">@{acc}</span>
                        </div>
                        {isActive ? (
                          <span className="text-[10px] text-devtoys-accent font-semibold px-1.5 py-0.5 rounded bg-devtoys-accent/20">
                            Current
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleSwitchAccount(acc)}
                            loading={switching}
                          >
                            Switch
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add another account actions */}
            <div className="pt-2 border-t border-devtoys-border/70 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-devtoys-muted">
                Need to use a different GitHub account?
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={handleLaunchLogin}
                icon={<UserPlus className="w-3 h-3 text-devtoys-accent" />}
              >
                Log In Another Account
              </Button>
            </div>
          </div>

          {/* Helper when user clicks Log In Another Account */}
          {loginPromptOpen && (
            <div className="p-3 rounded-md border border-devtoys-accent/40 bg-devtoys-accent/10 space-y-2 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-devtoys-primary flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-devtoys-accent" />
                  GitHub CLI Login in Progress
                </span>
                <button
                  onClick={() => setLoginPromptOpen(false)}
                  className="text-devtoys-muted hover:text-devtoys-primary text-xs"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-[11px] text-devtoys-secondary leading-relaxed">
                A terminal window has opened running <code className="bg-devtoys-card px-1 py-0.5 rounded text-devtoys-accent">gh auth login</code>. Follow the prompts:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-devtoys-muted space-y-1 pl-1">
                <li>Choose <strong>GitHub.com</strong></li>
                <li>Choose your preferred protocol (<strong>HTTPS</strong> or <strong>SSH</strong>)</li>
                <li>Select <strong>Login with a web browser</strong></li>
                <li>Copy the 8-character code, press Enter, and authorize in your browser</li>
              </ol>
              <div className="pt-1 flex items-center gap-2">
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    onRefreshStatus();
                  }}
                  loading={loading}
                  icon={<RefreshCw className="w-3 h-3" />}
                >
                  I Finished Logging In — Check Accounts
                </Button>
              </div>
            </div>
          )}

          {/* Manual Terminal Reference */}
          <div className="p-2.5 rounded-md border border-devtoys-border/60 bg-devtoys-sidebar text-[11px] text-devtoys-muted space-y-1.5">
            <div className="font-semibold text-devtoys-secondary">Manual Terminal Commands</div>
            <div className="space-y-1 font-mono text-[10px]">
              <div><span className="text-devtoys-muted"># Authenticate another account:</span> <span className="text-devtoys-primary font-bold">gh auth login</span></div>
              <div><span className="text-devtoys-muted"># Switch active account:</span> <span className="text-devtoys-primary font-bold">gh auth switch --hostname github.com --user &lt;username&gt;</span></div>
            </div>
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
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleLaunchLogin} loading={loading}>
              Open Login Terminal
            </Button>
            <Button variant="secondary" size="sm" onClick={onRefreshStatus} loading={loading}>
              Check Login Status
            </Button>
          </div>
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
