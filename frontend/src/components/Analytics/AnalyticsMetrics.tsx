import React from 'react';
import { MessageSquare, Zap, Target, Clock, Award, ShieldAlert } from 'lucide-react';

export interface MetricCard {
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

export const AnalyticsMetrics: React.FC<AnalyticsMetricsProps> = ({ metrics }) => {
  const displayMetrics: MetricCard[] = metrics && metrics.length > 0 ? metrics : [
    {
      label: 'Conversion Rate',
      value: '0%',
      icon: <Zap size={20} />,
      bgColor: 'bg-emerald-950/60',
      textColor: 'text-emerald-400',
      description: 'Submitted to interview/offer',
    },
    {
      label: 'Rejection Rate',
      value: '0%',
      icon: <ShieldAlert size={20} />,
      bgColor: 'bg-rose-950/60',
      textColor: 'text-rose-400',
      description: 'Rejected / total processed',
    },
    {
      label: 'Avg Time to Submit',
      value: 'N/A',
      icon: <Clock size={20} />,
      bgColor: 'bg-indigo-950/60',
      textColor: 'text-indigo-400',
      description: 'From job discovery to submit',
    },
    {
      label: 'Shortlisted Ratio',
      value: '0%',
      icon: <Target size={20} />,
      bgColor: 'bg-purple-950/60',
      textColor: 'text-purple-400',
      description: 'Jobs with >= 70% match score',
    },
    {
      label: 'Interview Invitations',
      value: '0',
      icon: <MessageSquare size={20} />,
      bgColor: 'bg-amber-950/60',
      textColor: 'text-amber-400',
      description: 'Rounds scheduled',
    },
    {
      label: 'Offers Received',
      value: '0',
      icon: <Award size={20} />,
      bgColor: 'bg-teal-950/60',
      textColor: 'text-teal-400',
      description: 'Formal offers received',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {displayMetrics.map((metric, idx) => (
        <div key={idx} className="glass-dark rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${metric.bgColor}`}>
              <span className={metric.textColor}>{metric.icon}</span>
            </div>
            {metric.change !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                metric.trend === 'up' ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'
              }`}>
                {metric.trend === 'up' ? '▲' : '▼'} {Math.abs(metric.change)}%
              </span>
            )}
          </div>

          <p className="text-xs uppercase font-semibold tracking-wider text-gray-400 mb-1">{metric.label}</p>
          <p className="text-3xl font-extrabold text-white tracking-tight">{metric.value}</p>
          {metric.description && (
            <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default AnalyticsMetrics;
