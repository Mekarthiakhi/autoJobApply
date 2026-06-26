import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../../api/auth';
import StatsCard from './StatsCard';
import ApplicationPulse from './ApplicationPulse';
import { Search, Sparkles, Calendar, Gift, Target, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalJobsFound: 247,
    totalApplications: 47,
    totalMatches: 12,
    successRate: 24,
    interviews: 3,
    offers: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardAPI.getDashboard();
        setStats(response.data.stats);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-primary"></div>
      </div>
    );

  return (
    <div className="w-full space-y-8 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Your AI agent is working 24/7 to land you interviews
          </p>
        </div>
        <Link
          to="/settings"
          className="neumo-btn inline-flex items-center gap-2"
        >
          <span>⚙️</span> Settings
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Jobs Applied Today */}
        <StatsCard
          icon={<Zap size={20} />}
          label="Applied Today"
          value={6}
          trend={{ value: 12, direction: 'up' }}
          accentColor="blue"
        >
          <div className="flex items-end gap-1 h-12 mt-4">
            {[20, 30, 25, 40, 35, 50, 60, 55].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-accent-primary/60 rounded-sm hover:bg-accent-primary transition-colors"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </StatsCard>

        {/* Response Rate */}
        <StatsCard
          icon={<TrendingUp size={20} />}
          label="Response Rate"
          value="24%"
          trend={{ value: 8, direction: 'up' }}
          accentColor="green"
        >
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Responses</span>
              <span>6 of 47</span>
            </div>
            <div className="w-full bg-neumo-highlight rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent-success h-full rounded-full transition-all duration-500"
                style={{ width: '12.8%' }}
              />
            </div>
          </div>
        </StatsCard>

        {/* Interviews Booked */}
        <StatsCard
          icon={<Calendar size={20} />}
          label="Interviews Booked"
          value={3}
          trend={{ value: 2, direction: 'up' }}
          accentColor="amber"
        >
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-gray-400">
              📅 <span className="text-white font-medium">Google</span> - Jun 28
            </p>
            <p className="text-gray-400">
              📅 <span className="text-white font-medium">Microsoft</span> - Jun 29
            </p>
          </div>
        </StatsCard>

        {/* Active Campaigns */}
        <StatsCard
          icon={<Target size={20} />}
          label="Active Campaigns"
          value={5}
          accentColor="purple"
        >
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Tech Stack Matched</span>
              <span className="bg-accent-success/20 text-accent-success px-2 py-1 rounded">
                87%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Companies Targeted</span>
              <span className="text-white font-medium">142</span>
            </div>
          </div>
        </StatsCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Pulse Feed - spans 2 columns */}
        <div className="lg:col-span-2">
          <ApplicationPulse isRunning={true} />
        </div>

        {/* Right Sidebar - Success Metrics */}
        <div className="space-y-6">
          {/* Success Rate Card */}
          <div className="neumo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white">Success Rate</h3>
              <span className="text-2xl font-display font-bold text-accent-success">
                {stats.successRate}%
              </span>
            </div>

            {/* Circular Progress */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeDasharray={`${stats.successRate * 2.83} 283`}
                  strokeLinecap="round"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    transition: 'stroke-dasharray 0.5s ease',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-mono font-semibold text-accent-success">
                  {stats.successRate}%
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400">
              Keep applying to improve your match rate
            </p>
          </div>

          {/* Applications Summary */}
          <div className="neumo-card p-6">
            <h3 className="font-display font-semibold text-white mb-4">Application Summary</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                <span className="text-sm text-gray-300">Applied</span>
                <span className="status-badge applied">{stats.totalApplications}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
                <span className="text-sm text-gray-300">Matched</span>
                <span className="status-badge success">{stats.totalMatches}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
                <span className="text-sm text-gray-300">Pending Response</span>
                <span className="status-badge pending">
                  {stats.totalApplications - stats.totalMatches}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-accent-success/10 border border-accent-success/20">
                <span className="text-sm text-gray-300">Offers</span>
                <span className="status-badge success">{stats.offers}</span>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="neumo-card p-6 border-l-4 border-accent-primary">
            <h3 className="font-display font-semibold text-white mb-2">Next Steps</h3>
            <p className="text-xs text-gray-400 mb-4">
              You're on track! Keep your resume updated for better matches.
            </p>
            <Link
              to="/settings"
              className="neumo-btn w-full text-center text-sm"
            >
              Update Resume
            </Link>
          </div>
        </div>
      </div>

      {/* Funnel Chart Section */}
      <div className="neumo-card p-6">
        <h3 className="font-display font-semibold text-white mb-6 text-lg">
          Application Funnel
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Applied', value: 47, color: 'accent-primary' },
            { label: 'Viewed', value: 12, color: 'accent-info' },
            { label: 'Responded', value: 6, color: 'accent-success' },
            { label: 'Interviewing', value: 3, color: 'accent-warning' },
            { label: 'Offers', value: 1, color: 'accent-success' },
          ].map((stage, idx) => (
            <div key={idx} className="text-center">
              <div
                className={`h-16 rounded-lg flex items-center justify-center mb-2 text-white font-display font-bold text-lg bg-${stage.color}/20`}
              >
                {stage.value}
              </div>
              <p className="text-xs text-gray-400 font-medium">{stage.label}</p>
              {idx < 4 && <div className="text-2xl text-gray-600 mt-2">↓</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Activity Heatmap */}
      <div className="neumo-card p-6">
        <h3 className="font-display font-semibold text-white mb-6 text-lg">
          Weekly Activity
        </h3>

        <div className="flex items-end gap-1 h-32">
          {[
            { day: 'Mon', apps: 8 },
            { day: 'Tue', apps: 12 },
            { day: 'Wed', apps: 10 },
            { day: 'Thu', apps: 15 },
            { day: 'Fri', apps: 14 },
            { day: 'Sat', apps: 5 },
            { day: 'Sun', apps: 3 },
          ].map((item) => (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-gradient-to-t from-accent-primary to-accent-success rounded-t-lg transition-all duration-300 hover:shadow-glow-blue group relative"
                style={{ height: `${(item.apps / 15) * 100}%` }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neumo-surface px-2 py-1 rounded text-xs whitespace-nowrap">
                  {item.apps} apps
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium mt-2">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
