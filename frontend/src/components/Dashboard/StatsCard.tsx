import React from 'react';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
  children?: React.ReactNode;
  className?: string;
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const accentMap = {
  blue: { bg: 'bg-accent-primary/10', text: 'text-accent-primary', glow: 'shadow-glow-blue' },
  green: { bg: 'bg-accent-success/10', text: 'text-accent-success', glow: 'shadow-glow-green' },
  amber: { bg: 'bg-accent-warning/10', text: 'text-accent-warning', glow: 'shadow-glow-amber' },
  red: { bg: 'bg-accent-error/10', text: 'text-accent-error', glow: 'shadow-glow-rose' },
  purple: { bg: 'bg-accent-info/10', text: 'text-accent-info', glow: 'shadow-glow-indigo' },
};

const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  children,
  className = '',
  accentColor = 'blue',
}) => {
  const accent = accentMap[accentColor];

  return (
    <div className={`neumo-card p-6 flex flex-col ${className}`}>
      {/* Icon Container */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${accent.bg} ${accent.text}`}>
        {icon}
      </div>

      {/* Label */}
      <h3 className="kpi-label mb-2">
        {label}
      </h3>

      {/* Main Value */}
      <div className="flex items-baseline gap-3 mb-4">
        <div className="kpi-value">
          {value}
        </div>
        {trend && (
          <span className={`text-sm font-semibold flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-accent-success' : 'text-accent-error'
          }`}>
            {trend.direction === 'up' ? '↗' : '↘'} {trend.value}%
          </span>
        )}
      </div>

      {/* Children Content */}
      <div className="mt-auto flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default StatsCard;
