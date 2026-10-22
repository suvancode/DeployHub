import { spawn } from 'child_process';
import { ActionResult } from '../../src/types/api';
import { logger } from './logger';
import { configManager } from './configManager';

export function openInTerminal(folderPath: string): Promise<ActionResult<void>> {
  return new Promise((resolve) => {
    logger.info('terminalHelper', `Opening terminal in folder: ${folderPath}`);

    const settings = configManager.getSettings();
    const preferred = settings.preferredTerminal || 'wt';

    // Safe invocation mapping for Windows terminals
    // We launch detached so the main app isn't blocked by the terminal session
    let cmd: string;
    let args: string[];

    if (preferred === 'wt') {
      // Windows Terminal
      cmd = 'wt';
      args = ['-d', folderPath];
    } else if (preferred === 'pwsh') {
      cmd = 'pwsh';
      args = ['-NoExit', '-Command', `Set-Location -LiteralPath '${folderPath}'`];
    } else if (preferred === 'cmd') {
      cmd = 'cmd';
      args = ['/K', `cd /d "${folderPath}"`];
    } else {
      // Default powershell
      cmd = 'powershell';
      args = ['-NoExit', '-Command', `Set-Location -LiteralPath '${folderPath}'`];
    }

    try {
      const child = spawn(cmd, args, {
        detached: true,
        stdio: 'ignore',
        shell: true, // Need shell to launch desktop window on Windows
      });

      child.on('error', (err) => {
        logger.warn('terminalHelper', `Failed to open preferred terminal ${preferred}, falling back to explorer/cmd`, err);
        // Fallback to cmd
        try {
          const fallback = spawn('cmd', ['/K', `cd /d "${folderPath}"`], {
            detached: true,
            stdio: 'ignore',
            shell: true,
          });
          fallback.unref();
          resolve({ success: true });
        } catch (fallbackErr: unknown) {
          const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          resolve({
            success: false,
            error: {
              code: 'TERMINAL_ERROR',
              message: 'Failed to open terminal window.',
              why: msg,
              modified: false,
              nextStep: 'You can manually open your terminal and navigate to the project directory.',
            },
          });
        }
      });

      child.unref();
      resolve({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('terminalHelper', 'Terminal launch exception', err);
      resolve({
        success: false,
        error: {
          code: 'TERMINAL_ERROR',
          message: 'Failed to open terminal.',
          why: msg,
          modified: false,
          nextStep: 'Check terminal configuration in Settings.',
        },
      });
    }
  });
}

export function openTerminalWithCommand(command: string, folderPath?: string): Promise<ActionResult<void>> {
  return new Promise((resolve) => {
    logger.info('terminalHelper', `Opening terminal with command: ${command}`);

    const settings = configManager.getSettings();
    const preferred = settings.preferredTerminal || 'powershell';
    const cwd = folderPath || process.cwd();

    let cmd: string;
    let args: string[];

    if (preferred === 'wt') {
      cmd = 'wt';
      args = ['-d', cwd, 'powershell', '-NoExit', '-Command', command];
    } else if (preferred === 'pwsh') {
      cmd = 'pwsh';
      args = ['-NoExit', '-Command', `Set-Location -LiteralPath '${cwd}'; ${command}`];
    } else if (preferred === 'cmd') {
      cmd = 'cmd';
      args = ['/K', `cd /d "${cwd}" && ${command}`];
    } else {
      cmd = 'powershell';
      args = ['-NoExit', '-Command', `Set-Location -LiteralPath '${cwd}'; ${command}`];
    }

    try {
      const child = spawn(cmd, args, {
        detached: true,
        stdio: 'ignore',
        shell: true,
      });

      child.on('error', (err) => {
        logger.warn('terminalHelper', `Failed to open terminal ${preferred}, falling back to powershell`, err);
        try {
          const fallback = spawn('powershell', ['-NoExit', '-Command', command], {
            detached: true,
            stdio: 'ignore',
            shell: true,
          });
          fallback.unref();
          resolve({ success: true });
        } catch (fallbackErr: unknown) {
          const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          resolve({
            success: false,
            error: {
              code: 'TERMINAL_ERROR',
              message: 'Failed to open terminal window.',
              why: msg,
              modified: false,
            },
          });
        }
      });

      child.unref();
      resolve({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('terminalHelper', 'Terminal launch exception', err);
      resolve({
        success: false,
        error: {
          code: 'TERMINAL_ERROR',
          message: 'Failed to open terminal.',
          why: msg,
          modified: false,
        },
      });
    }
  });
}
