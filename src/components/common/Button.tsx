import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'sm',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-devtoys-accent disabled:opacity-50 disabled:cursor-not-allowed select-none border text-xs';

  const sizeStyles = {
    xs: 'h-6 px-2 text-2xs gap-1',
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    md: 'h-8 px-3 text-xs gap-2',
    lg: 'h-9 px-4 text-sm gap-2',
  };

  const variantStyles = {
    primary: 'bg-devtoys-accent hover:bg-devtoys-accentHover text-slate-900 border-devtoys-accent font-semibold shadow-none',
    secondary: 'bg-devtoys-card hover:bg-devtoys-cardHover text-devtoys-primary border-devtoys-border',
    outline: 'bg-transparent hover:bg-devtoys-card text-devtoys-secondary hover:text-devtoys-primary border-devtoys-border',
    ghost: 'bg-transparent hover:bg-devtoys-cardHover text-devtoys-secondary hover:text-devtoys-primary border-transparent',
    danger: 'bg-devtoys-error/15 hover:bg-devtoys-error/25 text-devtoys-error border-devtoys-error/30',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-current" /> : icon}
      {children}
    </button>
  );
};
