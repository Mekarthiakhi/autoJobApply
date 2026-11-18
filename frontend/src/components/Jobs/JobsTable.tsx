import React, { useEffect, useState } from 'react';
import { useJobs } from '../../hooks/useJobs';
import { applicationsAPI, dashboardAPI, jobsAPI } from '../../api/auth';
import { Search, SlidersHorizontal, Clock, Home, Building, RefreshCw, ExternalLink, Globe } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PortalStatus {
  id: string;
  name: string;
  coverage: string;
  status: 'active' | 'needs_key';
  requiresKey: boolean;
  envVar?: string;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently synced';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return 'Recently synced';
  const diffMs = Date.now() - parsed.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return parsed.toLocaleDateString();
}

function getSourceBadgeStyle(source?: string): { bg: string; color: string; label: string } {
  const s = (source || 'direct').toLowerCase();
  const map: Record<string, { bg: string; color: string; label: string }> = {
    greenhouse: { bg: 'rgba(16,185,129,0.18)', color: '#34d399', label: 'Greenhouse ATS' },
    ashby: { bg: 'rgba(99,102,241,0.18)', color: '#a5b4fc', label: 'Ashby ATS' },
    lever: { bg: 'rgba(59,130,246,0.18)', color: '#60a5fa', label: 'Lever ATS' },
    remotive: { bg: 'rgba(139,92,246,0.16)', color: '#c4b5fd', label: 'Remotive' },
    remoteok: { bg: 'rgba(239,68,68,0.16)', color: '#fca5a5', label: 'RemoteOK' },
    jobicy: { bg: 'rgba(14,165,233,0.16)', color: '#7dd3fc', label: 'Jobicy' },
    arbeitnow: { bg: 'rgba(245,158,11,0.16)', color: '#fcd34d', label: 'Arbeitnow' },
    himalayas: { bg: 'rgba(16,185,129,0.16)', color: '#6ee7b7', label: 'Himalayas' },
    linkedin: { bg: 'rgba(59,130,246,0.18)', color: '#93c5fd', label: 'LinkedIn' },
    indeed: { bg: 'rgba(99,102,241,0.18)', color: '#a5b4fc', label: 'Indeed' },
    glassdoor: { bg: 'rgba(34,197,94,0.16)', color: '#86efac', label: 'Glassdoor' },
    naukri: { bg: 'rgba(249,115,22,0.16)', color: '#fdba74', label: 'Naukri' },
    shine: { bg: 'rgba(168,85,247,0.16)', color: '#d8b4fe', label: 'Shine' },
    jsearch: { bg: 'rgba(56,189,248,0.16)', color: '#7dd3fc', label: 'JSearch' },
    adzuna: { bg: 'rgba(20,184,166,0.16)', color: '#5eead4', label: 'Adzuna' },
    jooble: { bg: 'rgba(236,72,153,0.16)', color: '#f9a8d4', label: 'Jooble' },
  };
  return map[s] || { bg: 'rgba(255,255,255,0.08)', color: '#cbd5e1', label: s.toUpperCase() };
}

