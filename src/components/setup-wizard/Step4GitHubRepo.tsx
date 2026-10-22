import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Lock,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search,
} from 'lucide-react';
import {
  CreateRepoOptions,
  ConnectRepoOptions,
  GitHubRepoItem,
  ProjectInspection,
} from '../../types/api';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface Step4Props {
  inspection: ProjectInspection;
  defaultRepoName: string;
  onCreateRepo: (options: CreateRepoOptions) => Promise<string | null>;
  onConnectRepo: (options: ConnectRepoOptions) => Promise<string | null>;
  onListRepos: () => Promise<GitHubRepoItem[]>;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
  configuredRepoUrl: string | null;
}

export const Step4GitHubRepo: React.FC<Step4Props> = ({
  inspection,
  defaultRepoName,
  onCreateRepo,
  onConnectRepo,
  onListRepos,
  onNext,
  onBack,
  loading,
  configuredRepoUrl,
}) => {
  const [mode, setMode] = useState<'create' | 'connect'>('create');

  // Mode A fields
  const [repoName, setRepoName] = useState(defaultRepoName || inspection.folderName);
  const [isPrivate, setIsPrivate] = useState(true); // DEFAULT IS PRIVATE!
  const [description, setDescription] = useState('');
  const [remoteName, setRemoteName] = useState('origin');

  // Mode B fields
  const [existingRepoUrl, setExistingRepoUrl] = useState('');
  const [userRepos, setUserRepos] = useState<GitHubRepoItem[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Status
  const [createdUrl, setCreatedUrl] = useState<string | null>(configuredRepoUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'connect' && userRepos.length === 0) {
      setLoadingRepos(true);
      onListRepos()
        .then((repos) => setUserRepos(repos))
        .catch(() => {})
        .finally(() => setLoadingRepos(false));
    }
  }, [mode, onListRepos, userRepos.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!repoName.trim()) return;

    const url = await onCreateRepo({
      name: repoName.trim(),
      description: description.trim(),
      isPrivate,
      remoteName,
    });

    if (url) {
      setCreatedUrl(url);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!existingRepoUrl.trim()) return;

    const url = await onConnectRepo({
      repoUrl: existingRepoUrl.trim(),
      remoteName,
    });

    if (url) {
      setCreatedUrl(url);
    }
  };

  const filteredRepos = userRepos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Step 4: GitHub Repository Configuration</h3>
        <p className="text-xs text-slate-400 mt-1">
          Create a new repository or link an existing one. Repositories default to private for your security.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === 'create'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Mode A: Create New Repository
        </button>
        <button
          type="button"
          onClick={() => setMode('connect')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === 'connect'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Mode B: Connect Existing Repository
        </button>
      </div>

      {createdUrl ? (
        /* Successfully configured repository banner */
        <div className="p-6 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>GitHub Repository Configured Successfully</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 flex items-center justify-between">
            <span className="truncate">{createdUrl}</span>
            <a
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white flex items-center gap-1 pl-2"
            >
              View <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-xs text-slate-400">
            Local Git remote <strong className="text-slate-200">{remoteName}</strong> has been verified and configured.
          </p>
        </div>
      ) : mode === 'create' ? (
        /* Mode A: Create New Repository Form */
        <form onSubmit={handleCreate} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Repository Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              required
              pattern="[A-Za-z0-9_.-]+"
              placeholder="my-cool-project"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Letters, numbers, dashes, and underscores only.
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief summary of this project"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Visibility selection (Defaults to Private!) */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-2">
              Visibility (Security Policy)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  isPrivate
                    ? 'border-emerald-500 bg-emerald-950/20 text-slate-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="mt-1 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-100">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Private (Default)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Only you and collaborators can view this repository.
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  !isPrivate
                    ? 'border-emerald-500 bg-emerald-950/20 text-slate-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="mt-1 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-100">
                    <Globe className="w-3.5 h-3.5 text-sky-400" /> Public
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Visible to everyone on GitHub.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={<GitPullRequest className="w-4 h-4" />}
            >
              Create Repository on GitHub & Set Remote
            </Button>
          </div>
        </form>
      ) : (
        /* Mode B: Connect Existing Repository */
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Existing GitHub Repository URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={existingRepoUrl}
                  onChange={(e) => setExistingRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/my-existing-repo.git"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <Button type="submit" variant="primary" size="sm" loading={loading} disabled={!existingRepoUrl.trim()}>
                  Connect
                </Button>
              </div>
            </div>
          </form>

          {/* Quick select from user repositories */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">
                Or select from your existing GitHub repositories:
              </span>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Filter repos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-slate-800/80 bg-slate-950/60 p-1.5">
              {loadingRepos ? (
                <div className="text-xs text-slate-500 text-center py-4">Loading repositories from GitHub...</div>
              ) : filteredRepos.length > 0 ? (
                filteredRepos.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExistingRepoUrl(r.url)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-slate-200 group-hover:text-emerald-400 truncate">
                        {r.fullName}
                      </div>
                      {r.description && <div className="text-[11px] text-slate-500 truncate">{r.description}</div>}
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 ml-2">
                      {r.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">No repositories found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <Alert variant="error" title="Configuration Error">
          {errorMessage}
        </Alert>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!createdUrl}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to Manual Push
        </Button>
      </div>
    </div>
  );
};
