import React, { useState } from 'react';
import {
  FolderKanban,
  Clock,
  PlusSquare,
  GitBranch,
  Terminal,
  Globe,
  Activity,
  FileText,
  Sliders,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';

export type NavItemId =
  | 'all-projects'
  | 'recent-projects'
  | 'repo-setup'
  | 'branches-remotes'
  | 'manual-push'
  | 'vercel-projects'
  | 'deployment-status'
  | 'activity-logs'
  | 'settings';

interface NavItemDef {
  id: NavItemId;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

interface SidebarProps {
  currentTab: NavItemId;
  onSelectTab: (tab: NavItemId) => void;
  projectCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  projectCount,
}) => {
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navGroups: NavGroupDef[] = [
    {
      title: 'Workspace',
      items: [
        {
          id: 'all-projects',
          label: 'All Projects',
          icon: <FolderKanban className="w-4 h-4 text-devtoys-accent" />,
          badge: projectCount > 0 ? projectCount : undefined,
        },
        {
          id: 'recent-projects',
          label: 'Recent Projects',
          icon: <Clock className="w-4 h-4 text-devtoys-secondary" />,
        },
      ],
    },
    {
      title: 'Git Tools',
      items: [
        {
          id: 'repo-setup',
          label: 'Repository Setup',
          icon: <PlusSquare className="w-4 h-4 text-devtoys-success" />,
        },
        {
          id: 'branches-remotes',
          label: 'Branches & Remotes',
          icon: <GitBranch className="w-4 h-4 text-devtoys-warning" />,
        },
        {
          id: 'manual-push',
          label: 'Manual Push Commands',
          icon: <Terminal className="w-4 h-4 text-devtoys-accent" />,
        },
      ],
    },
    {
      title: 'Deployment',
      items: [
        {
          id: 'vercel-projects',
          label: 'Vercel Projects',
          icon: <Globe className="w-4 h-4 text-devtoys-accent" />,
        },
        {
          id: 'deployment-status',
          label: 'Deployment Status',
          icon: <Activity className="w-4 h-4 text-devtoys-success" />,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          id: 'activity-logs',
          label: 'Activity Logs',
          icon: <FileText className="w-4 h-4 text-devtoys-secondary" />,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Sliders className="w-4 h-4 text-devtoys-secondary" />,
        },
      ],
    },
  ];

  // Filter groups and items based on search input
  const filteredGroups = navGroups
    .map((group) => {
      if (!search.trim()) return group;
      const filtered = group.items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      );
      return { ...group, items: filtered };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside className="w-60 bg-devtoys-sidebar border-r border-devtoys-border flex flex-col justify-between select-none shrink-0 text-xs">
      {/* Top branding & search */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-12 px-3.5 flex items-center gap-2.5 border-b border-devtoys-border/60">
          <div className="w-6 h-6 rounded bg-devtoys-card border border-devtoys-border flex items-center justify-center text-devtoys-accent shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-devtoys-primary text-xs tracking-tight">DeployHub</span>
            <span className="text-[10px] text-devtoys-muted leading-tight">Git & Vercel Tools</span>
          </div>
        </div>

        {/* Search input */}
        <div className="p-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-devtoys-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search a tool..."
              className="w-full h-7 bg-devtoys-card border border-devtoys-border rounded-md pl-8 pr-7 text-xs text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-devtoys-muted hover:text-devtoys-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation groups list */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-3 pb-3">
        {filteredGroups.map((group) => {
          const isCollapsed = !search && !!collapsedGroups[group.title];

          return (
            <div key={group.title} className="space-y-0.5">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-devtoys-muted hover:text-devtoys-secondary transition-colors uppercase tracking-wider"
              >
                <span>{group.title}</span>
                <span className="text-devtoys-muted">
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectTab(item.id)}
                        className={`w-full h-[32px] px-2.5 flex items-center justify-between rounded-md transition-colors relative text-left group ${
                          isActive
                            ? 'bg-devtoys-card text-devtoys-primary font-medium'
                            : 'text-devtoys-secondary hover:bg-devtoys-cardHover hover:text-devtoys-primary'
                        }`}
                      >
                        {/* Left accent bar on active item */}
                        {isActive && (
                          <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-devtoys-accent rounded-r" />
                        )}

                        <div className="flex items-center gap-2.5 truncate">
                          <span className="shrink-0">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-devtoys-border/60 text-devtoys-secondary font-mono">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="text-center py-6 text-devtoys-muted text-xs">
            No tools matching &quot;{search}&quot;
          </div>
        )}
      </nav>

      {/* Settings row at the bottom if not already in search */}
      <div className="p-2 border-t border-devtoys-border/60">
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`w-full h-[32px] px-2.5 flex items-center gap-2.5 rounded-md transition-colors text-left ${
            currentTab === 'settings'
              ? 'bg-devtoys-card text-devtoys-primary font-medium'
              : 'text-devtoys-secondary hover:bg-devtoys-cardHover hover:text-devtoys-primary'
          }`}
        >
          {currentTab === 'settings' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-devtoys-accent rounded-r" />
          )}
          <Sliders className="w-4 h-4 text-devtoys-muted" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
