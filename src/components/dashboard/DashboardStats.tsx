import React from 'react';
import { FolderGit2, GitPullRequest, Globe, CheckCircle } from 'lucide-react';
import { ProjectRecord } from '../../types/api';

interface DashboardStatsProps {
  projects: ProjectRecord[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ projects }) => {
  const total = projects.length;
  const completed = projects.filter((p) => p.setupStatus === 'completed').length;
  const githubConnected = projects.filter((p) => !!p.repoUrl).length;
  const vercelLinked = projects.filter((p) => !!p.vercelProjectName).length;
  const awaitingSetup = projects.filter((p) => p.setupStatus !== 'completed').length;

  const stats = [
    {
      label: 'Configured Projects',
      value: total,
      subtext: `${completed} ready for production`,
      icon: <FolderGit2 className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-800/40 bg-emerald-950/20',
    },
    {
      label: 'Connected to GitHub',
      value: githubConnected,
      subtext: `${total - githubConnected} unlinked`,
      icon: <GitPullRequest className="w-5 h-5 text-indigo-400" />,
      color: 'border-indigo-800/40 bg-indigo-950/20',
    },
    {
      label: 'Linked to Vercel',
      value: vercelLinked,
      subtext: `${total - vercelLinked} unlinked`,
      icon: <Globe className="w-5 h-5 text-sky-400" />,
      color: 'border-sky-800/40 bg-sky-950/20',
    },
    {
      label: 'Awaiting Setup',
      value: awaitingSetup,
      subtext: awaitingSetup > 0 ? 'Action required' : 'All up to date',
      icon: <CheckCircle className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-800/40 bg-amber-950/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-2xl border ${stat.color} backdrop-blur-sm transition-all hover:border-slate-700`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">{stat.label}</span>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              {stat.icon}
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
          <div className="text-xs text-slate-400 mt-1">{stat.subtext}</div>
        </div>
      ))}
    </div>
  );
};
