import { app, BrowserWindow } from 'electron';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from './logger';
import { ActionResult } from '../../src/types/api';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
}

export interface DownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

/**
 * Compares two semantic version strings (e.g. "1.1.1" vs "1.1.0").
 * Returns true if v1 > v2.
 */
function isVersionNewer(v1: string, v2: string): boolean {
  const clean1 = v1.replace(/^v/i, '').trim();
  const clean2 = v2.replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
}

/**
 * Downloads a file from a URL following all 301/302 redirects.
 */
function downloadFileWithRedirects(
  url: string,
  destPath: string,
  onProgress: (prog: DownloadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const get = (targetUrl: string, redirectCount = 0) => {
      if (redirectCount > 8) {
        return reject(new Error('Too many HTTP redirects when downloading update.'));
      }

      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': 'DeployHub-App-Updater',
            Accept: 'application/octet-stream',
          },
        },
        (res) => {
          // Handle HTTP redirects (301, 302, 307, 308)
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            return get(res.headers.location, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            file.close();
            try {
              fs.unlinkSync(destPath);
            } catch {}
            return reject(new Error(`Download failed with HTTP ${res.statusCode}: ${res.statusMessage}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let transferredBytes = 0;

          res.on('data', (chunk) => {
            transferredBytes += chunk.length;
            const percent = totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : 0;
            onProgress({
              percent,
              transferredBytes,
              totalBytes,
            });
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close(() => resolve());
          });
        }
      );

      req.on('error', (err) => {
        file.close();
        try {
          fs.unlinkSync(destPath);
        } catch {}
        reject(err);
      });
    };

    get(url);
  });
}

export class UpdateManager {
  private repoOwner = 'suvancode';
  private repoName = 'DeployHub';

  /**
   * Checks GitHub Releases for a newer version than current app version.
   */
  async checkForUpdates(): Promise<ActionResult<UpdateInfo>> {
    const currentVersion = app.getVersion() || '1.1.0';
    logger.info('updateManager', `Checking for updates (current version: ${currentVersion})`);

    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;

    try {
      const releaseData = await new Promise<{
        tag_name: string;
        name: string;
        body: string;
        published_at: string;
        assets: Array<{
          name: string;
          browser_download_url: string;
          size: number;
        }>;
      }>((resolve, reject) => {
        const req = https.get(
          apiUrl,
          {
            headers: {
              'User-Agent': 'DeployHub-App-Updater',
              Accept: 'application/vnd.github.v3+json',
            },
          },
          (res) => {
            if (res.statusCode !== 200) {
              return reject(new Error(`GitHub API returned HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          }
        );
        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => {
          req.destroy(new Error('Update check timed out'));
        });
      });

      const latestTag = releaseData.tag_name || '1.0.0';
      const cleanLatest = latestTag.replace(/^v/i, '');
      const hasUpdate = isVersionNewer(cleanLatest, currentVersion);

      // Locate installer .exe asset
      const exeAsset = releaseData.assets?.find(
        (a) => a.name.toLowerCase().endsWith('.exe') && !a.name.toLowerCase().includes('blockmap')
      );

      const updateInfo: UpdateInfo = {
        hasUpdate,
        currentVersion,
        latestVersion: cleanLatest,
        releaseName: releaseData.name || `DeployHub v${cleanLatest}`,
        releaseNotes: releaseData.body || 'No release notes provided.',
        publishedAt: releaseData.published_at || new Date().toISOString(),
        downloadUrl: exeAsset?.browser_download_url,
        assetName: exeAsset?.name,
        assetSize: exeAsset?.size,
      };

      logger.info('updateManager', `Update check result: hasUpdate=${hasUpdate}, latest=${cleanLatest}`);
      return { success: true, data: updateInfo };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('updateManager', 'Failed to check for updates', msg);
      return {
        success: false,
        error: {
          code: 'UPDATE_CHECK_FAILED',
          message: 'Unable to check for updates.',
          why: msg,
          modified: false,
          nextStep: 'Check your internet connection and try again.',
        },
      };
    }
  }

  /**
   * Downloads the installer and executes it, replacing the running application.
   */
  async downloadAndInstallUpdate(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<ActionResult<void>> {
    logger.info('updateManager', `Starting update download from: ${downloadUrl}`);
    const tempDir = app.getPath('temp');
    const installerFilename = path.basename(downloadUrl) || 'DeployHub-Setup-Update.exe';
    const installerPath = path.join(tempDir, installerFilename);

    try {
      await downloadFileWithRedirects(downloadUrl, installerPath, (prog) => {
        if (onProgress) onProgress(prog);
        const win = BrowserWindow.getAllWindows()[0];
        if (win && !win.isDestroyed()) {
          win.webContents.send('update-progress', prog);
        }
      });

      logger.info('updateManager', `Update downloaded successfully to: ${installerPath}. Launching installer...`);

      // Spawn installer detached so it proceeds after current process quits
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      // Quit current application so installer can overwrite running files
      setTimeout(() => {
        app.quit();
      }, 1000);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('updateManager', 'Failed to download or execute update', msg);
      return {
        success: false,
        error: {
          code: 'UPDATE_INSTALL_FAILED',
          message: 'Failed to download and install update.',
          why: msg,
          modified: false,
          nextStep: 'You can manually download the installer from GitHub Releases.',
        },
      };
    }
  }
}

export const updateManager = new UpdateManager();
