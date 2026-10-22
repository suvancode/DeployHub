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

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-devtoys-error/15 text-devtoys-error font-medium">
            <AlertCircle className="w-2.5 h-2.5" /> ERROR
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-devtoys-warning/15 text-devtoys-warning font-medium">
            <AlertTriangle className="w-2.5 h-2.5" /> WARN
          </span>
        );
      case 'debug':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-devtoys-border text-devtoys-muted font-medium">
            <Bug className="w-2.5 h-2.5" /> DEBUG
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-devtoys-accent/15 text-devtoys-accent font-medium">
            <Info className="w-2.5 h-2.5" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-3 max-w-5xl mx-auto text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-devtoys-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-devtoys-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-devtoys-accent" /> Activity & Diagnostics Logs
          </h2>
          <p className="text-xs text-devtoys-muted mt-0.5">
            Structured local logs with credentials and token redaction.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLogs}
            icon={copied ? <Check className="w-3 h-3 text-devtoys-success" /> : <Copy className="w-3 h-3" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefreshLogs}
            icon={<RefreshCw className="w-3 h-3" />}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearLogs}
            icon={<Trash2 className="w-3 h-3" />}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-devtoys-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full h-7 bg-devtoys-card border border-devtoys-border rounded-md pl-8 pr-2.5 text-xs text-devtoys-primary placeholder:text-devtoys-muted focus:outline-none focus:border-devtoys-accent"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="h-7 bg-devtoys-card border border-devtoys-border rounded-md px-2.5 text-xs text-devtoys-primary focus:outline-none focus:border-devtoys-accent"
        >
          <option value="all">All Levels ({logs.length})</option>
          <option value="info">Info</option>
          <option value="warn">Warnings</option>
          <option value="error">Errors</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      {/* Log Console Window */}
      <div className="rounded-md border border-devtoys-border bg-devtoys-sidebar overflow-hidden font-mono text-[11px]">
        <div className="p-2 bg-devtoys-card/60 border-b border-devtoys-border text-devtoys-muted flex items-center justify-between text-[11px]">
          <span>Log Output Stream</span>
          <span>{filteredLogs.length} events</span>
        </div>

        <div className="p-2 max-h-[500px] overflow-y-auto space-y-1 select-text">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-1.5 rounded hover:bg-devtoys-card/50 transition-colors"
              >
                <span className="text-devtoys-muted select-none text-[10px] shrink-0 pt-0.5">
                  {entry.timestamp.substring(11, 19)}
                </span>
                <span className="shrink-0">{getLevelBadge(entry.level)}</span>
                <span className="text-devtoys-accent font-semibold shrink-0">[{entry.module}]</span>
                <div className="flex-1 break-all text-devtoys-secondary">
                  <span>{entry.message}</span>
                  {entry.details !== undefined && (
                    <pre className="mt-1 p-1.5 rounded bg-devtoys-main text-[10px] text-devtoys-muted overflow-x-auto">
                      {typeof entry.details === 'string'
                        ? entry.details
                        : JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-devtoys-muted">No log entries found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
