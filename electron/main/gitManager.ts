import fs from 'fs';
import path from 'path';
import { runProcess } from './processRunner';
import { logger } from './logger';
import { ActionResult, ManualPushInfo } from '../../src/types/api';

export class GitManager {
  /**
   * Initializes a Git repository safely with the specified initial branch name.
   */
  async initRepo(folderPath: string, branchName: string = 'main'): Promise<ActionResult<{ branch: string }>> {
    logger.info('gitManager', `Initializing git repository at ${folderPath} with branch ${branchName}`);
    try {
      const gitDir = path.join(folderPath, '.git');
      if (fs.existsSync(gitDir)) {
        return {
          success: false,
          error: {
            code: 'GIT_ALREADY_INITIALIZED',
            message: 'Folder is already a Git repository.',
            why: 'The .git folder already exists in this project directory.',
            modified: false,
            nextStep: 'Proceed with existing Git repository configuration.',
          },
        };
      }

      // Initialize with branch name
      const initRes = await runProcess('git', ['init', '-b', branchName], { cwd: folderPath });
      if (initRes.code !== 0) {
        // Older Git versions might not support -b in git init, fallback
        const fallbackRes = await runProcess('git', ['init'], { cwd: folderPath });
        if (fallbackRes.code !== 0) {
          throw new Error(`Git init failed: ${fallbackRes.stderr || fallbackRes.stdout}`);
        }
        await runProcess('git', ['checkout', '-b', branchName], { cwd: folderPath });
      }

      logger.info('gitManager', `Successfully initialized Git repo with branch ${branchName}`);
      return {
        success: true,
        data: { branch: branchName },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('gitManager', 'Failed to initialize Git repository', err);
      return {
        success: false,
        error: {
          code: 'GIT_INIT_ERROR',
          message: 'Failed to initialize Git repository.',
          why: msg,
          modified: false,
          nextStep: 'Ensure Git is installed and you have write permissions for this folder.',
        },
      };
    }
  }

  /**
   * Creates or updates .gitignore safely after user review.
   */
  async applyGitignore(folderPath: string, content: string): Promise<ActionResult<void>> {
    logger.info('gitManager', `Applying .gitignore to ${folderPath}`);
    try {
      const gitignorePath = path.join(folderPath, '.gitignore');
      fs.writeFileSync(gitignorePath, content, 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'GITIGNORE_WRITE_ERROR',
          message: 'Failed to write .gitignore file.',
          why: msg,
          modified: false,
          nextStep: 'Check file system permissions.',
        },
      };
    }
  }

