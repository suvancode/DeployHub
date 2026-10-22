import path from 'path';
import fs from 'fs';
import { runProcess, RunOptions, ProcessRunResult } from './processRunner';
import { logger } from './logger';
import { VercelStatus, VercelProjectConfig, ActionResult } from '../../src/types/api';
import { openTerminalWithCommand } from './terminalHelper';

/**
 * Sanitizes a project name or custom slug for Vercel:
 * Vercel requires lowercase, max 100 chars, only letters, numbers, '.', '_', '-', and no '---'.
 */
export function sanitizeVercelProjectName(name: string): string {
  if (!name || typeof name !== 'string') return 'my-project';
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/---+/g, '--')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return sanitized || 'my-project';
}

export class VercelManager {
  /**
   * Runs Vercel commands using global `vercel` if available, falling back to `npx vercel`.
   */
  private async runVercel(args: string[], options: RunOptions = {}): Promise<ProcessRunResult> {
    try {
      const direct = await runProcess('vercel', args, options);
      if (
        direct.code === 0 ||
        (direct.stderr && !direct.stderr.includes('is not recognized') && !direct.stderr.includes('ENOENT'))
      ) {
        return direct;
      }
    } catch {
      // ignore and fallback
    }
    return runProcess('npx', ['vercel', ...args], options);
  }

  /**
   * Resolves the vercel executable (global vercel, or fallback to npx).
   */
  async checkStatus(): Promise<VercelStatus> {
    logger.info('vercelManager', 'Checking Vercel CLI status');

    // 1. Check authentication using vercel whoami
    try {
      const whoamiRes = await this.runVercel(['whoami']);
      const combined = `${whoamiRes.stdout}\n${whoamiRes.stderr}`.trim();

      if (whoamiRes.code === 0 && combined) {
        const lines = combined.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const username =
          lines.find(
            (l: string) =>
              !l.toLowerCase().includes('vercel') &&
              !l.toLowerCase().includes('retrieving') &&
              !l.toLowerCase().includes('node')
          ) || lines[lines.length - 1];
        return {
          installed: true,
          authenticated: true,
          username,
        };
      }

      // Check if installed via --version
      const verRes = await this.runVercel(['--version']);
      if (verRes.code === 0) {
        return {
          installed: true,
          authenticated: false,
          error: 'Vercel CLI is accessible but not authenticated. Run `npx vercel login` or use the Login button.',
        };
      }

      return {
        installed: false,
        authenticated: false,
        error: 'Vercel CLI not found. Install it globally via `npm i -g vercel` or run `npx vercel login`.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        installed: false,
        authenticated: false,
        error: `Failed to check Vercel status: ${msg}`,
      };
    }
  }

  /**
   * Launches `npx vercel login` in a visible terminal window for authenticating.
   */
  async loginAccount(): Promise<ActionResult<void>> {
    logger.info('vercelManager', 'Launching npx vercel login in terminal');
    return openTerminalWithCommand('npx vercel login');
  }

