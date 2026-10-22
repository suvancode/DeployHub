import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { LogEntry } from '../../src/types/api';

const SENSITIVE_PATTERNS = [
  { regex: /gho_[a-zA-Z0-9_]{20,}/g, replace: 'gho_***REDACTED***' },
  { regex: /ghp_[a-zA-Z0-9_]{20,}/g, replace: 'ghp_***REDACTED***' },
  { regex: /github_pat_[a-zA-Z0-9_]{25,}/g, replace: 'github_pat_***REDACTED***' },
  { regex: /vercel_[a-zA-Z0-9_]{16,}/g, replace: 'vercel_***REDACTED***' },
  { regex: /Bearer\s+[a-zA-Z0-9._\-]+/gi, replace: 'Bearer ***REDACTED***' },
  { regex: /(password|secret|token)\s*[:=]\s*["']?([^\s"']+)["']?/gi, replace: '$1: ***REDACTED***' },
];

function redactSensitive(text: string): string {
  let redacted = text;
  for (const { regex, replace } of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(regex, replace);
  }
  return redacted;
}

class Logger {
  private logBuffer: LogEntry[] = [];
  private maxBuffer = 1000;
  private logFile: string | null = null;

  init() {
    try {
      const userDataDir = app.getPath('userData');
      const logsDir = path.join(userDataDir, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      const today = new Date().toISOString().split('T')[0];
      this.logFile = path.join(logsDir, `deployhub-${today}.log`);
    } catch {
      // Running in unit test or early initialization
      this.logFile = null;
    }
  }

  private write(level: LogEntry['level'], module: string, message: string, details?: unknown) {
    const safeMessage = redactSensitive(message);
    let safeDetails: unknown = undefined;

    if (details !== undefined) {
      try {
        const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
        safeDetails = JSON.parse(redactSensitive(detailsStr));
      } catch {
        safeDetails = redactSensitive(String(details));
      }
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message: safeMessage,
      details: safeDetails,
    };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBuffer) {
      this.logBuffer.shift();
    }

    // Write to disk
    if (this.logFile) {
      try {
        const line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${entry.details ? ' ' + JSON.stringify(entry.details) : ''}\n`;
        fs.appendFileSync(this.logFile, line, 'utf-8');
      } catch {
        // Disk write failure shouldn't crash the app
      }
    }

    // Console output for dev
    if (process.env.NODE_ENV !== 'production') {
      const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
      console.log(`${color}[${entry.level.toUpperCase()}]\x1b[0m [${module}] ${entry.message}`);
    }
  }

  info(module: string, message: string, details?: unknown) {
    this.write('info', module, message, details);
  }

  warn(module: string, message: string, details?: unknown) {
    this.write('warn', module, message, details);
  }

  error(module: string, message: string, details?: unknown) {
    this.write('error', module, message, details);
  }

  debug(module: string, message: string, details?: unknown) {
    this.write('debug', module, message, details);
  }

  getEntries(): LogEntry[] {
    return [...this.logBuffer];
  }

  clear() {
    this.logBuffer = [];
  }
}

export const logger = new Logger();
