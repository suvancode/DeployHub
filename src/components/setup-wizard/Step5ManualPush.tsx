import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { ManualPushInfo } from '../../types/api';
import { Button } from '../common/Button';

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 5: Manual Git Push Verification</h3>
        <p className="text-[11px] text-devtoys-muted">
          DeployHub follows a strict security policy: code is <strong>never pushed automatically</strong>.
        </p>
      </div>

      {/* Manual Push Banner */}
      <div className="p-3 rounded-md border border-devtoys-accent/30 bg-devtoys-accent/10 flex items-start gap-2 text-devtoys-primary text-xs">
        <ShieldAlert className="w-4 h-4 text-devtoys-accent shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-devtoys-accent">Manual Action Required:</strong> Run the command below in your terminal. You maintain full control over what and when to publish.
        </div>
      </div>

      {/* Command Block */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-devtoys-primary">Push Command</span>
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
            variant="primary"
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
            checked={userConfirmedPushed}
            onChange={(e) => setUserConfirmedPushed(e.target.checked)}
            className="mt-0.5 rounded text-devtoys-accent focus:ring-devtoys-accent"
          />
          <div className="text-[11px] text-devtoys-secondary">
            <span className="font-semibold text-devtoys-primary">
              I have run the push command (or will push before Vercel deploy)
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
          disabled={!userConfirmedPushed}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Proceed to Vercel Setup
        </Button>
      </div>
    </div>
  );
};
