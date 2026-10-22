import React, { useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Globe,
  Terminal,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
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
  projectName,
  repoUrl,
  branchName,
  vercelProjectName,
  onDeployInitial,
  onFinish,
  loading,
}) => {
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [inspectUrl, setInspectUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleDeploy = async (isProduction: boolean) => {
    setDeployError(null);
    const res = await onDeployInitial(isProduction);
    if (res) {
      setDeployedUrl(res.url);
      if (res.inspectUrl) setInspectUrl(res.inspectUrl);
    } else {
      setDeployError('Initial deployment failed. Check activity logs or Vercel dashboard for build details.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" /> Setup Complete: Initial Deployment & Automation
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Your local project is configured with Git, GitHub, and Vercel.
        </p>
      </div>

      {/* Configuration Summary Card */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Configuration Summary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" /> GitHub Repository
            </span>
            <div className="font-semibold text-slate-200 truncate">{repoUrl}</div>
            <div className="text-[11px] text-slate-400">Branch: <strong className="text-emerald-300 font-mono">{branchName}</strong></div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" /> Vercel Project
            </span>
            <div className="font-semibold text-slate-200 truncate">{vercelProjectName}</div>
            <div className="text-[11px] text-slate-400">Status: Linked to GitHub</div>
          </div>
        </div>
      </div>

      {/* Optional Initial Deployment */}
      <div className="p-5 rounded-2xl border border-sky-800/40 bg-sky-950/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
            <Rocket className="w-4 h-4 text-sky-400" />
            <span>Optional Initial Deployment</span>
          </div>
          {deployedUrl && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Deployed
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          You can test your project build right now with an initial Vercel deployment, or skip directly to the dashboard.
        </p>

        {deployedUrl ? (
          <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
            <span className="text-xs text-slate-400">Production URL:</span>
            <div className="flex items-center justify-between">
              <a
                href={deployedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-base font-bold text-emerald-400 hover:underline flex items-center gap-1.5"
              >
                <span>{deployedUrl}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              {inspectUrl && (
                <a
                  href={inspectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  Build Logs <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleDeploy(true)}
              loading={loading}
              icon={<Rocket className="w-4 h-4" />}
            >
              Deploy to Production
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => handleDeploy(false)}
              loading={loading}
            >
              Preview Deploy Only
            </Button>
          </div>
        )}

        {deployError && (
          <Alert variant="error" title="Deployment Notice">
            {deployError}
          </Alert>
        )}
      </div>

      {/* The Crucial Ongoing Workflow Guide */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          How Future Deployments Work Automatically
        </h4>

        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
            <span>You edit your project files locally.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
            <span>Stage and commit changes in your terminal (<code className="text-emerald-300">git commit -m &quot;...&quot;</code>).</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
            <span>Run your manual push command: <code className="text-emerald-300 font-bold">git push</code>.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">4</span>
            <span>GitHub notifies Vercel, which builds and deploys your updates automatically!</span>
          </div>
        </div>
      </div>

      {/* Final Action */}
      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          size="lg"
          onClick={onFinish}
          icon={<CheckCircle2 className="w-5 h-5" />}
        >
          Finish & Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
