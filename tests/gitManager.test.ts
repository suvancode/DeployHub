import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { gitManager } from '../electron/main/gitManager';

describe('GitManager', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deployhub-git-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should initialize a git repository with default branch', async () => {
    const initRes = await gitManager.initRepo(tempDir, 'main');
    expect(initRes.success).toBe(true);
    expect(initRes.data?.branch).toBe('main');
    expect(fs.existsSync(path.join(tempDir, '.git'))).toBe(true);
  });

  it('should fail gracefully if git repository is already initialized', async () => {
    await gitManager.initRepo(tempDir, 'main');
    const secondInit = await gitManager.initRepo(tempDir, 'main');
    expect(secondInit.success).toBe(false);
    expect(secondInit.error?.code).toBe('GIT_ALREADY_INITIALIZED');
  });

  it('should apply .gitignore content safely', async () => {
    const gitignoreContent = 'node_modules/\n.env\n';
    const res = await gitManager.applyGitignore(tempDir, gitignoreContent);
    expect(res.success).toBe(true);
    expect(fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8')).toBe(gitignoreContent);
  });

  it('should create initial commit when no commits exist', async () => {
    await gitManager.initRepo(tempDir, 'main');
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');

    const commitRes = await gitManager.createInitialCommit(tempDir, 'Initial commit');
    expect(commitRes.success).toBe(true);
    expect(commitRes.data?.commitHash).toBeDefined();

    // Trying to create initial commit again should fail because commits already exist!
    const secondCommit = await gitManager.createInitialCommit(tempDir, 'Another commit');
    expect(secondCommit.success).toBe(false);
    expect(secondCommit.error?.code).toBe('COMMITS_ALREADY_EXIST');
  });

  it('should configure remote and prevent silent overwrite of conflicting remote', async () => {
    await gitManager.initRepo(tempDir, 'main');

    // Add first remote
    const remoteRes1 = await gitManager.setRemote(tempDir, 'origin', 'https://github.com/user/repo-1.git');
    expect(remoteRes1.success).toBe(true);

    // Re-adding identical URL is idempotent and succeeds
    const identicalRes = await gitManager.setRemote(tempDir, 'origin', 'https://github.com/user/repo-1.git');
    expect(identicalRes.success).toBe(true);

    // Adding conflicting URL to same remote name must fail to prevent silent overwrite!
    const conflictRes = await gitManager.setRemote(tempDir, 'origin', 'https://github.com/user/repo-conflicting.git');
    expect(conflictRes.success).toBe(false);
    expect(conflictRes.error?.code).toBe('REMOTE_CONFLICT');
  });

  it('should generate manual push command without auto-pushing', async () => {
    await gitManager.initRepo(tempDir, 'main');
    await gitManager.setRemote(tempDir, 'origin', 'https://github.com/user/repo-1.git');
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');
    await gitManager.createInitialCommit(tempDir, 'Initial commit');

    const pushRes = await gitManager.getManualPushCommand(tempDir, 'origin', 'main');
    expect(pushRes.success).toBe(true);
    expect(pushRes.data?.command).toBe('git push -u origin main');
    expect(pushRes.data?.isInitialPush).toBe(true);
    expect(pushRes.data?.hasCommits).toBe(true);
  });
});
