import React, { useEffect, useState } from 'react';
import { useJobs } from '../../hooks/useJobs';
import { applicationsAPI } from '../../api/auth';
import { Search, SlidersHorizontal, MapPin, Clock, Home, Building } from 'lucide-react';

export const JobsTable: React.FC = () => {
  const { jobs, loading, fetchJobs, searchJobs } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

  const rawJobs = Array.isArray(jobs) ? jobs : (jobs && Array.isArray((jobs as any).jobs) ? (jobs as any).jobs : []);
  const safeJobs = rawJobs.filter((j: any) => {
    const score = j.match_score || 85;
    if (minScoreFilter > 0 && score < minScoreFilter) return false;
    if (activeTab === 'matched' && score < 80) return false;
    return true;
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      searchJobs([val.trim()]);
    } else {
      fetchJobs();
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplyingJobId(jobId);
      await applicationsAPI.applyToJob(jobId);
      setTimeout(() => {
        setApplyingJobId(null);
        alert('Successfully applied!');
      }, 800);
    } catch (err) {
      console.error('Failed to apply', err);
      setApplyingJobId(null);
      alert('Failed to apply');
    }
  };

  const getMatchClass = (score: number | null) => {
    if (!score) return 'match-med';
    if (score >= 90) return 'match-high';
    return 'match-med';
  };
  
  const getMatchLabel = (score: number | null) => {
    if (!score) return 'Good';
    if (score >= 90) return 'Top match';
    if (score >= 85) return 'Strong';
    return 'Good';
  };

  const getLogoColor = (companyName: string) => {
    const hash = companyName.length;
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
        <div className={`tab ${activeTab === 'matched' ? 'active' : ''}`} onClick={() => setActiveTab('matched')}>Matched</div>
        <div className={`tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>Saved</div>
      </div>

      <div className="content">
        <div className="section-header">
          <div>
            <div className="section-title">Job Matches</div>
            <div className="section-sub">{safeJobs.length} new matches found today · Last synced 3 min ago</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
            <div className="stat-val">{safeJobs.length}</div>
            <div className="stat-delta up">↑ 18 today</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">AI Matches</div>
            <div className="stat-val accent">{safeJobs.filter((j: any) => (j.match_score || 0) >= 80).length}</div>
            <div className="stat-delta up">↑ above 80%</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">Applied</div>
            <div className="stat-val">34</div>
            <div className="stat-delta">this week</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">Success rate</div>
            <div className="stat-val green">64%</div>
            <div className="stat-delta up">↑ +8% vs last week</div>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px', padding: '0 4px' }}>Top matches</div>

        {safeJobs.length > 0 ? (
          safeJobs.map((job: any) => {
            const logoColor = getLogoColor(job.company_name);
            const score = job.match_score ?? (80 + (job.company_name.length % 15)); // deterministic fallback
            
            return (
              <div key={job.id} className="job-row">
                <div className="job-logo" style={{ background: logoColor.bg, color: logoColor.color }}>
                  {job.company_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="job-info">
                  <div className="job-title">{job.title}</div>
                  <div className="job-meta">
                    <span>{job.company_name} · {job.location || 'Remote'}</span>
                    <span>
                      {job.location?.toLowerCase().includes('remote') ? <Home size={11} /> : <Building size={11} />} 
                      {job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site'}
                    </span>
                    <span><Clock size={11} /> 2h ago</span>
                  </div>
                </div>
                <div className="score-bar-wrap">
                  <div className="score-bar">
                    <div className={`score-fill ${score >= 90 ? 'high' : ''}`} style={{ width: `${score}%` }}></div>
                  </div>
                  <div className="score-num" style={score >= 90 ? { color: '#4ADE80' } : {}}>{Math.round(score)}%</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={`match-pill ${getMatchClass(score)}`}>{getMatchLabel(score)}</div>
                  <button 
                    onClick={() => handleApply(job.id)}
                    disabled={applyingJobId === job.id}
                    style={{
                      background: 'linear-gradient(135deg, #6C63FF 0%, #483dff 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: applyingJobId === job.id ? 'not-allowed' : 'pointer',
                      opacity: applyingJobId === job.id ? 0.7 : 1
                    }}
                  >
                    {applyingJobId === job.id ? 'Applying...' : 'Apply Now'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            No jobs found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsTable;
