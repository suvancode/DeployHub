import React, { useState } from 'react';
import {
  FileText,
  Search,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
} from 'lucide-react';
import { LogEntry } from '../../types/api';
import { Button } from '../common/Button';

interface LogViewerProps {
  logs: LogEntry[];
  onRefreshLogs: () => void;
  onClearLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onRefreshLogs,
  onClearLogs,
}) => {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const filteredLogs = logs.filter((entry) => {
    if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        entry.message.toLowerCase().includes(q) ||
        entry.module.toLowerCase().includes(q) ||
        (entry.details && JSON.stringify(entry.details).toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCopyLogs = async () => {
    try {
      const text = filteredLogs
        .map(
          (l) =>
            `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.module}] ${l.message}${
              l.details ? ' ' + JSON.stringify(l.details) : ''
            }`
        )
        .join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
      case 'warn':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
      case 'debug':
        return <Bug className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> Activity & Diagnostics Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Structured local logs with credentials and token redaction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLogs}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy Logs'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshLogs}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearLogs}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Levels ({logs.length})</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>

      {/* Log Console Window */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden font-mono text-xs">
        <div className="p-3 bg-slate-900/60 border-b border-slate-800 text-slate-400 flex items-center justify-between text-[11px]">
          <span>DeployHub Local Diagnostic Log Stream</span>
          <span>{filteredLogs.length} entries shown</span>
        </div>

        <div className="p-4 max-h-[550px] overflow-y-auto space-y-2 select-text">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-900/60 transition-colors border border-transparent hover:border-slate-800"
              >
                {getLevelIcon(entry.level)}
                <span className="text-slate-500 select-none text-[11px] shrink-0">
                  {entry.timestamp.substring(11, 19)}
                </span>
                <span className="text-indigo-400 font-semibold shrink-0">[{entry.module}]</span>
                <div className="flex-1 break-all text-slate-300">
                  <span>{entry.message}</span>
                  {entry.details !== undefined && (
                    <pre className="mt-1 p-2 rounded bg-slate-900/90 text-[11px] text-slate-400 overflow-x-auto">
                      {typeof entry.details === 'string'
                        ? entry.details
                        : JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-600">No logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