  /**
   * Switches Vercel team/scope using `vercel switch <scope>`.
   */
  async switchAccount(scope: string): Promise<ActionResult<void>> {
    logger.info('vercelManager', `Switching Vercel scope to ${scope}`);
    try {
      const res = await this.runVercel(['switch', scope]);
      if (res.code !== 0) {
        return {
          success: false,
          error: {
            code: 'VERCEL_SWITCH_FAILED',
            message: res.stderr || res.stdout || 'Failed to switch Vercel scope.',
            modified: false,
          },
        };
      }
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'VERCEL_SWITCH_ERROR',
          message: msg,
          modified: false,
        },
      };
    }
  }

  /**
   * Links or creates a Vercel project for the target folder.
   * Ensures the project name is strictly sanitized to lowercase alphanumeric.
   */
  async linkProject(
    folderPath: string,
    config: VercelProjectConfig
  ): Promise<ActionResult<{ projectId: string; projectName: string }>> {
    const safeProjectName = sanitizeVercelProjectName(config.projectName);
    logger.info('vercelManager', `Linking Vercel project: ${safeProjectName} (original: ${config.projectName}) in ${folderPath}`);

    const targetDir = config.projectRoot ? path.resolve(folderPath, config.projectRoot) : folderPath;

    try {
      // Run vercel link --yes --project <safeProjectName>
      const args = ['link', '--yes', '--project', safeProjectName];
      const linkRes = await this.runVercel(args, { cwd: targetDir });

      if (linkRes.code !== 0) {
        return {
          success: false,
          error: {
            code: 'VERCEL_LINK_FAILED',
            message: 'Failed to link project with Vercel.',
            why: linkRes.stderr || linkRes.stdout || 'Vercel CLI returned an error.',
            modified: false,
            nextStep: 'Ensure you are logged in to Vercel via `npx vercel login`.',
          },
        };
      }

      // Add environment variables if provided
      if (config.envVars && config.envVars.length > 0) {
        for (const ev of config.envVars) {
          if (!ev.key.trim() || !ev.value.trim()) continue;
          for (const target of ev.target) {
            try {
              await this.runVercel(['env', 'add', ev.key, target], {
                cwd: targetDir,
                input: `${ev.value}\n`,
              });
            } catch (err) {
              logger.warn('vercelManager', `Failed to add env var ${ev.key} for ${target}`, err);
            }
          }
        }
      }

      return {
        success: true,
        data: {
          projectId: safeProjectName,
          projectName: safeProjectName,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('vercelManager', 'Error linking Vercel project', err);
      return {
        success: false,
        error: {
          code: 'VERCEL_ERROR',
          message: 'An error occurred while linking Vercel project.',
          why: msg,
          modified: false,
          nextStep: 'Check Vercel CLI login status and network connection.',
        },
      };
    }
  }

  /**
   * Performs automated deployment using Vercel CLI.
   * Guarantees non-interactive automated deployment and extracts the shortest canonical URL.
   */
  async deployInitial(
    folderPath: string,
    isProduction: boolean = true,
    customSlug?: string
  ): Promise<ActionResult<{ url: string; inspectUrl?: string }>> {
    logger.info('vercelManager', `Running Vercel deploy (production: ${isProduction}, slug: ${customSlug})`);

    const safeName = sanitizeVercelProjectName(customSlug || path.basename(folderPath));
    const vercelConfigPath = path.join(folderPath, '.vercel', 'project.json');

    // If not yet linked, automatically link using the safe sanitized name first
    if (!fs.existsSync(vercelConfigPath)) {
      logger.info('vercelManager', `Project not linked. Auto-linking as ${safeName}...`);
      try {
        await this.runVercel(['link', '--yes', '--project', safeName], { cwd: folderPath });
      } catch (linkErr) {
        logger.warn('vercelManager', 'Auto-link attempt returned an error; will try deploy directly', linkErr);
      }
    }

    try {
      const args = ['deploy', '--yes'];
      if (isProduction) {
        args.push('--prod');
      }

      const deployRes = await this.runVercel(args, {
        cwd: folderPath,
        timeoutMs: 240000, // 4 minutes timeout for build
      });

      const combinedOutput = `${deployRes.stdout}\n${deployRes.stderr}`;

      if (deployRes.code !== 0 && !combinedOutput.includes('https://') && !combinedOutput.includes('Aliased')) {
        return {
          success: false,
          error: {
            code: 'DEPLOY_FAILED',
            message: 'Vercel deployment failed during build or upload.',
            why: deployRes.stderr || deployRes.stdout,
            modified: false,
            nextStep: 'Check build scripts and error messages in the deployment logs.',
          },
        };
      }

      // Parse URLs from stdout & stderr
      // 1. Look for canonical shortest URL from "▲ Aliased https://<short-domain>.vercel.app"
      // or "Production URL: https://<short-domain>.vercel.app"
      let shortestUrl = '';
      let inspectUrl: string | undefined;

      const aliasedMatch = combinedOutput.match(/(?:▲\s*Aliased|Production URL:)\s*(https:\/\/[a-zA-Z0-9_\-\.]+vercel\.app)/i);
      if (aliasedMatch) {
        shortestUrl = aliasedMatch[1];
      }

      const inspectMatch = combinedOutput.match(/(https:\/\/vercel\.com\/[^\s\n]+)/i);
      if (inspectMatch) {
        inspectUrl = inspectMatch[1];
      }

      // If no aliased match, find any production/preview URL
      if (!shortestUrl) {
        const urlMatches = [...combinedOutput.matchAll(/(https:\/\/[a-zA-Z0-9_\-\.]+\.vercel\.app)/gi)];
        if (urlMatches.length > 0) {
          // Find shortest URL string among all vercel.app URLs!
          const allUrls = urlMatches.map((m) => m[1]);
          allUrls.sort((a, b) => a.length - b.length);
          shortestUrl = allUrls[0];
        }
      }

      // Fallback: the canonical project domain on Vercel is https://<safeName>.vercel.app
      if (!shortestUrl) {
        shortestUrl = `https://${safeName}.vercel.app`;
      }

      logger.info('vercelManager', `Deployment successful. Shortest canonical URL: ${shortestUrl}`);
      return {
        success: true,
        data: {
          url: shortestUrl,
          inspectUrl,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('vercelManager', 'Deployment execution failed', err);
      return {
        success: false,
        error: {
          code: 'DEPLOY_EXECUTION_ERROR',
          message: 'Deployment command failed to execute.',
          why: msg,
          modified: false,
          nextStep: 'Check your internet connection and Vercel CLI credentials.',
        },
      };
    }
  }
}

export const vercelManager = new VercelManager();
