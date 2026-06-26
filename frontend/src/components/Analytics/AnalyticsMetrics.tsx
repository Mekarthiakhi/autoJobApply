import React from 'react';
import { TrendingUp, MessageSquare, Zap, Target, Calendar, Award } from 'lucide-react';

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  description?: string;
}

interface AnalyticsMetricsProps {
  metrics?: MetricCard[];
}

const AnalyticsMetrics: React.FC<AnalyticsMetricsProps> = ({
  metrics = [
    {
      label: 'Response Rate',
      value: '11.1%',
      change: 3,
      trend: 'up',
      icon: <MessageSquare size={20} />,
      bgColor: 'bg-accent-info/10',
      textColor: 'text-accent-info',
      description: '54 of 487 applications',
    },
    {
      label: 'Interview Rate',
      value: '3.7%',
      change: 1,
      trend: 'up',
      icon: <Zap size={20} />,
      bgColor: 'bg-accent-success/10',
      textColor: 'text-accent-success',
      description: '18 interviews scheduled',
    },
    {
      label: 'Offer Rate',
      value: '0.6%',
      change: -0.2,
      trend: 'down',
      icon: <Award size={20} />,
      bgColor: 'bg-accent-success/10',
      textColor: 'text-accent-success',
      description: '3 offers received',
    },
    {
      label: 'Avg Applications/Day',
      value: '23',
      change: 5,
      trend: 'up',
      icon: <Target size={20} />,
      bgColor: 'bg-accent-primary/10',
      textColor: 'text-accent-primary',
      description: 'Last 21 days',
    },
    {
      label: 'Active Streak',
      value: '12 days',
      change: 12,
      trend: 'up',
      icon: <Calendar size={20} />,
      bgColor: 'bg-accent-warning/10',
      textColor: 'text-accent-warning',
      description: 'Current consecutive days',
    },
    {
      label: 'Avg Time to Response',
      value: '2.4 days',
      change: 0.3,
      trend: 'down',
      icon: <TrendingUp size={20} />,
      bgColor: 'bg-accent-info/10',
      textColor: 'text-accent-info',
      description: 'Faster than last month',
    },
  ],
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, idx) => (
        <div key={idx} className="neumo-card p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${metric.bgColor}`}>
              <span className={metric.textColor}>{metric.icon}</span>
            </div>

            {/* Trend Indicator */}
            {metric.change !== undefined && (
              <div
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  metric.trend === 'up'
                    ? 'bg-accent-success/20 text-accent-success'
                    : 'bg-accent-error/20 text-accent-error'
                }`}
              >
                {metric.trend === 'up' ? '↗' : '↘'} {Math.abs(metric.change)}%
              </div>
            )}
          </div>

          {/* Label */}
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
            {metric.label}
          </p>

          {/* Main Value */}
          <div className="mb-3">
            <h3 className="text-3xl font-display font-bold text-white">
              {metric.value}
            </h3>
          </div>

          {/* Description */}
          {metric.description && (
            <p className="text-xs text-gray-500">{metric.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default AnalyticsMetrics;
