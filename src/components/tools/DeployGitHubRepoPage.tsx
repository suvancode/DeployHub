import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Globe,
  Cloud,
  FileCode,
  Search,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Folder,
  FolderOpen,
  Lock,
  GitBranch,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ProjectRecord,
  GitHubAccountStatus,
  VercelStatus,
  NetlifyStatus,
  GitHubRepoItem,
  PipelineResult,
} from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';

interface DeployGitHubRepoPageProps {
  projects: ProjectRecord[];
  githubStatus?: GitHubAccountStatus | null;
  vercelStatus?: VercelStatus | null;
  netlifyStatus?: NetlifyStatus | null;
  onRefreshProjects: () => void;
  onSelectProject: (project: ProjectRecord) => void;
  onOpenUrl: (url: string) => void;
}

export const DeployGitHubRepoPage: React.FC<DeployGitHubRepoPageProps> = ({
  projects,
  githubStatus,
  vercelStatus,
  netlifyStatus,
  onRefreshProjects,
  onSelectProject,
  onOpenUrl,
}) => {
  // Input source mode
  const [sourceMode, setSourceMode] = useState<'my-repos' | 'custom-url'>('my-repos');
  const [userRepos, setUserRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');

  // Selected Repository Details
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [branchName, setBranchName] = useState('main');
  const [customSlug, setCustomSlug] = useState('');
  const [targetLocalPath, setTargetLocalPath] = useState('');

  // Target Platforms Selection (All 3 selected by default!)
  const [selectedPlatforms, setSelectedPlatforms] = useState<{
    vercel: boolean;
    netlify: boolean;
    githubPages: boolean;
  }>({
    vercel: true,
    netlify: true,
    githubPages: true,
  });

  // Execution state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string>('');
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployedProject, setDeployedProject] = useState<ProjectRecord | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load user's repositories on mount
  useEffect(() => {
    fetchUserRepos();
  }, []);

  const fetchUserRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await window.deployHubAPI.listGitHubRepos();
      if (res.success && res.data) {
        setUserRepos(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSelectRepo = (repo: GitHubRepoItem) => {
    setSelectedRepo(repo);
    setCustomRepoUrl(repo.url);
    setBranchName(repo.defaultBranch || 'main');
    const slug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setCustomSlug(slug);

    // Check if repo already exists locally in existing projects
    const existing = projects.find(
      (p) => p.repoUrl && p.repoUrl.toLowerCase().includes(repo.name.toLowerCase())
    );
    if (existing) {
      setTargetLocalPath(existing.path);
    } else {
      setTargetLocalPath('');
    }
    setDeployError(null);
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomRepoUrl(url);
    setSelectedRepo(null);
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
    if (match) {
      const name = match[2];
      const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      setCustomSlug(slug);

      const existing = projects.find(
        (p) => p.repoUrl && p.repoUrl.toLowerCase().includes(name.toLowerCase())
      );
      if (existing) {
        setTargetLocalPath(existing.path);
      }
    }
    setDeployError(null);
  };

  const togglePlatform = (p: 'vercel' | 'netlify' | 'githubPages') => {
    setSelectedPlatforms((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  const selectAllPlatforms = () => {
    setSelectedPlatforms({
      vercel: true,
      netlify: true,
      githubPages: true,
    });
  };

  const handleSelectFolder = async () => {
    const selected = await window.deployHubAPI.selectFolder();
    if (selected) {
      setTargetLocalPath(selected);
    }
  };

  const handleDeploy = async () => {
    const repoUrlToDeploy = selectedRepo ? selectedRepo.url : customRepoUrl.trim();
    if (!repoUrlToDeploy) {
      setDeployError('Please select or enter a GitHub repository URL.');
      return;
    }

    const targets: Array<'vercel' | 'netlify' | 'github-pages'> = [];
    if (selectedPlatforms.vercel) targets.push('vercel');
    if (selectedPlatforms.netlify) targets.push('netlify');
    if (selectedPlatforms.githubPages) targets.push('github-pages');

    if (targets.length === 0) {
      setDeployError('Please select at least one deployment platform (Vercel, Netlify, or GitHub Pages).');
      return;
    }

    setIsDeploying(true);
    setDeployError(null);
    setDeployStep('Initializing repository workspace...');

    try {
      setDeployStep('Cloning / syncing repository & running automated multi-deploy...');
      const res = await window.deployHubAPI.deployGitHubRepo({
        repoUrl: repoUrlToDeploy,
        targetPath: targetLocalPath || undefined,
        branchName: branchName || 'main',
        customSlug: customSlug || undefined,
        targets,
      });

      if (res.success && res.data) {
        setDeployedProject(res.data.project);
        setPipelineResult(res.data.pipeline);
        onRefreshProjects();
      } else {
        setDeployError(res.error?.why || res.error?.message || 'Deployment pipeline failed.');
      }
    } catch (err: unknown) {
      setDeployError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeploying(false);
      setDeployStep('');
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredRepos = userRepos.filter((r) => {
    const q = repoSearch.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q));
  });

  const activeRepoUrl = selectedRepo ? selectedRepo.url : customRepoUrl;
  const match = activeRepoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  const ownerName = match ? match[1] : githubStatus?.username || 'user';
  const repoName = match ? match[2] : selectedRepo?.name || 'project';
  const effectiveSlug = customSlug || repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const vercelPreview = `https://${effectiveSlug}.vercel.app`;
  const netlifyPreview = `https://${effectiveSlug}.netlify.app`;
  const ghPagesPreview = `https://${ownerName.toLowerCase()}.github.io/${repoName}/`;

  const allThreeSelected = selectedPlatforms.vercel && selectedPlatforms.netlify && selectedPlatforms.githubPages;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto text-xs">
      {/* Header Banner */}
      <div className="p-4 rounded-lg border border-devtoys-accent/30 bg-devtoys-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-devtoys-accent/15 border border-devtoys-accent/30 flex items-center justify-center text-devtoys-accent shrink-0">
              <Rocket className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-devtoys-primary">Deploy GitHub Repository Everywhere</h2>
          </div>
          <p className="text-[11px] text-devtoys-muted mt-1 leading-relaxed">
            Deploy any GitHub repository simultaneously to <strong>Vercel</strong>, <strong>Netlify</strong>, and <strong>GitHub Pages</strong> with shortest canonical URLs in one click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent" className="font-mono">Vercel + Netlify + GH Pages</Badge>
        </div>
      </div>

      {/* Success Banner & Live Results Grid */}
      {pipelineResult && deployedProject && (
        <div className="p-4 rounded-lg border border-devtoys-success/40 bg-devtoys-success/10 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-devtoys-success flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Repository Deployed Successfully!
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSelectProject(deployedProject)}
                icon={<Layers className="w-3.5 h-3.5" />}
              >
                Open in Project Workspace
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPipelineResult(null);
                  setDeployedProject(null);
                  setSelectedRepo(null);
                  setCustomRepoUrl('');
                }}
              >
                Deploy Another Repo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Vercel Result */}
            {pipelineResult.results?.vercel?.url && (
              <div className="p-3 rounded-md bg-devtoys-sidebar border border-devtoys-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                    <Globe className="w-3.5 h-3.5 text-devtoys-accent" /> Vercel
                  </span>
                  <Badge variant="success">Live</Badge>
                </div>
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => onOpenUrl(pipelineResult.results!.vercel!.url!)}
                    className="text-devtoys-accent hover:underline font-mono text-xs truncate text-left"
                    title={pipelineResult.results.vercel.url}
                  >
                    {pipelineResult.results.vercel.url}
                  </button>
                  <button
                    onClick={() => handleCopy(pipelineResult.results!.vercel!.url!)}
                    className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                    title="Copy URL"
                  >
                    {copiedUrl === pipelineResult.results.vercel.url ? (
                      <Check className="w-3.5 h-3.5 text-devtoys-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Netlify Result */}
            {pipelineResult.results?.netlify?.url && (
              <div className="p-3 rounded-md bg-devtoys-sidebar border border-devtoys-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                    <Cloud className="w-3.5 h-3.5 text-teal-400" /> Netlify
                  </span>
                  <Badge variant="success">Live</Badge>
                </div>
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => onOpenUrl(pipelineResult.results!.netlify!.url!)}
                    className="text-teal-400 hover:underline font-mono text-xs truncate text-left"
                    title={pipelineResult.results.netlify.url}
                  >
                    {pipelineResult.results.netlify.url}
                  </button>
                  <button
                    onClick={() => handleCopy(pipelineResult.results!.netlify!.url!)}
                    className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                    title="Copy URL"
                  >
                    {copiedUrl === pipelineResult.results.netlify.url ? (
                      <Check className="w-3.5 h-3.5 text-devtoys-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* GitHub Pages Result */}
            {pipelineResult.results?.githubPages?.url && (
              <div className="p-3 rounded-md bg-devtoys-sidebar border border-devtoys-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                    <FileCode className="w-3.5 h-3.5 text-devtoys-success" /> GitHub Pages
                  </span>
                  <Badge
                    variant={
                      pipelineResult.results.githubPages.isLive === false ? 'warning' : 'success'
                    }
                  >
                    {pipelineResult.results.githubPages.isLive === false ? 'Building (~1-2m)' : 'Live'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => onOpenUrl(pipelineResult.results!.githubPages!.url!)}
                    className="text-devtoys-success hover:underline font-mono text-xs truncate text-left"
                    title={pipelineResult.results.githubPages.url}
                  >
                    {pipelineResult.results.githubPages.url}
                  </button>
                  <button
                    onClick={() => handleCopy(pipelineResult.results!.githubPages!.url!)}
                    className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                    title="Copy URL"
                  >
                    {copiedUrl === pipelineResult.results.githubPages.url ? (
                      <Check className="w-3.5 h-3.5 text-devtoys-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Select Repository */}
      <div className="p-4 rounded-lg border border-devtoys-border bg-devtoys-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-devtoys-primary flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-devtoys-accent/20 text-devtoys-accent flex items-center justify-center font-bold text-[11px]">
              1
            </span>
            Choose GitHub Repository
          </span>

          {/* Toggle between My Repos vs URL */}
          <div className="flex rounded border border-devtoys-border bg-devtoys-sidebar p-0.5 text-xs">
            <button
              onClick={() => setSourceMode('my-repos')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sourceMode === 'my-repos'
                  ? 'bg-devtoys-card text-devtoys-primary font-medium'
                  : 'text-devtoys-muted hover:text-devtoys-secondary'
              }`}
            >
              My GitHub Repos ({userRepos.length})
            </button>
            <button
              onClick={() => setSourceMode('custom-url')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sourceMode === 'custom-url'
                  ? 'bg-devtoys-card text-devtoys-primary font-medium'
                  : 'text-devtoys-muted hover:text-devtoys-secondary'
              }`}
            >
              Paste GitHub URL
            </button>
          </div>
        </div>

        {sourceMode === 'my-repos' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-devtoys-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Filter repositories..."
                  className="w-full h-8 bg-devtoys-sidebar border border-devtoys-border rounded-md pl-8 pr-2.5 text-xs text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchUserRepos}
                loading={loadingRepos}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border border-devtoys-border bg-devtoys-sidebar/40 divide-y divide-devtoys-border/60">
              {filteredRepos.length > 0 ? (
                filteredRepos.map((repo) => {
                  const isSelected = selectedRepo?.name === repo.name;
                  return (
                    <div
                      key={repo.name}
                      onClick={() => handleSelectRepo(repo)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-devtoys-accent/15 border-l-2 border-devtoys-accent'
                          : 'hover:bg-devtoys-card/60'
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-devtoys-primary font-mono">{repo.name}</span>
                          {repo.isPrivate ? (
                            <Badge variant="warning" className="text-[10px] flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Private
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">Public</Badge>
                          )}
                          <span className="text-[11px] text-devtoys-muted font-mono">({repo.defaultBranch || 'main'})</span>
                        </div>
                        {repo.description && (
                          <div className="text-[11px] text-devtoys-muted truncate">{repo.description}</div>
                        )}
                      </div>
                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRepo(repo);
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-devtoys-muted">
                  {loadingRepos ? 'Loading GitHub repositories...' : 'No repositories found.'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={customRepoUrl}
              onChange={(e) => handleCustomUrlChange(e.target.value)}
              placeholder="https://github.com/suvancode/my-awesome-repo"
              className="w-full h-8 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
            />
            <span className="text-[11px] text-devtoys-muted">
              Enter any public or authenticated GitHub repository URL.
            </span>
          </div>
        )}

        {/* Selected Repo Card */}
        {activeRepoUrl && (
          <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-accent/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <GitBranch className="w-4 h-4 text-devtoys-accent shrink-0" />
              <span className="text-devtoys-muted">Active Repo:</span>
              <span className="font-mono text-devtoys-primary font-semibold truncate">{activeRepoUrl}</span>
            </div>
            <span className="font-mono text-devtoys-accent shrink-0 font-medium">Branch: {branchName}</span>
          </div>
        )}
      </div>

      {/* Step 2: Choose Platforms & Shortest Domains */}
      <div className="p-4 rounded-lg border border-devtoys-border bg-devtoys-card space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-devtoys-primary flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-devtoys-accent/20 text-devtoys-accent flex items-center justify-center font-bold text-[11px]">
              2
            </span>
            Target Platforms (Deploy Everywhere)
          </span>

          <button
            type="button"
            onClick={selectAllPlatforms}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-devtoys-accent/15 text-devtoys-accent hover:bg-devtoys-accent/25 border border-devtoys-accent/30 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {allThreeSelected ? 'All 3 Selected' : 'Select All 3 Platforms'}
          </button>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Vercel Option */}
          <div
            onClick={() => togglePlatform('vercel')}
            className={`p-3 rounded-md border cursor-pointer transition-all ${
              selectedPlatforms.vercel
                ? 'border-devtoys-accent bg-devtoys-accent/10'
                : 'border-devtoys-border bg-devtoys-sidebar/40 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                <Globe className="w-4 h-4 text-devtoys-accent" /> Vercel
              </span>
              <input
                type="checkbox"
                checked={selectedPlatforms.vercel}
                onChange={() => togglePlatform('vercel')}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
              />
            </div>
            <div className="text-[11px] font-mono text-devtoys-accent truncate pt-2 font-medium">
              {vercelPreview}
            </div>
            <div className="text-[10px] text-devtoys-muted pt-0.5">Shortest edge cloud hosting</div>
          </div>

          {/* Netlify Option */}
          <div
            onClick={() => togglePlatform('netlify')}
            className={`p-3 rounded-md border cursor-pointer transition-all ${
              selectedPlatforms.netlify
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-devtoys-border bg-devtoys-sidebar/40 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                <Cloud className="w-4 h-4 text-teal-400" /> Netlify
              </span>
              <input
                type="checkbox"
                checked={selectedPlatforms.netlify}
                onChange={() => togglePlatform('netlify')}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-devtoys-border bg-devtoys-sidebar text-teal-400 focus:ring-0"
              />
            </div>
            <div className="text-[11px] font-mono text-teal-400 truncate pt-2 font-medium">
              {netlifyPreview}
            </div>
            <div className="text-[10px] text-devtoys-muted pt-0.5">High-speed global CDN</div>
          </div>

          {/* GitHub Pages Option */}
          <div
            onClick={() => togglePlatform('githubPages')}
            className={`p-3 rounded-md border cursor-pointer transition-all ${
              selectedPlatforms.githubPages
                ? 'border-devtoys-success bg-devtoys-success/10'
                : 'border-devtoys-border bg-devtoys-sidebar/40 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                <FileCode className="w-4 h-4 text-devtoys-success" /> GitHub Pages
              </span>
              <input
                type="checkbox"
                checked={selectedPlatforms.githubPages}
                onChange={() => togglePlatform('githubPages')}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-success focus:ring-0"
              />
            </div>
            <div className="text-[11px] font-mono text-devtoys-success truncate pt-2 font-medium">
              {ghPagesPreview}
            </div>
            <div className="text-[10px] text-devtoys-muted pt-0.5">Direct repository branch static hosting</div>
          </div>
        </div>

        {/* Slug Customizer */}
        <div className="p-3 rounded-md bg-devtoys-sidebar border border-devtoys-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-devtoys-primary font-semibold flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-devtoys-accent" />
              Customize Subdomain Slug
            </span>
            <input
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={repoName || 'my-project'}
              className="h-7 w-48 bg-devtoys-card border border-devtoys-border rounded px-2 text-xs font-mono text-devtoys-accent focus:outline-none focus:border-devtoys-accent"
            />
          </div>
        </div>

        {/* Local Folder Location */}
        <div className="p-3 rounded-md bg-devtoys-sidebar border border-devtoys-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-devtoys-primary font-semibold flex items-center gap-1.5 text-xs">
              <Folder className="w-3.5 h-3.5 text-devtoys-muted" />
              Local Directory Path
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={handleSelectFolder}
              icon={<FolderOpen className="w-3 h-3" />}
            >
              Browse Folder...
            </Button>
          </div>
          <input
            type="text"
            value={targetLocalPath}
            onChange={(e) => setTargetLocalPath(e.target.value)}
            placeholder="Auto-detected or cloned automatically into workspace"
            className="w-full h-7 bg-devtoys-card border border-devtoys-border rounded px-2 text-xs font-mono text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
          />
        </div>
      </div>

      {/* Error Alert */}
      {deployError && (
        <Alert variant="error" title="Deployment Notice">
          {deployError}
        </Alert>
      )}

      {/* Step 3: Launch Multi-Deploy Action */}
      <div className="p-4 rounded-lg border-2 border-devtoys-accent bg-devtoys-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-sm text-devtoys-primary flex items-center gap-2">
              <Rocket className="w-4 h-4 text-devtoys-accent" />
              Launch Triple-Platform Deployment
            </div>
            <p className="text-[11px] text-devtoys-muted mt-0.5">
              Will clone/sync your repo, push commits, and deploy live to Vercel, Netlify & GitHub Pages simultaneously.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleDeploy}
            loading={isDeploying}
            disabled={!activeRepoUrl || isDeploying}
            icon={<Rocket className="w-4 h-4" />}
            className="px-6 py-2.5 font-bold shadow-md"
          >
            {isDeploying
              ? 'Deploying Everywhere...'
              : allThreeSelected
              ? '🚀 Deploy to All 3 (Vercel + Netlify + GH Pages)'
              : '🚀 Deploy to Selected Platforms'}
          </Button>
        </div>

        {isDeploying && (
          <div className="p-3 rounded bg-devtoys-sidebar border border-devtoys-accent/30 text-xs text-devtoys-accent flex items-center gap-2 animate-pulse font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{deployStep || 'Automating build and multi-cloud deployment...'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
