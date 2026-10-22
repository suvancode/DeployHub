import { describe, it, expect } from 'vitest';
import { logger } from '../electron/main/logger';

describe('Logger', () => {
  it('should record log entries in buffer', () => {
    logger.clear();
    logger.info('test-module', 'Test info message');
    logger.warn('test-module', 'Test warn message');
    logger.error('test-module', 'Test error message');

    const entries = logger.getEntries();
    expect(entries.length).toBe(3);
    expect(entries[0].level).toBe('info');
    expect(entries[0].message).toBe('Test info message');
    expect(entries[1].level).toBe('warn');
    expect(entries[2].level).toBe('error');
  });

  it('should redact sensitive tokens from log messages', () => {
    logger.clear();
    const secretToken = 'gho_123456789012345678901234567890123456';
    logger.info('github', `Using token: ${secretToken}`);

    const entries = logger.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].message).not.toContain(secretToken);
    expect(entries[0].message).toContain('***REDACTED***');
  });

  it('should redact secrets in key-value format', () => {
    logger.clear();
    logger.info('auth', 'password=SuperSecretPassword123');
    const entries = logger.getEntries();
    expect(entries[0].message).not.toContain('SuperSecretPassword123');
    expect(entries[0].message).toContain('***REDACTED***');
  });
});
