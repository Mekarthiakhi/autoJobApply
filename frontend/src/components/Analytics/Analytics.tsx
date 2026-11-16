import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, Download, Filter, Cpu, Layers, HelpCircle, 
  X, AlertTriangle, ArrowUpRight, CheckCircle2, XCircle
} from 'lucide-react';
import AnalyticsMetrics, { MetricCard } from './AnalyticsMetrics';
import ApplicationFunnel from './ApplicationFunnel';
import { analyticsAPI, exportsAPI } from '../../api/auth';

interface AnalyticsData {
  metrics: {
    totalJobsDiscovered: number;
    jobsShortlisted: number;
    applicationsPrepared: number;
    applicationsAwaitingReview: number;
    applicationsApproved: number;
    applicationsSubmitted: number;
    failedApplications: number;
    interviewInvitations: number;
    rejectionRate: number;
    applicationConversionRate: number;
    avgTimeDiscoveryToSubmissionHours: number | null;
    avgTimeDiscoveryToSubmissionFormatted: string;
  };
  funnelStages: any[];
  sourcePerformance: Array<{
    source: string;
    discoveredCount: number;
    preparedCount: number;
    submittedCount: number;
    interviewsCount: number;
    offersCount: number;
    rejectionsCount: number;
    conversionRate: number;
  }>;
  agentMetrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    errorRate: number;
    byAgent: Array<{
      agent: string;
      runs: number;
      errors: number;
      successRate: number;
    }>;
    recentErrors: Array<{
      id: string;
      action: string;
      details: any;
      created_at: string;
      job_title?: string;
      company_name?: string;
    }>;
  };
  insights: string[];
}

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'sources' | 'agents'>('overview');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [companySearch, setCompanySearch] = useState<string>('');
  const [roleSearch, setRoleSearch] = useState<string>('');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const d = new Date();
        d.setDate(d.getDate() - days);
        params.startDate = d.toISOString();
      }
      if (selectedPlatform) params.platform = selectedPlatform;
      if (companySearch.trim()) params.company = companySearch.trim();
      if (roleSearch.trim()) params.role = roleSearch.trim();

      const response = await analyticsAPI.getAnalytics(params);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPlatform, companySearch, roleSearch]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const metrics = data?.metrics;

  const metricCards: MetricCard[] = metrics ? [
    {
      label: 'Conversion Rate',
      value: `${metrics.applicationConversionRate}%`,
      icon: <ArrowUpRight size={20} />,
      bgColor: 'bg-emerald-950/60',
      textColor: 'text-emerald-400',
      description: 'Submitted applications converting to interviews or offers',
    },
    {
      label: 'Rejection Rate',
      value: `${metrics.rejectionRate}%`,
      icon: <AlertTriangle size={20} />,
      bgColor: 'bg-rose-950/60',
      textColor: 'text-rose-400',
      description: 'Rejected applications out of total processed',
    },
    {
      label: 'Avg Time to Submit',
      value: metrics.avgTimeDiscoveryToSubmissionFormatted,
      icon: <BarChart3 size={20} />,
      bgColor: 'bg-indigo-950/60',
      textColor: 'text-indigo-400',
      description: 'Mean elapsed time from job discovery to submission',
    },
    {
      label: 'Discovered Positions',
      value: metrics.totalJobsDiscovered,
      icon: <Layers size={20} />,
      bgColor: 'bg-purple-950/60',
      textColor: 'text-purple-400',
      description: 'Active crawled jobs across connected job boards',
    },
    {
      label: 'Interview Invitations',
      value: metrics.interviewInvitations,
      icon: <CheckCircle2 size={20} />,
      bgColor: 'bg-amber-950/60',
      textColor: 'text-amber-400',
      description: 'Rounds scheduled or in progress',
    },
    {
      label: 'Awaiting Candidate Review',
      value: metrics.applicationsAwaitingReview,
      icon: <AlertTriangle size={20} />,
      bgColor: 'bg-pink-950/60',
      textColor: 'text-pink-400',
      description: 'Drafts held for mandatory human verification',
    },
  ] : [];

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto p-4 md:p-6 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Analytics & System Intelligence
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Grounded database metrics, multi-agent observability, and conversion intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMetricDefinitions(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
          >
            <HelpCircle size={15} />
            <span>Metric Definitions</span>
          </button>
          <a 
            href={exportsAPI.getApplicationsCsvUrl()} 
            target="_blank" 
            rel="noreferrer" 
            className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
          >
            <Download size={15} />
            <span>Export Data</span>
          </a>
        </div>
      </div>

      {/* Date Range & Global Filters */}
      <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
            <Filter size={14} /> Time Horizon:
          </span>
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dateRange === range
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              {range === 'all' ? 'All Time' : `Last ${range.toUpperCase()}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select 
            value={selectedPlatform} 
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-gray-700"
          >
            <option value="">All Platforms</option>
            <option value="linkedin">LinkedIn</option>
            <option value="indeed">Indeed</option>
            <option value="glassdoor">Glassdoor</option>
            <option value="naukri">Naukri</option>
            <option value="career_page">Career Pages</option>
          </select>

          <input 
            type="text" 
            placeholder="Filter by company..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="bg-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 w-36"
          />

          <input 
            type="text" 
            placeholder="Filter by role..."
            value={roleSearch}
            onChange={(e) => setRoleSearch(e.target.value)}
            className="bg-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 w-36"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <BarChart3 size={16} />
          <span>Core Metrics</span>
        </button>
        <button
          onClick={() => setActiveTab('funnel')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'funnel'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Layers size={16} />
          <span>Funnel Analysis</span>
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'sources'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <span>🌐</span>
          <span>Source Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'agents'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Cpu size={16} />
          <span>Agent Activity & Errors</span>
        </button>
      </div>

      {/* Tab 1: Core Metrics Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AnalyticsMetrics metrics={metricCards} />

          {/* Key Insights (Grounded in real DB data) */}
          {data?.insights && data.insights.length > 0 && (
            <div className="glass-dark rounded-xl p-5 border border-indigo-500/30 bg-indigo-950/20">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span>💡 Pipeline Insights</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-indigo-200">
                {data.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-indigo-400">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Funnel Analysis */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="glass-dark rounded-xl p-6 border border-gray-800">
            <h3 className="text-base font-bold text-white mb-1">Application Pipeline Conversion Funnel</h3>
            <p className="text-xs text-gray-400 mb-6">
              Track throughput from initial job crawl to final submission and interviews.
            </p>
            <ApplicationFunnel stages={data?.funnelStages || []} />
          </div>
        </div>
      )}

      {/* Tab 3: Source Performance Comparison (Requirement 3) */}
      {activeTab === 'sources' && (
        <div className="glass-dark rounded-xl p-6 border border-gray-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Job-Source Performance Benchmarks</h3>
            <p className="text-xs text-gray-400">
              Compare yield, application volume, and conversion efficiency across platforms.
            </p>
          </div>

          {(!data?.sourcePerformance || data.sourcePerformance.length === 0) ? (
            <p className="text-xs text-gray-500 italic py-6 text-center">No platform data discovered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-3 font-semibold uppercase tracking-wider">Platform Source</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Discovered</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Prepared</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Submitted</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Interviews</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Offers</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Rejections</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-300">
                  {data.sourcePerformance.map((src) => (
                    <tr key={src.source} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 font-bold text-white uppercase">{src.source}</td>
                      <td className="py-3 font-mono">{src.discoveredCount}</td>
                      <td className="py-3 font-mono text-purple-300">{src.preparedCount}</td>
                      <td className="py-3 font-mono text-blue-300">{src.submittedCount}</td>
                      <td className="py-3 font-mono text-amber-300">{src.interviewsCount}</td>
                      <td className="py-3 font-mono text-teal-300">{src.offersCount}</td>
                      <td className="py-3 font-mono text-rose-300">{src.rejectionsCount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                          src.conversionRate >= 10 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' :
                          src.conversionRate > 0 ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/40' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {src.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Agent Execution Activity & Errors (Requirement 4) */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Agent KPI summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-dark rounded-xl p-4 border border-gray-800">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Runs</span>
              <div className="text-2xl font-bold text-white mt-1">{data?.agentMetrics.totalExecutions || 0}</div>
            </div>
            <div className="glass-dark rounded-xl p-4 border border-gray-800">
              <span className="text-xs text-emerald-400 uppercase font-semibold">Successful</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{data?.agentMetrics.successfulExecutions || 0}</div>
            </div>
            <div className="glass-dark rounded-xl p-4 border border-gray-800">
              <span className="text-xs text-rose-400 uppercase font-semibold">Failed Runs</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">{data?.agentMetrics.failedExecutions || 0}</div>
            </div>
            <div className="glass-dark rounded-xl p-4 border border-gray-800">
              <span className="text-xs text-amber-400 uppercase font-semibold">Error Rate</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">{data?.agentMetrics.errorRate || 0}%</div>
            </div>
          </div>

          {/* Breakdown by Agent Action */}
          <div className="glass-dark rounded-xl p-6 border border-gray-800">
            <h3 className="text-base font-bold text-white mb-3">Agent Execution Breakdown</h3>
            <div className="space-y-3">
              {data?.agentMetrics.byAgent.map((agent) => (
                <div key={agent.agent} className="p-3 rounded-lg bg-gray-950/70 border border-gray-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-white uppercase tracking-wider">{agent.agent.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400 ml-3">Runs: <strong>{agent.runs}</strong></span>
                    <span className="text-rose-400 ml-3">Errors: <strong>{agent.errors}</strong></span>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                      agent.successRate >= 95 ? 'bg-emerald-950/80 text-emerald-400' :
                      agent.successRate >= 80 ? 'bg-amber-950/80 text-amber-400' :
                      'bg-rose-950/80 text-rose-400'
                    }`}>
                      {agent.successRate}% Success
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Agent Errors */}
          <div className="glass-dark rounded-xl p-6 border border-gray-800">
            <h3 className="text-base font-bold text-white mb-1">Recent Agent Exceptions</h3>
            <p className="text-xs text-gray-400 mb-4">Failures, platform challenges, and timeout logs</p>

            {(!data?.agentMetrics.recentErrors || data.agentMetrics.recentErrors.length === 0) ? (
              <p className="text-xs text-gray-500 italic py-4">No recent agent errors detected.</p>
            ) : (
              <div className="space-y-2">
                {data.agentMetrics.recentErrors.map((err) => (
                  <div key={err.id} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex justify-between items-start gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle size={14} className="text-rose-400" />
                        <span className="font-semibold text-rose-300 uppercase">{err.action.replace(/_/g, ' ')}</span>
                        {err.company_name && (
                          <span className="text-gray-300">• {err.job_title} ({err.company_name})</span>
                        )}
                      </div>
                      <p className="text-gray-400 font-mono text-[11px]">
                        {typeof err.details === 'object' ? JSON.stringify(err.details) : err.details || 'Unknown error'}
                      </p>
                    </div>
                    <span className="text-gray-500 font-mono text-[11px] shrink-0">
                      {new Date(err.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metric Definitions Modal (Requirement 7) */}
      {showMetricDefinitions && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-dark rounded-xl max-w-2xl w-full p-6 border border-gray-700 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white">System Metric Definitions</h3>
              <button 
                onClick={() => setShowMetricDefinitions(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Total Jobs Discovered</strong>
                Total distinct active jobs crawled across connected platform scrapers matching selected filters.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Jobs Shortlisted</strong>
                Positions evaluated by the Explainable Match Scorer scoring &ge; 70% suitability.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Applications Prepared</strong>
                Applications that completed draft preparation (tailored resume version + cover letter + form answers).
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Applications Awaiting Review</strong>
                Applications currently queued in `READY_FOR_REVIEW` or `NEEDS_CANDIDATE_INPUT` pending candidate authorization.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Applications Approved</strong>
                Applications where the candidate reviewed responses and granted explicit individual authorization bound to an immutable SHA-256 hash.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Applications Submitted</strong>
                Applications successfully delivered to the target job portal via preflight-verified browser execution.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Failed Applications</strong>
                Applications encountering session errors, timeouts, or anti-bot challenge pauses.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Interview Invitations</strong>
                Positions where recruiter outreach or interview scheduling has been confirmed.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Rejection Rate</strong>
                Calculated as: `Rejections / (Submitted Applications + Rejections) * 100%`.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Application Conversion Rate</strong>
                Calculated as: `(Interviews + Offers) / Submitted Applications * 100%`.
              </div>
              <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
                <strong className="text-white block mb-0.5">Avg Time from Discovery to Submission</strong>
                Mean duration from initial job discovery timestamp to confirmed submission timestamp.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
