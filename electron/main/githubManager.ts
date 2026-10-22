import { runProcess } from './processRunner';
import { logger } from './logger';
import {
  GitHubAccountStatus,
  GitHubRepoItem,
  CreateRepoOptions,
  ConnectRepoOptions,
  ActionResult,
} from '../../src/types/api';
import { gitManager } from './gitManager';

export class GitHubManager {
  /**
   * Checks GitHub CLI availability, login status, and authenticated user details.
   */
  async checkStatus(): Promise<GitHubAccountStatus> {
    logger.info('githubManager', 'Checking GitHub CLI status and authentication');

    // 1. Check gh installed
    try {
      const verRes = await runProcess('gh', ['--version']);
      if (verRes.code !== 0) {
        return {
          installed: false,
          authenticated: false,
          error: 'GitHub CLI (gh) returned a non-zero exit code.',
        };
      }
    } catch {
      return {
        installed: false,
        authenticated: false,
        error: 'GitHub CLI (gh) is not installed or not found in system PATH. Install it via `winget install --id GitHub.cli` or from https://cli.github.com/',
      };
    }

    // 2. Check auth status
    try {
      const authRes = await runProcess('gh', ['auth', 'status']);
      // Note: gh auth status outputs to stderr in many versions even on success
      const combined = `${authRes.stdout}\n${authRes.stderr}`;

      if (combined.includes('Logged in to') || combined.includes('Active account: true')) {
        // Fetch user info via gh api user
        const userRes = await runProcess('gh', ['api', 'user']);
        if (userRes.code === 0) {
          const userJson = JSON.parse(userRes.stdout);
          return {
            installed: true,
            authenticated: true,
            username: userJson.login,
            name: userJson.name || userJson.login,
          };
        }

        // Fallback parse from auth status
        const match = combined.match(/account\s+([a-zA-Z0-9_\-]+)/i);
        const username = match ? match[1] : undefined;

        return {
          installed: true,
          authenticated: true,
          username,
        };
      }

      return {
        installed: true,
        authenticated: false,
        error: 'You are not logged in to GitHub CLI. Run `gh auth login` in your terminal or use the Login button.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        installed: true,
        authenticated: false,
        error: `Failed to verify GitHub authentication: ${msg}`,
      };
    }
  }

