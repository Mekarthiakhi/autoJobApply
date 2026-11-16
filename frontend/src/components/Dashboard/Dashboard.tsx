import React, { useEffect, useState, useCallback } from 'react';
import { dashboardAPI } from '../../api/auth';
import {
  Search, Sparkles, Target, ArrowUp, Inbox, CheckCircle2,
  Send, AlertTriangle, Clock, XCircle, Filter,
  RefreshCw, ChevronRight, Layers, Award
} from 'lucide-react';

interface MetricData {
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
}

interface PendingAction {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  stageStatus: string;
  actionRequired: 'VERIFY_ANSWERS' | 'PROVIDE_MISSING_INFO' | 'EXPIRING_SOON';
  details: string;
  expiresAt?: string;
  missingFieldsCount?: number;
  uncertainFieldsCount?: number;
}

interface WorkflowItem {
  id: string;
  timestamp: string;
  action: string;
  status: string;
  jobTitle?: string;
  companyName?: string;
  details?: any;
}

interface SourcePerf {
  source: string;
  discoveredCount: number;
  preparedCount: number;
  submittedCount: number;
  interviewsCount: number;
  offersCount: number;
  conversionRate: number;
}

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricData>({
    totalJobsDiscovered: 0,
    jobsShortlisted: 0,
    applicationsPrepared: 0,
    applicationsAwaitingReview: 0,
    applicationsApproved: 0,
    applicationsSubmitted: 0,
    failedApplications: 0,
    interviewInvitations: 0,
    rejectionRate: 0,
    applicationConversionRate: 0,
    avgTimeDiscoveryToSubmissionHours: null,
    avgTimeDiscoveryToSubmissionFormatted: 'N/A',
  });

  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [recentWorkflow, setRecentWorkflow] = useState<WorkflowItem[]>([]);
  const [sourcePerformance, setSourcePerformance] = useState<SourcePerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgents, setRunningAgents] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [companySearch, setCompanySearch] = useState<string>('');
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchDashboard = useCallback(async () => {
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
      if (statusFilter) params.status = statusFilter;

      const response = await dashboardAPI.getDashboard(params);
      if (response.data?.metrics) {
        setMetrics(response.data.metrics);
      }
      if (response.data?.pendingActions) {
        setPendingActions(response.data.pendingActions);
      }
      if (response.data?.recentWorkflow) {
        setRecentWorkflow(response.data.recentWorkflow);
      }
      if (response.data?.sourcePerformance) {
        setSourcePerformance(response.data.sourcePerformance);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPlatform, companySearch, roleSearch, statusFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRunAgents = async () => {
    try {
      setRunningAgents(true);
      const response = await dashboardAPI.runAgents();
      alert(response.data.message || 'Multi-agent pipeline started successfully');
      fetchDashboard();
    } catch (err) {
      alert('Error initiating agent pipeline');
    } finally {
      setRunningAgents(false);
    }
  };

  const resetFilters = () => {
    setDateRange('all');
    setSelectedPlatform('');
    setCompanySearch('');
    setRoleSearch('');
    setStatusFilter('');
  };

  const hasActiveFilters = dateRange !== 'all' || selectedPlatform !== '' || companySearch !== '' || roleSearch !== '' || statusFilter !== '';

  if (loading && !metrics.totalJobsDiscovered && !metrics.applicationsPrepared) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="content fade-in space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Application Intelligence Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time pipeline metrics, conversion intelligence, and workflow observability</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${showFilters || hasActiveFilters
              ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
              : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:text-white'
              }`}
          >
            <Filter size={16} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            )}
          </button>

          <button
            onClick={handleRunAgents}
            disabled={runningAgents}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6C63FF 0%, #4B45B2 100%)',
            }}
          >
            <RefreshCw size={16} className={runningAgents ? 'animate-spin' : ''} />
            <span>{runningAgents ? 'Running Agents...' : 'Run Agents Now'}</span>
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">Filter Pipeline Data</span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Date Range */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time Horizon</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-2 border border-gray-700"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            {/* Platform / Source */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source / Platform</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-2 border border-gray-700"
              >
                <option value="">All Sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="glassdoor">Glassdoor</option>
                <option value="naukri">Naukri</option>
                <option value="career_page">Career Pages</option>
              </select>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Company</label>
              <input
                type="text"
                placeholder="Filter by company..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-2 border border-gray-700"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Job Title</label>
              <input
                type="text"
                placeholder="Filter by role..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-2 border border-gray-700"
              />
            </div>

            {/* Application Status */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Application Stage</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-2 border border-gray-700"
              >
                <option value="">All Stages</option>
                <option value="READY_FOR_REVIEW">Ready for Review</option>
                <option value="NEEDS_CANDIDATE_INPUT">Needs Candidate Input</option>
                <option value="APPROVED">Approved</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="FAILED">Failed</option>
                <option value="interview">Interview</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Pending Candidate Actions Banner (Requirement 5) */}
      {pendingActions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 text-amber-200">
              <AlertTriangle className="text-amber-400 shrink-0" size={20} />
              <strong className="text-amber-100 font-semibold text-sm">
                {pendingActions.length} Action(s) Require Candidate Attention
              </strong>
            </div>
            <a
              href="#/review-queue"
              className="text-xs text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1"
            >
              Open Review Queue <ChevronRight size={14} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingActions.slice(0, 3).map((action) => (
              <div
                key={action.applicationId}
                className="p-3 rounded-lg bg-gray-950/70 border border-amber-500/30 flex justify-between items-start gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-white truncate max-w-[200px]">{action.jobTitle}</h4>
                  <p className="text-xs text-indigo-400 truncate">{action.companyName}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{action.details}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 uppercase font-semibold ${action.actionRequired === 'PROVIDE_MISSING_INFO'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                  : action.actionRequired === 'EXPIRING_SOON'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                    : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50'
                  }`}>
                  {action.actionRequired.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11 Core Metrics Grid (Requirements: Real DB, Documented, Non-Misleading) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Jobs Discovered */}
        <div className="kpi-card kpi-blue p-5 rounded-xl bg-gray-900/60 border border-indigo-500/20">
          <div className="flex justify-between items-start">
            <div className="kpi-icon blue p-2.5 rounded-lg bg-indigo-950/60"><Search size={18} color="#A5A0FF" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Discovery</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-white mt-3">{metrics.totalJobsDiscovered}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Total Jobs Discovered</div>
          <div className="kpi-trend text-[11px] text-indigo-400 mt-2 flex items-center">
            <ArrowUp size={11} className="inline mr-1" /> active normalized pool
          </div>
        </div>

        {/* Metric 2: Jobs Shortlisted */}
        <div className="kpi-card kpi-green p-5 rounded-xl bg-gray-900/60 border border-emerald-500/20">
          <div className="flex justify-between items-start">
            <div className="kpi-icon green p-2.5 rounded-lg bg-emerald-950/60"><Sparkles size={18} color="#4ADE80" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Match Rank</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-emerald-400 mt-3">{metrics.jobsShortlisted}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Jobs Shortlisted</div>
          <div className="kpi-trend text-[11px] text-emerald-400 mt-2 flex items-center">
            <ArrowUp size={11} className="inline mr-1" /> compatibility &ge; 70%
          </div>
        </div>

        {/* Metric 3: Applications Prepared */}
        <div className="kpi-card p-5 rounded-xl bg-gray-900/60 border border-purple-500/20">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-purple-950/60"><Layers size={18} className="text-purple-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Drafts</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-purple-300 mt-3">{metrics.applicationsPrepared}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Applications Prepared</div>
          <div className="kpi-trend text-[11px] text-purple-400 mt-2 flex items-center">
            tailored resume & cover letter
          </div>
        </div>

        {/* Metric 4: Awaiting Review */}
        <div className="kpi-card p-5 rounded-xl bg-gray-900/60 border border-pink-500/30">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-pink-950/60"><Inbox size={18} color="#EC4899" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-pink-400 font-semibold">Action Required</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-pink-400 mt-3">{metrics.applicationsAwaitingReview}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Awaiting Review</div>
          <div className="kpi-trend text-[11px] text-pink-400 mt-2 flex items-center">
            pending candidate verification
          </div>
        </div>

        {/* Metric 5: Approved */}
        <div className="kpi-card p-5 rounded-xl bg-gray-900/60 border border-teal-500/20">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-teal-950/60"><CheckCircle2 size={18} className="text-teal-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Authorized</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-teal-300 mt-3">{metrics.applicationsApproved}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Applications Approved</div>
          <div className="kpi-trend text-[11px] text-teal-400 mt-2 flex items-center">
            SHA-256 hash bound
          </div>
        </div>

        {/* Metric 6: Submitted */}
        <div className="kpi-card p-5 rounded-xl bg-gray-900/60 border border-blue-500/20">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-blue-950/60"><Send size={18} className="text-blue-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Execution</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-blue-300 mt-3">{metrics.applicationsSubmitted}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Applications Submitted</div>
          <div className="kpi-trend text-[11px] text-blue-400 mt-2 flex items-center">
            confirmed on job portal
          </div>
        </div>

        {/* Metric 7: Failed Applications */}
        <div className="kpi-card p-5 rounded-xl bg-gray-900/60 border border-rose-500/20">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-lg bg-rose-950/60"><XCircle size={18} className="text-rose-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Failures</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-rose-400 mt-3">{metrics.failedApplications}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Failed Applications</div>
          <div className="kpi-trend text-[11px] text-rose-400 mt-2 flex items-center">
            challenge or network error
          </div>
        </div>

        {/* Metric 8: Interview Invitations */}
        <div className="kpi-card kpi-amber p-5 rounded-xl bg-gray-900/60 border border-amber-500/20">
          <div className="flex justify-between items-start">
            <div className="kpi-icon amber p-2.5 rounded-lg bg-amber-950/60"><Target size={18} color="#FBBF24" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Interviews</span>
          </div>
          <div className="kpi-num text-3xl font-extrabold text-amber-400 mt-3">{metrics.interviewInvitations}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Interview Invitations</div>
          <div className="kpi-trend text-[11px] text-amber-400 mt-2 flex items-center">
            rounds in progress
          </div>
        </div>
      </div>

      {/* Efficiency & Conversion Strip (Metrics 9, 10, 11) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 9: Rejection Rate */}
        <div className="p-5 rounded-xl bg-gray-900/70 border border-gray-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Rejection Rate</span>
            <div className="text-2xl font-bold text-gray-200 mt-1">{metrics.rejectionRate}%</div>
            <p className="text-[11px] text-gray-500 mt-0.5">rejections / total processed</p>
          </div>
          <div className="text-right">
            <span className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-400 font-mono">
              Benchmark &lt; 85%
            </span>
          </div>
        </div>

        {/* Metric 10: Application Conversion Rate */}
        <div className="p-5 rounded-xl bg-gray-900/70 border border-gray-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Conversion Rate</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.applicationConversionRate}%</div>
            <p className="text-[11px] text-gray-500 mt-0.5">interviews + offers / submitted</p>
          </div>
          <div className="text-right">
            <Award className="text-emerald-400 ml-auto" size={28} />
          </div>
        </div>

        {/* Metric 11: Average Time from Discovery to Submission */}
        <div className="p-5 rounded-xl bg-gray-900/70 border border-gray-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Avg Discovery-to-Submit</span>
            <div className="text-2xl font-bold text-indigo-300 mt-1">{metrics.avgTimeDiscoveryToSubmissionFormatted}</div>
            <p className="text-[11px] text-gray-500 mt-0.5">mean preparation cycle</p>
          </div>
          <div className="text-right">
            <Clock className="text-indigo-400 ml-auto" size={28} />
          </div>
        </div>
      </div>

      {/* Source Performance Breakdown (Requirement 3) */}
      {sourcePerformance.length > 0 && (
        <div className="p-6 rounded-xl bg-gray-900/60 border border-gray-800">
          <h3 className="text-base font-bold text-white mb-1">Job-Source Performance</h3>
          <p className="text-xs text-gray-400 mb-4">Volume and conversion efficiency breakdown by job portal</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-3 font-semibold uppercase tracking-wider">Portal Source</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Discovered</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Prepared</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Submitted</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Interviews</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {sourcePerformance.map((source) => (
                  <tr key={source.source} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-medium text-white uppercase">{source.source}</td>
                    <td className="py-3 font-mono">{source.discoveredCount}</td>
                    <td className="py-3 font-mono text-purple-300">{source.preparedCount}</td>
                    <td className="py-3 font-mono text-blue-300">{source.submittedCount}</td>
                    <td className="py-3 font-mono text-amber-300">{source.interviewsCount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-semibold ${source.conversionRate >= 10 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' :
                        source.conversionRate > 0 ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/40' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                        {source.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Workflow History (Requirement 6) */}
      {recentWorkflow.length > 0 && (
        <div className="p-6 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Recent Workflow History</h3>
              <p className="text-xs text-gray-400">Live operational logs across multi-agent pipelines</p>
            </div>
            <a href="#/activity-logs" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All Logs <ChevronRight size={14} />
            </a>
          </div>

          <div className="space-y-2.5">
            {recentWorkflow.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-gray-950/70 border border-gray-800/80 flex justify-between items-center gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-emerald-400' :
                    item.status === 'failed' || item.status === 'error' ? 'bg-rose-400' :
                      'bg-amber-400'
                    }`} />
                  <div>
                    <span className="font-semibold text-white uppercase tracking-wider text-[11px] bg-gray-800/90 px-2 py-0.5 rounded mr-2">
                      {item.action.replace(/_/g, ' ')}
                    </span>
                    {item.jobTitle && (
                      <span className="text-gray-300">{item.jobTitle} {item.companyName ? `at ${item.companyName}` : ''}</span>
                    )}
                  </div>
                </div>

                <div className="text-right text-gray-500 font-mono text-[11px] shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