  /**
   * Creates an initial commit ONLY after user confirmation and safety check for sensitive files.
   */
  async createInitialCommit(folderPath: string, message: string = 'Initial commit'): Promise<ActionResult<{ commitHash: string }>> {
    logger.info('gitManager', `Creating initial commit in ${folderPath}`);
    try {
      // 1. Check if commits already exist
      const checkCommit = await runProcess('git', ['rev-list', '--count', 'HEAD'], { cwd: folderPath });
      if (checkCommit.code === 0 && parseInt(checkCommit.stdout, 10) > 0) {
        return {
          success: false,
          error: {
            code: 'COMMITS_ALREADY_EXIST',
            message: 'Repository already contains commits. Initial commit skipped.',
            why: 'Existing project history must not be overwritten or appended without user intent.',
            modified: false,
            nextStep: 'Use standard manual commits or keep existing repository history.',
          },
        };
      }

      // 2. Stage files
      const addRes = await runProcess('git', ['add', '.'], { cwd: folderPath });
      if (addRes.code !== 0) {
        throw new Error(`Git add failed: ${addRes.stderr || addRes.stdout}`);
      }

      // 3. Commit
      const commitRes = await runProcess('git', ['commit', '-m', message], { cwd: folderPath });
      if (commitRes.code !== 0) {
        throw new Error(`Git commit failed: ${commitRes.stderr || commitRes.stdout}`);
      }

      // 4. Retrieve commit hash
      const hashRes = await runProcess('git', ['rev-parse', 'HEAD'], { cwd: folderPath });
      const hash = hashRes.code === 0 ? hashRes.stdout : 'unknown';

      logger.info('gitManager', `Created initial commit: ${hash}`);
      return {
        success: true,
        data: { commitHash: hash },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('gitManager', 'Failed to create initial commit', err);
      return {
        success: false,
        error: {
          code: 'COMMIT_FAILED',
          message: 'Failed to create initial commit.',
          why: msg,
          modified: false,
          nextStep: 'Review git status in your terminal.',
        },
      };
    }
  }

  /**
   * Sets or adds a remote. NEVER silently replaces an existing different remote.
   */
  async setRemote(folderPath: string, remoteName: string, remoteUrl: string, allowUpdate = false): Promise<ActionResult<void>> {
    logger.info('gitManager', `Configuring remote "${remoteName}" -> "${remoteUrl}" in ${folderPath} (allowUpdate: ${allowUpdate})`);
    try {
      const remotesRes = await runProcess('git', ['remote', '-v'], { cwd: folderPath });
      const lines = remotesRes.stdout.split('\n').filter(Boolean);

      let existingUrl: string | null = null;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === remoteName) {
          existingUrl = parts[1];
          break;
        }
      }

      if (existingUrl) {
        if (existingUrl === remoteUrl) {
          // Already matches, all good
          return { success: true };
        }
        if (allowUpdate) {
          logger.info('gitManager', `Updating existing remote "${remoteName}" to "${remoteUrl}"`);
          const updateRes = await runProcess('git', ['remote', 'set-url', remoteName, remoteUrl], { cwd: folderPath });
          if (updateRes.code !== 0) {
            throw new Error(`Failed to update remote: ${updateRes.stderr || updateRes.stdout}`);
          }
          return { success: true };
        }
        // Remote exists but points to different URL
        return {
          success: false,
          error: {
            code: 'REMOTE_CONFLICT',
            message: `Remote "${remoteName}" already exists and points to "${existingUrl}".`,
            why: 'Silently overwriting an existing remote could break your local Git configuration.',
            modified: false,
            nextStep: 'Choose a different remote name or explicitly verify and update the existing remote.',
          },
        };
      }

      // Add remote
      const addRes = await runProcess('git', ['remote', 'add', remoteName, remoteUrl], { cwd: folderPath });
      if (addRes.code !== 0) {
        throw new Error(`Failed to add remote: ${addRes.stderr || addRes.stdout}`);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'SET_REMOTE_ERROR',
          message: 'Failed to set Git remote.',
          why: msg,
          modified: false,
          nextStep: 'Check repository permissions and remote format.',
        },
      };
    }
  }

  /**
   * Generates the precise manual push command based on repository state.
   * NEVER pushes code automatically!
   */
  async getManualPushCommand(
    folderPath: string,
    remoteName: string = 'origin',
    branchName?: string
  ): Promise<ActionResult<ManualPushInfo>> {
    try {
      // Determine active branch if not provided
      let branch = branchName;
      if (!branch) {
        const branchRes = await runProcess('git', ['branch', '--show-current'], { cwd: folderPath });
        if (branchRes.code === 0 && branchRes.stdout) {
          branch = branchRes.stdout;
        } else {
          branch = 'main';
        }
      }

      // Determine remote URL
      const remoteRes = await runProcess('git', ['remote', 'get-url', remoteName], { cwd: folderPath });
      const repoUrl = remoteRes.code === 0 ? remoteRes.stdout : '';

      // Check if there are commits
      const countRes = await runProcess('git', ['rev-list', '--count', 'HEAD'], { cwd: folderPath });
      const hasCommits = countRes.code === 0 && parseInt(countRes.stdout, 10) > 0;

      // Check if upstream branch is already set
      const upstreamRes = await runProcess(
        'git',
        ['rev-parse', '--abbrev-ref', `${branch}@{upstream}`],
        { cwd: folderPath }
      );
      const isUpstreamSet = upstreamRes.code === 0;

      let command: string;
      let explanation: string;
      let isInitialPush = false;

      if (!isUpstreamSet) {
        command = `git push -u ${remoteName} ${branch}`;
        explanation = `Sets upstream tracking for "${branch}" to "${remoteName}/${branch}" and uploads your commits.`;
        isInitialPush = true;
      } else {
        command = `git push`;
        explanation = `Pushes your committed changes to the configured tracking branch "${remoteName}/${branch}".`;
      }

      return {
        success: true,
        data: {
          command,
          branch,
          remoteName,
          repoUrl,
          hasCommits,
          explanation,
          isInitialPush,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: {
          code: 'PUSH_COMMAND_ERROR',
          message: 'Unable to calculate manual push command.',
          why: msg,
          modified: false,
          nextStep: 'Ensure git repository is initialized with a remote.',
        },
      };
    }
  }
}

export const gitManager = new GitManager();
