import React, { useState, useEffect, useCallback } from 'react';
import {
  ProjectRecord,
  GitHubAccountStatus,
  VercelStatus,
  NetlifyStatus,
  LogEntry,
  AppSettings,
} from './types/api';
import { Sidebar, NavItemId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatusBar } from './components/layout/StatusBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectWorkspace } from './components/dashboard/ProjectWorkspace';
import { SetupWizard } from './components/setup-wizard/SetupWizard';
import { ManualPushPage } from './components/tools/ManualPushPage';
import { BranchesRemotesPage } from './components/tools/BranchesRemotesPage';
import { VercelProjectsPage } from './components/tools/VercelProjectsPage';
import { RecentProjectsPage } from './components/tools/RecentProjectsPage';
import { LogViewer } from './components/logs/LogViewer';
import { SettingsPage } from './components/settings/SettingsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavItemId>('all-projects');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubAccountStatus | null>(null);
  const [vercelStatus, setVercelStatus] = useState<VercelStatus | null>(null);
  const [netlifyStatus, setNetlifyStatus] = useState<NetlifyStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    preferredTerminal: 'wt',
    defaultBranch: 'main',
    autoDetectVercel: true,
  });

  // Load initial data from Electron Main process
  const refreshProjects = useCallback(async () => {
    try {
      if (window.deployHubAPI) {
        const list = await window.deployHubAPI.getProjects();
        setProjects(list);
        if (selectedProject) {
          const updated = list.find((p) => p.id === selectedProject.id);
          if (updated) setSelectedProject(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  }, [selectedProject]);

  const refreshStatuses = useCallback(async () => {
    try {
      if (window.deployHubAPI) {
        const [gh, vc, nl] = await Promise.all([
          window.deployHubAPI.checkGitHubStatus(),
          window.deployHubAPI.checkVercelStatus(),
          window.deployHubAPI.checkNetlifyStatus(),
        ]);
        setGithubStatus(gh);
        setVercelStatus(vc);
        setNetlifyStatus(nl);
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
      if (selectedProject?.id === id) setSelectedProject(null);
      await refreshProjects();
    }
  };

  const handleSaveProject = async (project: ProjectRecord) => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.saveProject(project);
      setSelectedProject(project);
      await refreshProjects();
    }
  };

  const handleSwitchGitHubAccount = async (username: string) => {
    if (window.deployHubAPI) {
      const res = await window.deployHubAPI.switchGitHubAccount(username);
      if (res.success) {
        await refreshStatuses();
      }
    }
  };

  const handleLoginGitHub = async () => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.loginGitHub();
      await refreshStatuses();
    }
  };

  const handleLoginVercel = async () => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.loginVercel();
      await refreshStatuses();
    }
  };

  const handleLoginNetlify = async () => {
    if (window.deployHubAPI) {
      await window.deployHubAPI.loginNetlify();
      await refreshStatuses();
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

  const handleSelectProject = (project: ProjectRecord) => {
    setSelectedProject(project);
  };

  const getPageTitle = () => {
    if (selectedProject && currentTab === 'all-projects') {
      return selectedProject.name;
    }
    switch (currentTab) {
      case 'all-projects':
        return 'All Projects';
      case 'recent-projects':
        return 'Recent Projects';
      case 'repo-setup':
        return 'Repository Setup';
      case 'branches-remotes':
        return 'Branches & Remotes';
      case 'manual-push':
        return 'Manual Push Commands';
      case 'vercel-projects':
      case 'deployment-status':
        return 'Vercel Deployment';
      case 'activity-logs':
        return 'Activity Logs';
      case 'settings':
        return 'Settings';
      default:
        return 'DeployHub';
    }
  };

  const getBreadcrumb = () => {
    if (selectedProject && currentTab === 'all-projects') {
      return 'All Projects';
    }
    switch (currentTab) {
      case 'all-projects':
      case 'recent-projects':
        return 'Workspace';
      case 'repo-setup':
      case 'branches-remotes':
      case 'manual-push':
        return 'Git Tools';
      case 'vercel-projects':
      case 'deployment-status':
        return 'Deployment';
      default:
        return undefined;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-devtoys-main text-devtoys-primary font-sans antialiased">
      {/* Main 2-part content area: Sidebar + Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab !== 'all-projects') {
              setSelectedProject(null);
            }
            setCurrentTab(tab);
          }}
          projectCount={projects.length}
        />

        {/* Workspace Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-devtoys-content overflow-hidden">
          <Header
            title={getPageTitle()}
            breadcrumb={getBreadcrumb()}
            githubStatus={githubStatus}
            vercelStatus={vercelStatus}
            netlifyStatus={netlifyStatus}
            onRefreshStatus={refreshStatuses}
            onSwitchGitHubAccount={handleSwitchGitHubAccount}
            onLoginGitHub={handleLoginGitHub}
            onLoginVercel={handleLoginVercel}
            onLoginNetlify={handleLoginNetlify}
          />

          <main className="flex-1 overflow-y-auto">
            {/* View 1: All Projects (or Selected Project Workspace) */}
            {currentTab === 'all-projects' && (
              selectedProject ? (
                <ProjectWorkspace
                  project={selectedProject}
                  githubStatus={githubStatus}
                  vercelStatus={vercelStatus}
                  netlifyStatus={netlifyStatus}
                  onRefreshStatuses={refreshStatuses}
                  onBack={() => setSelectedProject(null)}
                  onOpenFolder={handleOpenFolder}
                  onOpenTerminal={handleOpenTerminal}
                  onOpenUrl={handleOpenUrl}
                  onReconfigure={(p) => {
                    setSelectedProject(p);
                    setCurrentTab('repo-setup');
                  }}
                  onSaveProject={handleSaveProject}
                />
              ) : (
                <DashboardView
                  projects={projects}
                  onStartNewSetup={() => {
                    setSelectedProject(null);
                    setCurrentTab('repo-setup');
                  }}
                  onSelectProject={handleSelectProject}
                  onOpenFolder={handleOpenFolder}
                  onOpenTerminal={handleOpenTerminal}
                  onOpenUrl={handleOpenUrl}
                  onDeleteProject={handleDeleteProject}
                  onRefresh={refreshProjects}
                />
              )
            )}

            {/* View 2: Recent Projects */}
            {currentTab === 'recent-projects' && (
              <RecentProjectsPage
                projects={projects}
                onSelectProject={(p) => {
                  setSelectedProject(p);
                  setCurrentTab('all-projects');
                }}
                onOpenFolder={handleOpenFolder}
                onOpenTerminal={handleOpenTerminal}
                onOpenUrl={handleOpenUrl}
                onDeleteProject={(id) => handleDeleteProject(id)}
              />
            )}

            {/* View 3: Repository Setup (Setup Wizard) */}
            {currentTab === 'repo-setup' && (
              <SetupWizard
                initialProject={selectedProject}
                githubStatus={githubStatus}
                vercelStatus={vercelStatus}
                onRefreshGitHubStatus={refreshStatuses}
                onRefreshVercelStatus={refreshStatuses}
                onOpenTerminal={handleOpenTerminal}
                onSaveProject={handleSaveProject}
                onCloseWizard={() => setCurrentTab('all-projects')}
              />
            )}

            {/* View 4: Branches & Remotes */}
            {currentTab === 'branches-remotes' && (
              <BranchesRemotesPage
                projects={projects}
                selectedProject={selectedProject}
                onOpenUrl={handleOpenUrl}
              />
            )}

            {/* View 5: Manual Push Commands */}
            {currentTab === 'manual-push' && (
              <ManualPushPage
                projects={projects}
                selectedProject={selectedProject}
                onOpenTerminal={handleOpenTerminal}
              />
            )}

            {/* View 6 & 7: Vercel Deployment */}
            {(currentTab === 'vercel-projects' || currentTab === 'deployment-status') && (
              <VercelProjectsPage
                projects={projects}
                vercelStatus={vercelStatus}
                onRefreshStatus={refreshStatuses}
                onOpenUrl={handleOpenUrl}
                onSelectProject={(p) => {
                  setSelectedProject(p);
                  setCurrentTab('all-projects');
                }}
              />
            )}

            {/* View 8: Activity Logs */}
            {currentTab === 'activity-logs' && (
              <LogViewer
                logs={logs}
                onRefreshLogs={refreshLogs}
                onClearLogs={handleClearLogs}
              />
            )}

            {/* View 9: Settings */}
            {currentTab === 'settings' && (
              <SettingsPage
                settings={settings}
                githubStatus={githubStatus}
                vercelStatus={vercelStatus}
                netlifyStatus={netlifyStatus}
                onSaveSettings={handleSaveSettings}
                onRefreshStatuses={refreshStatuses}
                onExportRegistry={handleExportRegistry}
                onImportRegistry={handleImportRegistry}
                onSwitchGitHubAccount={handleSwitchGitHubAccount}
                onLoginGitHub={handleLoginGitHub}
                onLoginVercel={handleLoginVercel}
                onLoginNetlify={handleLoginNetlify}
              />
            )}
          </main>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        selectedProjectName={selectedProject?.name || null}
        githubStatus={githubStatus}
        vercelStatus={vercelStatus}
      />
    </div>
  );
};
