import { gitManager } from './gitManager';
import { vercelManager } from './vercelManager';
import { netlifyManager } from './netlifyManager';
import { ghPagesManager } from './ghPagesManager';
import { logger } from './logger';
import { ActionResult, PipelineResult, DeployResultItem } from '../../src/types/api';

/**
 * Executes a full automation pipeline:
 * 1. Pushes local commits to remote GitHub repository
 * 2. Deploys to selected platforms: Vercel, Netlify, and/or GitHub Pages
 * 3. Extracts and returns the shortest canonical URLs for each platform
 */
export async function pushAndDeployPipeline(
  folderPath: string,
  remoteName: string = 'origin',
  branchName?: string,
  isProduction: boolean = true,
  customSlug?: string,
  targets: Array<'vercel' | 'netlify' | 'github-pages'> = ['vercel']
): Promise<ActionResult<PipelineResult>> {
  logger.info(
    'pipeline',
    `Starting Automation Pipeline for ${folderPath} (targets: ${targets.join(', ')}, slug: ${customSlug})`
  );

  // Step 1: Push code to GitHub
  logger.info('pipeline', 'Step 1: Pushing code to GitHub');
  const pushRes = await gitManager.pushRepo(folderPath, remoteName, branchName);

  if (!pushRes.success) {
    logger.error('pipeline', 'Step 1 (Push to GitHub) failed', pushRes.error);
    return {
      success: false,
      error: {
        code: 'PIPELINE_PUSH_FAILED',
        message: 'Push & Deploy pipeline failed at Step 1 (Push to GitHub).',
        why: pushRes.error?.why || pushRes.error?.message || 'Git push rejected by remote.',
        modified: false,
      },
      data: {
        pushSuccess: false,
        deploySuccess: false,
        error: pushRes.error?.why || pushRes.error?.message,
      },
    };
  }

  // Step 2: Deploy to all requested targets
  const results: Record<string, DeployResultItem> = {};
  let primaryDeployUrl = '';
  let primaryInspectUrl = '';
  let anyDeploySuccess = false;

  // 2a. Vercel
  if (targets.includes('vercel')) {
    logger.info('pipeline', `Deploying to Vercel (slug: ${customSlug})`);
    const vcRes = await vercelManager.deployInitial(folderPath, isProduction, customSlug);
    if (vcRes.success && vcRes.data) {
      anyDeploySuccess = true;
      primaryDeployUrl = vcRes.data.url;
      primaryInspectUrl = vcRes.data.inspectUrl || '';
      results.vercel = {
        platform: 'vercel',
        success: true,
        url: vcRes.data.url,
        inspectUrl: vcRes.data.inspectUrl,
      };
    } else {
      results.vercel = {
        platform: 'vercel',
        success: false,
        error: vcRes.error?.why || vcRes.error?.message || 'Vercel deployment failed.',
      };
    }
  }

  // 2b. Netlify
  if (targets.includes('netlify')) {
    logger.info('pipeline', `Deploying to Netlify (slug: ${customSlug})`);
    const netlifyRes = await netlifyManager.deploy(folderPath, {
      siteName: customSlug,
      isProduction,
    });
    if (netlifyRes.success && netlifyRes.data) {
      anyDeploySuccess = true;
      if (!primaryDeployUrl) primaryDeployUrl = netlifyRes.data.url;
      results.netlify = {
        platform: 'netlify',
        success: true,
        url: netlifyRes.data.url,
        inspectUrl: netlifyRes.data.deployUrl,
      };
    } else {
      results.netlify = {
        platform: 'netlify',
        success: false,
        error: netlifyRes.error?.why || netlifyRes.error?.message || 'Netlify deployment failed.',
      };
    }
  }

  // 2c. GitHub Pages
  if (targets.includes('github-pages')) {
    logger.info('pipeline', `Configuring GitHub Pages (branch: ${branchName || 'main'})`);
    const ghRes = await ghPagesManager.deploy(folderPath, branchName || 'main');
    if (ghRes.success && ghRes.data) {
      anyDeploySuccess = true;
      if (!primaryDeployUrl) primaryDeployUrl = ghRes.data.url;
      results.githubPages = {
        platform: 'github-pages',
        success: true,
        url: ghRes.data.url,
        isLive: ghRes.data.isLive,
        status: ghRes.data.status,
        message: ghRes.data.message,
      };
    } else {
      results.githubPages = {
        platform: 'github-pages',
        success: false,
        error: ghRes.error?.why || ghRes.error?.message || 'GitHub Pages configuration failed.',
      };
    }
  }

  logger.info('pipeline', `Pipeline completed. Deployed successfully: ${anyDeploySuccess}`);

  return {
    success: anyDeploySuccess,
    data: {
      pushSuccess: true,
      pushOutput: pushRes.data?.output,
      deploySuccess: anyDeploySuccess,
      deployUrl: primaryDeployUrl,
      inspectUrl: primaryInspectUrl,
      results: results as PipelineResult['results'],
    },
  };
}
