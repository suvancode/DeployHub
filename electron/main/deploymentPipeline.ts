import fs from 'fs';
import path from 'path';
import os from 'os';
import { gitManager } from './gitManager';
import { vercelManager } from './vercelManager';
import { netlifyManager } from './netlifyManager';
import { ghPagesManager } from './ghPagesManager';
import { configManager } from './configManager';
import { runProcess } from './processRunner';
import { logger } from './logger';
import { ActionResult, PipelineResult, DeployResultItem, ProjectRecord } from '../../src/types/api';

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
  targets: Array<'vercel' | 'netlify' | 'github-pages'> = ['vercel', 'netlify', 'github-pages']
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

export interface DeployGitHubRepoOptions {
  repoUrl: string;
  targetPath?: string;
  branchName?: string;
  customSlug?: string;
  targets?: Array<'vercel' | 'netlify' | 'github-pages'>;
}

/**
 * Automates the complete GitHub repository deployment:
 * 1. Checks if repository is already local or clones it cleanly
 * 2. Runs the multi-platform deployment to Vercel, Netlify, and/or GitHub Pages
 * 3. Registers or updates the project in DeployHub's persistent database
 */
export async function deployGitHubRepoPipeline(
  options: DeployGitHubRepoOptions
): Promise<ActionResult<{ project: ProjectRecord; pipeline: PipelineResult }>> {
  const {
    repoUrl,
    branchName = 'main',
    targets = ['vercel', 'netlify', 'github-pages'],
  } = options;

  logger.info('pipeline', `Deploying GitHub repository: ${repoUrl} to targets: ${targets.join(', ')}`);

  // 1. Extract owner and repository name
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  const owner = match ? match[1] : 'suvancode';
  const repoName = match ? match[2] : 'project';
  const safeSlug = (options.customSlug || repoName)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';

  // 2. Determine local directory
  let localDir = options.targetPath;
  const existingProjects = configManager.getProjects();
  const existingByRepo = existingProjects.find(
    (p) => p.repoUrl && p.repoUrl.toLowerCase().includes(repoName.toLowerCase())
  );

  if (!localDir) {
    if (existingByRepo && fs.existsSync(existingByRepo.path)) {
      localDir = existingByRepo.path;
    } else {
      let baseDir: string | undefined;
      for (const p of existingProjects) {
        if (p.path && fs.existsSync(path.dirname(p.path))) {
          baseDir = path.dirname(p.path);
          break;
        }
      }
      if (!baseDir || !fs.existsSync(baseDir)) {
        try {
          const userDesk = path.join(os.homedir(), 'Desktop');
          baseDir = fs.existsSync(userDesk)
            ? path.join(userDesk, 'DeployHub-Projects')
            : path.join(os.homedir(), 'DeployHub-Projects');
        } catch {
          baseDir = path.join(process.cwd(), 'projects');
        }
      }
      localDir = path.join(baseDir, repoName);
    }
  }

  // 3. Clone if directory does not exist or lacks .git
  if (!fs.existsSync(localDir) || !fs.existsSync(path.join(localDir, '.git'))) {
    logger.info('pipeline', `Local directory not found or not a git repo, cloning to ${localDir}...`);
    const cloneRes = await gitManager.cloneRepo(repoUrl, localDir);
    if (!cloneRes.success) {
      return {
        success: false,
        error: {
          code: 'CLONE_FAILED',
          message: `Failed to clone repository: ${cloneRes.error?.message || 'Clone error'}`,
          why: cloneRes.error?.why,
          modified: false,
        },
      };
    }
  }

  // 4. Run multi-platform deployment pipeline
  const pipeRes = await pushAndDeployPipeline(
    localDir,
    'origin',
    branchName,
    true,
    safeSlug,
    targets
  );

  if (!pipeRes.success || !pipeRes.data) {
    return {
      success: false,
      error: pipeRes.error || {
        code: 'DEPLOY_PIPELINE_FAILED',
        message: 'Multi-platform deployment pipeline encountered an error.',
        modified: false,
      },
    };
  }

  // 5. Construct or update ProjectRecord
  const projectId = existingByRepo ? existingByRepo.id : `proj_${Date.now()}`;
  const now = new Date().toISOString();
  const projectRecord: ProjectRecord = {
    id: projectId,
    name: repoName,
    path: localDir,
    customSlug: safeSlug,
    repoUrl,
    remoteName: 'origin',
    branchName,
    githubUser: owner,
    vercelProjectName: safeSlug,
    vercelProductionUrl: pipeRes.data.results?.vercel?.url,
    netlifySiteName: safeSlug,
    netlifyProductionUrl: pipeRes.data.results?.netlify?.url,
    githubPagesUrl: pipeRes.data.results?.githubPages?.url,
    projectRoot: '.',
    productionBranch: branchName,
    setupStatus: 'completed',
    createdAt: existingByRepo?.createdAt || now,
    updatedAt: now,
    lastOperation: {
      name: 'Multi-Platform Deploy',
      status: pipeRes.data.deploySuccess ? 'success' : 'failed',
      timestamp: now,
      message: `Deployed to ${targets.join(', ')}`,
    },
  };

  configManager.saveProject(projectRecord);
  logger.info('pipeline', `Project ${repoName} saved to registry after deployment.`);

  return {
    success: true,
    data: {
      project: projectRecord,
      pipeline: pipeRes.data,
    },
  };
}
