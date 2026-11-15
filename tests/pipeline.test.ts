import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushAndDeployPipeline, deployGitHubRepoPipeline } from '../electron/main/deploymentPipeline';
import { gitManager } from '../electron/main/gitManager';
import { vercelManager } from '../electron/main/vercelManager';
import { netlifyManager } from '../electron/main/netlifyManager';
import { ghPagesManager } from '../electron/main/ghPagesManager';
import { configManager } from '../electron/main/configManager';

vi.mock('../electron/main/gitManager', () => ({
  gitManager: {
    pushRepo: vi.fn(),
    cloneRepo: vi.fn(),
  },
}));

vi.mock('../electron/main/vercelManager', () => ({
  vercelManager: {
    deployInitial: vi.fn(),
  },
}));

vi.mock('../electron/main/netlifyManager', () => ({
  netlifyManager: {
    deploy: vi.fn(),
  },
}));

vi.mock('../electron/main/ghPagesManager', () => ({
  ghPagesManager: {
    deploy: vi.fn(),
  },
}));

vi.mock('../electron/main/configManager', () => ({
  configManager: {
    getProjects: vi.fn().mockReturnValue([]),
    saveProject: vi.fn().mockImplementation((p) => p),
  },
}));

describe('pushAndDeployPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully run git push then deploy to vercel with shortest url', async () => {
    vi.mocked(gitManager.pushRepo).mockResolvedValueOnce({
      success: true,
      data: { output: 'Everything up-to-date' },
    });

    vi.mocked(vercelManager.deployInitial).mockResolvedValueOnce({
      success: true,
      data: {
        url: 'https://test-project.vercel.app',
        inspectUrl: 'https://vercel.com/user/test-project/deployments/xyz',
      },
    });

    const result = await pushAndDeployPipeline(
      'C:\\fake\\path',
      'origin',
      'main',
      true,
      'test-project',
      ['vercel']
    );

    expect(result.success).toBe(true);
    expect(result.data?.pushSuccess).toBe(true);
    expect(result.data?.deploySuccess).toBe(true);
    expect(result.data?.deployUrl).toBe('https://test-project.vercel.app');
    expect(gitManager.pushRepo).toHaveBeenCalledWith('C:\\fake\\path', 'origin', 'main');
    expect(vercelManager.deployInitial).toHaveBeenCalledWith('C:\\fake\\path', true, 'test-project');
  });

  it('should deploy to both vercel and netlify and return both shortest urls', async () => {
    vi.mocked(gitManager.pushRepo).mockResolvedValueOnce({
      success: true,
      data: { output: 'Pushed to origin/main' },
    });

    vi.mocked(vercelManager.deployInitial).mockResolvedValueOnce({
      success: true,
      data: {
        url: 'https://myslug.vercel.app',
      },
    });

    vi.mocked(netlifyManager.deploy).mockResolvedValueOnce({
      success: true,
      data: {
        url: 'https://myslug.netlify.app',
        deployUrl: 'https://deploy-id.netlify.app',
      },
    });

    const result = await pushAndDeployPipeline(
      'C:\\fake\\path',
      'origin',
      'main',
      true,
      'myslug',
      ['vercel', 'netlify']
    );

    expect(result.success).toBe(true);
    expect(result.data?.results?.vercel?.url).toBe('https://myslug.vercel.app');
    expect(result.data?.results?.netlify?.url).toBe('https://myslug.netlify.app');
  });

  it('should halt pipeline if git push fails and not call deployment platforms', async () => {
    vi.mocked(gitManager.pushRepo).mockResolvedValueOnce({
      success: false,
      error: {
        code: 'PUSH_REJECTED',
        message: 'Push rejected by remote',
        modified: false,
      },
    });

    const result = await pushAndDeployPipeline(
      'C:\\fake\\path',
      'origin',
      'main',
      true,
      'my-slug',
      ['vercel', 'netlify']
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PIPELINE_PUSH_FAILED');
    expect(result.data?.pushSuccess).toBe(false);
    expect(vercelManager.deployInitial).not.toHaveBeenCalled();
    expect(netlifyManager.deploy).not.toHaveBeenCalled();
  });

  it('should deploy to github pages and return live status', async () => {
    vi.mocked(gitManager.pushRepo).mockResolvedValueOnce({
      success: true,
      data: { output: 'Everything up-to-date' },
    });

    vi.mocked(ghPagesManager.deploy).mockResolvedValueOnce({
      success: true,
      data: {
        url: 'https://suvancode.github.io/my-app/',
        isLive: true,
        status: 'built',
        message: 'GitHub Pages is live at https://suvancode.github.io/my-app/',
      },
    });

    const result = await pushAndDeployPipeline(
      'C:\\fake\\path',
      'origin',
      'main',
      true,
      'my-app',
      ['github-pages']
    );

    expect(result.success).toBe(true);
    expect(result.data?.results?.githubPages?.url).toBe('https://suvancode.github.io/my-app/');
    expect(result.data?.results?.githubPages?.isLive).toBe(true);
    expect(result.data?.results?.githubPages?.status).toBe('built');
  });

  it('should deploy to all three platforms (vercel, netlify, github-pages)', async () => {
    vi.mocked(gitManager.pushRepo).mockResolvedValueOnce({
      success: true,
      data: { output: 'Everything up-to-date' },
    });

    vi.mocked(vercelManager.deployInitial).mockResolvedValueOnce({
      success: true,
      data: { url: 'https://super-app.vercel.app' },
    });

    vi.mocked(netlifyManager.deploy).mockResolvedValueOnce({
      success: true,
      data: { url: 'https://super-app.netlify.app' },
    });

    vi.mocked(ghPagesManager.deploy).mockResolvedValueOnce({
      success: true,
      data: {
        url: 'https://suvancode.github.io/super-app/',
        isLive: true,
        status: 'built',
        message: 'Live',
      },
    });

    const result = await pushAndDeployPipeline(
      'C:\\fake\\path',
      'origin',
      'main',
      true,
      'super-app',
      ['vercel', 'netlify', 'github-pages']
    );

    expect(result.success).toBe(true);
    expect(result.data?.results?.vercel?.url).toBe('https://super-app.vercel.app');
    expect(result.data?.results?.netlify?.url).toBe('https://super-app.netlify.app');
    expect(result.data?.results?.githubPages?.url).toBe('https://suvancode.github.io/super-app/');
  });

  it('should clone and deploy GitHub repo to all 3 platforms via deployGitHubRepoPipeline', async () => {
    vi.mocked(gitManager.cloneRepo).mockResolvedValueOnce({
      success: true,
      data: { path: 'C:\\fake\\path\\my-repo' },
    });

    vi.mocked(gitManager.pushRepo).mockResolvedValueOnce({
      success: true,
      data: { output: 'Everything up-to-date' },
    });

    vi.mocked(vercelManager.deployInitial).mockResolvedValueOnce({
      success: true,
      data: { url: 'https://my-repo.vercel.app' },
    });

    vi.mocked(netlifyManager.deploy).mockResolvedValueOnce({
      success: true,
      data: { url: 'https://my-repo.netlify.app' },
    });

    vi.mocked(ghPagesManager.deploy).mockResolvedValueOnce({
      success: true,
      data: {
        url: 'https://suvancode.github.io/my-repo/',
        isLive: true,
        status: 'built',
      },
    });

    const result = await deployGitHubRepoPipeline({
      repoUrl: 'https://github.com/suvancode/my-repo.git',
      targetPath: 'C:\\fake\\path\\my-repo',
      branchName: 'main',
      customSlug: 'my-repo',
      targets: ['vercel', 'netlify', 'github-pages'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.project.name).toBe('my-repo');
    expect(result.data?.project.vercelProductionUrl).toBe('https://my-repo.vercel.app');
    expect(result.data?.project.netlifyProductionUrl).toBe('https://my-repo.netlify.app');
    expect(result.data?.project.githubPagesUrl).toBe('https://suvancode.github.io/my-repo/');
    expect(configManager.saveProject).toHaveBeenCalled();
  });
});
