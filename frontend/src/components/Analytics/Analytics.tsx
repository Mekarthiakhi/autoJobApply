import React, { useState } from 'react';
import { BarChart3, Calendar, Download, Filter } from 'lucide-react';
import AnalyticsMetrics from './AnalyticsMetrics';
import ApplicationFunnel from './ApplicationFunnel';
import ActivityHeatmap from './ActivityHeatmap';

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('quarter');
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'activity'>('overview');

  const stats = {
    totalApplications: 487,
    profilesViewed: 142,
    messagesReceived: 54,
    interviews: 18,
    offers: 3,
    responseRate: 11.1,
    interviewRate: 3.7,
    offerRate: 0.6,
  };

  return (
    <div className="w-full space-y-8 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Analytics & Insights
          </h1>
          <p className="text-gray-400 text-sm">
            Track your application performance and optimize your job search strategy
          </p>
        </div>
        <button className="neumo-btn inline-flex items-center gap-2 text-sm">
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* Date Range & Filters */}
      <div className="flex gap-3 flex-wrap">
        {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateRange === range
                ? 'bg-accent-primary text-white shadow-glow-blue'
                : 'neumo-btn'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
        <button className="neumo-btn inline-flex items-center gap-2 text-sm ml-auto">
          <Filter size={16} />
          Filter
        </button>
      </div>

      {/* Main Metrics Cards */}
      <div>
        <h2 className="text-xl font-display font-semibold text-white mb-4">
          Key Metrics
        </h2>
        <AnalyticsMetrics />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Applications',
            value: stats.totalApplications,
            icon: '📬',
            color: 'text-accent-primary',
          },
          {
            label: 'Profiles Viewed',
            value: stats.profilesViewed,
            icon: '👁️',
            color: 'text-accent-info',
          },
          {
            label: 'Messages Received',
            value: stats.messagesReceived,
            icon: '💬',
            color: 'text-accent-warning',
          },
          {
            label: 'Interviews',
            value: stats.interviews,
            icon: '🎯',
            color: 'text-accent-success',
          },
        ].map((stat, idx) => (
          <div key={idx} className="neumo-card p-4 text-center">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-display font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-neumo-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <BarChart3 size={16} />
          Performance
        </button>
        <button
          onClick={() => setActiveTab('funnel')}
          className={`pb-3 px-4 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'funnel'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <span>📊</span>
          Funnel Analysis
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-4 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'activity'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Calendar size={16} />
          Activity
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Conversion Overview */}
          <div className="neumo-card p-8">
            <h3 className="text-lg font-display font-semibold text-white mb-6">
              Conversion Pipeline
            </h3>

            {/* Flow Visualization */}
            <div className="space-y-4">
              {[
                {
                  stage: 'Applied',
                  count: 487,
                  percentage: 100,
                  color: 'bg-accent-primary',
                },
                {
                  stage: 'Viewed',
                  count: 142,
                  percentage: 29,
                  color: 'bg-accent-info',
                },
                {
                  stage: 'Messaged',
                  count: 54,
                  percentage: 11,
                  color: 'bg-accent-warning',
                },
                {
                  stage: 'Interviewed',
                  count: 18,
                  percentage: 4,
                  color: 'bg-accent-success',
                },
                {
                  stage: 'Offered',
                  count: 3,
                  percentage: 1,
                  color: 'bg-accent-success',
                },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{item.stage}</span>
                    <span className="text-sm font-semibold text-gray-300">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-neumo-light rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing */}
            <div className="neumo-card p-6 bg-accent-success/5 border-l-4 border-accent-success">
              <h4 className="font-semibold text-white mb-4">✨ What's Working</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Strong application volume (23/day average)</li>
                <li>• Good profile view rate (29% reach recruiters)</li>
                <li>• Competitive interview rate (3.7%)</li>
                <li>• Consistent daily effort with 12-day streak</li>
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="neumo-card p-6 bg-accent-warning/5 border-l-4 border-accent-warning">
              <h4 className="font-semibold text-white mb-4">📈 Areas to Improve</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Increase profile view rate (target: 40%)</li>
                <li>• Improve response conversion (target: 15%)</li>
                <li>• Focus on high-fit companies</li>
                <li>• Optimize resume for better matches</li>
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="neumo-card p-6 bg-accent-primary/5 border-l-4 border-accent-primary">
            <h4 className="font-semibold text-white mb-4">💡 Recommendations</h4>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                Based on your data, here are the top 3 actions to improve your results:
              </p>
              <ol className="space-y-2 pl-4 list-decimal">
                <li>
                  <span className="font-semibold">Improve resume match scores</span> - Your 29% view
                  rate indicates some resume-job mismatches. Focus on tailoring your resume for each
                  role.
                </li>
                <li>
                  <span className="font-semibold">Target high-fit companies</span> - Companies where
                  you meet 80%+ of requirements tend to respond more frequently.
                </li>
                <li>
                  <span className="font-semibold">Personalize outreach</span> - Adding a personalized
                  note increases response rate by 25%+.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className="space-y-8">
          <ApplicationFunnel />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-8">
          <ActivityHeatmap />
        </div>
      )}

      {/* Comparison with Goals */}
      <div className="neumo-card p-6">
        <h3 className="text-lg font-display font-semibold text-white mb-6">
          Performance vs. Goals
        </h3>

        <div className="space-y-4">
          {[
            {
              metric: 'Daily Applications',
              current: 23,
              goal: 20,
              unit: 'per day',
              status: 'on-track',
            },
            {
              metric: 'Response Rate',
              current: 11.1,
              goal: 15,
              unit: '%',
              status: 'below',
            },
            {
              metric: 'Interview Rate',
              current: 3.7,
              goal: 5,
              unit: '%',
              status: 'below',
            },
            {
              metric: 'Consistency',
              current: 12,
              goal: 30,
              unit: 'days',
              status: 'on-track',
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-neumo-light">
              <div className="flex-1">
                <p className="font-semibold text-white text-sm mb-2">{item.metric}</p>
                <div className="w-full h-2 bg-neumo-highlight rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.status === 'on-track' ? 'bg-accent-success' : 'bg-accent-warning'
                    }`}
                    style={{ width: `${Math.min(100, (item.current / item.goal) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right min-w-max">
                <p className="font-semibold text-white text-sm">
                  {item.current} / {item.goal}
                </p>
                <p className="text-xs text-gray-400">{item.unit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="neumo-card p-6 bg-accent-info/5 border-l-4 border-accent-info">
        <h3 className="text-sm font-semibold text-accent-info mb-2">📊 Pro Tips</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Monitor your conversion rates to identify bottlenecks</li>
          <li>• A/B test different resume variants to improve view rates</li>
          <li>• Maintain consistent daily application volume for best results</li>
          <li>• Export your analytics to share with mentors or career coaches</li>
        </ul>
      </div>
    </div>
  );
};

export default Analytics;
