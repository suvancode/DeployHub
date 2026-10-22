import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanProjectFolder } from '../electron/main/projectScanner';

describe('ProjectScanner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deployhub-scan-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should return accessible: false for non-existent path', async () => {
    const fakePath = path.join(tempDir, 'does-not-exist-12345');
    const result = await scanProjectFolder(fakePath);
    expect(result.accessible).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should detect a Next.js project with npm', async () => {
    const pkg = {
      name: 'test-next-app',
      dependencies: {
        next: '^14.0.0',
        react: '^18.2.0',
      },
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{}');

    const result = await scanProjectFolder(tempDir);
    expect(result.accessible).toBe(true);
    expect(result.hasPackageJson).toBe(true);
    expect(result.packageManager).toBe('npm');
    expect(result.framework?.id).toBe('nextjs');
    expect(result.framework?.vercelCompatible).toBe(true);
  });

  it('should detect a Vite + React project with pnpm', async () => {
    const pkg = {
      name: 'test-vite-app',
      devDependencies: {
        vite: '^5.0.0',
      },
      dependencies: {
        react: '^18.2.0',
      },
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));
    fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '');

    const result = await scanProjectFolder(tempDir);
    expect(result.packageManager).toBe('pnpm');
    expect(result.framework?.id).toBe('vite-react');
    expect(result.framework?.vercelCompatible).toBe(true);
  });

  it('should detect sensitive files like .env and private keys', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'DATABASE_URL=postgres://...');
    fs.writeFileSync(path.join(tempDir, 'server.key'), '-----BEGIN PRIVATE KEY-----');

    const result = await scanProjectFolder(tempDir);
    expect(result.sensitiveFiles.length).toBe(2);
    expect(result.sensitiveFiles.some((f) => f.path === '.env')).toBe(true);
    expect(result.sensitiveFiles.some((f) => f.path === 'server.key')).toBe(true);
    // Because no .gitignore exists, it should trigger a warning
    expect(result.warnings.some((w) => w.includes('sensitive file'))).toBe(true);
  });

  it('should detect monorepo structures', async () => {
    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"');
    const appsDir = path.join(tempDir, 'apps', 'web');
    fs.mkdirSync(appsDir, { recursive: true });
    fs.writeFileSync(path.join(appsDir, 'package.json'), JSON.stringify({ name: 'web' }));

    const result = await scanProjectFolder(tempDir);
    expect(result.isMonorepo).toBe(true);
    expect(result.monorepoPackages).toContain('apps/web');
  });

  it('should warn about standalone Node server compatibility on Vercel', async () => {
    const pkg = {
      name: 'express-server',
      dependencies: {
        express: '^4.18.0',
      },
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg));

    const result = await scanProjectFolder(tempDir);
    expect(result.framework?.id).toBe('node-backend');
    expect(result.framework?.vercelCompatible).toBe(false);
    expect(result.warnings.some((w) => w.includes('Node.js server'))).toBe(true);
  });
});
