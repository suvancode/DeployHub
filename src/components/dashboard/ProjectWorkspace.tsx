import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Folder,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  Globe,
  ShieldCheck,
  RotateCw,
  FolderGit2,
  AlertTriangle,
  UploadCloud,
  Rocket,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Cloud,
  FileCode,
  Sparkles,
  Layers,
  RefreshCw,
  Info,
  Loader2,
} from 'lucide-react';
import {
  ProjectRecord,
  GitHubAccountStatus,
  VercelStatus,
  NetlifyStatus,
  PipelineResult,
  GitHubPagesStatus,
} from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface ProjectWorkspaceProps {
  project: ProjectRecord;
  githubStatus?: GitHubAccountStatus | null;
  vercelStatus?: VercelStatus | null;
  netlifyStatus?: NetlifyStatus | null;
  onRefreshStatuses?: () => void;
  onBack: () => void;
  onOpenFolder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onOpenUrl: (url: string) => void;
  onReconfigure: (project: ProjectRecord) => void;
  onSaveProject?: (project: ProjectRecord) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  githubStatus,
  vercelStatus,
  netlifyStatus,
  onRefreshStatuses,
  onBack,
  onOpenFolder,
  onOpenTerminal,
  onOpenUrl,
  onReconfigure,
  onSaveProject,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'git' | 'github' | 'vercel' | 'netlify' | 'gh-pages'>('overview');
  const [copied, setCopied] = useState(false);

  // Shortest domain custom slug
  const initialSlug =
    project.customSlug ||
    project.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'app';
  const [customSlug, setCustomSlug] = useState(initialSlug);

  // Multi-platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<{
    vercel: boolean;
    netlify: boolean;
    githubPages: boolean;
  }>({
    vercel: true,
    netlify: true,
    githubPages: false,
  });

  // Automation states
  const [isPushing, setIsPushing] = useState(false);
  const [isDeployingVercel, setIsDeployingVercel] = useState(false);
  const [isDeployingNetlify, setIsDeployingNetlify] = useState(false);
  const [isDeployingGhPages, setIsDeployingGhPages] = useState(false);
  const [isCheckingGhPages, setIsCheckingGhPages] = useState(false);
  const [ghPagesStatus, setGhPagesStatus] = useState<GitHubPagesStatus | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [isProduction, setIsProduction] = useState(true);

  // Status feedback
  const [pushStatus, setPushStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [deployFeedback, setDeployFeedback] = useState<{
    platform: string;
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const pushCommand = project.branchName
    ? `git push -u ${project.remoteName || 'origin'} ${project.branchName}`
    : 'git push';

  // Helper to extract repo name from repoUrl
  const repoName = project.repoUrl
    ? project.repoUrl.replace(/https:\/\/github\.com\/[^/]+\//, '').replace(/\.git$/, '')
    : project.name;
  const ownerName = project.githubUser || githubStatus?.username || 'user';

  // Shortest URLs preview
  const vercelShortUrl = `https://${customSlug || 'app'}.vercel.app`;
  const netlifyShortUrl = `https://${customSlug || 'app'}.netlify.app`;
  const ghPagesShortUrl = `https://${ownerName.toLowerCase()}.github.io/${repoName}/`;

  const togglePlatform = (p: 'vercel' | 'netlify' | 'githubPages') => {
    setSelectedPlatforms((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  // Fetch GitHub Pages status on mount or project change
  useEffect(() => {
    let isMounted = true;
    window.deployHubAPI
      .checkGhPagesStatus(project.path)
      .then((status) => {
        if (isMounted) setGhPagesStatus(status);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [project.path]);

  // Background polling for GitHub Pages when building/propagating
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (ghPagesStatus?.enabled && !ghPagesStatus?.isLive) {
      timer = setTimeout(async () => {
        try {
          const updated = await window.deployHubAPI.checkGhPagesStatus(project.path);
          setGhPagesStatus(updated);
        } catch {
          // ignore
        }
      }, 6000);
    }
    return () => clearTimeout(timer);
  }, [ghPagesStatus, project.path]);

  const handleRefreshGhPagesStatus = async () => {
    setIsCheckingGhPages(true);
    try {
      const updated = await window.deployHubAPI.checkGhPagesStatus(project.path);
      setGhPagesStatus(updated);
    } catch {
      // ignore
    } finally {
      setIsCheckingGhPages(false);
    }
  };

  // 1. Push code to GitHub
  const handlePush = async () => {
    setIsPushing(true);
    setPushStatus(null);
    try {
      const res = await window.deployHubAPI.pushRepo(
        project.path,
        project.remoteName || 'origin',
        project.branchName || 'main'
      );
      if (res.success) {
        setPushStatus({
          success: true,
          message: res.data?.autoFixed && res.data.fixedUrl
            ? `Remote URL auto-corrected to "${res.data.fixedUrl}" and code pushed successfully!`
            : `Code pushed successfully to ${project.remoteName || 'origin'}/${project.branchName || 'main'}!`,
        });
      } else {
        const diag = res.error?.diagnosis;
        setPushStatus({
          success: false,
          message: diag ? `${diag.title}: ${diag.whatIsError} ${diag.suggestion}` : res.error?.why || res.error?.message || 'Git push rejected by remote.',
        });
      }
    } catch (e: unknown) {
      setPushStatus({ success: false, message: String(e) });
    } finally {
      setIsPushing(false);
    }
  };

  // 2. Deploy to Vercel (standalone)
  const handleDeployVercel = async () => {
    setIsDeployingVercel(true);
    setDeployFeedback(null);
    try {
      const res = await window.deployHubAPI.deployVercel(project.path, isProduction, customSlug);
      if (res.success && res.data) {
        const liveUrl = res.data.url;
        setDeployFeedback({
          platform: 'Vercel',
          success: true,
          message: `Live on Vercel: ${liveUrl}`,
          url: liveUrl,
        });

        if (onSaveProject) {
          onSaveProject({
            ...project,
            customSlug,
            vercelProductionUrl: liveUrl,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setDeployFeedback({
          platform: 'Vercel',
          success: false,
          message: res.error?.why || res.error?.message || 'Vercel deployment failed.',
        });
      }
    } catch (e: unknown) {
      setDeployFeedback({
        platform: 'Vercel',
        success: false,
        message: String(e),
      });
    } finally {
      setIsDeployingVercel(false);
    }
  };

  // 3. Deploy to Netlify (standalone)
  const handleDeployNetlify = async () => {
    if (!netlifyStatus?.authenticated) {
      setDeployFeedback({
        platform: 'Netlify',
        success: false,
        message: 'You are not logged in to Netlify. Please click "Netlify: Login" in the top header or settings to authenticate with your account before deploying.',
      });
      return;
    }

    setIsDeployingNetlify(true);
    setDeployFeedback(null);
    try {
      const res = await window.deployHubAPI.deployNetlify(project.path, customSlug, isProduction);
      if (res.success && res.data) {
        const liveUrl = res.data.url;
        setDeployFeedback({
          platform: 'Netlify',
          success: true,
          message: `Live on Netlify: ${liveUrl}`,
          url: liveUrl,
        });

        if (onSaveProject) {
          onSaveProject({
            ...project,
            customSlug,
            netlifySiteName: customSlug,
            netlifyProductionUrl: liveUrl,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setDeployFeedback({
          platform: 'Netlify',
          success: false,
          message: res.error?.why || res.error?.message || 'Netlify deployment failed.',
        });
      }
    } catch (e: unknown) {
      setDeployFeedback({
        platform: 'Netlify',
        success: false,
        message: String(e),
      });
    } finally {
      setIsDeployingNetlify(false);
    }
  };

  // 4. Deploy to GitHub Pages (standalone)
  const handleDeployGhPages = async () => {
    setIsDeployingGhPages(true);
    setDeployFeedback(null);
    try {
      const res = await window.deployHubAPI.deployGhPages(project.path, project.branchName || 'main');
      if (res.success && res.data) {
        const liveUrl = res.data.url;
        const isLive = res.data.isLive;
        setDeployFeedback({
          platform: 'GitHub Pages',
          success: true,
          message: res.data.message || (isLive ? `GitHub Pages is live: ${liveUrl}` : `GitHub Pages enabled: ${liveUrl} (Building ~1-2 min)`),
          url: liveUrl,
        });

        if (onSaveProject) {
          onSaveProject({
            ...project,
            githubPagesUrl: liveUrl,
            updatedAt: new Date().toISOString(),
          });
        }

        // Refresh live status
        try {
          const updated = await window.deployHubAPI.checkGhPagesStatus(project.path);
          setGhPagesStatus(updated);
        } catch {
          // ignore
        }
      } else {
        setDeployFeedback({
          platform: 'GitHub Pages',
          success: false,
          message: res.error?.why || res.error?.message || 'GitHub Pages configuration failed.',
        });
      }
    } catch (e: unknown) {
      setDeployFeedback({
        platform: 'GitHub Pages',
        success: false,
        message: String(e),
      });
    } finally {
      setIsDeployingGhPages(false);
    }
  };

  // 5. Unified Automated Pipeline: Push & Deploy to All Selected Targets
  const handlePushAndDeploy = async () => {
    const targets: Array<'vercel' | 'netlify' | 'github-pages'> = [];
    if (selectedPlatforms.vercel) targets.push('vercel');
    if (selectedPlatforms.netlify) targets.push('netlify');
    if (selectedPlatforms.githubPages) targets.push('github-pages');

    if (targets.length === 0) {
      setPipelineError('Please select at least one deployment platform (Vercel, Netlify, or GitHub Pages).');
      return;
    }

    if (targets.includes('netlify') && !netlifyStatus?.authenticated) {
      setPipelineError('Netlify is selected for deployment, but you are not logged in. Please click "Netlify: Login" in the header to authenticate with your account, or uncheck Netlify.');
      return;
    }

    setIsPipelineRunning(true);
    setPipelineError(null);
    setPipelineResult(null);
    setDeployFeedback(null);
    setPushStatus(null);

    try {
      const res = await window.deployHubAPI.pushAndDeploy(
        project.path,
        project.remoteName || 'origin',
        project.branchName || 'main',
        isProduction,
        customSlug,
        targets
      );

      if (res.success && res.data) {
        setPipelineResult(res.data);

        // Update stored URLs in project record
        const updated: ProjectRecord = {
          ...project,
          customSlug,
          updatedAt: new Date().toISOString(),
        };

        if (res.data.results?.vercel?.url) {
          updated.vercelProductionUrl = res.data.results.vercel.url;
        }
        if (res.data.results?.netlify?.url) {
          updated.netlifyProductionUrl = res.data.results.netlify.url;
          updated.netlifySiteName = customSlug;
        }
        if (res.data.results?.githubPages?.url) {
          updated.githubPagesUrl = res.data.results.githubPages.url;
        }

        if (onSaveProject) {
          onSaveProject(updated);
        }
      } else {
        setPipelineError(res.error?.why || res.error?.message || 'Automation pipeline encountered an error.');
        if (res.data) setPipelineResult(res.data);
      }
    } catch (e: unknown) {
      setPipelineError(String(e));
    } finally {
      setIsPipelineRunning(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSwitchGitHubUser = async (user: string) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.switchGitHubAccount(user);
      if (onRefreshStatuses) onRefreshStatuses();
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto text-xs">
      {/* Top Header: Back + Name + Actions Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-devtoys-border pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back
          </Button>

          <div className="w-7 h-7 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-center text-devtoys-accent shrink-0">
            <FolderGit2 className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-devtoys-primary truncate">{project.name}</h2>
              <Badge variant={project.setupStatus === 'completed' ? 'success' : 'warning'}>
                {project.setupStatus === 'completed' ? 'Configured' : 'Setup Incomplete'}
              </Badge>
            </div>
            <div className="text-[11px] text-devtoys-muted font-mono truncate" title={project.path}>
              {project.path}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenFolder(project.path)}
            icon={<Folder className="w-3.5 h-3.5" />}
          >
            Folder
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenTerminal(project.path)}
            icon={<Terminal className="w-3.5 h-3.5" />}
          >
            Terminal
          </Button>

          {project.repoUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenUrl(project.repoUrl!)}
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              GitHub
            </Button>
          )}

          {project.vercelProductionUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenUrl(project.vercelProductionUrl!)}
              icon={<Globe className="w-3.5 h-3.5" />}
            >
              Vercel
            </Button>
          )}

          {project.netlifyProductionUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenUrl(project.netlifyProductionUrl!)}
              icon={<Cloud className="w-3.5 h-3.5 text-teal-400" />}
            >
              Netlify
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onReconfigure(project)}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Reconfigure
          </Button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-devtoys-border gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: '⚡ Automation & Deployment Hub' },
          { id: 'git', label: 'Local Git' },
          { id: 'github', label: 'GitHub Repository' },
          { id: 'vercel', label: 'Vercel' },
          { id: 'netlify', label: 'Netlify' },
          { id: 'gh-pages', label: 'GitHub Pages' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === tab.id
                ? 'border-devtoys-accent text-devtoys-primary'
                : 'border-transparent text-devtoys-muted hover:text-devtoys-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & Automated Multi-Deploy Center */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* AUTOMATED MULTI-DEPLOYMENT HUB CARD */}
          <div className="p-4 rounded-lg border border-devtoys-accent/30 bg-devtoys-card shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-devtoys-border/60 pb-3">
              <div>
                <span className="font-bold text-devtoys-primary flex items-center gap-2 text-xs">
                  <Rocket className="w-4 h-4 text-devtoys-accent" />
                  Automated Multi-Platform Deployment Center
                </span>
                <p className="text-[11px] text-devtoys-muted mt-0.5">
                  Automate push to GitHub and deploy live to Vercel, Netlify, and GitHub Pages with shortest canonical domains.
                </p>
              </div>

              {/* Multi-Account Indicator Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {githubStatus?.authenticated && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px]">
                    <ShieldCheck className="w-3 h-3 text-devtoys-success shrink-0" />
                    <span className="text-devtoys-muted">GH:</span>
                    {githubStatus.accounts && githubStatus.accounts.length > 1 ? (
                      <select
                        value={githubStatus.username}
                        onChange={(e) => handleSwitchGitHubUser(e.target.value)}
                        className="bg-transparent text-devtoys-primary font-mono text-[11px] focus:outline-none cursor-pointer"
                        title="Switch GitHub account"
                      >
                        {githubStatus.accounts.map((acc) => (
                          <option key={acc} value={acc} className="bg-devtoys-card">
                            @{acc}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-mono text-devtoys-primary">@{githubStatus.username}</span>
                    )}
                  </div>
                )}

                {vercelStatus?.authenticated && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px]">
                    <Globe className="w-3 h-3 text-devtoys-accent shrink-0" />
                    <span className="text-devtoys-muted">Vercel:</span>
                    <span className="font-mono text-devtoys-primary">{vercelStatus.username}</span>
                  </div>
                )}

                {netlifyStatus?.authenticated && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px]">
                    <Cloud className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-devtoys-muted">Netlify:</span>
                    <span className="font-mono text-devtoys-primary">{netlifyStatus.username || 'Logged in'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: SHORTEST DOMAIN SLUG CUSTOMIZER */}
            <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-sidebar space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-devtoys-accent" />
                    Shortest Domain Slug / Custom Subdomain
                  </span>
                  <p className="text-[11px] text-devtoys-muted">
                    Customize your subdomain slug to get the shortest possible live URLs on all platforms.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-devtoys-muted font-mono">Slug:</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-short-app"
                    className="h-7 w-40 bg-devtoys-card border border-devtoys-border rounded px-2 text-xs font-mono text-devtoys-accent focus:outline-none focus:border-devtoys-accent"
                  />
                </div>
              </div>

              {/* Real-time Shortest Domain Previews */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-devtoys-border/60 text-[11px]">
                <div className="p-2 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-between">
                  <span className="text-devtoys-muted flex items-center gap-1">
                    <Globe className="w-3 h-3 text-devtoys-accent" /> Vercel Preview:
                  </span>
                  <span className="font-mono text-devtoys-accent truncate font-medium">{vercelShortUrl}</span>
                </div>

                <div className="p-2 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-between">
                  <span className="text-devtoys-muted flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-teal-400" /> Netlify Preview:
                  </span>
                  <span className="font-mono text-teal-400 truncate font-medium">{netlifyShortUrl}</span>
                </div>

                <div className="p-2 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-between">
                  <span className="text-devtoys-muted flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-devtoys-success" /> GH Pages Preview:
                  </span>
                  <span className="font-mono text-devtoys-success truncate font-medium">{ghPagesShortUrl}</span>
                </div>
              </div>
            </div>

            {/* PLATFORM SELECTION CHECKBOXES */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-devtoys-sidebar/60 p-2.5 rounded-md border border-devtoys-border/60">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-devtoys-primary">Target Platforms:</span>

                <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.vercel}
                    onChange={() => togglePlatform('vercel')}
                    className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                  />
                  <Globe className="w-3.5 h-3.5 text-devtoys-accent" />
                  <span>Vercel</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.netlify}
                    onChange={() => togglePlatform('netlify')}
                    className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                  />
                  <Cloud className="w-3.5 h-3.5 text-teal-400" />
                  <span>Netlify</span>
                  {!netlifyStatus?.authenticated && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1 rounded ml-0.5">
                      (Login required)
                    </span>
                  )}
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.githubPages}
                    onChange={() => togglePlatform('githubPages')}
                    className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                  />
                  <FileCode className="w-3.5 h-3.5 text-devtoys-success" />
                  <span>GitHub Pages</span>
                </label>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={isProduction}
                  onChange={(e) => setIsProduction(e.target.checked)}
                  className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                />
                <span>Production Mode (<code>--prod</code>)</span>
              </label>
            </div>

            {/* PRIMARY AUTOMATION ACTION BAR */}
            <div className="space-y-2">
              {/* THE BIG ALL-IN-ONE BUTTON */}
              <button
                type="button"
                onClick={handlePushAndDeploy}
                disabled={isPipelineRunning || isPushing || isDeployingVercel || isDeployingNetlify || isDeployingGhPages}
                className="w-full p-3.5 rounded-lg border-2 border-devtoys-accent bg-devtoys-accent/15 hover:bg-devtoys-accent/25 transition-all text-left disabled:opacity-50 group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-devtoys-accent/20 border border-devtoys-accent/40 flex items-center justify-center text-devtoys-accent group-hover:scale-110 transition-transform">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-devtoys-primary">
                      {isPipelineRunning ? 'Running Automation Pipeline...' : '🚀 Push & Deploy to Selected Platforms at Once'}
                    </div>
                    <div className="text-[11px] text-devtoys-secondary">
                      Automated pipeline: Git Push to GitHub &rarr; Live build & publish on{' '}
                      {[
                        selectedPlatforms.vercel && 'Vercel',
                        selectedPlatforms.netlify && 'Netlify',
                        selectedPlatforms.githubPages && 'GitHub Pages',
                      ]
                        .filter(Boolean)
                        .join(' + ') || 'selected targets'}{' '}
                      with shortest URLs!
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold text-devtoys-accent shrink-0 hidden sm:block">
                  {isPipelineRunning ? 'Deploying...' : 'One-Click Deploy ⚡'}
                </div>
              </button>

              {/* INDIVIDUAL QUICK ACTIONS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePush}
                  loading={isPushing}
                  disabled={isPipelineRunning}
                  icon={<UploadCloud className="w-3.5 h-3.5" />}
                >
                  Push to GitHub
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDeployVercel}
                  loading={isDeployingVercel}
                  disabled={isPipelineRunning}
                  icon={<Globe className="w-3.5 h-3.5" />}
                >
                  Deploy Vercel
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDeployNetlify}
                  loading={isDeployingNetlify}
                  disabled={isPipelineRunning}
                  icon={<Cloud className="w-3.5 h-3.5 text-teal-400" />}
                >
                  Deploy Netlify
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDeployGhPages}
                  loading={isDeployingGhPages}
                  disabled={isPipelineRunning}
                  icon={<FileCode className="w-3.5 h-3.5 text-devtoys-success" />}
                >
                  Deploy GH Pages
                </Button>
              </div>
            </div>

            {/* PIPELINE LIVE RESULTS & SHORT DOMAINS BANNER */}
            {pipelineResult && (
              <div className="p-3.5 rounded-lg border border-devtoys-success/40 bg-devtoys-success/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-devtoys-success flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Automation Pipeline Succeeded!
                  </span>
                  <span className="text-[11px] text-devtoys-muted">Code pushed & sites live</span>
                </div>

                {/* Grid of Shortest Deployed URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Vercel Result */}
                  {pipelineResult.results?.vercel && (
                    <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-devtoys-primary flex items-center gap-1">
                          <Globe className="w-3 h-3 text-devtoys-accent" /> Vercel
                        </span>
                        <Badge variant={pipelineResult.results.vercel.success ? 'success' : 'error'}>
                          {pipelineResult.results.vercel.success ? 'Live' : 'Failed'}
                        </Badge>
                      </div>
                      {pipelineResult.results.vercel.url ? (
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            onClick={() => onOpenUrl(pipelineResult.results!.vercel!.url!)}
                            className="text-devtoys-accent hover:underline font-mono text-[11px] truncate text-left"
                            title={pipelineResult.results.vercel.url}
                          >
                            {pipelineResult.results.vercel.url}
                          </button>
                          <button
                            onClick={() => handleCopy(pipelineResult.results!.vercel!.url!)}
                            className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                            title="Copy URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-devtoys-error truncate">
                          {pipelineResult.results.vercel.error}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Netlify Result */}
                  {pipelineResult.results?.netlify && (
                    <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-devtoys-primary flex items-center gap-1">
                          <Cloud className="w-3 h-3 text-teal-400" /> Netlify
                        </span>
                        <Badge variant={pipelineResult.results.netlify.success ? 'success' : 'error'}>
                          {pipelineResult.results.netlify.success ? 'Live' : 'Failed'}
                        </Badge>
                      </div>
                      {pipelineResult.results.netlify.url ? (
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            onClick={() => onOpenUrl(pipelineResult.results!.netlify!.url!)}
                            className="text-teal-400 hover:underline font-mono text-[11px] truncate text-left"
                            title={pipelineResult.results.netlify.url}
                          >
                            {pipelineResult.results.netlify.url}
                          </button>
                          <button
                            onClick={() => handleCopy(pipelineResult.results!.netlify!.url!)}
                            className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                            title="Copy URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-devtoys-error truncate">
                          {pipelineResult.results.netlify.error}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GitHub Pages Result */}
                  {pipelineResult.results?.githubPages && (
                    <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-border space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-devtoys-primary flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-devtoys-success" /> GitHub Pages
                        </span>
                        <Badge
                          variant={
                            pipelineResult.results.githubPages.success
                              ? pipelineResult.results.githubPages.isLive === false
                                ? 'warning'
                                : 'success'
                              : 'error'
                          }
                        >
                          {pipelineResult.results.githubPages.success
                            ? pipelineResult.results.githubPages.isLive === false
                              ? 'Building (~1-2m)'
                              : 'Live'
                            : 'Failed'}
                        </Badge>
                      </div>
                      {pipelineResult.results.githubPages.url ? (
                        <>
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <button
                              onClick={() => onOpenUrl(pipelineResult.results!.githubPages!.url!)}
                              className="text-devtoys-success hover:underline font-mono text-[11px] truncate text-left"
                              title={pipelineResult.results.githubPages.url}
                            >
                              {pipelineResult.results.githubPages.url}
                            </button>
                            <button
                              onClick={() => handleCopy(pipelineResult.results!.githubPages!.url!)}
                              className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                              title="Copy URL"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {pipelineResult.results.githubPages.isLive === false && (
                            <div className="text-[10px] text-amber-400 font-sans pt-0.5 leading-snug">
                              Initial build in progress (~1-2m). Fastly CDN propagating.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[10px] text-devtoys-error truncate">
                          {pipelineResult.results.githubPages.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {pipelineError && (
              <div className="p-3 rounded-md border border-devtoys-error/40 bg-devtoys-error/10 text-devtoys-error flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Automation Pipeline Notice:</div>
                  <div className="text-[11px] mt-0.5">{pipelineError}</div>
                </div>
              </div>
            )}

            {deployFeedback && (
              <div
                className={`p-3 rounded-md border text-xs space-y-1 ${
                  deployFeedback.success
                    ? 'border-devtoys-success/40 bg-devtoys-success/10 text-devtoys-success'
                    : 'border-devtoys-error/40 bg-devtoys-error/10 text-devtoys-error'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    {deployFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {deployFeedback.message}
                  </span>
                  {deployFeedback.url && (
                    <button
                      onClick={() => onOpenUrl(deployFeedback.url!)}
                      className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>Open Site</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {pushStatus && (
              <div
                className={`p-2.5 rounded text-[11px] border ${
                  pushStatus.success
                    ? 'border-devtoys-success/30 bg-devtoys-success/10 text-devtoys-success'
                    : 'border-devtoys-error/30 bg-devtoys-error/10 text-devtoys-error'
                }`}
              >
                {pushStatus.message}
              </div>
            )}
          </div>

          {/* Properties Grid with All Live URLs */}
          <div className="border border-devtoys-border rounded-md bg-devtoys-card divide-y divide-devtoys-border/60">
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Local Directory</span>
              <span className="font-mono text-devtoys-primary truncate max-w-md">{project.path}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Active Branch</span>
              <span className="font-mono text-devtoys-primary font-medium">{project.branchName || 'main'}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Remote Name</span>
              <span className="font-mono text-devtoys-primary">{project.remoteName || 'origin'}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">GitHub Repository</span>
              {project.repoUrl ? (
                <button
                  onClick={() => onOpenUrl(project.repoUrl!)}
                  className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono"
                >
                  <span>{project.repoUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">Not connected</span>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Shortest Vercel URL</span>
              {project.vercelProductionUrl ? (
                <button
                  onClick={() => onOpenUrl(project.vercelProductionUrl!)}
                  className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono font-medium"
                >
                  <span>{project.vercelProductionUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">Not deployed yet ({vercelShortUrl})</span>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">Shortest Netlify URL</span>
              {project.netlifyProductionUrl ? (
                <button
                  onClick={() => onOpenUrl(project.netlifyProductionUrl!)}
                  className="text-teal-400 hover:underline flex items-center gap-1 font-mono font-medium"
                >
                  <span>{project.netlifyProductionUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">Not deployed yet ({netlifyShortUrl})</span>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-devtoys-muted">GitHub Pages URL</span>
              {project.githubPagesUrl ? (
                <div className="flex items-center gap-2">
                  {ghPagesStatus?.enabled && (
                    <Badge variant={ghPagesStatus.isLive ? 'success' : 'warning'}>
                      {ghPagesStatus.isLive ? 'Live' : 'Building (~1-2m)'}
                    </Badge>
                  )}
                  <button
                    onClick={() => onOpenUrl(project.githubPagesUrl!)}
                    className="text-devtoys-success hover:underline flex items-center gap-1 font-mono font-medium"
                  >
                    <span>{project.githubPagesUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-devtoys-muted italic">Not deployed yet ({ghPagesShortUrl})</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Local Git */}
      {activeTab === 'git' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <GitBranch className="w-4 h-4 text-devtoys-accent" />
            <span>Local Git Configuration</span>
          </div>

          <div className="space-y-2 text-devtoys-secondary">
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Configured Branch:</span>
              <span className="font-mono text-devtoys-primary">{project.branchName || 'main'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Remote:</span>
              <span className="font-mono text-devtoys-primary">{project.remoteName || 'origin'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-devtoys-muted">Push Tracking:</span>
              <span className="text-devtoys-success font-medium">Upstream configured</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePush}
              loading={isPushing}
              icon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Push to Remote
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenTerminal(project.path)}
              icon={<Terminal className="w-3.5 h-3.5" />}
            >
              Terminal
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: GitHub */}
      {activeTab === 'github' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-devtoys-success" />
            <span>GitHub Integration</span>
          </div>

          {project.repoUrl ? (
            <div className="space-y-2 text-devtoys-secondary">
              <div className="flex justify-between py-1 border-b border-devtoys-border/60">
                <span className="text-devtoys-muted">Repository URL:</span>
                <span className="font-mono text-devtoys-accent">{project.repoUrl}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-devtoys-border/60">
                <span className="text-devtoys-muted">Owner Identity:</span>
                <span className="font-mono">@{project.githubUser || githubStatus?.username || 'Verified'}</span>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenUrl(project.repoUrl!)}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open on GitHub
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePush}
                  loading={isPushing}
                  icon={<UploadCloud className="w-3.5 h-3.5" />}
                >
                  Push Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-devtoys-muted py-4 text-center">
              No GitHub repository connected for this project.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Vercel */}
      {activeTab === 'vercel' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <Globe className="w-4 h-4 text-devtoys-accent" />
            <span>Vercel Integration</span>
          </div>

          <div className="space-y-2 text-devtoys-secondary">
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Subdomain Slug:</span>
              <span className="font-mono text-devtoys-accent">{customSlug}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Shortest Canonical URL:</span>
              <span className="font-mono text-devtoys-primary">{vercelShortUrl}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-devtoys-muted">Live Deployment:</span>
              {project.vercelProductionUrl ? (
                <button
                  onClick={() => onOpenUrl(project.vercelProductionUrl!)}
                  className="text-devtoys-accent hover:underline flex items-center gap-1 font-mono"
                >
                  <span>{project.vercelProductionUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">No deployment recorded</span>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeployVercel}
              loading={isDeployingVercel}
              icon={<Globe className="w-3.5 h-3.5" />}
            >
              Deploy to Vercel
            </Button>
          </div>
        </div>
      )}

      {/* Tab 5: Netlify */}
      {activeTab === 'netlify' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-3">
          <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
            <Cloud className="w-4 h-4 text-teal-400" />
            <span>Netlify Integration</span>
          </div>

          <div className="space-y-2 text-devtoys-secondary">
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Site Slug:</span>
              <span className="font-mono text-teal-400">{customSlug}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Shortest Canonical URL:</span>
              <span className="font-mono text-devtoys-primary">{netlifyShortUrl}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-devtoys-muted">Live Deployment:</span>
              {project.netlifyProductionUrl ? (
                <button
                  onClick={() => onOpenUrl(project.netlifyProductionUrl!)}
                  className="text-teal-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>{project.netlifyProductionUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-devtoys-muted italic">No deployment recorded</span>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeployNetlify}
              loading={isDeployingNetlify}
              icon={<Cloud className="w-3.5 h-3.5 text-teal-400" />}
            >
              Deploy to Netlify
            </Button>
          </div>
        </div>
      )}

      {/* Tab 6: GitHub Pages */}
      {activeTab === 'gh-pages' && (
        <div className="p-4 rounded-md border border-devtoys-border bg-devtoys-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-devtoys-primary font-semibold text-xs">
              <FileCode className="w-4 h-4 text-devtoys-success" />
              <span>GitHub Pages Integration</span>
            </div>
            {ghPagesStatus?.enabled && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleRefreshGhPagesStatus}
                loading={isCheckingGhPages}
                icon={<RefreshCw className="w-3 h-3" />}
              >
                Verify Live Status
              </Button>
            )}
          </div>

          <div className="space-y-2 text-devtoys-secondary text-xs">
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Repository:</span>
              <span className="font-mono text-devtoys-primary">{ownerName}/{repoName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Pages Canonical URL:</span>
              <span className="font-mono text-devtoys-success font-medium">{ghPagesShortUrl}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-devtoys-border/60">
              <span className="text-devtoys-muted">Live CDN Status:</span>
              {ghPagesStatus?.enabled ? (
                ghPagesStatus.isLive ? (
                  <span className="text-devtoys-success flex items-center gap-1.5 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Live (HTTP 200 OK)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5 font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Building & Propagating (~1-2 min)
                  </span>
                )
              ) : (
                <span className="text-devtoys-muted italic">Not enabled yet</span>
              )}
            </div>
            {ghPagesStatus?.sourceBranch && (
              <div className="flex justify-between py-1 border-b border-devtoys-border/60">
                <span className="text-devtoys-muted">Source Branch / Path:</span>
                <span className="font-mono text-devtoys-primary">
                  {ghPagesStatus.sourceBranch}:{ghPagesStatus.sourcePath || '/'}
                </span>
              </div>
            )}
          </div>

          {/* Explanatory callout for 404 behavior */}
          <div className="p-3 rounded-md bg-devtoys-sidebar/70 border border-devtoys-border/80 text-[11px] text-devtoys-secondary space-y-1">
            <div className="font-semibold text-devtoys-primary flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-devtoys-accent" />
              Why might GitHub Pages return 404 initially?
            </div>
            <p className="leading-relaxed text-devtoys-muted">
              GitHub Pages deploys asynchronously. When first enabled or after new code is pushed, GitHub takes 1 to 2 minutes to compile the site and distribute it to its global Fastly edge CDN. During this initial setup window, visiting the URL will display GitHub's 404 page until the background build completes.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeployGhPages}
              loading={isDeployingGhPages}
              icon={<FileCode className="w-3.5 h-3.5" />}
            >
              {ghPagesStatus?.enabled ? 'Re-Deploy / Update GitHub Pages' : 'Enable / Deploy GitHub Pages'}
            </Button>
            {project.githubPagesUrl && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenUrl(project.githubPagesUrl!)}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open Site
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
