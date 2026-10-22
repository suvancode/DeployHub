import { spawn, SpawnOptions } from 'child_process';
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

    const spawnOptions: SpawnOptions = {
      cwd,
      env,
      shell: false, // Critical security requirement: do NOT invoke shell
      windowsHide: true,
    };

    let child;
    try {
      child = spawn(executable, args, spawnOptions);
    } catch (err) {
      logger.error('processRunner', `Failed to spawn ${executable}`, err);
      return reject(err);
    }

    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
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
      logger.error('processRunner', `Process error for ${executable}`, err);
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