  /**
   * Fetches recent repositories owned or accessible by the authenticated user.
   */
  async listUserRepositories(): Promise<ActionResult<GitHubRepoItem[]>> {
    logger.info('githubManager', 'Listing user repositories via gh');
    try {
      const res = await runProcess('gh', [
        'repo',
        'list',
        '--limit',
        '50',
        '--json',
        'name,nameWithOwner,isPrivate,url,description,defaultBranchRef',
      ]);

      if (res.code !== 0) {
        throw new Error(res.stderr || 'Failed to list repositories');
      }

      const rawList = JSON.parse(res.stdout);
      const items: GitHubRepoItem[] = rawList.map((r: {
        name: string;
        nameWithOwner: string;
        isPrivate: boolean;
        url: string;
        description?: string;
        defaultBranchRef?: { name: string };
      }) => ({
        name: r.name,
        fullName: r.nameWithOwner,
        isPrivate: r.isPrivate,
        url: r.url,
        description: r.description || undefined,
        defaultBranch: r.defaultBranchRef?.name || 'main',
      }));

      return {
        success: true,
        data: items,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('githubManager', 'Error listing GitHub repositories', err);
      return {
        success: false,
        error: {
          code: 'GITHUB_LIST_FAILED',
          message: 'Failed to list GitHub repositories.',
          why: msg,
          modified: false,
          nextStep: 'Ensure GitHub CLI is authenticated using `gh auth login`.',
        },
      };
    }
  }

  /**
   * Creates a new GitHub repository and sets the local remote.
   * Defaults to private visibility. Checks for conflicts first!
   */
  async createRepository(
    folderPath: string,
    options: CreateRepoOptions
  ): Promise<ActionResult<{ repoUrl: string; remoteName: string }>> {
    const { name, description, isPrivate, remoteName = 'origin' } = options;
    logger.info('githubManager', `Creating GitHub repository: ${name} (private: ${isPrivate})`);

    try {
      // 1. Get authenticated username
      const status = await this.checkStatus();
      if (!status.authenticated || !status.username) {
        return {
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'You must be authenticated with GitHub CLI to create a repository.',
            why: status.error || 'No active GitHub account found.',
            modified: false,
            nextStep: 'Run `gh auth login` in your terminal.',
          },
        };
      }

      const fullRepoPath = `${status.username}/${name}`;

      // 2. Conflict check: check if repo already exists
      const checkRes = await runProcess('gh', ['repo', 'view', fullRepoPath]);
      if (checkRes.code === 0) {
        return {
          success: false,
          error: {
            code: 'REPO_ALREADY_EXISTS',
            message: `Repository "${fullRepoPath}" already exists on GitHub.`,
            why: 'A repository with this name already belongs to your account.',
            modified: false,
            nextStep: 'Choose a different repository name or connect to this existing repository instead.',
          },
        };
      }

      // 3. Create repository via gh repo create
      const args = [
        'repo',
        'create',
        name,
        isPrivate ? '--private' : '--public',
      ];
      if (description && description.trim()) {
        args.push('--description', description.trim());
      }

      const createRes = await runProcess('gh', args, { cwd: folderPath });
      if (createRes.code !== 0) {
        throw new Error(createRes.stderr || createRes.stdout || 'GitHub repository creation failed');
      }

      // Retrieve created repo URL
      const viewRes = await runProcess('gh', ['repo', 'view', fullRepoPath, '--json', 'url']);
      let repoUrl = `https://github.com/${fullRepoPath}.git`;
      if (viewRes.code === 0) {
        try {
          const parsed = JSON.parse(viewRes.stdout);
          if (parsed.url) repoUrl = parsed.url;
        } catch {
          // fallback to standard format
        }
      }

      // 4. Configure local Git remote safely
      const remoteResult = await gitManager.setRemote(folderPath, remoteName, repoUrl);
      if (!remoteResult.success) {
        return {
          success: false,
          error: {
            code: 'REMOTE_SET_FAILED',
            message: `Repository was created on GitHub (${repoUrl}), but local remote "${remoteName}" could not be configured.`,
            why: remoteResult.error?.message,
            modified: true,
            completedSteps: ['Created GitHub repository'],
            nextStep: 'Check your local Git remotes configuration.',
          },
        };
      }

      logger.info('githubManager', `Successfully created repo and set remote: ${repoUrl}`);
      return {
        success: true,
        data: {
          repoUrl,
          remoteName,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('githubManager', 'Failed to create GitHub repository', err);
      return {
        success: false,
        error: {
          code: 'CREATE_REPO_FAILED',
          message: 'Failed to create GitHub repository.',
          why: msg,
          modified: false,
          nextStep: 'Verify your network connection and GitHub CLI authentication.',
        },
      };
    }
  }

  /**
   * Connects to an existing repository URL, verifying access and configuring remote.
   */
  async connectRepository(
    folderPath: string,
    options: ConnectRepoOptions
  ): Promise<ActionResult<{ repoUrl: string; remoteName: string }>> {
    const { repoUrl, remoteName = 'origin' } = options;
    logger.info('githubManager', `Connecting to existing repository: ${repoUrl}`);

    try {
      // 1. Verify repository access using gh repo view
      const viewRes = await runProcess('gh', ['repo', 'view', repoUrl]);
      if (viewRes.code !== 0) {
        return {
          success: false,
          error: {
            code: 'REPO_ACCESS_DENIED',
            message: `Cannot access GitHub repository "${repoUrl}".`,
            why: viewRes.stderr || 'Repository does not exist or your authenticated account does not have access.',
            modified: false,
            nextStep: 'Verify the repository URL and check that your GitHub account has read/write permissions.',
          },
        };
      }

      // 2. Configure local Git remote safely
      const remoteResult = await gitManager.setRemote(folderPath, remoteName, repoUrl);
      if (!remoteResult.success) {
        return {
          success: false,
          error: remoteResult.error,
        };
      }

      return {
        success: true,
        data: {
          repoUrl,
          remoteName,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'CONNECT_REPO_FAILED',
          message: 'Failed to connect existing repository.',
          why: msg,
          modified: false,
          nextStep: 'Verify repository URL and try again.',
        },
      };
    }
  }
}

export const githubManager = new GitHubManager();
