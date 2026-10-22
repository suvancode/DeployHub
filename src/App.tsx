import React, { useState, useEffect, useCallback } from 'react';
import {
  ProjectRecord,
  GitHubAccountStatus,
  VercelStatus,
  LogEntry,
  AppSettings,
} from './types/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { SetupWizard } from './components/setup-wizard/SetupWizard';
import { LogViewer } from './components/logs/LogViewer';
import { SettingsModal } from './components/settings/SettingsModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'setup' | 'logs' | 'settings'>('dashboard');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubAccountStatus | null>(null);
  const [vercelStatus, setVercelStatus] = useState<VercelStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    preferredTerminal: 'wt',
    defaultBranch: 'main',
    autoDetectVercel: true,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSetupProject, setActiveSetupProject] = useState<ProjectRecord | null>(null);

  // Load initial data from Electron Main process
  const refreshProjects = useCallback(async () => {
    try {
      if (window.deployHubAPI) {
        const list = await window.deployHubAPI.getProjects();
        setProjects(list);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  }, []);

  const refreshStatuses = useCallback(async () => {
    try {
      if (window.deployHubAPI) {
        const [gh, vc] = await Promise.all([
          window.deployHubAPI.checkGitHubStatus(),
          window.deployHubAPI.checkVercelStatus(),
        ]);
        setGithubStatus(gh);
        setVercelStatus(vc);
      }
    } catch (err) {
      console.error('Failed to load CLI statuses', err);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      if (window.deployHubAPI) {
        const l = await window.deployHubAPI.getLogs();
        setLogs(l);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      if (window.deployHubAPI) {
        const s = await window.deployHubAPI.getSettings();
        setSettings(s);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
    refreshStatuses();
    refreshLogs();
    refreshSettings();
  }, [refreshProjects, refreshStatuses, refreshLogs, refreshSettings]);

  // Actions
  const handleOpenFolder = async (path: string) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.openInExplorer(path);
    }
  };

  const handleOpenTerminal = async (path: string) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.openInTerminal(path);
    }
  };

  const handleOpenUrl = async (url: string) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.openExternalUrl(url);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.deleteProject(id);
      await refreshProjects();
    }
  };

  const handleSaveProject = async (project: ProjectRecord) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.saveProject(project);
      await refreshProjects();
    }
  };

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.saveSettings(newSettings);
      await refreshSettings();
    }
  };

  const handleClearLogs = async () => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.clearLogs();
      await refreshLogs();
    }
  };

  const handleExportRegistry = async () => {
    if (window.deployHubAPI) {
      const res = await window.deployHubAPI.exportRegistry();
      if (res.success && res.data) {
        // Trigger browser download of JSON file
        const blob = new Blob([res.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deployhub-projects-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleImportRegistry = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const text = await file.text();
        if (window.deployHubAPI) {
          const res = await window.deployHubAPI.importRegistry(text);
          if (res.success) {
            alert(`Successfully imported ${res.data} projects!`);
            await refreshProjects();
          } else {
            alert(`Import failed: ${res.error?.message}`);
          }
        }
      }
    };
    input.click();
  };

  const handleStartNewSetup = () => {
    setActiveSetupProject(null);
    setCurrentTab('setup');
  };

  const handleResumeSetup = (project: ProjectRecord) => {
    setActiveSetupProject(project);
    setCurrentTab('setup');
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Project Dashboard';
      case 'setup':
        return activeSetupProject ? `Configure: ${activeSetupProject.name}` : 'Setup New Project';
      case 'logs':
        return 'System & Activity Logs';
      case 'settings':
        return 'Settings';
      default:
        return 'DeployHub';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        projectCount={projects.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getPageTitle()}
          githubStatus={githubStatus}
          vercelStatus={vercelStatus}
          onRefreshStatus={refreshStatuses}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              projects={projects}
              onStartNewSetup={handleStartNewSetup}
              onResumeSetup={handleResumeSetup}
              onOpenFolder={handleOpenFolder}
              onOpenTerminal={handleOpenTerminal}
              onOpenUrl={handleOpenUrl}
              onDeleteProject={handleDeleteProject}
              onExportRegistry={handleExportRegistry}
              onImportRegistry={handleImportRegistry}
            />
          )}

          {currentTab === 'setup' && (
            <SetupWizard
              initialProject={activeSetupProject}
              githubStatus={githubStatus}
              vercelStatus={vercelStatus}
              onRefreshGitHubStatus={refreshStatuses}
              onRefreshVercelStatus={refreshStatuses}
              onOpenTerminal={handleOpenTerminal}
              onSaveProject={handleSaveProject}
              onCloseWizard={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'logs' && (
            <LogViewer
              logs={logs}
              onRefreshLogs={refreshLogs}
              onClearLogs={handleClearLogs}
            />
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        githubStatus={githubStatus}
        vercelStatus={vercelStatus}
        onSaveSettings={handleSaveSettings}
        onExportRegistry={handleExportRegistry}
        onImportRegistry={handleImportRegistry}
      />
    </div>
  );
};
