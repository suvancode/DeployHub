import React, { useState } from 'react';
import {
  GitBranch,
  ShieldCheck,
  FileCheck,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  PlusCircle,
} from 'lucide-react';
import { ProjectInspection } from '../../types/api';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface Step2Props {
  inspection: ProjectInspection;
  onInitGit: (branch: string) => Promise<boolean>;
  onApplyGitignore: (content: string) => Promise<boolean>;
  onCreateInitialCommit: (message: string) => Promise<boolean>;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

export const Step2GitSetup: React.FC<Step2Props> = ({
  inspection,
  onInitGit,
  onApplyGitignore,
  onCreateInitialCommit,
  onNext,
  onBack,
  loading,
}) => {
  const [initialBranch, setInitialBranch] = useState(inspection.currentBranch || 'main');
  const [gitignoreContent, setGitignoreContent] = useState(
    inspection.hasGitignore && inspection.existingGitignoreContent
      ? inspection.existingGitignoreContent
      : inspection.suggestedGitignore || 'node_modules/\n.env\n'
  );
  const [showGitignoreEditor, setShowGitignoreEditor] = useState(!inspection.hasGitignore);
  const [commitMessage, setCommitMessage] = useState('Initial commit via DeployHub');
  const [initSuccess, setInitSuccess] = useState(inspection.isGitRepo);
  const [gitignoreSuccess, setGitignoreSuccess] = useState(inspection.hasGitignore);
  const [commitSuccess, setCommitSuccess] = useState(inspection.hasCommits);

  const handleInit = async () => {
    const success = await onInitGit(initialBranch);
    if (success) setInitSuccess(true);
  };

  const handleApplyGitignore = async () => {
    const success = await onApplyGitignore(gitignoreContent);
    if (success) setGitignoreSuccess(true);
  };

  const handleCreateCommit = async () => {
    const success = await onCreateInitialCommit(commitMessage);
    if (success) setCommitSuccess(true);
  };

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 2: Git Setup Manager</h3>
        <p className="text-[11px] text-devtoys-muted">
          Configure Git repository safely without rewriting history or overwriting remotes.
        </p>
      </div>

      {inspection.isGitRepo ? (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
          <div className="flex items-center gap-2 text-devtoys-success font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Existing Git Repository Preserved</span>
          </div>
          <p className="text-[11px] text-devtoys-muted leading-relaxed">
            Existing Git history is preserved. No commits will be rewritten.
          </p>
          <div className="flex gap-4 text-[11px] bg-devtoys-sidebar p-2 rounded border border-devtoys-border">
            <div>
              <span className="text-devtoys-muted">Branch: </span>
              <span className="font-mono text-devtoys-primary font-semibold">{inspection.currentBranch || 'main'}</span>
            </div>
            <div>
              <span className="text-devtoys-muted">Commits: </span>
              <span className="text-devtoys-secondary">{inspection.commitCount}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-devtoys-primary flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-devtoys-accent" /> Initialize Local Git Repository
            </span>
            {initSuccess && (
              <span className="text-[11px] text-devtoys-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Initialized
              </span>
            )}
          </div>

          {!initSuccess ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={initialBranch}
                onChange={(e) => setInitialBranch(e.target.value)}
                placeholder="Initial branch (e.g. main)"
                className="w-40 h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
              />
              <Button variant="primary" size="sm" onClick={handleInit} loading={loading}>
                Initialize Git
              </Button>
            </div>
          ) : (
            <Alert variant="success" title="Git Initialized">
              Repository initialized on branch <strong className="font-mono">{initialBranch}</strong>.
            </Alert>
          )}
        </div>
      )}

      {/* .gitignore Configuration */}
      <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-devtoys-primary flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-devtoys-accent" /> .gitignore Configuration
          </span>
          <button
            onClick={() => setShowGitignoreEditor(!showGitignoreEditor)}
            className="text-[11px] text-devtoys-accent hover:underline"
          >
            {showGitignoreEditor ? 'Hide Editor' : 'Edit .gitignore'}
          </button>
        </div>

        {showGitignoreEditor && (
          <div className="space-y-2 pt-1">
            <textarea
              value={gitignoreContent}
              onChange={(e) => setGitignoreContent(e.target.value)}
              rows={6}
              className="w-full bg-devtoys-sidebar border border-devtoys-border rounded-md p-2 font-mono text-xs text-devtoys-secondary focus:outline-none focus:border-devtoys-accent resize-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApplyGitignore}
              loading={loading}
              disabled={gitignoreSuccess}
            >
              {gitignoreSuccess ? 'Saved' : 'Save .gitignore'}
            </Button>
          </div>
        )}
      </div>

      {/* Optional Initial Commit */}
      {!inspection.hasCommits && !commitSuccess && (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
          <div className="flex items-center gap-1.5 text-devtoys-primary font-semibold">
            <PlusCircle className="w-3.5 h-3.5 text-devtoys-accent" />
            <span>Create Optional Initial Commit</span>
          </div>
          <p className="text-[11px] text-devtoys-muted leading-relaxed">
            GitHub requires at least one commit before pushing. You can create one now:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="flex-1 h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
            />
            <Button variant="primary" size="sm" onClick={handleCreateCommit} loading={loading}>
              Commit
            </Button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <Button variant="primary" size="sm" onClick={onNext} icon={<ArrowRight className="w-3.5 h-3.5" />}>
          Continue to GitHub User
        </Button>
      </div>
    </div>
  );
};