export const JobsTable: React.FC = () => {
  const toast = useToast();
  const { jobs, loading, fetchJobs, searchJobs } = useJobs();
  const [applications, setApplications] = useState<any[]>([]);
  const [portals, setPortals] = useState<PortalStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPortal, setSelectedPortal] = useState<string>('all');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [activelyHiringOnly, setActivelyHiringOnly] = useState<boolean>(true);
  const [directAtsOnly, setDirectAtsOnly] = useState<boolean>(false);
  const [remoteOnly, setRemoteOnly] = useState<boolean>(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadData = async () => {
    await fetchJobs();
    const [appRes, portalsRes] = await Promise.all([
      applicationsAPI.getApplications().catch(() => ({ data: [] })),
      jobsAPI.getPortals().catch(() => ({ data: { portals: [] } })),
    ]);
    setApplications(Array.isArray(appRes.data) ? appRes.data : []);
    setPortals(Array.isArray(portalsRes.data?.portals) ? portalsRes.data.portals : []);
    setLastSyncedAt(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const rawJobs = Array.isArray(jobs)
    ? jobs
    : jobs && Array.isArray((jobs as any).jobs)
    ? (jobs as any).jobs
    : [];

  const appliedJobIds = new Set(applications.map((a: any) => a.job_id));
  const discoveredSources = Array.from(
    new Set(rawJobs.map((j: any) => (j.source || '').toLowerCase()).filter(Boolean))
  ) as string[];

  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const isJobActivelyHiring = (j: any) => {
    if ((j.status || '').toLowerCase() === 'expired') return false;
    const postedMs = new Date(j.posted_date || j.created_at || Date.now()).getTime();
    if (!Number.isNaN(postedMs) && postedMs < fourteenDaysAgo) return false;
    return !/no longer accepting|position filled|job closed|expired/i.test(`${j.title || ''} ${(j.job_description || '').slice(0, 300)}`);
  };
  const isJobDirectAts = (j: any) =>
    ['greenhouse', 'ashby', 'lever'].includes((j.source || '').toLowerCase()) ||
    /greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|^mailto:/i.test(j.apply_url || '');
  const isJobRemote = (j: any) =>
    /remote|worldwide|anywhere|work from home|wfh/i.test(`${j.location || ''} ${j.title || ''}`);

  const safeJobs = rawJobs.filter((j: any) => {
    const score = typeof j.match_score === 'number' ? j.match_score : 0;
    if (minScoreFilter > 0 && score < minScoreFilter) return false;
    if (activelyHiringOnly && !isJobActivelyHiring(j)) return false;
    if (directAtsOnly && !isJobDirectAts(j)) return false;
    if (remoteOnly && !isJobRemote(j)) return false;
    if (activeTab === 'matched' && score < 55) return false;
    if (activeTab === 'saved' && !j.is_saved && !appliedJobIds.has(j.id)) return false;
    if (selectedPortal !== 'all' && (j.source || '').toLowerCase() !== selectedPortal) return false;
    return true;
  });

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const jobsFoundToday = rawJobs.filter((j: any) => {
    const t = new Date(j.created_at || j.posted_date || 0).getTime();
    return t >= oneDayAgo;
  }).length;

  const aiMatchedCount = rawJobs.filter((j: any) => (j.match_score || 0) >= 80).length;

  const appliedThisWeek = applications.filter((a: any) => {
    const t = new Date(a.applied_at || a.created_at || 0).getTime();
    return t >= sevenDaysAgo;
  }).length;

  const positiveOutcomes = applications.filter((a: any) =>
    ['interview', 'offer', 'submitted', 'applied'].includes((a.status || '').toLowerCase())
  ).length;
  const successRate =
    applications.length > 0 ? Math.round((positiveOutcomes / applications.length) * 100) : 0;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      searchJobs([val.trim()]);
    } else {
      fetchJobs();
    }
  };

  const handleDiscoverJobs = async () => {
    try {
      setDiscovering(true);
      toast.info('Searching all connected live job portals & scoring against your resume...');
      const res = await dashboardAPI.runAgents({ sync: true, limitJobs: 12 });
      await loadData();
      const discovered = res.data?.summary?.jobsDiscovered;
      const queued = res.data?.summary?.draftsQueuedForReview;
      toast.success(
        typeof discovered === 'number'
          ? `Discovered ${discovered} live jobs across portals and queued ${queued || 0} drafts in Review Queue!`
          : 'Live multi-portal job discovery completed!'
      );
    } catch (err) {
      console.error('Job discovery failed', err);
      toast.error('Failed to run job discovery pipeline.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplyingJobId(jobId);
      await applicationsAPI.applyToJob(jobId);
      await loadData();
      toast.success('Application submitted and tracked!');
    } catch (err: any) {
      console.error('Failed to apply', err);
      toast.error(err?.response?.data?.error || 'Failed to apply');
    } finally {
      setApplyingJobId(null);
    }
  };

  const getMatchClass = (score: number | null | undefined) => {
    if (!score) return 'match-med';
    if (score >= 90) return 'match-high';
    return 'match-med';
  };

  const getMatchLabel = (score: number | null | undefined) => {
    if (typeof score !== 'number') return 'Unscored';
    if (score >= 90) return 'Top match';
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  const getLogoColor = (companyName: string) => {
    const hash = (companyName || 'NA').length;
    const colors = [
      { bg: 'rgba(0,119,255,0.12)', color: '#60A5FA' },
      { bg: 'rgba(255,165,0,0.12)', color: '#FBBF24' },
      { bg: 'rgba(108,99,255,0.15)', color: '#A5A0FF' },
      { bg: 'rgba(74,222,128,0.1)', color: '#4ADE80' },
    ];
    return colors[hash % colors.length];
  };

  if (loading && safeJobs.length === 0) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C63FF]"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: '4px', padding: '0 32px', background: '#0D0E1A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Jobs</div>
        <div className={`tab ${activeTab === 'matched' ? 'active' : ''}`} onClick={() => setActiveTab('matched')}>Matched (≥80%)</div>
        <div className={`tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>Applied / Saved</div>
      </div>

      <div className="content">
        <div className="section-header">
          <div>
            <div className="section-title">Job Matches</div>
            <div className="section-sub">
              {safeJobs.length} job{safeJobs.length === 1 ? '' : 's'} shown · {lastSyncedAt ? `Synced ${formatRelativeTime(lastSyncedAt.toISOString())}` : 'Syncing...'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleDiscoverJobs}
              disabled={discovering}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #6C63FF 0%, #483dff 100%)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: discovering ? 'not-allowed' : 'pointer',
                opacity: discovering ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} className={discovering ? 'animate-spin' : ''} />
              {discovering ? 'Discovering...' : 'Discover Live Jobs'}
            </button>

            {discoveredSources.length > 0 && (
              <select
                value={selectedPortal}
                onChange={(e) => setSelectedPortal(e.target.value)}
                style={{
                  background: '#12131F',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: 'white',
                  outline: 'none',
                }}
              >
                <option value="all">All Portals ({rawJobs.length})</option>
                {discoveredSources.map((src) => (
                  <option key={src} value={src}>
                    {getSourceBadgeStyle(src).label}
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#12131F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
              <Search size={14} color="rgba(255,255,255,0.3)" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={handleSearch}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'white', width: '150px' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: showFilterDropdown ? '#1E2238' : '#12131F', border: minScoreFilter > 0 ? '1px solid #6C63FF' : '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer' }}
              >
                <SlidersHorizontal size={14} color={minScoreFilter > 0 ? '#6C63FF' : 'rgba(255,255,255,0.5)'} />
                <span style={{ fontSize: '13px', color: minScoreFilter > 0 ? '#6C63FF' : 'rgba(255,255,255,0.5)', fontWeight: minScoreFilter > 0 ? 600 : 400 }}>
                  {minScoreFilter > 0 ? `≥ ${minScoreFilter}%` : 'Filter'}
                </span>
              </div>
              {showFilterDropdown && (
                <div style={{ position: 'absolute', right: 0, top: '44px', background: '#16192B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px', zIndex: 50, minWidth: '150px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', padding: '4px 8px', fontWeight: 600 }}>MIN MATCH SCORE</div>
                  {[0, 70, 80, 90].map((score) => (
                    <div
                      key={score}
                      onClick={() => { setMinScoreFilter(score); setShowFilterDropdown(false); }}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: minScoreFilter === score ? '#6C63FF' : 'white', background: minScoreFilter === score ? 'rgba(108,99,255,0.15)' : 'transparent' }}
                    >
                      {score === 0 ? 'All Matches' : `≥ ${score}% Score`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Hiring & Direct Apply Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setActivelyHiringOnly(!activelyHiringOnly)}
            className={activelyHiringOnly ? 'neumo-btn-primary' : 'neumo-btn'}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            🔥 Actively Hiring ({rawJobs.filter(isJobActivelyHiring).length})
          </button>
          <button
            type="button"
            onClick={() => setDirectAtsOnly(!directAtsOnly)}
            className={directAtsOnly ? 'neumo-btn-primary' : 'neumo-btn'}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            ⚡ Direct ATS Apply ({rawJobs.filter(isJobDirectAts).length})
          </button>
          <button
            type="button"
            onClick={() => setRemoteOnly(!remoteOnly)}
            className={remoteOnly ? 'neumo-btn-primary' : 'neumo-btn'}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            🌍 Remote Only ({rawJobs.filter(isJobRemote).length})
          </button>
        </div>

        {/* Connected Live Portals Strip */}
        {portals.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            marginBottom: '18px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>
              <Globe size={13} /> Portals:
            </span>
            {portals.map((p) => (
              <span
                key={p.id}
                title={`${p.name} — ${p.coverage}${p.status === 'needs_key' ? ` (Add ${p.envVar} to enable)` : ' (Live)'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  background: p.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.1)',
                  border: p.status === 'active' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(251,191,36,0.25)',
                  color: p.status === 'active' ? '#6ee7b7' : '#fcd34d',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.status === 'active' ? '#34d399' : '#fbbf24' }}></span>
                {p.name}
              </span>
            ))}
          </div>
        )}

        <div className="stat-strip">
          <div className="stat-cell">
            <div className="stat-label">Jobs Found</div>
            <div className="stat-val">{rawJobs.length}</div>
            <div className="stat-delta up">{jobsFoundToday} added today</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">AI Matches</div>
            <div className="stat-val accent">{aiMatchedCount}</div>
            <div className="stat-delta up">score ≥ 80%</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">Applied</div>
            <div className="stat-val">{applications.length}</div>
            <div className="stat-delta">{appliedThisWeek} this week</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">Active Rate</div>
            <div className="stat-val green">{successRate}%</div>
            <div className="stat-delta">{applications.length > 0 ? `${positiveOutcomes} of ${applications.length} active` : 'No applications yet'}</div>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px', padding: '0 4px' }}>
          Discovered Opportunities
        </div>

        {safeJobs.length > 0 ? (
          safeJobs.map((job: any) => {
            const company = job.company_name || 'Company';
            const logoColor = getLogoColor(company);
            const sourceBadge = getSourceBadgeStyle(job.source);
            const hasScore = typeof job.match_score === 'number';
            const score = hasScore ? Math.round(job.match_score) : 0;
            const isApplied = appliedJobIds.has(job.id);

            return (
              <div key={job.id} className="job-row">
                <div className="job-logo" style={{ background: logoColor.bg, color: logoColor.color }}>
                  {company.substring(0, 2).toUpperCase()}
                </div>
                <div className="job-info">
                  <div className="job-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{job.title}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: sourceBadge.bg,
                        color: sourceBadge.color,
                      }}
                    >
                      {sourceBadge.label}
                    </span>
                    {isJobActivelyHiring(job) && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'rgba(16,185,129,0.14)',
                          border: '1px solid rgba(16,185,129,0.32)',
                          color: '#34d399',
                        }}
                      >
                        Actively Hiring
                      </span>
                    )}
                    {isJobDirectAts(job) && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'rgba(108,99,255,0.16)',
                          border: '1px solid rgba(108,99,255,0.35)',
                          color: '#a5b4fc',
                        }}
                      >
                        Direct ATS
                      </span>
                    )}
                  </div>
                  <div className="job-meta">
                    <span>{company} · {job.location || 'Remote'}</span>
                    <span>
                      {job.location?.toLowerCase().includes('remote') ? <Home size={11} /> : <Building size={11} />}
                      {job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site'}
                    </span>
                    <span><Clock size={11} /> {formatRelativeTime(job.posted_date || job.created_at)}</span>
                  </div>
                </div>
                <div className="score-bar-wrap">
                  <div className="score-bar">
                    <div className={`score-fill ${score >= 90 ? 'high' : ''}`} style={{ width: `${score}%` }}></div>
                  </div>
                  <div className="score-num" style={score >= 90 ? { color: '#4ADE80' } : {}}>{hasScore ? `${score}%` : '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={`match-pill ${getMatchClass(job.match_score)}`}>{getMatchLabel(job.match_score)}</div>
                  {job.apply_url && job.apply_url.startsWith('http') && (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open original job posting"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#cbd5e1',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      View <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={applyingJobId === job.id || isApplied}
                    style={{
                      background: isApplied ? 'rgba(74, 222, 128, 0.15)' : 'linear-gradient(135deg, #6C63FF 0%, #483dff 100%)',
                      color: isApplied ? '#4ADE80' : 'white',
                      border: isApplied ? '1px solid rgba(74, 222, 128, 0.3)' : 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: applyingJobId === job.id || isApplied ? 'not-allowed' : 'pointer',
                      opacity: applyingJobId === job.id ? 0.7 : 1,
                    }}
                  >
                    {isApplied ? 'Applied' : applyingJobId === job.id ? 'Applying...' : 'Apply Now'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>
              No jobs discovered yet
            </div>
            <div style={{ fontSize: '13px', marginBottom: '16px' }}>
              Click &ldquo;Discover Live Jobs&rdquo; above to pull live roles from all connected portals.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsTable;
