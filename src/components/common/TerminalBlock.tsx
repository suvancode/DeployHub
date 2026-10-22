import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface TerminalBlockProps {
  command: string;
  title?: string;
  showIcon?: boolean;
}

export const TerminalBlock: React.FC<TerminalBlockProps> = ({
  command,
  title = 'Command',
  showIcon = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          {showIcon && <Terminal className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{title}</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          title="Copy command"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 font-mono text-sm text-emerald-300 select-all overflow-x-auto whitespace-pre">
        <span className="text-slate-500 mr-2 select-none">$</span>
        <span>{command}</span>
      </div>
    </div>
  );
};
