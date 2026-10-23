import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ghPagesManager } from '../electron/main/ghPagesManager';
import { runProcess } from '../electron/main/processRunner';

vi.mock('../electron/main/processRunner', () => ({
  runProcess: vi.fn(),
}));

describe('GhPagesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRepoInfo', () => {
    it('should parse HTTPS git origin remote', async () => {
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: 'https://github.com/suvancode/Build-Lab.git\n',
        stderr: '',
      });

      const info = await ghPagesManager.getRepoInfo('C:\\fake\\path');
      expect(info).toEqual({
        owner: 'suvancode',
        repo: 'Build-Lab',
      });
    });

    it('should parse SSH git origin remote', async () => {
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: 'git@github.com:suvancode/Build-Lab.git\n',
        stderr: '',
      });

      const info = await ghPagesManager.getRepoInfo('C:\\fake\\path');
      expect(info).toEqual({
        owner: 'suvancode',
        repo: 'Build-Lab',
      });
    });

    it('should return null if origin remote is not github', async () => {
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: 'https://gitlab.com/user/project.git\n',
        stderr: '',
      });

      const info = await ghPagesManager.getRepoInfo('C:\\fake\\path');
      expect(info).toBeNull();
    });
  });

  describe('checkStatus', () => {
    it('should return enabled with built status when GitHub API succeeds', async () => {
      // 1. getRepoInfo remote
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: 'https://github.com/suvancode/Build-Lab.git\n',
        stderr: '',
      });

      // 2. gh api repos/pages
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: JSON.stringify({
          status: 'built',
          html_url: 'https://suvancode.github.io/Build-Lab/',
          source: { branch: 'main', path: '/' },
        }),
        stderr: '',
      });

      // 3. gh api builds/latest
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: JSON.stringify({
          status: 'built',
          error: { message: null },
        }),
        stderr: '',
      });

      // mock global fetch
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        status: 200,
      } as any);

      try {
        const status = await ghPagesManager.checkStatus('C:\\fake\\path');
        expect(status.enabled).toBe(true);
        expect(status.url).toBe('https://suvancode.github.io/Build-Lab/');
        expect(status.status).toBe('built');
        expect(status.isLive).toBe(true);
      } finally {
        global.fetch = origFetch;
      }
    });

    it('should return enabled false if repository does not have Pages enabled', async () => {
      // 1. getRepoInfo remote
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 0,
        stdout: 'https://github.com/suvancode/Build-Lab.git\n',
        stderr: '',
      });

      // 2. gh api repos/pages fails (404 Not Found)
      vi.mocked(runProcess).mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: 'Not Found',
      });

      const status = await ghPagesManager.checkStatus('C:\\fake\\path');
      expect(status.enabled).toBe(false);
      expect(status.url).toBe('https://suvancode.github.io/Build-Lab/');
    });
  });
});
