import path from 'path';
import fs from 'fs';
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
   * Checks GitHub Pages status for the repository.
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
          return {
            enabled: true,
            url: json.html_url || shortestUrl,
            status: json.status,
            customDomain: json.cname,
            sourceBranch: json.source?.branch,
            sourcePath: json.source?.path,
          };
        } catch {
          // ignore
        }
      }
      return { enabled: false, url: shortestUrl };
    } catch {
      return { enabled: false, url: shortestUrl };
    }
  }

  /**
   * Enables or deploys GitHub Pages for the repository.
   * Returns shortest canonical URL: https://<owner>.github.io/<repo>/
   */
  async deploy(
    folderPath: string,
    branchName: string = 'main'
  ): Promise<ActionResult<{ url: string }>> {
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
    logger.info('ghPagesManager', `Enabling GitHub Pages for ${owner}/${repo}`);

    try {
      // Step 1: If project has a built static directory (dist, build, out), push to gh-pages branch
      const distDir = ['dist', 'build', 'out'].find((d) => fs.existsSync(path.join(folderPath, d)));
      let targetSourceBranch = branchName;

      if (distDir) {
        logger.info('ghPagesManager', `Pushing ${distDir} to gh-pages branch...`);
        try {
          const subtreeRes = await runProcess(
            'git',
            ['subtree', 'push', '--prefix', distDir, 'origin', 'gh-pages'],
            { cwd: folderPath }
          );
          if (subtreeRes.code === 0) {
            targetSourceBranch = 'gh-pages';
          }
        } catch (subErr) {
          logger.warn('ghPagesManager', 'Subtree push failed, falling back to standard branch', subErr);
        }
      }

      // Step 2: Call GitHub API to enable Pages
      const apiRes = await runProcess('gh', [
        'api',
        '-X',
        'POST',
        `repos/${owner}/${repo}/pages`,
        '-F',
        `source[branch]=${targetSourceBranch}`,
        '-F',
        'source[path]=/',
      ]);

      if (apiRes.code === 0 && apiRes.stdout) {
        try {
          const json = JSON.parse(apiRes.stdout);
          return {
            success: true,
            data: {
              url: json.html_url || shortestUrl,
            },
          };
        } catch {
          // fallback
        }
      }

      // Step 3: Check if already enabled or created
      const statusRes = await runProcess('gh', ['api', `repos/${owner}/${repo}/pages`]);
      if (statusRes.code === 0 && statusRes.stdout) {
        try {
          const json = JSON.parse(statusRes.stdout);
          return {
            success: true,
            data: {
              url: json.html_url || shortestUrl,
            },
          };
        } catch {
          // fallback
        }
      }

      // If already configured or pending GitHub build, return canonical URL
      return {
        success: true,
        data: {
          url: shortestUrl,
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
