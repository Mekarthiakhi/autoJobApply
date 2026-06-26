import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, Clock } from 'lucide-react';

interface ApplicationEvent {
  id: string;
  company: string;
  role: string;
  logo?: string;
  timestamp: Date;
  status: 'applied' | 'viewed' | 'responded';
}

interface ApplicationPulseProps {
  events?: ApplicationEvent[];
  isRunning?: boolean;
}

const ApplicationPulse: React.FC<ApplicationPulseProps> = ({
  events = [
    {
      id: '1',
      company: 'Google',
      role: 'Senior Frontend Engineer',
      timestamp: new Date(Date.now() - 5 * 60000),
      status: 'applied',
    },
    {
      id: '2',
      company: 'Microsoft',
      role: 'Full Stack Developer',
      timestamp: new Date(Date.now() - 12 * 60000),
      status: 'applied',
    },
    {
      id: '3',
      company: 'Apple',
      role: 'iOS Developer',
      timestamp: new Date(Date.now() - 25 * 60000),
      status: 'viewed',
    },
    {
      id: '4',
      company: 'Meta',
      role: 'React Engineer',
      timestamp: new Date(Date.now() - 45 * 60000),
      status: 'responded',
    },
  ],
  isRunning = true,
}) => {
  const [localEvents, setLocalEvents] = useState<ApplicationEvent[]>(events);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <Zap className="w-4 h-4 text-accent-primary" />;
      case 'viewed':
        return <Clock className="w-4 h-4 text-accent-warning" />;
      case 'responded':
        return <CheckCircle className="w-4 h-4 text-accent-success" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'applied':
        return 'Applied';
      case 'viewed':
        return 'Viewed';
      case 'responded':
        return 'Responded';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'text-accent-primary';
      case 'viewed':
        return 'text-accent-warning';
      case 'responded':
        return 'text-accent-success';
      default:
        return 'text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="neumo-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse"></div>
          <h3 className="font-display font-semibold text-white text-lg">
            Live Application Feed
          </h3>
        </div>
        {isRunning && (
          <span className="text-xs font-semibold text-accent-success uppercase tracking-wider">
            Active
          </span>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mb-6 p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
        <p className="text-sm text-gray-300">
          <span className="text-accent-primary font-semibold">AutoApply</span> sent{' '}
          <span className="text-white font-bold">47 applications</span> while you slept 🚀
        </p>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {localEvents.map((event, index) => (
          <div
            key={event.id}
            className={`neumo-card p-4 flex items-start gap-4 border-l-4 transition-all duration-500`}
            style={{
              borderLeftColor:
                event.status === 'applied'
                  ? '#4F8EF7'
                  : event.status === 'viewed'
                    ? '#F59E0B'
                    : '#10B981',
              animation: index === 0 ? 'slideInLeft 0.5s ease-out' : 'none',
            }}
          >
            {/* Icon */}
            <div className="mt-1">{getStatusIcon(event.status)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-white text-sm">{event.company}</h4>
                  <p className="text-xs text-gray-400 truncate">{event.role}</p>
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(event.status)}`}>
                  {getStatusText(event.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">{formatTime(event.timestamp)}</p>
            </div>

            {/* Ripple Animation on Latest */}
            {index === 0 && (
              <div
                className="absolute w-8 h-8 rounded-full border-2 border-accent-primary"
                style={{
                  animation: 'ripple 0.6s ease-out',
                  opacity: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* View All Link */}
      <button className="mt-6 w-full py-3 rounded-lg text-sm font-semibold text-accent-primary hover:bg-accent-primary/5 transition-colors">
        View All Applications →
      </button>
    </div>
  );
};

export default ApplicationPulse;
