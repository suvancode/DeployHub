import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Sliders,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'setup' | 'logs' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'setup' | 'logs' | 'settings') => void;
  projectCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  projectCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: projectCount > 0 ? projectCount : undefined,
    },
    {
      id: 'setup' as const,
      label: 'New Setup',
      icon: <PlusCircle className="w-4 h-4" />,
    },
    {
      id: 'logs' as const,
      label: 'Activity Logs',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base text-slate-100 tracking-tight">DeployHub</div>
            <div className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase font-semibold">
              Git & Vercel Auto
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={active ? 'text-emerald-400' : 'text-slate-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Safety Guarantee */}
      <div className="p-4 m-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Manual-Push Guarantee</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          DeployHub never pushes code automatically. You maintain 100% control over commits and publishing.
        </p>
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>v1.0.0 (Local-first)</span>
          <a
            href="https://vercel.com/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            Docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </aside>
  );
};
