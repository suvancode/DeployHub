import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info,
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pushInfo.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Step 5: Manual Git Push Verification</h3>
        <p className="text-xs text-slate-400 mt-1">
          DeployHub follows a strict security policy: code is <strong>never pushed automatically</strong>.
        </p>
      </div>

      {/* Security Rule Guarantee */}
      <div className="p-4 rounded-xl border border-emerald-800/60 bg-emerald-950/20 text-xs text-emerald-200/95 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-emerald-300">Why Manual Push?</strong> Automatic or background pushing can accidentally publish unintended commits, private keys, or break remote tracking branches. You remain in total control of your GitHub repository.
        </div>
      </div>

      {/* Primary Push Command Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            {pushInfo.isInitialPush ? 'Initial Push Command' : 'Push Command'}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Branch: <strong className="text-emerald-400">{pushInfo.branch}</strong> → Remote: <strong className="text-emerald-400">{pushInfo.remoteName}</strong>
          </span>
        </div>

        {/* Command block with copy button */}
        <div className="relative group">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-base text-emerald-400 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2 select-all overflow-x-auto">
              <span className="text-slate-600 select-none">$</span>
              <span>{pushInfo.command}</span>
            </div>
            <button
              onClick={handleCopy}
              className="ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {pushInfo.explanation}
        </p>

        {/* Action: Open Terminal */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onOpenTerminal(projectPath)}
            icon={<Terminal className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Open Project in Terminal
          </Button>
          <span className="text-xs text-slate-500">
            Click to launch your terminal directly in this directory and paste the command.
          </span>
        </div>
      </div>

      {/* Manual Checkbox / Confirmation */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={userConfirmedPushed}
            onChange={(e) => setUserConfirmedPushed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700"
          />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-slate-100">
              I have executed the push command (or will push before Vercel deploy)
            </span>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              Once your commits are on GitHub, Vercel will be able to access the repository and set up automatic deployments for all future pushes.
            </p>
          </div>
        </label>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!userConfirmedPushed}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Proceed to Vercel Setup
        </Button>
      </div>
    </div>
  );
};
