import fs from 'fs';
import path from 'path';
import { ProjectInspection, FrameworkInfo, SensitiveFileWarning, GitRemoteInfo, GitFileInfo } from '../../src/types/api';
import { runProcess } from './processRunner';
import { logger } from './logger';

const SENSITIVE_FILE_NAMES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.staging',
  '.env.test',
  'credentials.json',
  'serviceAccountKey.json',
  'id_rsa',
  'id_ed25519',
  'secret.key',
];

const SENSITIVE_EXTENSIONS = ['.pem', '.key', '.pfx', '.p12', '.keystore'];

export async function scanProjectFolder(folderPath: string): Promise<ProjectInspection> {
  const warnings: string[] = [];
  const normalizedPath = path.resolve(folderPath);

  logger.info('projectScanner', `Scanning folder: ${normalizedPath}`);

  // 1. Check folder existence and accessibility
  let accessible = false;
  try {
    const stat = fs.statSync(normalizedPath);
    accessible = stat.isDirectory();
  } catch (err) {
    logger.warn('projectScanner', `Folder is not accessible: ${normalizedPath}`, err);
    return {
      folderPath: normalizedPath,
      folderName: path.basename(normalizedPath),
      accessible: false,
      gitInstalled: false,
      isGitRepo: false,
      availableBranches: [],
      remotes: [],
      hasUncommittedChanges: false,
      uncommittedFiles: [],
      hasCommits: false,
      commitCount: 0,
      hasPackageJson: false,
      hasGitignore: false,
      sensitiveFiles: [],
      isMonorepo: false,
      warnings: ['Directory does not exist or is not readable'],
    };
  }

  // 2. Git CLI presence
  let gitInstalled = false;
  let gitVersion: string | undefined;
  try {
    const gitRes = await runProcess('git', ['--version']);
    if (gitRes.code === 0) {
      gitInstalled = true;
      gitVersion = gitRes.stdout;
    }
  } catch {
    gitInstalled = false;
    warnings.push('Git is not installed or not in PATH.');
  }

  // 3. Git repository state
  const gitDir = path.join(normalizedPath, '.git');
  let isGitRepo = false;
  let currentBranch: string | undefined;
  const availableBranches: string[] = [];
  const remotes: GitRemoteInfo[] = [];
  let hasUncommittedChanges = false;
  const uncommittedFiles: GitFileInfo[] = [];
  let hasCommits = false;
  let commitCount = 0;

  if (fs.existsSync(gitDir) && gitInstalled) {
    try {
      // Check if git considers it a repo
      const repoCheck = await runProcess('git', ['rev-parse', '--is-inside-work-tree'], { cwd: normalizedPath });
      isGitRepo = repoCheck.code === 0 && repoCheck.stdout === 'true';

      if (isGitRepo) {
        // Detect current branch
        const branchRes = await runProcess('git', ['branch', '--show-current'], { cwd: normalizedPath });
        if (branchRes.code === 0 && branchRes.stdout) {
          currentBranch = branchRes.stdout;
        } else {
          // Might be in detached HEAD or newly initiated repo without commits
          const headRes = await runProcess('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: normalizedPath });
          if (headRes.code === 0 && headRes.stdout) {
            currentBranch = headRes.stdout;
          }
        }

        // List branches
        const branchListRes = await runProcess('git', ['branch', '--list'], { cwd: normalizedPath });
        if (branchListRes.code === 0) {
          const lines = branchListRes.stdout.split('\n');
          for (const line of lines) {
            const clean = line.replace('*', '').trim();
            if (clean) availableBranches.push(clean);
          }
        }

        // Remotes
        const remoteRes = await runProcess('git', ['remote', '-v'], { cwd: normalizedPath });
        if (remoteRes.code === 0 && remoteRes.stdout) {
          const remoteMap = new Map<string, { fetch: string; push: string }>();
          const lines = remoteRes.stdout.split('\n');
          for (const line of lines) {
            // format: origin https://github.com/user/repo (fetch)
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const name = parts[0];
              const url = parts[1];
              const type = parts[2];
              if (!remoteMap.has(name)) {
                remoteMap.set(name, { fetch: '', push: '' });
              }
              const obj = remoteMap.get(name)!;
              if (type.includes('fetch')) obj.fetch = url;
              if (type.includes('push')) obj.push = url;
            }
          }
          for (const [name, urls] of remoteMap.entries()) {
            remotes.push({
              name,
              fetchUrl: urls.fetch,
              pushUrl: urls.push || urls.fetch,
            });
          }
        }

        // Check commits
        const commitCheck = await runProcess('git', ['rev-list', '--count', 'HEAD'], { cwd: normalizedPath });
        if (commitCheck.code === 0) {
          commitCount = parseInt(commitCheck.stdout, 10) || 0;
          hasCommits = commitCount > 0;
        } else {
          hasCommits = false;
          commitCount = 0;
        }

        // Check uncommitted changes
        const statusRes = await runProcess('git', ['status', '--porcelain'], { cwd: normalizedPath });
        if (statusRes.code === 0) {
          const lines = statusRes.stdout.split('\n').filter(Boolean);
          hasUncommittedChanges = lines.length > 0;
          for (const l of lines.slice(0, 50)) {
            const status = l.substring(0, 2).trim();
            const filePath = l.substring(3).trim();
            uncommittedFiles.push({ path: filePath, status });
          }
        }
      }
    } catch (err) {
      logger.warn('projectScanner', 'Error inspecting Git repository details', err);
    }
  }

  // 4. Inspect .gitignore
  const gitignorePath = path.join(normalizedPath, '.gitignore');
  let hasGitignore = false;
  let existingGitignoreContent: string | undefined;
  if (fs.existsSync(gitignorePath)) {
    hasGitignore = true;
    try {
      existingGitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    } catch {
      // ignore
    }
  }

  // 5. Package manifest & framework detection
  const packageJsonPath = path.join(normalizedPath, 'package.json');
  let hasPackageJson = false;
  let packageManager: ProjectInspection['packageManager'] = 'none';
  let framework: FrameworkInfo | undefined;

  // Detect package manager
  if (fs.existsSync(path.join(normalizedPath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(normalizedPath, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(normalizedPath, 'bun.lockb')) || fs.existsSync(path.join(normalizedPath, 'bun.lock'))) {
    packageManager = 'bun';
  } else if (fs.existsSync(path.join(normalizedPath, 'package-lock.json'))) {
    packageManager = 'npm';
  }

  if (fs.existsSync(packageJsonPath)) {
    hasPackageJson = true;
    if (packageManager === 'none') {
      packageManager = 'npm';
    }
    try {
      const pkgRaw = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      if (allDeps['next']) {
        framework = {
          id: 'nextjs',
          name: 'Next.js',
          vercelCompatible: true,
          buildCommand: 'npm run build',
          outputDirectory: '.next',
          notes: 'Native Vercel support with Edge and Serverless functions.',
        };
      } else if (allDeps['vite']) {
        if (allDeps['react']) {
          framework = {
            id: 'vite-react',
            name: 'React (Vite)',
            vercelCompatible: true,
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
          };
        } else if (allDeps['vue']) {
          framework = {
            id: 'vite-vue',
            name: 'Vue (Vite)',
            vercelCompatible: true,
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
          };
        } else if (allDeps['svelte']) {
          framework = {
            id: 'vite-svelte',
            name: 'Svelte (Vite)',
            vercelCompatible: true,
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
          };
        } else {
          framework = {
            id: 'vite',
            name: 'Vite',
            vercelCompatible: true,
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
          };
        }
      } else if (allDeps['astro']) {
        framework = {
          id: 'astro',
          name: 'Astro',
          vercelCompatible: true,
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
        };
      } else if (allDeps['nuxt']) {
        framework = {
          id: 'nuxt',
          name: 'Nuxt',
          vercelCompatible: true,
          buildCommand: 'npm run build',
          outputDirectory: '.output/public',
        };
      } else if (allDeps['@remix-run/react'] || allDeps['@remix-run/node']) {
        framework = {
          id: 'remix',
          name: 'Remix',
          vercelCompatible: true,
          buildCommand: 'npm run build',
        };
      } else if (allDeps['express'] || allDeps['@nestjs/core'] || allDeps['fastify']) {
        framework = {
          id: 'node-backend',
          name: 'Node.js Backend Server',
          vercelCompatible: false,
          notes: 'Continuous background Node servers (Express/Nest/Fastify) require serverless adaptation or Docker on Vercel.',
        };
        warnings.push('This project appears to be a standalone Node.js server. Vercel is optimized for static sites and serverless functions.');
      } else {
        framework = {
          id: 'other-node',
          name: 'Generic Node.js',
          vercelCompatible: true,
          buildCommand: pkg.scripts?.build ? 'npm run build' : undefined,
          outputDirectory: fs.existsSync(path.join(normalizedPath, 'dist')) ? 'dist' : undefined,
        };
      }
    } catch {
      warnings.push('Failed to parse package.json. JSON might be malformed.');
    }
  } else {
    // Check for static HTML site
    if (fs.existsSync(path.join(normalizedPath, 'index.html'))) {
      framework = {
        id: 'html-static',
        name: 'Static HTML / CSS / JS',
        vercelCompatible: true,
        outputDirectory: '.',
        notes: 'Deployable directly to Vercel static hosting.',
      };
    }
  }

  // 6. Sensitive files detection
  const sensitiveFiles: SensitiveFileWarning[] = [];
  try {
    const rootFiles = fs.readdirSync(normalizedPath);
    for (const file of rootFiles) {
      const lower = file.toLowerCase();
      const ext = path.extname(lower);

      if (SENSITIVE_FILE_NAMES.includes(file) || SENSITIVE_FILE_NAMES.includes(lower)) {
        sensitiveFiles.push({
          path: file,
          reason: 'Potential secrets or environment variables file.',
          severity: 'critical',
        });
      } else if (SENSITIVE_EXTENSIONS.includes(ext)) {
        sensitiveFiles.push({
          path: file,
          reason: `Private key or security credential certificate (${ext}).`,
          severity: 'critical',
        });
      }
    }
  } catch (err) {
    logger.warn('projectScanner', 'Error reading directory for sensitive files', err);
  }

  // Check if .gitignore ignores .env
  if (sensitiveFiles.length > 0) {
    if (!hasGitignore) {
      warnings.push(`Project contains ${sensitiveFiles.length} sensitive file(s) but has no .gitignore!`);
    } else if (existingGitignoreContent && !existingGitignoreContent.includes('.env')) {
      warnings.push('Sensitive file(s) found and .gitignore does NOT include .env!');
    }
  }

  // 7. Monorepo detection
  let isMonorepo = false;
  const monorepoPackages: string[] = [];

  const monorepoMarkers = [
    'pnpm-workspace.yaml',
    'lerna.json',
    'turbo.json',
    'nx.json',
  ];

  for (const marker of monorepoMarkers) {
    if (fs.existsSync(path.join(normalizedPath, marker))) {
      isMonorepo = true;
      break;
    }
  }

  // Check nested packages / apps folder
  const possibleSubdirs = ['apps', 'packages', 'frontend', 'client'];
  for (const sub of possibleSubdirs) {
    const fullSub = path.join(normalizedPath, sub);
    if (fs.existsSync(fullSub) && fs.statSync(fullSub).isDirectory()) {
      try {
        const entries = fs.readdirSync(fullSub);
        for (const entry of entries) {
          const entryPkg = path.join(fullSub, entry, 'package.json');
          if (fs.existsSync(entryPkg)) {
            isMonorepo = true;
            monorepoPackages.push(`${sub}/${entry}`);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 8. Generate suggested .gitignore if none exists or missing essentials
  const suggestedGitignore = generateSuggestedGitignore(framework?.id);

  return {
    folderPath: normalizedPath,
    folderName: path.basename(normalizedPath),
    accessible,
    gitInstalled,
    gitVersion,
    isGitRepo,
    currentBranch,
    availableBranches,
    remotes,
    hasUncommittedChanges,
    uncommittedFiles,
    hasCommits,
    commitCount,
    hasPackageJson,
    packageManager,
    framework,
    hasGitignore,
    existingGitignoreContent,
    sensitiveFiles,
    isMonorepo,
    monorepoPackages: monorepoPackages.length > 0 ? monorepoPackages : undefined,
    suggestedGitignore,
    warnings,
  };
}

function generateSuggestedGitignore(frameworkId?: string): string {
  const common = `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables & secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.pem
*.key

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor & OS files
.DS_Store
Thumbs.db
.vscode/
.idea/
`;

  if (frameworkId === 'nextjs') {
    return `${common}
# Next.js
.next/
out/
build/
`;
  }

  return `${common}
# Production build outputs
dist/
build/
`;
}
