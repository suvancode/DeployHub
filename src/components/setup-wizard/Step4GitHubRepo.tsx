import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Lock,
  Globe,
  ExternalLink,
  CheckCircle2,
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
  const [repoName, setRepoName] = useState(defaultRepoName || inspection.folderName);
  const [isPrivate, setIsPrivate] = useState(true);
  const [description, setDescription] = useState('');
  const [remoteName] = useState('origin');
  const [existingRepoUrl, setExistingRepoUrl] = useState('');
  const [userRepos, setUserRepos] = useState<GitHubRepoItem[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
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

    if (url) setCreatedUrl(url);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!existingRepoUrl.trim()) return;

    const url = await onConnectRepo({
      repoUrl: existingRepoUrl.trim(),
      remoteName,
    });

    if (url) setCreatedUrl(url);
  };

  const filteredRepos = userRepos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 4: GitHub Repository Configuration</h3>
        <p className="text-[11px] text-devtoys-muted">
          Create a new repository or link an existing one. Repositories default to private.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-md bg-devtoys-card border border-devtoys-border p-0.5">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
            mode === 'create'
              ? 'bg-devtoys-sidebar text-devtoys-accent font-semibold'
              : 'text-devtoys-muted hover:text-devtoys-primary'
          }`}
        >
          Mode A: Create New Repository
        </button>
        <button
          type="button"
          onClick={() => setMode('connect')}
          className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
            mode === 'connect'
              ? 'bg-devtoys-sidebar text-devtoys-accent font-semibold'
              : 'text-devtoys-muted hover:text-devtoys-primary'
          }`}
        >
          Mode B: Connect Existing Repository
        </button>
      </div>

      {createdUrl ? (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
          <div className="flex items-center gap-2 text-devtoys-success font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>GitHub Repository Configured Successfully</span>
          </div>
          <div className="p-2 bg-devtoys-sidebar rounded border border-devtoys-border font-mono text-devtoys-accent text-xs truncate">
            {createdUrl}
          </div>
        </div>
      ) : mode === 'create' ? (
        <form onSubmit={handleCreate} className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div>
            <label className="text-[11px] text-devtoys-muted block mb-1">
              Repository Name <span className="text-devtoys-error">*</span>
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              required
              className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
            />
          </div>

          <div>
            <label className="text-[11px] text-devtoys-muted block mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
            />
          </div>

          <div>
            <label className="text-[11px] text-devtoys-muted block mb-1.5">Visibility</label>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="text-devtoys-accent focus:ring-devtoys-accent"
                />
                <span className="text-devtoys-primary flex items-center gap-1">
                  <Lock className="w-3 h-3 text-devtoys-accent" /> Private (Default)
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="text-devtoys-accent focus:ring-devtoys-accent"
                />
                <span className="text-devtoys-secondary flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Public
                </span>
              </label>
            </div>
          </div>

          <div className="pt-1">
            <Button type="submit" variant="primary" size="sm" loading={loading}>
              Create Repository on GitHub
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <form onSubmit={handleConnect} className="space-y-2">
            <label className="text-[11px] text-devtoys-muted block">Existing Repository URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={existingRepoUrl}
                onChange={(e) => setExistingRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git"
                className="flex-1 h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
              />
              <Button type="submit" variant="primary" size="sm" loading={loading} disabled={!existingRepoUrl.trim()}>
                Connect
              </Button>
            </div>
          </form>

          {/* User Repos List */}
          <div className="pt-2 border-t border-devtoys-border">
            <div className="text-[11px] text-devtoys-muted mb-1.5">Or choose from your repositories:</div>
            <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-devtoys-border bg-devtoys-sidebar p-1">
              {loadingRepos ? (
                <div className="text-devtoys-muted text-center py-2 text-[11px]">Loading repositories...</div>
              ) : filteredRepos.length > 0 ? (
                filteredRepos.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExistingRepoUrl(r.url)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-devtoys-card text-[11px] flex items-center justify-between text-devtoys-secondary hover:text-devtoys-primary"
                  >
                    <span className="font-mono truncate">{r.fullName}</span>
                    <span className="text-[10px] text-devtoys-muted">{r.isPrivate ? 'Private' : 'Public'}</span>
                  </button>
                ))
              ) : (
                <div className="text-devtoys-muted text-center py-2 text-[11px]">No repositories found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && <Alert variant="error" title="Error">{errorMessage}</Alert>}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!createdUrl}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Continue to Manual Push
        </Button>
      </div>
    </div>
  );
};
