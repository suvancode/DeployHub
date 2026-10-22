import React, { useState } from 'react';
import {
  FolderOpen,
  GitBranch,
  ShieldAlert,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { ProjectInspection } from '../../types/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';

interface Step1Props {
  inspection: ProjectInspection | null;
  scanError?: string | null;
  onSelectFolder: () => void;
  onManualPathSubmit: (path: string) => void;
  onRefreshInspection: () => void;
  onNext: () => void;
  loading: boolean;
}

export const Step1FolderSelect: React.FC<Step1Props> = ({
  inspection,
  scanError,
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
    <div className="space-y-3.5 text-xs">
      <div>
        <h3 className="font-semibold text-devtoys-primary">Step 1: Select & Inspect Project Folder</h3>
        <p className="text-[11px] text-devtoys-muted">
          Select a local project folder. DeployHub will perform a read-only inspection without modifying your files.
        </p>
      </div>

      {/* Folder Selection Bar */}
      <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-2.5">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onSelectFolder}
            loading={loading}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Browse Folder...
          </Button>
          <span className="text-[11px] text-devtoys-muted">or paste folder path below:</span>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            placeholder="C:\Users\username\projects\my-app"
            className="flex-1 h-7 bg-devtoys-sidebar border border-devtoys-border rounded-md px-2.5 text-xs font-mono text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!manualPath.trim() || loading}>
            Inspect
          </Button>
        </form>
      </div>

      {/* Error Message */}
      {scanError && (
        <Alert variant="error" title="Folder Inspection Failed">
          {scanError}
        </Alert>
      )}

      {/* Inspection Report */}
      {inspection && (
        <div className="space-y-3 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-devtoys-primary flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-devtoys-success" />
              Inspection Report: <span className="font-mono text-devtoys-accent">{inspection.folderName}</span>
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={onRefreshInspection}
              icon={<RefreshCw className="w-3 h-3" />}
            >
              Re-scan
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Git Status Card */}
            <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-devtoys-secondary flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-devtoys-accent" /> Git Status
                </span>
                {inspection.isGitRepo ? (
                  <Badge variant="success">Git Repository</Badge>
                ) : (
                  <Badge variant="warning">Not Initialized</Badge>
                )}
              </div>

              {inspection.isGitRepo ? (
                <div className="space-y-1 text-devtoys-secondary text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-devtoys-muted">Current Branch:</span>
                    <span className="font-mono text-devtoys-primary font-medium">{inspection.currentBranch || 'HEAD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-devtoys-muted">Commits:</span>
                    <span>{inspection.commitCount} {inspection.commitCount === 0 && '(Empty repo)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-devtoys-muted">Remotes:</span>
                    <span className="truncate max-w-[160px]">
                      {inspection.remotes.length > 0
                        ? inspection.remotes.map((r) => r.name).join(', ')
                        : 'None'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-devtoys-muted">
                  Git is not initialized yet. DeployHub will initialize it safely in Step 2.
                </p>
              )}
            </div>

            {/* Framework Card */}
            <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-devtoys-secondary flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-devtoys-accent" /> Framework
                </span>
                {inspection.hasPackageJson ? (
                  <Badge variant="info">package.json</Badge>
                ) : (
                  <Badge variant="neutral">Static</Badge>
                )}
              </div>

              <div className="space-y-1 text-devtoys-secondary text-[11px]">
                <div className="flex justify-between">
                  <span className="text-devtoys-muted">Detected:</span>
                  <span className="font-medium text-devtoys-primary">{inspection.framework?.name || 'Generic / None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-devtoys-muted">Vercel Compatible:</span>
                  <span className={inspection.framework?.vercelCompatible !== false ? 'text-devtoys-success' : 'text-devtoys-warning'}>
                    {inspection.framework?.vercelCompatible !== false ? 'Yes' : 'Requires review'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-devtoys-muted">Package Manager:</span>
                  <span className="uppercase font-mono">{inspection.packageManager || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sensitive files warning if any */}
          {inspection.sensitiveFiles.length > 0 && (
            <div className="p-2.5 rounded-md border border-devtoys-warning/30 bg-devtoys-warning/10 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-devtoys-warning font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Sensitive Files Found ({inspection.sensitiveFiles.length})</span>
              </div>
              <p className="text-devtoys-secondary">
                The following files will be added to .gitignore before committing:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {inspection.sensitiveFiles.map((sf, idx) => (
                  <span key={idx} className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-devtoys-card border border-devtoys-border text-devtoys-warning">
                    {sf.path}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onNext}
              disabled={!inspection.accessible}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Continue to Git Setup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
