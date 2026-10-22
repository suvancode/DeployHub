import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  ArrowUpCircle,
  CheckCircle2,
} from 'lucide-react';
import { ManualPushInfo } from '../../types/api';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface Step5Props {
  pushInfo: ManualPushInfo;
  projectPath: string;
  onOpenTerminal: (path: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step5ManualPush: React.FC<Step5Props> = ({
  pushInfo,
  projectPath,
  onOpenTerminal,
  onNext,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);
  const [userConfirmedPushed, setUserConfirmedPushed] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushOutput, setPushOutput] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pushInfo.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleAutoPush = async () => {
    setIsPushing(true);
    setPushError(null);
    setPushOutput(null);
    try {
      const res = await window.deployHubAPI.pushRepo(projectPath, pushInfo.remoteName, pushInfo.branch);
      if (res.success && res.data) {
        setPushSuccess(true);
        setPushOutput(res.data.output);
        setUserConfirmedPushed(true);
      } else {
        setPushError(res.error?.why || res.error?.message || 'Git push failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPushError(`Push error: ${msg}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 5: Push Code to GitHub</h3>
        <p className="text-[11px] text-devtoys-muted">
          Push your commits automatically with one click, or use the manual terminal command.
        </p>
      </div>

      {/* Target Remote Info */}
      <div className="p-2.5 rounded-md border border-devtoys-border bg-devtoys-sidebar flex items-center justify-between text-[11px]">
        <span className="text-devtoys-muted">Target Remote ({pushInfo.remoteName}/{pushInfo.branch}):</span>
        <span className="text-devtoys-accent font-mono truncate max-w-[320px]" title={pushInfo.repoUrl}>
          {pushInfo.repoUrl || 'origin'}
        </span>
      </div>

      {/* Auto-Push Action Box */}
      <div className="p-3.5 rounded-md border border-devtoys-accent/40 bg-devtoys-accent/10 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-center text-devtoys-accent shrink-0">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-devtoys-primary">Push Automatically to GitHub</div>
              <div className="text-[11px] text-devtoys-muted">
                Executes <code className="font-mono text-devtoys-accent">{pushInfo.command}</code> directly from DeployHub.
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAutoPush}
            loading={isPushing}
            icon={pushSuccess ? <Check className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
          >
            {isPushing ? 'Pushing...' : pushSuccess ? 'Push Again' : 'Push Code to GitHub'}
          </Button>
        </div>

        {pushSuccess && (
          <Alert variant="success" title="Push Completed Successfully">
            Your code has been uploaded to <span className="font-mono font-bold">{pushInfo.repoUrl}</span>! You can now proceed to Vercel deployment.
          </Alert>
        )}

        {pushError && (
          <Alert variant="error" title="Push Failed" onClose={() => setPushError(null)}>
            <div className="font-mono text-[11px] whitespace-pre-wrap">{pushError}</div>
          </Alert>
        )}
      </div>

      {/* Manual Terminal Command (Alternative) */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-devtoys-secondary">Manual Push Alternative</span>
          <span className="text-devtoys-muted font-mono">
            {pushInfo.remoteName}/{pushInfo.branch}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-7 px-3 rounded bg-devtoys-sidebar border border-devtoys-border font-mono text-xs text-devtoys-accent flex items-center select-all">
            <span className="text-devtoys-muted mr-1.5 select-none">$</span>
            <span>{pushInfo.command}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenTerminal(projectPath)}
            icon={<Terminal className="w-3.5 h-3.5" />}
          >
            Terminal
          </Button>
        </div>

        <p className="text-[11px] text-devtoys-muted leading-relaxed">
          {pushInfo.explanation}
        </p>
      </div>

      {/* Confirmation Checkbox */}
      <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={userConfirmedPushed || pushSuccess}
            onChange={(e) => setUserConfirmedPushed(e.target.checked)}
            className="mt-0.5 rounded text-devtoys-accent focus:ring-devtoys-accent"
          />
          <div className="text-[11px] text-devtoys-secondary">
            <span className="font-semibold text-devtoys-primary">
              Code is pushed to GitHub (automatically above or via terminal)
            </span>
            <div className="text-devtoys-muted mt-0.5">
              Once pushed to GitHub, Vercel will be able to detect commits and configure builds.
            </div>
          </div>
        </label>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!userConfirmedPushed && !pushSuccess}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Proceed to Vercel Setup
        </Button>
      </div>
    </div>
  );
};
