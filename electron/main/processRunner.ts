import { spawn, execSync, SpawnOptions } from 'child_process';
import { logger } from './logger';

export interface ProcessRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  input?: string;
}

/**
 * Runs an executable safely using an argument array without shell execution.
 * Avoids any shell injection vulnerabilities.
 */
export function runProcess(
  executable: string,
  args: string[],
  options: RunOptions = {}
): Promise<ProcessRunResult> {
  return new Promise((resolve, reject) => {
    const { cwd, timeoutMs = 30000, env = process.env, input } = options;

    logger.debug('processRunner', `Executing: ${executable} ${args.join(' ')} (cwd: ${cwd || 'default'})`);

    let cmd = executable;
    if (process.platform === 'win32') {
      if (cmd === 'npx') cmd = 'npx.cmd';
      else if (cmd === 'npm') cmd = 'npm.cmd';
      else if (cmd === 'vercel') cmd = 'vercel.cmd';
      else if (cmd === 'netlify') cmd = 'netlify.cmd';
    }

    const isWindowsBatch =
      process.platform === 'win32' &&
      (cmd === 'npx' ||
        cmd === 'npx.cmd' ||
        cmd === 'npm' ||
        cmd === 'npm.cmd' ||
        cmd === 'vercel' ||
        cmd === 'vercel.cmd' ||
        cmd === 'netlify' ||
        cmd === 'netlify.cmd' ||
        cmd.toLowerCase().endsWith('.cmd') ||
        cmd.toLowerCase().endsWith('.bat'));

    const spawnOptions: SpawnOptions = {
      cwd,
      env,
      shell: isWindowsBatch,
      windowsHide: true,
    };

    let child;
    try {
      child = spawn(cmd, args, spawnOptions);
    } catch (err) {
      logger.error('processRunner', `Failed to spawn ${cmd}`, err);
      return reject(err);
    }

    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    const killChildTree = () => {
      if (child && child.pid) {
        if (process.platform === 'win32') {
          try {
            execSync(`taskkill /pid ${child.pid} /T /F`, { windowsHide: true, stdio: 'ignore' });
          } catch {
            try {
              child.kill('SIGKILL');
            } catch {
              // ignore
            }
          }
        } else {
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }
      }
    };

    const timer = setTimeout(() => {
      isTimedOut = true;
      killChildTree();
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('error', (err) => {
      clearTimeout(timer);
      killChildTree();
      logger.error('processRunner', `Process error for ${cmd}`, err);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (isTimedOut) {
        const timeoutErr = new Error(`Command timed out after ${timeoutMs}ms: ${executable} ${args.join(' ')}`);
        logger.error('processRunner', timeoutErr.message);
        return reject(timeoutErr);
      }

      const exitCode = code ?? 0;
      if (exitCode !== 0) {
        logger.debug('processRunner', `Command exited with non-zero code ${exitCode}`, { stderr: stderr.trim() });
      }

      resolve({
        code: exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}
