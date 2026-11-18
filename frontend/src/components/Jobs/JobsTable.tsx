import React, { useEffect, useState } from 'react';
import { useJobs } from '../../hooks/useJobs';
import { applicationsAPI, dashboardAPI } from '../../api/auth';
import { Search, SlidersHorizontal, Clock, Home, Building, RefreshCw } from 'lucide-react';

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

export const JobsTable: React.FC = () => {
  const { jobs, loading, fetchJobs, searchJobs } = useJobs();
  const [applications, setApplications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadData = async () => {
    await fetchJobs();
    try {
      const appRes = await applicationsAPI.getApplications();
      setApplications(Array.isArray(appRes.data) ? appRes.data : []);
    } catch {
      setApplications([]);
    }
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

  const safeJobs = rawJobs.filter((j: any) => {
    const score = typeof j.match_score === 'number' ? j.match_score : 0;
    if (minScoreFilter > 0 && score < minScoreFilter) return false;
    if (activeTab === 'matched' && score < 80) return false;
    if (activeTab === 'saved' && !j.is_saved && !appliedJobIds.has(j.id)) return false;
    return true;
  });

  // Compute dynamic metrics from real DB records
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
      await dashboardAPI.runAgents();
      await loadData();
    } catch (err) {
      console.error('Job discovery failed', err);
      alert('Failed to run job discovery pipeline.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplyingJobId(jobId);
      await applicationsAPI.applyToJob(jobId);
      await loadData();
      alert('Application submitted and tracked!');
    } catch (err: any) {
      console.error('Failed to apply', err);
      alert(err?.response?.data?.error || 'Failed to apply');
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
            const hasScore = typeof job.match_score === 'number';
            const score = hasScore ? Math.round(job.match_score) : 0;
            const isApplied = appliedJobIds.has(job.id);

            return (
              <div key={job.id} className="job-row">
                <div className="job-logo" style={{ background: logoColor.bg, color: logoColor.color }}>
                  {company.substring(0, 2).toUpperCase()}
                </div>
                <div className="job-info">
                  <div className="job-title">{job.title}</div>
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
              Upload your resume in the Resume tab or click &ldquo;Discover Live Jobs&rdquo; to find matching roles.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsTable;
