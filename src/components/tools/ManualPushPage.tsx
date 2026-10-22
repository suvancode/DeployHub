import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Copy,
  Check,
  GitBranch,
  ShieldCheck,
  Info,
  FolderGit2,
  UploadCloud,
  Rocket,
  Globe,
  Cloud,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { ProjectRecord, PipelineResult } from '../../types/api';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Badge } from '../common/Badge';

interface ManualPushPageProps {
  projects: ProjectRecord[];
  selectedProject: ProjectRecord | null;
  onOpenTerminal: (path: string) => void;
  onOpenUrl?: (url: string) => void;
}

export const ManualPushPage: React.FC<ManualPushPageProps> = ({
  projects,
  selectedProject,
  onOpenTerminal,
  onOpenUrl,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(
    selectedProject?.id || (projects.length > 0 ? projects[0].id : '')
  );
  const [copiedInitial, setCopiedInitial] = useState(false);
  const [copiedSubsequent, setCopiedSubsequent] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [slug, setSlug] = useState(
    activeProject?.customSlug ||
      activeProject?.name.toLowerCase().replace(/[^a-z0-9-]/g, '') ||
      'app'
  );

  const [selectedTargets, setSelectedTargets] = useState<{
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
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [isProduction, setIsProduction] = useState(true);

  // Statuses
  const [pushStatus, setPushStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [singleDeployStatus, setSingleDeployStatus] = useState<{
    platform: string;
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineResult | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject) {
      setActiveProjectId(selectedProject.id);
      setSlug(
        selectedProject.customSlug ||
          selectedProject.name.toLowerCase().replace(/[^a-z0-9-]/g, '') ||
          'app'
      );
    } else if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
      setSlug(
        projects[0].customSlug ||
          projects[0].name.toLowerCase().replace(/[^a-z0-9-]/g, '') ||
          'app'
      );
    }
  }, [selectedProject, projects, activeProjectId]);

  const initialPushCmd = activeProject
    ? `git push -u ${activeProject.remoteName || 'origin'} ${activeProject.branchName || 'main'}`
    : 'git push -u origin main';

  const subsequentPushCmd = 'git push';

  const toggleTarget = (target: 'vercel' | 'netlify' | 'githubPages') => {
    setSelectedTargets((prev) => ({ ...prev, [target]: !prev[target] }));
  };

  // 1. Auto push
  const handleAutoPush = async () => {
    if (!activeProject) return;
    setIsPushing(true);
    setPushStatus(null);
    try {
      const res = await window.deployHubAPI.pushRepo(
        activeProject.path,
        activeProject.remoteName || 'origin',
        activeProject.branchName || 'main'
      );
      if (res.success) {
        setPushStatus({
          success: true,
          message: res.data?.autoFixed && res.data.fixedUrl
            ? `Remote URL auto-corrected to "${res.data.fixedUrl}" and code pushed successfully!`
            : `Code pushed successfully to ${activeProject.remoteName || 'origin'}/${activeProject.branchName || 'main'}!`,
        });
      } else {
        const diag = res.error?.diagnosis;
        setPushStatus({
          success: false,
          message: diag ? `${diag.title}: ${diag.whatIsError} ${diag.suggestion}` : res.error?.why || res.error?.message || 'Git push rejected by remote.',
        });
      }
    } catch (err: unknown) {
      setPushStatus({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsPushing(false);
    }
  };

  // 2. Deploy to Vercel
  const handleDeployVercel = async () => {
    if (!activeProject) return;
    setIsDeployingVercel(true);
    setSingleDeployStatus(null);
    try {
      const res = await window.deployHubAPI.deployVercel(activeProject.path, isProduction, slug);
      if (res.success && res.data) {
        setSingleDeployStatus({
          platform: 'Vercel',
          success: true,
          message: `Deployed to Vercel: ${res.data.url}`,
          url: res.data.url,
        });
      } else {
        setSingleDeployStatus({
          platform: 'Vercel',
          success: false,
          message: res.error?.why || res.error?.message || 'Vercel deployment failed.',
        });
      }
    } catch (err: unknown) {
      setSingleDeployStatus({
        platform: 'Vercel',
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsDeployingVercel(false);
    }
  };

  // 3. Deploy to Netlify
  const handleDeployNetlify = async () => {
    if (!activeProject) return;
    setIsDeployingNetlify(true);
    setSingleDeployStatus(null);
    try {
      const res = await window.deployHubAPI.deployNetlify(activeProject.path, slug, isProduction);
      if (res.success && res.data) {
        setSingleDeployStatus({
          platform: 'Netlify',
          success: true,
          message: `Deployed to Netlify: ${res.data.url}`,
          url: res.data.url,
        });
      } else {
        setSingleDeployStatus({
          platform: 'Netlify',
          success: false,
          message: res.error?.why || res.error?.message || 'Netlify deployment failed.',
        });
      }
    } catch (err: unknown) {
      setSingleDeployStatus({
        platform: 'Netlify',
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsDeployingNetlify(false);
    }
  };

  // 4. Deploy to GitHub Pages
  const handleDeployGhPages = async () => {
    if (!activeProject) return;
    setIsDeployingGhPages(true);
    setSingleDeployStatus(null);
    try {
      const res = await window.deployHubAPI.deployGhPages(activeProject.path, activeProject.branchName || 'main');
      if (res.success && res.data) {
        setSingleDeployStatus({
          platform: 'GitHub Pages',
          success: true,
          message: `GitHub Pages enabled: ${res.data.url}`,
          url: res.data.url,
        });
      } else {
        setSingleDeployStatus({
          platform: 'GitHub Pages',
          success: false,
          message: res.error?.why || res.error?.message || 'GitHub Pages configuration failed.',
        });
      }
    } catch (err: unknown) {
      setSingleDeployStatus({
        platform: 'GitHub Pages',
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsDeployingGhPages(false);
    }
  };

  // 5. Push & Deploy Multi-Platform
  const handlePushAndDeploy = async () => {
    if (!activeProject) return;
    const targets: Array<'vercel' | 'netlify' | 'github-pages'> = [];
    if (selectedTargets.vercel) targets.push('vercel');
    if (selectedTargets.netlify) targets.push('netlify');
    if (selectedTargets.githubPages) targets.push('github-pages');

    if (targets.length === 0) {
      setPipelineError('Please select at least one deployment target.');
      return;
    }

    setIsPipelineRunning(true);
    setPipelineError(null);
    setPipelineStatus(null);
    try {
      const res = await window.deployHubAPI.pushAndDeploy(
        activeProject.path,
        activeProject.remoteName || 'origin',
        activeProject.branchName || 'main',
        isProduction,
        slug,
        targets
      );
      if (res.success && res.data) {
        setPipelineStatus(res.data);
      } else {
        setPipelineError(res.error?.why || res.error?.message || 'Pipeline failed.');
        if (res.data) setPipelineStatus(res.data);
      }
    } catch (err: unknown) {
      setPipelineError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPipelineRunning(false);
    }
  };

  const copyCommand = async (cmd: string, isInitial: boolean) => {
    try {
      await navigator.clipboard.writeText(cmd);
      if (isInitial) {
        setCopiedInitial(true);
        setTimeout(() => setCopiedInitial(false), 2000);
      } else {
        setCopiedSubsequent(true);
        setTimeout(() => setCopiedSubsequent(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto text-xs">
      {/* Page Title & Rule */}
      <div className="border-b border-devtoys-border pb-3">
        <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
          <Terminal className="w-4 h-4 text-devtoys-accent" /> Push & Multi-Platform Deployment Center
        </h2>
        <p className="text-xs text-devtoys-muted mt-0.5">
          Execute automated releases to GitHub, Vercel, Netlify, and GitHub Pages, or copy terminal commands.
        </p>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-4">
          {/* Project Selector */}
          <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <label className="font-medium text-devtoys-secondary flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-devtoys-accent" /> Select Project:
            </label>
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent min-w-[220px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.branchName || 'main'})
                </option>
              ))}
            </select>
          </div>

          {activeProject && (
            <>
              {/* Shortest Domain Customizer Box */}
              <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-sidebar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-devtoys-accent" />
                  Shortest Domain Subdomain:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-short-app"
                    className="h-7 w-44 bg-devtoys-card border border-devtoys-border rounded px-2 text-xs font-mono text-devtoys-accent focus:outline-none focus:border-devtoys-accent"
                  />
                  <span className="text-[11px] text-devtoys-muted font-mono">.vercel.app / .netlify.app</span>
                </div>
              </div>

              {/* AUTOMATION ACTIONS HUB */}
              <div className="p-4 rounded-lg border border-devtoys-accent/30 bg-devtoys-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-devtoys-border/60 pb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-devtoys-primary">Target Platforms:</span>

                    <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
                      <input
                        type="checkbox"
                        checked={selectedTargets.vercel}
                        onChange={() => toggleTarget('vercel')}
                        className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                      />
                      <Globe className="w-3.5 h-3.5 text-devtoys-accent" />
                      <span>Vercel</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
                      <input
                        type="checkbox"
                        checked={selectedTargets.netlify}
                        onChange={() => toggleTarget('netlify')}
                        className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                      />
                      <Cloud className="w-3.5 h-3.5 text-teal-400" />
                      <span>Netlify</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
                      <input
                        type="checkbox"
                        checked={selectedTargets.githubPages}
                        onChange={() => toggleTarget('githubPages')}
                        className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                      />
                      <FileCode className="w-3.5 h-3.5 text-devtoys-success" />
                      <span>GH Pages</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary text-[11px] select-none">
                    <input
                      type="checkbox"
                      checked={isProduction}
                      onChange={(e) => setIsProduction(e.target.checked)}
                      className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
                    />
                    <span>Production Build (<code>--prod</code>)</span>
                  </label>
                </div>

                {/* Primary Automated Deploy Button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePushAndDeploy}
                  loading={isPipelineRunning}
                  icon={<Rocket className="w-4 h-4" />}
                >
                  🚀 Push & Deploy Selected Platforms (Automated)
                </Button>

                {/* Quick Individual Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleAutoPush}
                    loading={isPushing}
                    icon={<UploadCloud className="w-3 h-3" />}
                  >
                    Push to GitHub
                  </Button>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleDeployVercel}
                    loading={isDeployingVercel}
                    icon={<Globe className="w-3 h-3" />}
                  >
                    Deploy Vercel
                  </Button>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleDeployNetlify}
                    loading={isDeployingNetlify}
                    icon={<Cloud className="w-3 h-3 text-teal-400" />}
                  >
                    Deploy Netlify
                  </Button>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleDeployGhPages}
                    loading={isDeployingGhPages}
                    icon={<FileCode className="w-3 h-3 text-devtoys-success" />}
                  >
                    Deploy GH Pages
                  </Button>
                </div>

                {/* Pipeline Live Results */}
                {pipelineStatus && pipelineStatus.deploySuccess && (
                  <div className="p-3 rounded-md border border-devtoys-success/40 bg-devtoys-success/10 space-y-2">
                    <span className="font-semibold text-devtoys-success flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      Automated Pipeline Finished Successfully!
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {pipelineStatus.results?.vercel?.url && (
                        <div className="p-2 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px] truncate">
                          <span className="text-devtoys-muted block">Vercel (Shortest):</span>
                          <a
                            href={pipelineStatus.results.vercel.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-devtoys-accent hover:underline font-mono"
                          >
                            {pipelineStatus.results.vercel.url}
                          </a>
                        </div>
                      )}

                      {pipelineStatus.results?.netlify?.url && (
                        <div className="p-2 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px] truncate">
                          <span className="text-devtoys-muted block">Netlify (Shortest):</span>
                          <a
                            href={pipelineStatus.results.netlify.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-400 hover:underline font-mono"
                          >
                            {pipelineStatus.results.netlify.url}
                          </a>
                        </div>
                      )}

                      {pipelineStatus.results?.githubPages?.url && (
                        <div className="p-2 rounded bg-devtoys-sidebar border border-devtoys-border text-[11px] truncate">
                          <span className="text-devtoys-muted block">GH Pages:</span>
                          <a
                            href={pipelineStatus.results.githubPages.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-devtoys-success hover:underline font-mono"
                          >
                            {pipelineStatus.results.githubPages.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {pipelineError && (
                  <Alert variant="error" title="Pipeline Error">
                    {pipelineError}
                  </Alert>
                )}

                {singleDeployStatus && (
                  <Alert
                    variant={singleDeployStatus.success ? 'success' : 'error'}
                    title={`${singleDeployStatus.platform} Deployment`}
                  >
                    <div>{singleDeployStatus.message}</div>
                  </Alert>
                )}

                {pushStatus && (
                  <Alert
                    variant={pushStatus.success ? 'success' : 'error'}
                    title={pushStatus.success ? 'Push Successful' : 'Push Error'}
                    onClose={() => setPushStatus(null)}
                  >
                    {pushStatus.message}
                  </Alert>
                )}
              </div>

              {/* Command 1: Initial Push */}
              <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary">1. Initial Push (Sets Upstream Tracking)</span>
                  <span className="text-[11px] text-devtoys-muted">Run once when connecting a new repository</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-7 px-3 rounded bg-devtoys-sidebar border border-devtoys-border font-mono text-xs text-devtoys-accent flex items-center select-all">
                    <span className="text-devtoys-muted mr-1.5 select-none">$</span>
                    <span>{initialPushCmd}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => copyCommand(initialPushCmd, true)}
                    icon={copiedInitial ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedInitial ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenTerminal(activeProject.path)}
                    icon={<Terminal className="w-3.5 h-3.5" />}
                  >
                    Terminal
                  </Button>
                </div>
              </div>

              {/* Command 2: Subsequent Pushes */}
              <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-devtoys-primary">2. Subsequent Pushes (Daily Updates)</span>
                  <span className="text-[11px] text-devtoys-muted">After committing new local changes</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-7 px-3 rounded bg-devtoys-sidebar border border-devtoys-border font-mono text-xs text-devtoys-primary flex items-center select-all">
                    <span className="text-devtoys-muted mr-1.5 select-none">$</span>
                    <span>{subsequentPushCmd}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyCommand(subsequentPushCmd, false)}
                    icon={copiedSubsequent ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedSubsequent ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="text-[11px] text-devtoys-muted flex items-start gap-1.5 pt-1">
                  <Info className="w-3 h-3 text-devtoys-muted shrink-0 mt-0.5" />
                  <span>
                    Remember: You must commit your changes locally first (<code className="text-devtoys-secondary">git commit -m &quot;...&quot;</code>) before pushing to GitHub.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-devtoys-muted bg-devtoys-card/30 rounded-md border border-devtoys-border">
          No projects configured yet. Use &quot;Repository Setup&quot; in the sidebar to configure a project folder.
        </div>
      )}
    </div>
  );
};
