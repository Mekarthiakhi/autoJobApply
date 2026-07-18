import React, { useEffect, useState } from 'react';
import { applicationsAPI } from '../../api/auth';

export const ApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationsAPI.getApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const stats = {
    applied: applications.filter((a: any) => a.status === 'applied' || a.status === 'pending').length,
    interviews: applications.filter((a: any) => a.status === 'interview').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
    offers: applications.filter((a: any) => a.status === 'offer').length,
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 's-applied';
      case 'interview': return 's-interview';
      case 'rejected': return 's-rejected';
      case 'offer': return 's-offer';
      case 'pending': return 's-pending';
      default: return 's-applied';
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'Applied';
    if (status.toLowerCase() === 'interview') return 'Interview scheduled';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getLogoColor = (companyName: string) => {
    if (!companyName) return { bg: 'rgba(255,255,255,0.1)', color: '#FFFFFF' };
    const hash = companyName.length;
    const colors = [
      { bg: 'rgba(0,119,255,0.12)', color: '#60A5FA' },
      { bg: 'rgba(255,165,0,0.12)', color: '#FBBF24' },
      { bg: 'rgba(108,99,255,0.15)', color: '#A5A0FF' },
      { bg: 'rgba(74,222,128,0.1)', color: '#4ADE80' },
    ];
    return colors[hash % colors.length];
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C63FF]"></div>
      </div>
    );
  }

  return (
    <div className="content fade-in">
      <div className="section-header">
        <div>
          <div className="section-title">My Applications</div>
          <div className="section-sub">{applications.length} total · {stats.interviews} active · Updated just now</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="status-pill s-applied" style={{ padding: '6px 14px', cursor: 'pointer', borderRadius: '8px' }}>Applied</div>
          <div className="status-pill s-interview" style={{ padding: '6px 14px', cursor: 'pointer', borderRadius: '8px' }}>Interviews</div>
          <div className="status-pill s-rejected" style={{ padding: '6px 14px', cursor: 'pointer', borderRadius: '8px' }}>Rejected</div>
        </div>
      </div>
      
      <div className="stat-strip">
        <div className="stat-cell"><div className="stat-label">Applied</div><div className="stat-val">{stats.applied}</div></div>
        <div className="stat-cell"><div className="stat-label">Interviews</div><div className="stat-val amber">{stats.interviews}</div></div>
        <div className="stat-cell"><div className="stat-label">Rejected</div><div className="stat-val red">{stats.rejected}</div></div>
        <div className="stat-cell"><div className="stat-label">Offers</div><div className="stat-val green">{stats.offers}</div></div>
      </div>

      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px', padding: '0 4px' }}>Recent Applications</div>

      {applications.length > 0 ? (
        applications.map((app: any) => {
          const logoColor = getLogoColor(app.company_name);
          return (
            <div key={app.id} className="job-row" style={{ opacity: app.status === 'rejected' ? 0.55 : 1 }}>
              <div className="job-logo" style={{ background: logoColor.bg, color: logoColor.color }}>
                {app.company_name ? app.company_name.substring(0, 2).toUpperCase() : 'NA'}
              </div>
              <div className="job-info">
                <div className="job-title">{app.title || app.job_title} · {app.company_name || 'Company'}</div>
                <div className="job-meta">
                  <span>Applied {new Date(app.applied_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{app.location || 'Remote'}</span>
                </div>
              </div>
              <div className={`status-pill ${getStatusClass(app.status)}`}>
                {getStatusLabel(app.status)}
              </div>
            </div>
          );
        })
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          No applications tracked yet. Start applying to jobs in the Jobs tab!
        </div>
      )}
    </div>
  );
};

export default ApplicationsList;
