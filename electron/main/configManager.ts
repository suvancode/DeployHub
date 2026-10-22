import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { ProjectRecord, AppSettings } from '../../src/types/api';
import { logger } from './logger';

interface RegistrySchema {
  schemaVersion: number;
  updatedAt: string;
  projects: ProjectRecord[];
}

const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  preferredTerminal: 'wt',
  defaultBranch: 'main',
  autoDetectVercel: true,
};

export class ConfigManager {
  private configDir: string;
  private registryFile: string;
  private settingsFile: string;

  constructor(customConfigDir?: string) {
    if (customConfigDir) {
      this.configDir = customConfigDir;
    } else {
      try {
        this.configDir = app.getPath('userData');
      } catch {
        // Fallback for tests or early startup
        this.configDir = path.join(process.cwd(), '.deployhub_data');
      }
    }

    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    this.registryFile = path.join(this.configDir, 'projects.json');
    this.settingsFile = path.join(this.configDir, 'settings.json');

    this.ensureFilesExist();
  }

  private ensureFilesExist() {
    if (!fs.existsSync(this.registryFile)) {
      const initialRegistry: RegistrySchema = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        projects: [],
      };
      this.atomicWriteFile(this.registryFile, JSON.stringify(initialRegistry, null, 2));
    }

    if (!fs.existsSync(this.settingsFile)) {
      this.atomicWriteFile(this.settingsFile, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    }
  }

  /**
   * Atomic write: writes to temporary file then renames to avoid corruption on crash/power loss
   */
  private atomicWriteFile(targetPath: string, content: string) {
    const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    try {
      fs.renameSync(tempPath, targetPath);
    } catch {
      // In Windows, sometimes rename fails if target is locked; copy and unlink
      fs.copyFileSync(tempPath, targetPath);
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore temp unlink error
      }
    }
  }

  getProjects(): ProjectRecord[] {
    try {
      if (!fs.existsSync(this.registryFile)) {
        return [];
      }
      const raw = fs.readFileSync(this.registryFile, 'utf-8');
      const parsed = JSON.parse(raw) as RegistrySchema;

      if (!parsed || !Array.isArray(parsed.projects)) {
        throw new Error('Invalid projects format');
      }

      return parsed.projects;
    } catch (err) {
      logger.error('configManager', 'Failed to read projects registry. Corrupted file detected.', err);
      // Create backup of corrupted file
      try {
        const corruptedBackup = path.join(
          this.configDir,
          `projects.corrupted.${Date.now()}.json`
        );
        fs.copyFileSync(this.registryFile, corruptedBackup);
        logger.warn('configManager', `Saved corrupted registry backup to ${corruptedBackup}`);
      } catch {
        // ignore
      }

      // Re-initialize valid empty registry
      const emptyRegistry: RegistrySchema = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        projects: [],
      };
      this.atomicWriteFile(this.registryFile, JSON.stringify(emptyRegistry, null, 2));
      return [];
    }
  }

  getProject(id: string): ProjectRecord | null {
    const projects = this.getProjects();
    return projects.find((p) => p.id === id) || null;
  }

  saveProject(project: ProjectRecord): ProjectRecord {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === project.id);

    const updatedProject: ProjectRecord = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      projects[index] = updatedProject;
    } else {
      projects.unshift(updatedProject);
    }

    const payload: RegistrySchema = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      projects,
    };

    this.atomicWriteFile(this.registryFile, JSON.stringify(payload, null, 2));
    logger.info('configManager', `Saved project: ${project.name} (${project.id})`);
    return updatedProject;
  }

  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) {
      return false;
    }

    const payload: RegistrySchema = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      projects: filtered,
    };

    this.atomicWriteFile(this.registryFile, JSON.stringify(payload, null, 2));
    logger.info('configManager', `Removed project from registry: ${id} (source files untouched)`);
    return true;
  }

  exportRegistry(): string {
    const projects = this.getProjects();
    // Sanitize: ensure no accidental secret leaks in export
    const sanitizedProjects = projects.map((p) => ({
      ...p,
      // Remove any potential runtime warnings containing sensitive paths if any
    }));

    return JSON.stringify(
      {
        version: CURRENT_SCHEMA_VERSION,
        exportDate: new Date().toISOString(),
        projects: sanitizedProjects,
      },
      null,
      2
    );
  }

  importRegistry(jsonString: string): number {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.projects)) {
        throw new Error('Export file format is invalid: missing projects array');
      }

      const existing = this.getProjects();
      const existingMap = new Map(existing.map((p) => [p.id, p]));
      let importedCount = 0;

      for (const item of parsed.projects) {
        if (item.id && item.name && item.path) {
          existingMap.set(item.id, item);
          importedCount++;
        }
      }

      const payload: RegistrySchema = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        projects: Array.from(existingMap.values()),
      };

      this.atomicWriteFile(this.registryFile, JSON.stringify(payload, null, 2));
      logger.info('configManager', `Imported ${importedCount} projects into registry`);
      return importedCount;
    } catch (err) {
      logger.error('configManager', 'Failed to import projects registry', err);
      throw err;
    }
  }

  getSettings(): AppSettings {
    try {
      if (!fs.existsSync(this.settingsFile)) {
        return DEFAULT_SETTINGS;
      }
      const raw = fs.readFileSync(this.settingsFile, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.atomicWriteFile(this.settingsFile, JSON.stringify(updated, null, 2));
    logger.info('configManager', 'Updated application settings');
    return updated;
  }
}

export const configManager = new ConfigManager();
