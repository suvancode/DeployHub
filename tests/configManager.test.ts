import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../electron/main/configManager';
import { ProjectRecord } from '../src/types/api';

describe('ConfigManager', () => {
  let tempDir: string;
  let manager: ConfigManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deployhub-test-'));
    manager = new ConfigManager(tempDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should initialize empty registry when file does not exist', () => {
    const projects = manager.getProjects();
    expect(projects).toEqual([]);
  });

  it('should save and retrieve a project record', () => {
    const project: ProjectRecord = {
      id: 'proj-123',
      name: 'My Cool App',
      path: 'C:\\projects\\my-app',
      projectRoot: '.',
      setupStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    manager.saveProject(project);

    const retrieved = manager.getProject('proj-123');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('My Cool App');
    expect(retrieved?.id).toBe('proj-123');
  });

  it('should update existing project record without duplicating', () => {
    const project: ProjectRecord = {
      id: 'proj-123',
      name: 'Original Name',
      path: 'C:\\projects\\my-app',
      projectRoot: '.',
      setupStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    manager.saveProject(project);
    manager.saveProject({
      ...project,
      name: 'Updated Name',
      setupStatus: 'git_configured',
    });

    const all = manager.getProjects();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('Updated Name');
    expect(all[0].setupStatus).toBe('git_configured');
  });

  it('should delete project from registry', () => {
    const project: ProjectRecord = {
      id: 'proj-to-delete',
      name: 'Delete Me',
      path: 'C:\\projects\\del',
      projectRoot: '.',
      setupStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    manager.saveProject(project);
    expect(manager.getProjects().length).toBe(1);

    const deleted = manager.deleteProject('proj-to-delete');
    expect(deleted).toBe(true);
    expect(manager.getProjects().length).toBe(0);
  });

  it('should recover gracefully from corrupted JSON registry', () => {
    const registryFile = path.join(tempDir, 'projects.json');
    // Write invalid corrupted JSON
    fs.writeFileSync(registryFile, '{ broken json syntax ...!@#$');

    const projects = manager.getProjects();
    expect(projects).toEqual([]);

    // Verify backup of corrupted file was created
    const files = fs.readdirSync(tempDir);
    const backupExists = files.some((f) => f.startsWith('projects.corrupted.'));
    expect(backupExists).toBe(true);
  });

  it('should export and import registry correctly', () => {
    const project: ProjectRecord = {
      id: 'export-test-1',
      name: 'Export Project',
      path: 'C:\\projects\\export',
      projectRoot: '.',
      setupStatus: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    manager.saveProject(project);
    const exportedJson = manager.exportRegistry();
    expect(exportedJson).toContain('export-test-1');

    // Create a new manager instance in another directory
    const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'deployhub-test-2-'));
    const manager2 = new ConfigManager(tempDir2);

    expect(manager2.getProjects().length).toBe(0);
    const importedCount = manager2.importRegistry(exportedJson);
    expect(importedCount).toBe(1);
    expect(manager2.getProject('export-test-1')).not.toBeNull();

    try {
      fs.rmSync(tempDir2, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });
});
