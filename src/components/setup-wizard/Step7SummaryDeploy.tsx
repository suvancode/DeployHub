import React, { useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Globe,
  Cloud,
  FileCode,
  Check,
  AlertTriangle,
  Sparkles,
  Copy,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Badge } from '../common/Badge';
import { PipelineResult } from '../../types/api';

interface Step7Props {
  projectName: string;
  repoUrl: string;
  branchName: string;
  vercelProjectName: string;
  onDeployInitial: (isProduction: boolean, customSlug?: string) => Promise<{ url: string; inspectUrl?: string } | null>;
  onPushAndDeploy?: (
    isProduction: boolean,
    customSlug?: string,
    targets?: Array<'vercel' | 'netlify' | 'github-pages'>
  ) => Promise<PipelineResult | null>;
  onFinish: (urls?: { vercelUrl?: string; netlifyUrl?: string; ghPagesUrl?: string; slug?: string }) => void;
  loading: boolean;
}

export const Step7SummaryDeploy: React.FC<Step7Props> = ({
  projectName,
  repoUrl,
  branchName,
  vercelProjectName,
  onDeployInitial,
  onPushAndDeploy,
  onFinish,
  loading,
}) => {
  const initialSlug =
    vercelProjectName ||
    projectName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-') ||
    'app';

  const [slug, setSlug] = useState(initialSlug);
  const [selectedTargets, setSelectedTargets] = useState<{
    vercel: boolean;
    netlify: boolean;
    githubPages: boolean;
  }>({
    vercel: true,
    netlify: true,
    githubPages: false,
  });

  const [pipelineRes, setPipelineRes] = useState<PipelineResult | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const toggleTarget = (target: 'vercel' | 'netlify' | 'githubPages') => {
    setSelectedTargets((prev) => ({ ...prev, [target]: !prev[target] }));
  };

  const handlePushAndDeploy = async () => {
    if (!onPushAndDeploy) return;
    const targets: Array<'vercel' | 'netlify' | 'github-pages'> = [];
    if (selectedTargets.vercel) targets.push('vercel');
    if (selectedTargets.netlify) targets.push('netlify');
    if (selectedTargets.githubPages) targets.push('github-pages');

    if (targets.length === 0) {
      setDeployError('Please select at least one deployment target (Vercel, Netlify, or GitHub Pages).');
      return;
    }

    setDeployError(null);
    const res = await onPushAndDeploy(true, slug, targets);
    if (res && res.deploySuccess) {
      setPipelineRes(res);
    } else {
      setDeployError(res?.error || 'Automation pipeline encountered an error.');
      if (res) setPipelineRes(res);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDone = () => {
    onFinish({
      vercelUrl: pipelineRes?.results?.vercel?.url || pipelineRes?.deployUrl,
      netlifyUrl: pipelineRes?.results?.netlify?.url,
      ghPagesUrl: pipelineRes?.results?.githubPages?.url,
      slug,
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 7: Setup Complete & Automated Deployment</h3>
        <p className="text-[11px] text-devtoys-muted">
          Your repository is configured. Now launch with shortest canonical domains across Vercel, Netlify, and GitHub Pages.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-1">
          <span className="text-[11px] text-devtoys-muted flex items-center gap-1.5">
            <GitPullRequest className="w-3.5 h-3.5 text-devtoys-accent" /> GitHub Repository
          </span>
          <div className="font-semibold text-devtoys-primary font-mono truncate">{repoUrl}</div>
          <div className="text-[11px] text-devtoys-secondary">
            Branch: <strong className="text-devtoys-accent font-mono">{branchName}</strong>
          </div>
        </div>

        <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-1">
          <span className="text-[11px] text-devtoys-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-devtoys-accent" /> Shortest Domain Subdomain
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="h-7 w-full bg-devtoys-sidebar border border-devtoys-border rounded px-2 text-xs font-mono text-devtoys-accent focus:outline-none focus:border-devtoys-accent"
              placeholder="short-slug"
            />
          </div>
          <div className="text-[10px] text-devtoys-muted font-mono truncate">
            https://{slug || 'app'}.vercel.app &middot; https://{slug || 'app'}.netlify.app
          </div>
        </div>
      </div>

      {/* Target Platforms Selection */}
      <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-2.5">
        <span className="font-semibold text-devtoys-primary block text-xs">
          Select Platforms for 1-Click Deployment:
        </span>
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
            <input
              type="checkbox"
              checked={selectedTargets.vercel}
              onChange={() => toggleTarget('vercel')}
              className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
            />
            <Globe className="w-3.5 h-3.5 text-devtoys-accent" />
            <span>Vercel (<code>{slug}.vercel.app</code>)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
            <input
              type="checkbox"
              checked={selectedTargets.netlify}
              onChange={() => toggleTarget('netlify')}
              className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
            />
            <Cloud className="w-3.5 h-3.5 text-teal-400" />
            <span>Netlify (<code>{slug}.netlify.app</code>)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-devtoys-secondary select-none">
            <input
              type="checkbox"
              checked={selectedTargets.githubPages}
              onChange={() => toggleTarget('githubPages')}
              className="rounded border-devtoys-border bg-devtoys-sidebar text-devtoys-accent focus:ring-0"
            />
            <FileCode className="w-3.5 h-3.5 text-devtoys-success" />
            <span>GitHub Pages</span>
          </label>
        </div>
      </div>

      {/* Automated Multi-Platform Launch Action */}
      <div className="p-3.5 rounded-md border border-devtoys-accent/40 bg-devtoys-card space-y-3">
        <span className="font-semibold text-devtoys-primary block text-xs">
          🚀 Instant Multi-Platform Deployment
        </span>

        {pipelineRes && pipelineRes.deploySuccess ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded bg-devtoys-sidebar border border-devtoys-success/40 flex items-center justify-between text-xs text-devtoys-success font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Live Deployment Successful!
              </span>
            </div>

            {/* Platform Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {pipelineRes.results?.vercel?.url && (
                <div className="p-2 rounded bg-devtoys-sidebar border border-devtoys-border space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-devtoys-primary flex items-center gap-1">
                      <Globe className="w-3 h-3 text-devtoys-accent" /> Vercel
                    </span>
                    <Badge variant="success">Live</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <a
                      href={pipelineRes.results.vercel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-devtoys-accent hover:underline font-mono text-[11px] truncate"
                    >
                      {pipelineRes.results.vercel.url}
                    </a>
                    <button
                      onClick={() => handleCopy(pipelineRes.results!.vercel!.url!)}
                      className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                      title="Copy URL"
                    >
                      {copiedUrl === pipelineRes.results.vercel.url ? (
                        <Check className="w-3 h-3 text-devtoys-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {pipelineRes.results?.netlify?.url && (
                <div className="p-2 rounded bg-devtoys-sidebar border border-devtoys-border space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-devtoys-primary flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-teal-400" /> Netlify
                    </span>
                    <Badge variant="success">Live</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <a
                      href={pipelineRes.results.netlify.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:underline font-mono text-[11px] truncate"
                    >
                      {pipelineRes.results.netlify.url}
                    </a>
                    <button
                      onClick={() => handleCopy(pipelineRes.results!.netlify!.url!)}
                      className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                      title="Copy URL"
                    >
                      {copiedUrl === pipelineRes.results.netlify.url ? (
                        <Check className="w-3 h-3 text-devtoys-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {pipelineRes.results?.githubPages?.url && (
                <div className="p-2 rounded bg-devtoys-sidebar border border-devtoys-border space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-devtoys-primary flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-devtoys-success" /> GH Pages
                    </span>
                    <Badge variant="success">Live</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <a
                      href={pipelineRes.results.githubPages.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-devtoys-success hover:underline font-mono text-[11px] truncate"
                    >
                      {pipelineRes.results.githubPages.url}
                    </a>
                    <button
                      onClick={() => handleCopy(pipelineRes.results!.githubPages!.url!)}
                      className="p-1 hover:text-devtoys-primary text-devtoys-muted"
                      title="Copy URL"
                    >
                      {copiedUrl === pipelineRes.results.githubPages.url ? (
                        <Check className="w-3 h-3 text-devtoys-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePushAndDeploy}
              loading={loading}
              icon={<Rocket className="w-3.5 h-3.5" />}
            >
              🚀 Push & Deploy Selected Platforms (Automated)
            </Button>
          </div>
        )}

        {deployError && <Alert variant="error" title="Deployment Notice">{deployError}</Alert>}
      </div>

      {/* Final Action Button */}
      <div className="flex justify-end pt-2">
        <Button variant="primary" size="sm" onClick={handleDone} icon={<Check className="w-3.5 h-3.5" />}>
          Finish & Return to Workspace
        </Button>
      </div>
    </div>
  );
};
