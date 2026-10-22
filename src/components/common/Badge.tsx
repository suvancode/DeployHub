import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
  size?: 'xs' | 'sm';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'xs',
  icon,
}) => {
  const sizeStyles = {
    xs: 'text-[11px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
  };

  const variantStyles = {
    success: 'bg-devtoys-success/15 text-devtoys-success border border-devtoys-success/25',
    warning: 'bg-devtoys-warning/15 text-devtoys-warning border border-devtoys-warning/25',
    danger: 'bg-devtoys-error/15 text-devtoys-error border border-devtoys-error/25',
    info: 'bg-devtoys-accent/15 text-devtoys-accent border border-devtoys-accent/25',
    accent: 'bg-devtoys-accent/15 text-devtoys-accent border border-devtoys-accent/25',
    neutral: 'bg-devtoys-card text-devtoys-secondary border border-devtoys-border',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded ${sizeStyles[size]} ${variantStyles[variant]}`}
    >
      {icon}
      {children}
    </span>
  );
};
