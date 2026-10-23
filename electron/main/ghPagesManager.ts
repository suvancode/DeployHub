import path from 'path';
import fs from 'fs';
import os from 'os';
import { runProcess } from './processRunner';
import { logger } from './logger';
import { GitHubPagesStatus, ActionResult } from '../../src/types/api';

export class GhPagesManager {
  /**
   * Extracts owner and repository from git remote in folderPath.
   */
  async getRepoInfo(folderPath: string): Promise<{ owner: string; repo: string } | null> {
    try {
      const remoteRes = await runProcess('git', ['remote', 'get-url', 'origin'], { cwd: folderPath });
      if (remoteRes.code !== 0 || !remoteRes.stdout) return null;
      const remote = remoteRes.stdout.trim();
      const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Pings URL via HTTP GET with timeout to determine if site is live (200 OK) or 404.
   */
  async checkHttpLive(url: string): Promise<{ isLive: boolean; httpStatus?: number }> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'DeployHub-StatusCheck/1.1' },
        signal: AbortSignal.timeout(4000),
      });
      return {
        isLive: response.status >= 200 && response.status < 400,
        httpStatus: response.status,
      };
    } catch {
      return { isLive: false };
    }
  }

  /**
   * Checks GitHub Pages status for the repository, including build and live HTTP status.
   */
  async checkStatus(folderPath: string): Promise<GitHubPagesStatus> {
    const info = await this.getRepoInfo(folderPath);
    if (!info) {
      return { enabled: false };
    }
    const { owner, repo } = info;
    const shortestUrl = `https://${owner.toLowerCase()}.github.io/${repo}/`;

    try {
      const res = await runProcess('gh', ['api', `repos/${owner}/${repo}/pages`]);
      if (res.code === 0 && res.stdout) {
        try {
          const json = JSON.parse(res.stdout);
          const siteUrl = json.html_url || shortestUrl;

          // Check latest build status from GitHub Pages API
          let buildStatus = json.status || 'unknown';
          let buildError: string | undefined;
          try {
            const buildRes = await runProcess('gh', ['api', `repos/${owner}/${repo}/pages/builds/latest`]);
            if (buildRes.code === 0 && buildRes.stdout) {
              const bJson = JSON.parse(buildRes.stdout);
              if (bJson.status) buildStatus = bJson.status;
              if (bJson.error?.message) buildError = bJson.error.message;
            }
          } catch {
            // ignore build check failures
          }

          // Check live HTTP availability (whether CDN has propagated)
          const httpCheck = await this.checkHttpLive(siteUrl);

          return {
            enabled: true,
            url: siteUrl,
            status: buildStatus,
            isLive: httpCheck.isLive,
            httpStatus: httpCheck.httpStatus,
            buildError,
            customDomain: json.cname,
            sourceBranch: json.source?.branch,
            sourcePath: json.source?.path,
          };
        } catch {
          // ignore parse errors
        }
      }
      return { enabled: false, url: shortestUrl };
    } catch {
      return { enabled: false, url: shortestUrl };
    }
  }

  /**
   * Deploys static build directory (dist, build, out) directly to gh-pages branch.
   * Completely bypasses .gitignore issues cleanly without touching project git working tree.
   */
  async deployDistToGhPages(folderPath: string, distDir: string, remoteUrl: string): Promise<boolean> {
    const fullDistPath = path.join(folderPath, distDir);
    const tempDir = path.join(os.tmpdir(), `deployhub-ghpages-${Date.now()}`);

    try {
      // 1. Copy dist output to temporary directory
      fs.cpSync(fullDistPath, tempDir, { recursive: true });

      // 2. Initialize fresh git repo in tempDir and commit
      await runProcess('git', ['init'], { cwd: tempDir });
      await runProcess('git', ['checkout', '-B', 'gh-pages'], { cwd: tempDir });
      await runProcess('git', ['add', '-A'], { cwd: tempDir });
      await runProcess('git', ['commit', '-m', 'Deploy to GitHub Pages via DeployHub'], { cwd: tempDir });

      // 3. Force push directly to remote gh-pages branch
      const pushRes = await runProcess('git', ['push', '-f', remoteUrl, 'gh-pages'], { cwd: tempDir });
      return pushRes.code === 0;
    } catch (err) {
      logger.warn('ghPagesManager', 'Failed to publish dist directory to gh-pages branch', err);
      return false;
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Enables or deploys GitHub Pages for the repository.
   * Returns shortest canonical URL: https://<owner>.github.io/<repo>/
   */
  async deploy(
    folderPath: string,
    branchName: string = 'main'
  ): Promise<ActionResult<{ url: string; isLive: boolean; status: string; message: string }>> {
    const info = await this.getRepoInfo(folderPath);
    if (!info) {
      return {
        success: false,
        error: {
          code: 'NO_GITHUB_REMOTE',
          message: 'No GitHub origin remote found for this project. Connect to GitHub first.',
          modified: false,
        },
      };
    }

    const { owner, repo } = info;
    const shortestUrl = `https://${owner.toLowerCase()}.github.io/${repo}/`;
    logger.info('ghPagesManager', `Enabling / Deploying GitHub Pages for ${owner}/${repo}`);

    try {
      // Step 1: Detect build output directory or source configuration
      const distDir = ['dist', 'build', 'out'].find((d) => fs.existsSync(path.join(folderPath, d)));
      let targetSourceBranch = branchName;
      let targetSourcePath = '/';

      if (distDir) {
        const remoteRes = await runProcess('git', ['remote', 'get-url', 'origin'], { cwd: folderPath });
        const remoteUrl = remoteRes.code === 0 && remoteRes.stdout ? remoteRes.stdout.trim() : null;
        if (remoteUrl) {
          logger.info('ghPagesManager', `Publishing built static directory (${distDir}) to gh-pages branch...`);
          const pushed = await this.deployDistToGhPages(folderPath, distDir, remoteUrl);
          if (pushed) {
            targetSourceBranch = 'gh-pages';
            targetSourcePath = '/';
          }
        }
      } else if (
        fs.existsSync(path.join(folderPath, 'docs', 'index.html')) &&
        !fs.existsSync(path.join(folderPath, 'index.html'))
      ) {
        targetSourceBranch = branchName;
        targetSourcePath = '/docs';
      }

      // Step 2: Call GitHub API to enable Pages (POST)
      let apiRes = await runProcess('gh', [
        'api',
        '-X',
        'POST',
        `repos/${owner}/${repo}/pages`,
        '-F',
        `source[branch]=${targetSourceBranch}`,
        '-F',
        `source[path]=${targetSourcePath}`,
      ]);

      // If already enabled (409 Conflict), update source configuration with PUT
      const outputText = (apiRes.stderr || '') + (apiRes.stdout || '');
      if (
        apiRes.code !== 0 &&
        (outputText.includes('already exists') || outputText.includes('409') || apiRes.code === 1)
      ) {
        logger.info('ghPagesManager', 'Pages already exists, updating configuration via PUT...');
        apiRes = await runProcess('gh', [
          'api',
          '-X',
          'PUT',
          `repos/${owner}/${repo}/pages`,
          '-F',
          `source[branch]=${targetSourceBranch}`,
          '-F',
          `source[path]=${targetSourcePath}`,
        ]);
      }

      // Catch private repo restriction on GitHub Free
      if (apiRes.code !== 0) {
        const errLower = outputText.toLowerCase();
        if (errLower.includes('upgrade') || errLower.includes('pro') || errLower.includes('public')) {
          return {
            success: false,
            error: {
              code: 'GH_PAGES_PRIVATE_REPO',
              message: 'GitHub Pages requires a public repository on free GitHub accounts.',
              why: 'Make the repository public on GitHub, or upgrade to GitHub Pro/Team to enable Pages on private repositories.',
              modified: false,
            },
          };
        }
      }

      // Step 3: Check live status and builds
      const currentStatus = await this.checkStatus(folderPath);
      const finalUrl = currentStatus.url || shortestUrl;
      const isLive = currentStatus.isLive ?? false;
      const statusStr = currentStatus.status || (isLive ? 'built' : 'building');

      const message = isLive
        ? `GitHub Pages is live at ${finalUrl}`
        : `GitHub Pages enabled at ${finalUrl}. Site is currently building on GitHub (~1-2 minutes).`;

      return {
        success: true,
        data: {
          url: finalUrl,
          isLive,
          status: statusStr,
          message,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'GH_PAGES_ERROR',
          message: 'Failed to configure GitHub Pages.',
          why: msg,
          modified: false,
        },
      };
    }
  }
}

export const ghPagesManager = new GhPagesManager();
