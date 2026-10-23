import fs from 'fs';
import path from 'path';
import { gitManager } from './gitManager';
import { vercelManager } from './vercelManager';
import { netlifyManager } from './netlifyManager';
import { ghPagesManager } from './ghPagesManager';
import { runProcess } from './processRunner';
import { logger } from './logger';
import { ActionResult, PipelineResult, DeployResultItem } from '../../src/types/api';

/**
 * Executes a full automation pipeline:
 * 1. Ensures static projects have an index.html entry point
 * 2. Pushes local commits to remote GitHub repository
 * 3. Deploys to selected platforms: Vercel, Netlify, and/or GitHub Pages
 * 4. Extracts and returns the shortest canonical URLs for each platform
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

  // Pre-flight check: ensure static HTML projects have an index.html entrypoint so root deployment doesn't 404
  try {
    const hasRootIndex = fs.existsSync(path.join(folderPath, 'index.html'));
    const hasDistIndex = ['dist', 'build', 'out', 'public'].some((d) =>
      fs.existsSync(path.join(folderPath, d, 'index.html'))
    );
    if (!hasRootIndex && !hasDistIndex && !fs.existsSync(path.join(folderPath, 'package.json'))) {
      const files = fs.readdirSync(folderPath);
      const htmlFiles = files.filter((f) => f.endsWith('.html') && !f.startsWith('.'));
      if (htmlFiles.length > 0) {
        htmlFiles.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        const chosen = htmlFiles[0];
        fs.copyFileSync(path.join(folderPath, chosen), path.join(folderPath, 'index.html'));
        logger.info('pipeline', `Auto-created index.html from ${chosen} to prevent root 404.`);
        await runProcess('git', ['add', 'index.html'], { cwd: folderPath });
        await runProcess('git', ['commit', '-m', `feat: add index.html from ${chosen}`], { cwd: folderPath });
      }
    }
  } catch (indexErr) {
    logger.warn('pipeline', 'Could not run index.html pre-flight check', indexErr);
  }

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
