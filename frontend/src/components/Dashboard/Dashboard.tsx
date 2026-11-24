import React, { useEffect, useState, useCallback } from 'react';
import { dashboardAPI, applicationsAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  Search, Sparkles, Target, ArrowUp, Inbox, CheckCircle2,
  Send, AlertTriangle, Clock, XCircle, Filter,
  RefreshCw, ChevronRight, Layers, Award, Bot, BookOpen, ArrowRight, HelpCircle, X, ExternalLink
} from 'lucide-react';
import { HowItWorksModal } from '../Common/HowItWorksModal';

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
  const toast = useToast();
  const { user } = useAuth();
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showGuideBanner, setShowGuideBanner] = useState(() => localStorage.getItem('hide_onboarding_guide') !== 'true');
  const [cronStatus, setCronStatus] = useState<{
    enabled: boolean;
    intervalHours: number;
    lastRunAt: string | null;
    nextRunAt: string | null;
    isSchedulerActive: boolean;
    masterSchedule: string;
  } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [liveSyncActive, setLiveSyncActive] = useState<boolean>(true);

  // Card Details Modal State (Requirement 3: Click cards to show data list)
  const [selectedCardModal, setSelectedCardModal] = useState<{
    isOpen: boolean;
    cardType: string;
    title: string;
    count: number;
    category: 'jobs' | 'applications';
    items: any[];
    loading: boolean;
    search: string;
  }>({
    isOpen: false,
    cardType: '',
    title: '',
    count: 0,
    category: 'jobs',
    items: [],
    loading: false,
    search: '',
  });
  const [applyingInModalId, setApplyingInModalId] = useState<string | null>(null);
  const [modalSelectedJobIds, setModalSelectedJobIds] = useState<Set<string>>(new Set());
  const [modalBatchApplying, setModalBatchApplying] = useState(false);

  const handleCardClick = async (cardType: string, title: string, count: number) => {
    const isJobCategory = ['jobs_discovered', 'matched_jobs', 'totalJobsDiscovered', 'jobsShortlisted'].includes(cardType);
    setModalSelectedJobIds(new Set());
    setSelectedCardModal({
      isOpen: true,
      cardType,
      title,
      count,
      category: isJobCategory ? 'jobs' : 'applications',
      items: [],
      loading: true,
      search: '',
    });

    try {
      const res = await dashboardAPI.getCardItems(cardType);
      setSelectedCardModal((prev) => ({
        ...prev,
        category: res.data?.category || (isJobCategory ? 'jobs' : 'applications'),
        items: Array.isArray(res.data?.items) ? res.data.items : [],
        count: typeof res.data?.total === 'number' ? res.data.total : count,
        loading: false,
      }));
    } catch (err) {
      console.error('Failed to load card items', err);
      toast.error('Failed to load list for this metric');
      setSelectedCardModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleApplyFromModal = async (job: any) => {
    try {
      setApplyingInModalId(job.id);
      toast.info(`Tailoring resume with AI for ${job.company_name} & applying...`);
      const res = await applicationsAPI.applyToJob(job.id);
      toast.success(res.data?.message || `Resume tailored for ${job.company_name} and applied!`);
      // Refresh modal list
      if (selectedCardModal.cardType) {
        const refreshed = await dashboardAPI.getCardItems(selectedCardModal.cardType, selectedCardModal.search);
        setSelectedCardModal((prev) => ({
          ...prev,
          items: Array.isArray(refreshed.data?.items) ? refreshed.data.items : prev.items,
        }));
      }
      fetchDashboard(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to tailor resume and apply');
    } finally {
      setApplyingInModalId(null);
    }
  };

  const handleBatchApplyFromModal = async (targetJobIds: string[]) => {
    if (targetJobIds.length === 0) {
      toast.info('No jobs selected.');
      return;
    }

    try {
      setModalBatchApplying(true);
      toast.info(`Tailoring resumes & applying to ${targetJobIds.length} jobs...`);
      let successCount = 0;
      for (const jId of targetJobIds) {
        try {
          await applicationsAPI.applyToJob(jId);
          successCount++;
        } catch (err) {
          console.error(`Modal batch item error: ${jId}`, err);
        }
      }
      toast.success(`🎉 Successfully tailored resumes & applied to ${successCount} jobs!`);
      setModalSelectedJobIds(new Set());
      if (selectedCardModal.cardType) {
        const refreshed = await dashboardAPI.getCardItems(selectedCardModal.cardType, selectedCardModal.search);
        setSelectedCardModal((prev) => ({
          ...prev,
          items: Array.isArray(refreshed.data?.items) ? refreshed.data.items : prev.items,
        }));
      }
      fetchDashboard(true);
    } catch (err: any) {
      toast.error('Failed to batch apply');
    } finally {
      setModalBatchApplying(false);
    }
  };

  // Filters state
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [companySearch, setCompanySearch] = useState<string>('');
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchDashboard = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
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
      if (response.data?.cronStatus) {
        setCronStatus(response.data.cronStatus);
      }
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [dateRange, selectedPlatform, companySearch, roleSearch, statusFilter]);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  // Real-time live polling every 5 seconds (hands-free live updates without browser reload!)
  useEffect(() => {
    if (!liveSyncActive) return;
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboard, liveSyncActive]);

  const handleRunAgents = async () => {
    try {
      setRunningAgents(true);
      toast.info('Running multi-agent pipeline (Discovery → Ranking → Cover Letters → Review Queue)...');
      const response = await dashboardAPI.runAgents({ sync: true, limitJobs: 10 });
      const s = response.data?.summary;
      toast.success(
        s
          ? `Pipeline complete: ${s.jobsDiscovered} jobs discovered, ${s.jobsRanked} ranked, ${s.draftsQueuedForReview} drafts queued!`
          : response.data?.message || 'Multi-agent pipeline completed successfully'
      );
      await fetchDashboard();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Error initiating agent pipeline';
      toast.error(msg);
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
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Logged in as {user?.fullName || user?.email || 'Candidate'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.fullName || 'Candidate'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time pipeline metrics, conversion intelligence, and workflow observability</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            onClick={() => setLiveSyncActive(!liveSyncActive)}
            title={liveSyncActive ? "Live Auto-Sync Active (every 5s). Click to pause." : "Live Auto-Sync Paused. Click to resume."}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: liveSyncActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(100, 116, 139, 0.2)',
              border: `1px solid ${liveSyncActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
              color: liveSyncActive ? '#4ade80' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: liveSyncActive ? '#22c55e' : '#94a3b8',
                boxShadow: liveSyncActive ? '0 0 8px #22c55e' : 'none',
              }}
              className={liveSyncActive ? 'animate-pulse' : ''}
            />
            <span>{liveSyncActive ? 'Live 5s Sync' : 'Sync Paused'}</span>
          </div>

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white shadow-md shadow-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6C63FF 0%, #4B45B2 100%)',
            }}
          >
            <RefreshCw size={14} className={runningAgents ? 'animate-spin' : ''} />
            <span>{runningAgents ? 'Running...' : 'Run Pipeline'}</span>
          </button>

          <Link
            to="/agents"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <Bot size={14} className="text-indigo-400" />
            <span>Agents Studio</span>
          </Link>
        </div>
      </div>

      {/* Quick Start Guide Banner */}
      {showGuideBanner && (
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Quick Start: How AutoJobApply Works in 4 Steps
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                  A clear roadmap for new test users — zero guesswork
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#c7d2fe',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Open Full Guide & FAQs</span>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('hide_onboarding_guide', 'true');
                  setShowGuideBanner(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Dismiss banner"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <Link
              to="/resume"
              style={{
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: 'inherit',
                transition: 'background 0.15s ease',
              }}
              className="hover:bg-indigo-950/40"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#818cf8' }}>
                <span>1. Upload Resume</span>
                <ArrowRight size={12} />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Upload PDF/DOCX. AI parses your contact details, phone, and skills.
              </div>
            </Link>

            <Link
              to="/settings"
              style={{
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: 'inherit',
                transition: 'background 0.15s ease',
              }}
              className="hover:bg-indigo-950/40"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#c084fc' }}>
                <span>2. Set Match Score</span>
                <ArrowRight size={12} />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Set threshold to 50%–55% and choose remote location preferences.
              </div>
            </Link>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#f472b6' }}>
                <span>3. AI Discovers & Tailors</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Runs hourly or via "Run Pipeline". Drafts custom resumes + cover letters.
              </div>
            </div>

            <Link
              to="/review-queue"
              style={{
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: 'inherit',
                transition: 'background 0.15s ease',
              }}
              className="hover:bg-emerald-950/50"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#34d399' }}>
                <span>4. Authorize in Review</span>
                <ArrowRight size={12} />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Check the verify box and click "Authorize & Submit" to apply!
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Live Background Cron Job Hunter Status */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(17, 24, 39, 0.95) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4ade80',
              flexShrink: 0,
            }}
          >
            <Clock size={20} className={runningAgents ? 'animate-spin text-purple-400' : ''} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                Automated Background Job Hunter (Cronjob)
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: cronStatus?.enabled !== false ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: cronStatus?.enabled !== false ? '#4ade80' : '#f87171',
                  border: `1px solid ${cronStatus?.enabled !== false ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cronStatus?.enabled !== false ? '#22c55e' : '#ef4444' }} />
                {cronStatus?.enabled !== false ? 'ACTIVE & HUNTING' : 'PAUSED IN SETTINGS'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>
                Schedule: <strong style={{ color: '#e2e8f0' }}>Every {cronStatus?.intervalHours || 1} hr(s)</strong>
              </span>
              <span>
                Last Hunt: <strong style={{ color: '#e2e8f0' }}>{cronStatus?.lastRunAt ? new Date(cronStatus.lastRunAt).toLocaleTimeString() : 'Recent run logged'}</strong>
              </span>
              <span>
                Next Hunt: <strong style={{ color: '#38bdf8' }}>{cronStatus?.nextRunAt ? new Date(cronStatus.nextRunAt).toLocaleTimeString() : 'Scheduled soon'}</strong>
              </span>
              <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 5s sync (updated {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleRunAgents}
            disabled={runningAgents}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
            }}
          >
            <RefreshCw size={13} className={runningAgents ? 'animate-spin' : ''} />
            <span>{runningAgents ? 'Hunting Now...' : '⚡ Hunt Jobs Now'}</span>
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
            <Link
              to="/review-queue"
              className="text-xs text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1"
            >
              Open Review Queue <ChevronRight size={14} />
            </Link>
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

      {/* 11 Core Metrics Grid (Compact, Sleek & Premium Design - Clickable to View Lists) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Jobs Discovered */}
        <div
          onClick={() => handleCardClick('jobs_discovered', 'Total Jobs Discovered', metrics.totalJobsDiscovered)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 hover:border-indigo-500/60 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-indigo-950/70 border border-indigo-500/30"><Search size={16} className="text-indigo-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Discovery</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-white mt-2">{metrics.totalJobsDiscovered}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Total Jobs Discovered</div>
          <div className="kpi-trend text-[11px] text-indigo-400 mt-1.5 flex items-center justify-between">
            <span><ArrowUp size={11} className="inline mr-1" /> active normalized pool</span>
            <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
        </div>

        {/* Metric 2: AI-Matched Jobs */}
        <div
          onClick={() => handleCardClick('matched_jobs', 'AI-Matched Jobs', metrics.jobsShortlisted)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 hover:border-emerald-500/60 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
          title="Jobs matched and selected by your AI Agent based on resume qualifications (≥70% score). This is AI candidate matching, not company interview decisions."
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30"><Sparkles size={16} className="text-emerald-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">AI Match Rank</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-emerald-400 mt-2">{metrics.jobsShortlisted}</div>
          <div className="kpi-label text-xs text-gray-200 font-semibold mt-0.5">AI-Matched Jobs</div>
          <div className="kpi-trend text-[11px] text-emerald-400 mt-1.5 flex items-center justify-between">
            <span><ArrowUp size={11} className="inline mr-1" /> resume match &ge; 70%</span>
            <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            AI shortlisted for your review
          </div>
        </div>

        {/* Metric 3: Applications Prepared */}
        <div
          onClick={() => handleCardClick('applications_prepared', 'Applications Prepared', metrics.applicationsPrepared)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 hover:border-purple-500/60 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-500/30"><Layers size={16} className="text-purple-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Drafts</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-purple-300 mt-2">{metrics.applicationsPrepared}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Applications Prepared</div>
          <div className="kpi-trend text-[11px] text-purple-400 mt-1.5 flex items-center justify-between">
            <span>tailored resume & cover letter</span>
            <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
        </div>

        {/* Metric 4: Awaiting Review */}
        <div
          onClick={() => handleCardClick('awaiting_review', 'Applications Awaiting Review', metrics.applicationsAwaitingReview)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-pink-500/40 hover:border-pink-500/80 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-pink-950/70 border border-pink-500/40"><Inbox size={16} className="text-pink-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-pink-400 font-semibold">Action Required</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-pink-400 mt-2">{metrics.applicationsAwaitingReview}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Awaiting Review</div>
          <div className="kpi-trend text-[11px] text-pink-400 mt-1.5 flex items-center justify-between">
            <span>pending candidate verification</span>
            <span className="text-[10px] text-pink-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View queue <ChevronRight size={11} /></span>
          </div>
        </div>

        {/* Metric 5: Approved */}
        <div
          onClick={() => handleCardClick('approved', 'Applications Approved', metrics.applicationsApproved)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 hover:border-teal-500/60 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-teal-950/70 border border-teal-500/30"><CheckCircle2 size={16} className="text-teal-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Authorized</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-teal-300 mt-2">{metrics.applicationsApproved}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Applications Approved</div>
          <div className="kpi-trend text-[11px] text-teal-400 mt-1.5 flex items-center justify-between">
            <span>SHA-256 hash bound</span>
            <span className="text-[10px] text-teal-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
        </div>

        {/* Metric 6: Submitted */}
        <div
          onClick={() => handleCardClick('submitted', 'Applications Submitted', metrics.applicationsSubmitted)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 hover:border-blue-500/60 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-blue-950/70 border border-blue-500/30"><Send size={16} className="text-blue-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Execution</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-blue-300 mt-2">{metrics.applicationsSubmitted}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Applications Submitted</div>
          <div className="kpi-trend text-[11px] text-blue-400 mt-1.5 flex items-center justify-between">
            <span>confirmed on job portal</span>
            <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
        </div>

        {/* Metric 7: Failed Applications */}
        <div
          onClick={() => handleCardClick('failed', 'Failed Applications', metrics.failedApplications)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-rose-500/30 hover:border-rose-500/70 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-500/30"><XCircle size={16} className="text-rose-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Failures</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-rose-400 mt-2">{metrics.failedApplications}</div>
          <div className="kpi-label text-xs text-gray-400 font-medium mt-0.5">Failed Applications</div>
          <div className="kpi-trend text-[11px] text-rose-400 mt-1.5 flex items-center justify-between">
            <span>challenge or network error</span>
            <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
        </div>

        {/* Metric 8: Interview Invitations */}
        <div
          onClick={() => handleCardClick('interviews', 'Company Interviews / Offers', metrics.interviewInvitations)}
          className="kpi-card p-3.5 rounded-xl bg-slate-900/75 border border-amber-500/30 hover:border-amber-500/70 hover:scale-[1.01] hover:shadow-lg transition-all shadow-sm cursor-pointer group select-none"
          title="Actual interview rounds, recruiter outreach, and company shortlist invitations received from employers."
        >
          <div className="flex justify-between items-start">
            <div className="p-1.5 rounded-lg bg-amber-950/70 border border-amber-500/30"><Target size={16} className="text-amber-400" /></div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-semibold">Company Decision</span>
          </div>
          <div className="kpi-num text-2xl font-bold text-amber-400 mt-2">{metrics.interviewInvitations}</div>
          <div className="kpi-label text-xs text-gray-200 font-semibold mt-0.5">Company Interviews / Offers</div>
          <div className="kpi-trend text-[11px] text-amber-400 mt-1.5 flex items-center justify-between">
            <span>employer interview rounds</span>
            <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">View list <ChevronRight size={11} /></span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Shortlist invites from recruiters
          </div>
        </div>
      </div>

      {/* Efficiency & Conversion Strip (Metrics 9, 10, 11 - Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 9: Rejection Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] text-gray-400 uppercase font-semibold">Rejection Rate</span>
            <div className="text-xl font-bold text-gray-200 mt-0.5">{metrics.rejectionRate}%</div>
            <p className="text-[10px] text-gray-500 mt-0.5">rejections / total processed</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-gray-400 font-mono">
              Benchmark &lt; 85%
            </span>
          </div>
        </div>

        {/* Metric 10: Application Conversion Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] text-gray-400 uppercase font-semibold">Conversion Rate</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.applicationConversionRate}%</div>
            <p className="text-[10px] text-gray-500 mt-0.5">interviews + offers / submitted</p>
          </div>
          <div className="text-right">
            <Award className="text-emerald-400 ml-auto" size={24} />
          </div>
        </div>

        {/* Metric 11: Average Time from Discovery to Submission */}
        <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800/80 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] text-gray-400 uppercase font-semibold">Avg Discovery-to-Submit</span>
            <div className="text-xl font-bold text-indigo-300 mt-0.5">{metrics.avgTimeDiscoveryToSubmissionFormatted}</div>
            <p className="text-[10px] text-gray-500 mt-0.5">mean preparation cycle</p>
          </div>
          <div className="text-right">
            <Clock className="text-indigo-400 ml-auto" size={24} />
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
            <Link to="/activity-logs" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All Logs <ChevronRight size={14} />
            </Link>
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

      {/* Interactive Card Details Modal (Requirement 3: Click cards to show list) */}
      {selectedCardModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCardModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
                  {selectedCardModal.category === 'jobs' ? <Search size={20} /> : <Layers size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {selectedCardModal.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedCardModal.items.length} {selectedCardModal.category === 'jobs' ? 'Jobs' : 'Applications'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time items matching {selectedCardModal.title}. Click to review, tailor resume, or inspect status.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCardModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search filter within list */}
            <div className="p-3 sm:px-5 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2">
              <Search size={15} className="text-slate-500" />
              <input
                type="text"
                placeholder={`Search inside ${selectedCardModal.title}...`}
                value={selectedCardModal.search}
                onChange={(e) => setSelectedCardModal((prev) => ({ ...prev, search: e.target.value }))}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
              />
              {selectedCardModal.search && (
                <button
                  type="button"
                  onClick={() => setSelectedCardModal((prev) => ({ ...prev, search: '' }))}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {selectedCardModal.loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw size={28} className="animate-spin text-indigo-400" />
                  <span className="text-sm text-slate-400">Loading {selectedCardModal.title.toLowerCase()}...</span>
                </div>
              ) : (
                (() => {
                  const query = selectedCardModal.search.toLowerCase();
                  const filtered = selectedCardModal.items.filter((item: any) => {
                    const title = (item.title || item.jobTitle || '').toLowerCase();
                    const company = (item.company_name || item.companyName || '').toLowerCase();
                    const location = (item.location || '').toLowerCase();
                    const notes = (item.notes || '').toLowerCase();
                    return title.includes(query) || company.includes(query) || location.includes(query) || notes.includes(query);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400 bg-slate-950/20 rounded-xl border border-slate-800/50 p-6">
                        <Inbox size={36} className="mx-auto text-slate-600 mb-2" />
                        <h3 className="text-sm font-semibold text-slate-300">No records found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedCardModal.search
                            ? `No items matching "${selectedCardModal.search}"`
                            : `There are currently no items in ${selectedCardModal.title}.`}
                        </p>
                      </div>
                    );
                  }

                  if (selectedCardModal.category === 'jobs') {
                    const areAllModalSelected = filtered.length > 0 && filtered.every((j: any) => modalSelectedJobIds.has(j.id));
                    const isModalIndeterminate = modalSelectedJobIds.size > 0 && !areAllModalSelected;

                    const toggleModalSelectAll = () => {
                      if (areAllModalSelected) {
                        setModalSelectedJobIds(new Set());
                      } else {
                        setModalSelectedJobIds(new Set(filtered.map((j: any) => j.id)));
                      }
                    };

                    const toggleModalSelectJob = (id: string) => {
                      setModalSelectedJobIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      });
                    };

                    return (
                      <>
                        {/* Modal Batch Toolbar */}
                        <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl mb-3">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200 select-none">
                            <input
                              type="checkbox"
                              checked={areAllModalSelected && filtered.length > 0}
                              ref={(el) => { if (el) el.indeterminate = isModalIndeterminate; }}
                              onChange={toggleModalSelectAll}
                              disabled={modalBatchApplying || filtered.length === 0}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                            />
                            <span>Select All ({filtered.length})</span>
                            {modalSelectedJobIds.size > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                                {modalSelectedJobIds.size} selected
                              </span>
                            )}
                          </label>

                          <div className="flex items-center gap-2">
                            {modalSelectedJobIds.size > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleBatchApplyFromModal(Array.from(modalSelectedJobIds))}
                                disabled={modalBatchApplying}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                              >
                                {modalBatchApplying ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    <span>Applying...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={12} />
                                    <span>Apply to Selected ({modalSelectedJobIds.size})</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBatchApplyFromModal(filtered.map((j: any) => j.id))}
                                disabled={modalBatchApplying || filtered.length === 0}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                              >
                                {modalBatchApplying ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    <span>Applying All...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send size={12} />
                                    <span>Apply All ({filtered.length})</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {filtered.map((job: any) => {
                          const matchScore = typeof job.match_score === 'number' ? Math.round(job.match_score) : null;
                          const isApplying = applyingInModalId === job.id;
                          const isSelected = modalSelectedJobIds.has(job.id);
                          let matchedSkillsList: string[] = [];
                          try {
                            matchedSkillsList = Array.isArray(job.matching_skills) ? job.matching_skills : JSON.parse(job.matching_skills || '[]');
                          } catch {
                            matchedSkillsList = [];
                          }

                          return (
                            <div
                              key={job.id}
                              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                                isSelected
                                  ? 'bg-indigo-950/20 border-indigo-500/60'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={modalBatchApplying || isApplying}
                                  onChange={() => toggleModalSelectJob(job.id)}
                                  className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-white tracking-tight">{job.title}</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                      {job.source || 'Direct ATS'}
                                    </span>
                                    {matchScore !== null && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        matchScore >= 80 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                                      }`}>
                                        {matchScore}% Profile Fit
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-indigo-300 font-medium flex items-center gap-2">
                                    <span>{job.company_name}</span>
                                    <span className="text-slate-500">·</span>
                                    <span className="text-slate-400">{job.location || 'Remote'}</span>
                                    {job.salary && job.salary !== 'Not specified' && (
                                      <>
                                        <span className="text-slate-500">·</span>
                                        <span className="text-emerald-400">{job.salary}</span>
                                      </>
                                    )}
                                  </div>
                                  {matchedSkillsList.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                      <span className="text-[10px] text-emerald-400 font-semibold">Matched:</span>
                                      {matchedSkillsList.slice(0, 4).map((sk) => (
                                        <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/20">
                                          {sk}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {job.apply_url && job.apply_url.startsWith('http') && (
                                  <a
                                    href={job.apply_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all"
                                  >
                                    <span>Portal</span>
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleApplyFromModal(job)}
                                  disabled={isApplying}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                  {isApplying ? (
                                    <>
                                      <RefreshCw size={12} className="animate-spin" />
                                      <span>Tailoring...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={12} />
                                      <span>Tailor & Apply</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  }

                  // Applications list
                  return filtered.map((app: any) => {
                    const stage = app.stage_status || app.status || 'READY_FOR_REVIEW';
                    const isFailed = stage === 'FAILED' || app.status === 'failed' || Boolean(app.last_submission_error);

                    return (
                      <div
                        key={app.id}
                        className="p-3.5 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {app.title || 'Software Engineering Role'}
                            </h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isFailed
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                                : stage === 'SUBMITTED' || app.status === 'applied'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                : stage === 'APPROVED'
                                ? 'bg-teal-950/80 text-teal-300 border border-teal-500/30'
                                : 'bg-pink-950/80 text-pink-300 border border-pink-500/30'
                            }`}>
                              {stage.replace(/_/g, ' ')}
                            </span>
                            {app.match_score && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                                {Math.round(app.match_score)}% Score
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-indigo-300 font-medium flex items-center gap-2">
                            <span>{app.company_name}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{app.location || 'Remote'}</span>
                            {app.source && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-400 uppercase font-mono text-[10px]">{app.source}</span>
                              </>
                            )}
                          </div>
                          {app.resume_version_label && (
                            <div className="text-[11px] text-purple-300 pt-0.5 flex items-center gap-1">
                              <Sparkles size={11} /> {app.resume_version_label}
                            </div>
                          )}
                          {(app.last_submission_error || app.notes) && (
                            <div className={`text-[11px] mt-1 p-2 rounded-lg border ${
                              isFailed
                                ? 'bg-rose-950/40 text-rose-300 border-rose-900/50'
                                : 'bg-slate-900 text-slate-300 border-slate-800'
                            }`}>
                              {app.last_submission_error || app.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {stage === 'READY_FOR_REVIEW' || stage === 'NEEDS_CANDIDATE_INPUT' ? (
                            <Link
                              to="/review-queue"
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-950/80 hover:bg-pink-900 text-pink-200 border border-pink-500/40 flex items-center gap-1 transition-all"
                            >
                              <span>Review Draft</span>
                              <ChevronRight size={13} />
                            </Link>
                          ) : (
                            <Link
                              to="/applications"
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-all"
                            >
                              <span>Details</span>
                              <ChevronRight size={13} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:px-5 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
              <span>
                Showing {selectedCardModal.items.length} records in {selectedCardModal.title}
              </span>
              <div className="flex items-center gap-2">
                {selectedCardModal.category === 'jobs' ? (
                  <Link
                    to="/jobs"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>Open in Job Matches</span>
                    <ArrowRight size={12} />
                  </Link>
                ) : (
                  <Link
                    to="/applications"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>Open Applications Page</span>
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <HowItWorksModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default Dashboard;
