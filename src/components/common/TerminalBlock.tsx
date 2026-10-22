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
    <div className="rounded-md border border-devtoys-border bg-devtoys-sidebar overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-devtoys-border bg-devtoys-card/50">
        <div className="flex items-center gap-1.5 font-medium text-devtoys-secondary">
          {showIcon && <Terminal className="w-3.5 h-3.5 text-devtoys-accent" />}
          <span>{title}</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-devtoys-secondary hover:text-devtoys-primary bg-devtoys-card hover:bg-devtoys-cardHover border border-devtoys-border transition-colors"
          title="Copy command"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-devtoys-success" />
              <span className="text-devtoys-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-2.5 font-mono text-xs text-devtoys-primary select-all overflow-x-auto whitespace-pre">
        <span className="text-devtoys-muted mr-2 select-none">$</span>
        <span>{command}</span>
      </div>
    </div>
  );
};
