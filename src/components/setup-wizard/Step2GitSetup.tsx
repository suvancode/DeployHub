import React, { useState } from 'react';
import {
  GitBranch,
  ShieldCheck,
  FileCheck,
  CheckCircle,
  AlertTriangle,
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
    if (success) {
      setInitSuccess(true);
    }
  };

  const handleApplyGitignore = async () => {
    const success = await onApplyGitignore(gitignoreContent);
    if (success) {
      setGitignoreSuccess(true);
    }
  };

  const handleCreateCommit = async () => {
    const success = await onCreateInitialCommit(commitMessage);
    if (success) {
      setCommitSuccess(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Step 2: Git Setup Manager</h3>
        <p className="text-xs text-slate-400 mt-1">
          Configure Git safely without destructive history rewrites or silent overwrites.
        </p>
      </div>

      {/* Case A: Folder is already a Git repository */}
      {inspection.isGitRepo ? (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Existing Git Repository Preserved</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            DeployHub respects your existing Git history. No commits will be rewritten, and existing remotes will never be replaced silently.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500">Active Branch:</span>{' '}
              <span className="font-mono text-emerald-300 font-semibold">{inspection.currentBranch || 'main'}</span>
            </div>
            <div>
              <span className="text-slate-500">Existing Commits:</span>{' '}
              <span className="text-slate-200">{inspection.commitCount}</span>
            </div>
          </div>

          {inspection.hasUncommittedChanges && (
            <Alert variant="warning" title="Uncommitted Changes Detected">
              You have {inspection.uncommittedFiles.length} uncommitted file(s). You can commit them manually using your terminal or keep working.
            </Alert>
          )}
        </div>
      ) : (
        /* Case B: Initialize Git Repository */
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span>Initialize Local Git Repository</span>
            </div>
            {initSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Initialized
              </span>
            )}
          </div>

          {!initSuccess ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                This project does not have Git initialized yet. Specify your primary branch name below:
              </p>
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <label className="text-[11px] text-slate-400 block mb-1">Initial Branch Name</label>
                  <input
                    type="text"
                    value={initialBranch}
                    onChange={(e) => setInitialBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="pt-4">
                  <Button variant="primary" size="sm" onClick={handleInit} loading={loading}>
                    Initialize Git
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Alert variant="success" title="Git Initialized">
              Repository initialized on branch <strong className="font-mono">{initialBranch}</strong>.
            </Alert>
          )}
        </div>
      )}

      {/* .gitignore Configuration */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <FileCheck className="w-4 h-4 text-sky-400" />
            <span>.gitignore Configuration</span>
          </div>
          <button
            onClick={() => setShowGitignoreEditor(!showGitignoreEditor)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            {showGitignoreEditor ? 'Hide Editor' : 'View / Edit Proposed .gitignore'}
          </button>
        </div>

        {showGitignoreEditor && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Review and customize the proposed .gitignore before applying. Important: Secrets like <code className="text-amber-300">.env</code> must remain excluded!
            </p>
            <textarea
              value={gitignoreContent}
              onChange={(e) => setGitignoreContent(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-emerald-500 resize-none"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApplyGitignore}
              loading={loading}
              disabled={gitignoreSuccess}
            >
              {gitignoreSuccess ? '✓ .gitignore Applied' : 'Save .gitignore'}
            </Button>
          </div>
        )}
      </div>

      {/* Initial Commit Workflow (Only if 0 commits) */}
      {!inspection.hasCommits && !commitSuccess && (
        <div className="p-5 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 space-y-4">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Create Optional Initial Commit</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            GitHub requires at least one local commit before you can run <code className="text-emerald-300">git push</code>. You can create an initial commit now or create one manually later.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Commit Message</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCommit}
              loading={loading}
            >
              Stage Safe Files & Commit
            </Button>
          </div>
        </div>
      )}

      {commitSuccess && (
        <Alert variant="success" title="Commit Ready">
          Initial commit created successfully. You are ready to connect a GitHub repository.
        </Alert>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button variant="primary" size="md" onClick={onNext} icon={<ArrowRight className="w-4 h-4" />}>
          Continue to GitHub Account
        </Button>
      </div>
    </div>
  );
};
