import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  ArrowUpCircle,
  Wrench,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { ManualPushInfo, GitErrorDiagnosis } from '../../types/api';
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
  const [isFixing, setIsFixing] = useState(false);
  const [pushOutput, setPushOutput] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<GitErrorDiagnosis | null>(null);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [currentRepoUrl, setCurrentRepoUrl] = useState(pushInfo.repoUrl);
  const [autoFixedMessage, setAutoFixedMessage] = useState<string | null>(null);

  // Check if URL has malformed spaces
  const hasSpacesInRemote = Boolean(
    currentRepoUrl && (currentRepoUrl.includes(' ') || currentRepoUrl.includes('%20'))
  );
  const sanitizedProposedUrl = currentRepoUrl ? currentRepoUrl.replace(/\s+/g, '-').replace(/%20/g, '-') : '';

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
    setDiagnosis(null);
    setAutoFixedMessage(null);

    try {
      const res = await window.deployHubAPI.pushRepo(projectPath, pushInfo.remoteName, pushInfo.branch);
      if (res.success && res.data) {
        setPushSuccess(true);
        setPushOutput(res.data.output);
        setUserConfirmedPushed(true);
        if (res.data.autoFixed && res.data.fixedUrl) {
          setCurrentRepoUrl(res.data.fixedUrl);
          setAutoFixedMessage(`DeployHub automatically corrected the malformed remote URL to "${res.data.fixedUrl}"!`);
        }
      } else {
        const rawErr = res.error?.why || res.error?.message || 'Git push failed.';
        setPushError(rawErr);
        if (res.error?.diagnosis) {
          setDiagnosis(res.error.diagnosis);
        } else {
          const diag = await window.deployHubAPI.diagnoseGitError(rawErr, currentRepoUrl);
          setDiagnosis(diag);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPushError(`Push error: ${msg}`);
      const diag = await window.deployHubAPI.diagnoseGitError(msg, currentRepoUrl);
      setDiagnosis(diag);
    } finally {
      setIsPushing(false);
    }
  };

  const handleAutoFixRemote = async (fixedUrl: string) => {
    setIsFixing(true);
    setPushError(null);
    setDiagnosis(null);
    try {
      const fixRes = await window.deployHubAPI.fixGitRemote(projectPath, pushInfo.remoteName, fixedUrl);
      if (fixRes.success) {
        setCurrentRepoUrl(fixedUrl);
        setAutoFixedMessage(`Remote URL successfully updated to "${fixedUrl}". Pushing commits now...`);
        // Immediately trigger push after fixing
        const pushRes = await window.deployHubAPI.pushRepo(projectPath, pushInfo.remoteName, pushInfo.branch);
        if (pushRes.success && pushRes.data) {
          setPushSuccess(true);
          setPushOutput(pushRes.data.output);
          setUserConfirmedPushed(true);
          setAutoFixedMessage(`Fixed remote URL to "${fixedUrl}" and pushed code successfully!`);
        } else {
          const raw = pushRes.error?.why || pushRes.error?.message || 'Push failed after remote fix.';
          setPushError(raw);
          const diag = await window.deployHubAPI.diagnoseGitError(raw, fixedUrl);
          setDiagnosis(diag);
        }
      } else {
        setPushError(fixRes.error?.why || fixRes.error?.message || 'Failed to update remote URL.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPushError(`Auto-fix error: ${msg}`);
    } finally {
      setIsFixing(false);
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
        <span className="text-devtoys-accent font-mono truncate max-w-[320px]" title={currentRepoUrl}>
          {currentRepoUrl || 'origin'}
        </span>
      </div>

      {/* Proactive Malformed Space Warning if detected on load */}
      {hasSpacesInRemote && !pushSuccess && (
        <div className="p-3 rounded-md border border-devtoys-warning/40 bg-devtoys-warning/10 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-devtoys-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-devtoys-primary">Spaces Detected in Remote URL</div>
              <p className="text-[11px] text-devtoys-muted mt-0.5">
                The remote URL contains spaces (<code className="text-devtoys-warning font-mono">{currentRepoUrl}</code>).
                Git will reject this with a malformed URL error. GitHub repository names use hyphens instead.
              </p>
            </div>
            <Button
              variant="primary"
              size="xs"
              onClick={() => handleAutoFixRemote(sanitizedProposedUrl)}
              loading={isFixing}
              icon={<Wrench className="w-3 h-3" />}
            >
              Auto-Fix to Hyphenated URL
            </Button>
          </div>
        </div>
      )}

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

        {autoFixedMessage && (
          <Alert variant="info" title="Automatic Fix Applied">
            <div className="flex items-center gap-1.5 text-devtoys-primary">
              <Sparkles className="w-3.5 h-3.5 text-devtoys-accent shrink-0" />
              <span>{autoFixedMessage}</span>
            </div>
          </Alert>
        )}

        {pushSuccess && (
          <Alert variant="success" title="Push Completed Successfully">
            Your code has been uploaded to <span className="font-mono font-bold">{currentRepoUrl}</span>! You can now proceed to Vercel deployment.
          </Alert>
        )}

        {/* Intelligent Error & Auto-Fix Card */}
        {pushError && (
          <div className="p-3.5 rounded-md border border-devtoys-error/40 bg-devtoys-error/10 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-devtoys-error shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-devtoys-primary">
                    {diagnosis?.title || 'Push Failed'}
                  </div>
                  <div className="text-[11px] text-devtoys-primary/90 mt-1 leading-relaxed">
                    <strong className="text-devtoys-error">What is the error: </strong>
                    {diagnosis?.whatIsError || pushError}
                  </div>
                  {diagnosis?.suggestion && (
                    <div className="text-[11px] text-devtoys-muted mt-1 leading-relaxed">
                      <strong>How to fix: </strong>
                      {diagnosis.suggestion}
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setPushError(null);
                  setDiagnosis(null);
                }}
              >
                ✕
              </Button>
            </div>

            {/* Auto-Fix Action Button */}
            {diagnosis?.canAutoFix && diagnosis.suggestedUrl && (
              <div className="pt-1 flex items-center justify-between border-t border-devtoys-error/20">
                <span className="text-[11px] text-devtoys-muted">
                  Suggested target: <code className="font-mono text-devtoys-accent">{diagnosis.suggestedUrl}</code>
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAutoFixRemote(diagnosis.suggestedUrl!)}
                  loading={isFixing}
                  icon={<Wrench className="w-3.5 h-3.5" />}
                >
                  {diagnosis.autoFixLabel || 'Fix Remote & Retry'}
                </Button>
              </div>
            )}

            {/* Collapsible raw technical error */}
            <details className="text-[10px] text-devtoys-muted font-mono pt-1">
              <summary className="cursor-pointer hover:text-devtoys-primary select-none">
                Show Raw Terminal Output
              </summary>
              <pre className="mt-1 p-2 rounded bg-devtoys-sidebar border border-devtoys-border whitespace-pre-wrap overflow-x-auto text-[10px]">
                {pushError}
              </pre>
            </details>
          </div>
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
