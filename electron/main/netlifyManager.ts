import path from 'path';
import fs from 'fs';
import { runProcess, RunOptions, ProcessRunResult } from './processRunner';
import { logger } from './logger';
import { NetlifyStatus, ActionResult } from '../../src/types/api';
import { openTerminalWithCommand } from './terminalHelper';

export class NetlifyManager {
  /**
   * Runs Netlify commands using global `netlify` if available, falling back to `npx netlify`.
   */
  private async runNetlify(args: string[], options: RunOptions = {}): Promise<ProcessRunResult> {
    try {
      const direct = await runProcess('netlify', args, options);
      if (
        direct.code === 0 ||
        (direct.stderr && !direct.stderr.includes('is not recognized') && !direct.stderr.includes('ENOENT'))
      ) {
        return direct;
      }
    } catch {
      // ignore and fallback
    }
    return runProcess('npx', ['netlify', ...args], options);
  }

  /**
   * Checks Netlify CLI installation and authentication status.
   */
  async checkStatus(): Promise<NetlifyStatus> {
    logger.info('netlifyManager', 'Checking Netlify CLI status');
    try {
      const statusRes = await this.runNetlify(['status'], { timeoutMs: 8000 });
      const combined = `${statusRes.stdout}\n${statusRes.stderr}`;

      if (
        combined.includes('Logged in') ||
        combined.includes('Current team:') ||
        combined.includes('Email:') ||
        combined.includes('User:')
      ) {
        const emailMatch = combined.match(/Email:\s*([^\s\n]+)/i);
        const nameMatch =
          combined.match(/Name:\s*([^\s\n]+)/i) ||
          combined.match(/User:\s*([^\s\n]+)/i) ||
          combined.match(/Current team:\s*([^\s\n]+)/i);

        return {
          installed: true,
          authenticated: true,
          username: nameMatch ? nameMatch[1] : 'Netlify User',
          email: emailMatch ? emailMatch[1] : undefined,
        };
      }

      if (combined.includes('Not logged in')) {
        return {
          installed: true,
          authenticated: false,
          error: 'Netlify CLI is installed but not logged in. Click Login to connect.',
        };
      }

      const verRes = await this.runNetlify(['--version'], { timeoutMs: 8000 });
      if (verRes.code === 0) {
        return {
          installed: true,
          authenticated: false,
          error: 'Netlify CLI available. Run `npx netlify login` or click Login.',
        };
      }

      return {
        installed: false,
        authenticated: false,
        error: 'Netlify CLI not found.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        installed: false,
        authenticated: false,
        error: `Failed to check Netlify status: ${msg}`,
      };
    }
  }

  /**
   * Launches `npx netlify login` in a visible terminal window.
   */
  async loginAccount(): Promise<ActionResult<void>> {
    logger.info('netlifyManager', 'Launching npx netlify login in terminal');
    return openTerminalWithCommand('npx netlify login');
  }

  /**
   * Automatically detects static directory to deploy (dist, build, out, public, or .).
   */
  detectPublishDir(folderPath: string): string {
    const candidates = ['dist', 'build', 'out', 'public'];
    for (const cand of candidates) {
      const p = path.join(folderPath, cand);
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        const files = fs.readdirSync(p);
        if (files.includes('index.html') || files.length > 0) {
          return cand;
        }
      }
    }
    return '.';
  }

  /**
   * Deploys project to Netlify (Production).
   * Shortest canonical URL is: https://<siteName>.netlify.app
   */
  async deploy(
    folderPath: string,
    options: {
      siteName?: string;
      isProduction?: boolean;
      publishDir?: string;
    } = {}
  ): Promise<ActionResult<{ url: string; deployUrl?: string }>> {
    const publishDir = options.publishDir || this.detectPublishDir(folderPath);
    const isProduction = options.isProduction ?? true;
    const siteSlug = options.siteName
      ? options.siteName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, '-')
          .slice(0, 37)
      : undefined;

    logger.info('netlifyManager', `Deploying to Netlify (dir: ${publishDir}, slug: ${siteSlug})`);

    const args = ['deploy', '--dir', publishDir];
    if (isProduction) {
      args.push('--prod');
    }
    if (siteSlug) {
      args.push('--site-name', siteSlug);
    }
    args.push('--allow-anonymous');

    try {
      const res = await this.runNetlify(args, {
        cwd: folderPath,
        timeoutMs: 240000,
      });

      const combined = `${res.stdout}\n${res.stderr}`;
      if (res.code !== 0 && !combined.includes('Website URL') && !combined.includes('Live Draft URL') && !combined.includes('.netlify.app')) {
        return {
          success: false,
          error: {
            code: 'NETLIFY_DEPLOY_FAILED',
            message: 'Netlify deploy command failed.',
            why: res.stderr || res.stdout,
            modified: false,
            nextStep: 'Ensure build files exist and login via `npx netlify login`.',
          },
        };
      }

      // Extract shortest canonical website URL: https://<name>.netlify.app
      let siteUrl = '';
      let deployUrl = '';

      const siteMatch =
        combined.match(/Website (?:URL|draft):\s*(https:\/\/[a-zA-Z0-9_\-\.]+netlify\.app)/i) ||
        combined.match(/(https:\/\/[a-zA-Z0-9_\-\.]+\.netlify\.app)/i);

      if (siteMatch) {
        siteUrl = siteMatch[1];
      }

      const deployMatch = combined.match(/Deploy URL:\s*(https:\/\/[^\s\n]+)/i);
      if (deployMatch) {
        deployUrl = deployMatch[1];
      }

      // Pick shortest netlify.app URL if multiple are found
      const allUrls = [...combined.matchAll(/(https:\/\/[a-zA-Z0-9_\-\.]+\.netlify\.app)/gi)].map((m) => m[1]);
      if (allUrls.length > 0) {
        allUrls.sort((a, b) => a.length - b.length);
        siteUrl = allUrls[0];
      }

      if (!siteUrl && siteSlug) {
        siteUrl = `https://${siteSlug}.netlify.app`;
      }

      return {
        success: true,
        data: {
          url: siteUrl,
          deployUrl,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'NETLIFY_EXEC_ERROR',
          message: 'Failed to execute Netlify deploy.',
          why: msg,
          modified: false,
        },
      };
    }
  }
}

export const netlifyManager = new NetlifyManager();
