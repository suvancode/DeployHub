import React, { useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Globe,
  Check,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface Step7Props {
  projectName: string;
  repoUrl: string;
  branchName: string;
  vercelProjectName: string;
  onDeployInitial: (isProduction: boolean) => Promise<{ url: string; inspectUrl?: string } | null>;
  onFinish: () => void;
  loading: boolean;
}

export const Step7SummaryDeploy: React.FC<Step7Props> = ({
  repoUrl,
  branchName,
  vercelProjectName,
  onDeployInitial,
  onFinish,
  loading,
}) => {
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleDeploy = async (isProduction: boolean) => {
    setDeployError(null);
    const res = await onDeployInitial(isProduction);
    if (res) {
      setDeployedUrl(res.url);
    } else {
      setDeployError('Initial deployment failed. Check activity logs or Vercel CLI login.');
    }
  };

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 7: Setup Complete</h3>
        <p className="text-[11px] text-devtoys-muted">
          Your project is configured with Git, GitHub, and Vercel.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-1">
          <span className="text-[11px] text-devtoys-muted flex items-center gap-1.5">
            <GitPullRequest className="w-3.5 h-3.5 text-devtoys-accent" /> GitHub Repository
          </span>
          <div className="font-semibold text-devtoys-primary font-mono truncate">{repoUrl}</div>
          <div className="text-[11px] text-devtoys-secondary">Branch: <strong className="text-devtoys-accent font-mono">{branchName}</strong></div>
        </div>

        <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-1">
          <span className="text-[11px] text-devtoys-muted flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-devtoys-accent" /> Vercel Project
          </span>
          <div className="font-semibold text-devtoys-primary truncate">{vercelProjectName}</div>
          <div className="text-[11px] text-devtoys-secondary">Ready for automated builds</div>
        </div>
      </div>

      {/* Optional Initial Deployment */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2.5">
        <span className="font-semibold text-devtoys-primary block">Optional Initial Deployment</span>
        <p className="text-[11px] text-devtoys-muted leading-relaxed">
          You can test your project build now with an initial deployment, or return directly to your workspace.
        </p>

        {deployedUrl ? (
          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-success/40 flex items-center justify-between">
            <span className="text-devtoys-success font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Deployed:
            </span>
            <a
              href={deployedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono text-[11px]"
            >
              <span>{deployedUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDeploy(true)}
              loading={loading}
              icon={<Rocket className="w-3.5 h-3.5" />}
            >
              Deploy to Production
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDeploy(false)}
              loading={loading}
            >
              Preview Only
            </Button>
          </div>
        )}

        {deployError && <Alert variant="error" title="Deployment Notice">{deployError}</Alert>}
      </div>

      {/* Final Action Button */}
      <div className="flex justify-end pt-2">
        <Button variant="primary" size="sm" onClick={onFinish} icon={<Check className="w-3.5 h-3.5" />}>
          Finish & Return to Workspace
        </Button>
      </div>
    </div>
  );
};
