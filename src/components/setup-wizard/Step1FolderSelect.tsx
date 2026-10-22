import React, { useState } from 'react';
import {
  FolderOpen,
  GitBranch,
  ShieldAlert,
  AlertTriangle,
  Package,
  Layers,
  FileCode,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { ProjectInspection } from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface Step1Props {
  inspection: ProjectInspection | null;
  onSelectFolder: () => void;
  onManualPathSubmit: (path: string) => void;
  onRefreshInspection: () => void;
  onNext: () => void;
  loading: boolean;
}

export const Step1FolderSelect: React.FC<Step1Props> = ({
  inspection,
  onSelectFolder,
  onManualPathSubmit,
  onRefreshInspection,
  onNext,
  loading,
}) => {
  const [manualPath, setManualPath] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPath.trim()) {
      onManualPathSubmit(manualPath.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Step 1: Select & Inspect Project Folder</h3>
        <p className="text-xs text-slate-400 mt-1">
          Choose a local project folder. DeployHub will perform a non-destructive read-only inspection.
        </p>
      </div>

      {/* Folder Selection Controls */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={onSelectFolder}
            loading={loading}
            icon={<FolderOpen className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Browse Folder...
          </Button>
          <span className="text-xs text-slate-500 font-medium select-none">or enter path manually</span>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            placeholder="C:\Users\username\projects\my-cool-app"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!manualPath.trim() || loading}>
            Inspect
          </Button>
        </form>
      </div>

      {/* Inspection Report */}
      {inspection && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Inspection Report: <span className="font-mono text-emerald-400">{inspection.folderName}</span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshInspection}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Re-scan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Git Status Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-400 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" /> Git Status
                </span>
                {inspection.isGitRepo ? (
                  <Badge variant="success">Git Repository</Badge>
                ) : (
                  <Badge variant="warning">Not Initialized</Badge>
                )}
              </div>

              {inspection.isGitRepo ? (
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Branch:</span>
                    <span className="font-mono text-emerald-300">{inspection.currentBranch || 'HEAD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commits Count:</span>
                    <span>{inspection.commitCount} {inspection.commitCount === 0 && '(Empty repo)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remotes:</span>
                    <span>
                      {inspection.remotes.length > 0
                        ? inspection.remotes.map((r) => r.name).join(', ')
                        : 'None configured'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Working Tree:</span>
                    <span className={inspection.hasUncommittedChanges ? 'text-amber-400' : 'text-emerald-400'}>
                      {inspection.hasUncommittedChanges ? `${inspection.uncommittedFiles.length} uncommitted files` : 'Clean'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  This folder is not yet a Git repository. DeployHub will help you initialize it in the next step.
                </p>
              )}
            </div>

            {/* Framework & Package Manager */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-400" /> Framework & Manifest
                </span>
                {inspection.hasPackageJson ? (
                  <Badge variant="info">package.json</Badge>
                ) : (
                  <Badge variant="neutral">Static / No Manifest</Badge>
                )}
              </div>

              <div className="text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Detected Framework:</span>
                  <span className="font-semibold text-slate-200">
                    {inspection.framework?.name || 'Generic / None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vercel Compatibility:</span>
                  <span className={inspection.framework?.vercelCompatible !== false ? 'text-emerald-400' : 'text-amber-400'}>
                    {inspection.framework?.vercelCompatible !== false ? 'Compatible' : 'Requires review'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Package Manager:</span>
                  <span className="uppercase font-mono text-slate-300">{inspection.packageManager || 'None'}</span>
                </div>
                {inspection.isMonorepo && (
                  <div className="flex justify-between text-indigo-300">
                    <span className="text-slate-500">Monorepo:</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Yes ({inspection.monorepoPackages?.length || 0} packages)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sensitive Files Warning Card */}
          {inspection.sensitiveFiles.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-800/60 bg-amber-950/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Sensitive Files Detected ({inspection.sensitiveFiles.length})</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                The following files might contain private secrets or API keys. DeployHub ensures they will be added to .gitignore before anything is committed:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {inspection.sensitiveFiles.map((sf, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-200"
                    title={sf.reason}
                  >
                    {sf.path}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* General Warnings if any */}
          {inspection.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Inspection Notices</span>
              </div>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                {inspection.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action to proceed */}
          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              size="md"
              onClick={onNext}
              disabled={!inspection.accessible}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Git Setup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
