import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'error' | 'success';
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  title,
  children,
  variant = 'info',
  onClose,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-devtoys-accent/10 border-devtoys-accent/30 text-devtoys-primary',
      icon: <Info className="w-4 h-4 text-devtoys-accent shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-devtoys-warning/10 border-devtoys-warning/30 text-devtoys-primary',
      icon: <AlertTriangle className="w-4 h-4 text-devtoys-warning shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-devtoys-error/10 border-devtoys-error/30 text-devtoys-primary',
      icon: <AlertCircle className="w-4 h-4 text-devtoys-error shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-devtoys-success/10 border-devtoys-success/30 text-devtoys-primary',
      icon: <CheckCircle2 className="w-4 h-4 text-devtoys-success shrink-0 mt-0.5" />,
    },
  };

  const current = styles[variant];

  return (
    <div className={`p-3 rounded-md border flex items-start gap-2.5 text-xs ${current.bg} ${className}`}>
      {current.icon}
      <div className="flex-1">
        {title && <div className="font-semibold text-devtoys-primary mb-0.5">{title}</div>}
        <div className="text-devtoys-secondary leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-devtoys-muted hover:text-devtoys-primary p-0.5 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
