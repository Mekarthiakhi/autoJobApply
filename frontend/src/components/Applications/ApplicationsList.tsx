import React, { useEffect, useState } from 'react';
import { applicationsAPI } from '../../api/auth';
import './Applications.css';

export const ApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await applicationsAPI.getApplications();
        setApplications(response.data);
      } catch (error) {
        console.error('Failed to fetch applications', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  if (loading) return <div className="apps-loading">Loading applications...</div>;

  const stats = {
    applied: applications.filter((a: any) => a.status === 'applied').length,
    interviews: applications.filter((a: any) => a.interview_scheduled).length,
    rejected: applications.filter((a: any) => a.rejected).length,
    offers: applications.filter((a: any) => a.offer_received).length,
  };

  return (
    <div className="applications-container glass-dark fade-in">
      <h1 className="apps-title slide-in-left">My Applications</h1>
      
      <div className="apps-stats slide-in-right">
        <div className="stat-item glass">
          <span className="stat-label">Applied</span>
          <span className="stat-value">{stats.applied}</span>
        </div>
        <div className="stat-item glass">
          <span className="stat-label">Interviews</span>
          <span className="stat-value">{stats.interviews}</span>
        </div>
        <div className="stat-item glass">
          <span className="stat-label">Rejected</span>
          <span className="stat-value">{stats.rejected}</span>
        </div>
        <div className="stat-item glass">
          <span className="stat-label">Offers</span>
          <span className="stat-value">{stats.offers}</span>
        </div>
      </div>

      <div className="applications-list">
        {applications.map((app: any) => (
          <div key={app.id} className="app-card glass">
            <div className="app-header">
              <h3>{app.job_title || 'Job Title'}</h3>
              <span className={`status-badge status-${app.status}`}>{app.status}</span>
            </div>
            <div className="app-details">
              <p><strong>Company:</strong> {app.company_name || 'N/A'}</p>
              <p><strong>Applied:</strong> {new Date(app.applied_at).toLocaleDateString()}</p>
            </div>
            <div className="app-actions">
              <button className="btn btn-secondary">Update Status</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationsList;
