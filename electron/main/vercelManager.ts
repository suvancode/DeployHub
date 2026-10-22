import path from 'path';
import { runProcess } from './processRunner';
import { logger } from './logger';
import { VercelStatus, VercelProjectConfig, ActionResult } from '../../src/types/api';

export class VercelManager {
  private vercelCmd = 'vercel';

  /**
   * Resolves the vercel executable (global vercel, or fallback message).
   */
  async checkStatus(): Promise<VercelStatus> {
    logger.info('vercelManager', 'Checking Vercel CLI status');

    // 1. Check if vercel command is accessible
    try {
      const verRes = await runProcess(this.vercelCmd, ['--version']);
      if (verRes.code !== 0) {
        return {
          installed: false,
          authenticated: false,
          error: 'Vercel CLI returned an error when checking version.',
        };
      }
    } catch {
      return {
        installed: false,
        authenticated: false,
        error: 'Vercel CLI is not installed or not in PATH. Install it globally via `npm i -g vercel` or install from https://vercel.com/download',
      };
    }

    // 2. Check authentication using vercel whoami
    try {
      const whoamiRes = await runProcess(this.vercelCmd, ['whoami']);
      if (whoamiRes.code === 0 && whoamiRes.stdout) {
        const username = whoamiRes.stdout.trim();
        return {
          installed: true,
          authenticated: true,
          username,
        };
      }

      return {
        installed: true,
        authenticated: false,
        error: 'Vercel CLI is installed but not authenticated. Run `vercel login` in your terminal.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        installed: true,
        authenticated: false,
        error: `Failed to check Vercel login status: ${msg}`,
      };
    }
  }

  /**
   * Links or creates a Vercel project for the target folder.
   */
  async linkProject(
    folderPath: string,
    config: VercelProjectConfig
  ): Promise<ActionResult<{ projectId: string; projectName: string }>> {
    logger.info('vercelManager', `Linking Vercel project: ${config.projectName} in ${folderPath}`);

    const targetDir = config.projectRoot ? path.resolve(folderPath, config.projectRoot) : folderPath;

    try {
      // Run vercel link --yes --project <projectName>
      const args = ['link', '--yes', '--project', config.projectName];
      const linkRes = await runProcess(this.vercelCmd, args, { cwd: targetDir });

      if (linkRes.code !== 0) {
        return {
          success: false,
          error: {
            code: 'VERCEL_LINK_FAILED',
            message: 'Failed to link project with Vercel.',
            why: linkRes.stderr || linkRes.stdout || 'Vercel CLI returned an error.',
            modified: false,
            nextStep: 'Ensure you are logged in to Vercel via `vercel login` and project name is valid.',
          },
        };
      }

      // Add environment variables if provided
      if (config.envVars && config.envVars.length > 0) {
        for (const ev of config.envVars) {
          if (!ev.key.trim() || !ev.value.trim()) continue;
          for (const target of ev.target) {
            try {
              // Add env var securely via vercel env add <key> <target>
              await runProcess(this.vercelCmd, ['env', 'add', ev.key, target], {
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
          projectId: config.projectName,
          projectName: config.projectName,
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
   * Performs an initial deployment using Vercel CLI.
   * Note: This is an explicit initial build/deploy, separate from manual git push.
   */
  async deployInitial(
    folderPath: string,
    isProduction: boolean = false
  ): Promise<ActionResult<{ url: string; inspectUrl?: string }>> {
    logger.info('vercelManager', `Running initial Vercel deploy (production: ${isProduction})`);

    try {
      const args = ['deploy', '--yes'];
      if (isProduction) {
        args.push('--prod');
      }

      const deployRes = await runProcess(this.vercelCmd, args, {
        cwd: folderPath,
        timeoutMs: 180000, // 3 minutes timeout for build
      });

      if (deployRes.code !== 0) {
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

      // Vercel outputs the deployment URL on the last line of stdout
      const lines = deployRes.stdout.split('\n').map((l: string) => l.trim()).filter(Boolean);
      let deployedUrl = '';
      let inspectUrl: string | undefined;

      for (const line of lines) {
        if (line.startsWith('https://') && !line.includes('vercel.com/')) {
          deployedUrl = line;
        } else if (line.includes('vercel.com/') && line.startsWith('https://')) {
          inspectUrl = line;
        }
      }

      if (!deployedUrl && lines.length > 0) {
        deployedUrl = lines[lines.length - 1];
      }

      logger.info('vercelManager', `Initial deployment successful: ${deployedUrl}`);
      return {
        success: true,
        data: {
          url: deployedUrl,
          inspectUrl,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('vercelManager', 'Initial deployment execution failed', err);
      return {
        success: false,
        error: {
          code: 'DEPLOY_EXECUTION_ERROR',
          message: 'Initial deployment command failed to execute.',
          why: msg,
          modified: false,
          nextStep: 'Check your internet connection and Vercel CLI credentials.',
        },
      };
    }
  }
}

export const vercelManager = new VercelManager();
