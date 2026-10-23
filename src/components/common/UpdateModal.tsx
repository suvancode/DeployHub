import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { UpdateInfo, DownloadProgress } from '../../types/api';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExternalUrl?: (url: string) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onOpenExternalUrl,
}) => {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check for updates when modal opens
  useEffect(() => {
    if (isOpen) {
      handleCheck();
    }
  }, [isOpen]);

  // Listen to live download progress from Electron
  useEffect(() => {
    if (window.deployHubAPI?.onUpdateProgress) {
      const unsubscribe = window.deployHubAPI.onUpdateProgress((prog) => {
        setProgress(prog);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await window.deployHubAPI.checkForUpdates();
      if (res.success && res.data) {
        setUpdateInfo(res.data);
      } else {
        setError(res.error?.why || res.error?.message || 'Could not fetch latest release.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!updateInfo?.downloadUrl) return;
    setDownloading(true);
    setError(null);
    setStatusMessage('Downloading update package...');
    try {
      const res = await window.deployHubAPI.downloadAndInstallUpdate(updateInfo.downloadUrl);
      if (res.success) {
        setStatusMessage('Update downloaded! Launching installer and restarting...');
      } else {
        setError(res.error?.why || res.error?.message || 'Update installation failed.');
        setDownloading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!downloading) onClose();
      }}
      title="Check for DeployHub Updates"
      size="md"
    >
      <div className="space-y-4 text-xs">
        {/* Header & Status Card */}
        <div className="p-3.5 rounded-md border border-devtoys-border bg-devtoys-sidebar space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-devtoys-accent shrink-0" />
              <span className="font-semibold text-devtoys-primary">Application Version</span>
            </div>
            <Button
              variant="secondary"
              size="xs"
              onClick={handleCheck}
              loading={checking}
              disabled={downloading}
              icon={<RefreshCw className="w-3 h-3" />}
            >
              {checking ? 'Checking...' : 'Check Again'}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="text-devtoys-muted">
              Current: <span className="font-mono text-devtoys-primary">v{updateInfo?.currentVersion || '1.1.0'}</span>
            </div>
            {updateInfo?.latestVersion && (
              <div className="text-devtoys-muted">
                Latest: <span className="font-mono text-devtoys-accent font-semibold">v{updateInfo.latestVersion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Up to date view */}
        {updateInfo && !updateInfo.hasUpdate && !checking && !error && (
          <div className="p-4 rounded-md border border-devtoys-success/40 bg-devtoys-success/10 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-devtoys-success shrink-0" />
            <div>
              <div className="font-semibold text-devtoys-primary">DeployHub is Up to Date</div>
              <div className="text-[11px] text-devtoys-muted mt-0.5">
                You are currently running the latest version (v{updateInfo.currentVersion}). No update is needed.
              </div>
            </div>
          </div>
        )}

        {/* Update available view */}
        {updateInfo && updateInfo.hasUpdate && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-md border border-devtoys-accent/40 bg-devtoys-accent/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-devtoys-primary flex items-center gap-1.5">
                  <DownloadCloud className="w-4 h-4 text-devtoys-accent" />
                  <span>New Version Available: v{updateInfo.latestVersion}</span>
                </div>
                {updateInfo.assetSize && (
                  <span className="text-[10px] text-devtoys-muted font-mono">
                    Size: {formatBytes(updateInfo.assetSize)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-devtoys-muted leading-relaxed">
                A new version of DeployHub is ready to install directly from this app.
                No manual downloading or browser visits required!
              </p>

              {/* Progress Bar during download */}
              {downloading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] text-devtoys-muted font-mono">
                    <span>{statusMessage || 'Downloading update...'}</span>
                    <span>
                      {progress?.percent || 0}% ({formatBytes(progress?.transferredBytes || 0)} / {formatBytes(progress?.totalBytes || updateInfo.assetSize || 0)})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-devtoys-border overflow-hidden">
                    <div
                      className="h-full bg-devtoys-accent transition-all duration-150"
                      style={{ width: `${progress?.percent || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Install Button */}
              {!downloading && (
                <div className="pt-2 flex items-center justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleInstall}
                    icon={<DownloadCloud className="w-3.5 h-3.5" />}
                  >
                    Update & Restart Now (In-App)
                  </Button>
                </div>
              )}
            </div>

            {/* Release notes preview */}
            {updateInfo.releaseNotes && (
              <div className="p-3 rounded-md border border-devtoys-border bg-devtoys-card space-y-1.5">
                <div className="text-[11px] font-semibold text-devtoys-secondary">Release Highlights:</div>
                <div className="text-[11px] text-devtoys-muted font-mono whitespace-pre-wrap max-h-36 overflow-y-auto p-2 bg-devtoys-sidebar rounded border border-devtoys-border leading-relaxed">
                  {updateInfo.releaseNotes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-md border border-devtoys-error/40 bg-devtoys-error/10 flex items-start gap-2 text-devtoys-error">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">
              <div className="font-semibold">Update Check Failed</div>
              <div className="mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex items-center justify-between pt-2 border-t border-devtoys-border">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onOpenExternalUrl?.('https://github.com/suvancode/DeployHub/releases')}
            icon={<ExternalLink className="w-3 h-3" />}
          >
            View on GitHub Releases
          </Button>

          <Button variant="secondary" size="sm" onClick={onClose} disabled={downloading}>
            {downloading ? 'Please wait...' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
