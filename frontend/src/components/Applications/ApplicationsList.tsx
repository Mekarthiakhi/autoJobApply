import React, { useEffect, useState } from 'react';
import { applicationsAPI } from '../../api/auth';
import { Building, Calendar, RefreshCw } from 'lucide-react';
import styles from './Applications.module.css';


export const ApplicationsList: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleUpdateStatus = async (appId: string, currentStatus: string) => {
    const statuses = ['pending', 'applied', 'interview', 'rejected', 'offer'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    try {
      setUpdatingId(appId);
      await applicationsAPI.updateStatus(appId, nextStatus);
      // Update local state directly
      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, status: nextStatus } : app)
      );
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update application status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && applications.length === 0) return <div className={styles.appsLoading}>Loading applications...</div>;

  const stats = {
    applied: applications.filter((a: any) => a.status === 'applied' || a.status === 'pending').length,
    interviews: applications.filter((a: any) => a.status === 'interview').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
    offers: applications.filter((a: any) => a.status === 'offer').length,
  };

  return (
    <div className="applications-container glass-dark fade-in">
      <h1 className="apps-title slide-in-left">My Applications</h1>
      
      <div className="apps-stats slide-in-right">
        <div className="stat-item glass">
          <span className="stat-label">Applied</span>
          <span className="stat-value">{stats.applied}</span>
        </div>
        <div className={`${styles.statItem} glass`}>
          <span className={styles.statLabel}>Interviews</span>
          <span className={styles.statValue} style={{ color: '#f59e0b' }}>{stats.interviews}</span>
        </div>
        <div className={`${styles.statItem} glass`}>
          <span className={styles.statLabel}>Rejected</span>
          <span className={styles.statValue} style={{ color: '#ef4444' }}>{stats.rejected}</span>
        </div>
        <div className={`${styles.statItem} glass`}>
          <span className={styles.statLabel}>Offers</span>
          <span className={styles.statValue} style={{ color: '#10b981' }}>{stats.offers}</span>
        </div>
      </div>

      <div className={styles.applicationsList}>
        {applications.length > 0 ? (
          applications.map((app: any) => (
            <div key={app.id} className={`${styles.appCard} glass`}>
              <div className={styles.appHeader}>
                <div>
                  <h3 style={{ color: 'white', marginBottom: 4 }}>{app.title || app.job_title || 'Position'}</h3>
                  <span className={`${styles.statusBadge} ${styles['status' + capitalize(app.status)]}`}>
                    {app.status}
                  </span>
                </div>
              </div>
              <div className={styles.appDetails}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)' }}>
                  <Building size={14} />
                  <strong>Company:</strong> {app.company_name || 'N/A'}
                </p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)' }}>
                  <Calendar size={14} />
                  <strong>Applied:</strong> {new Date(app.applied_at).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.appActions}>
                <button 
                  className="btn btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
                  onClick={() => handleUpdateStatus(app.id, app.status)}
                  disabled={updatingId === app.id}
                >
                  <RefreshCw size={14} className={updatingId === app.id ? 'spin' : ''} />
                  <span>{updatingId === app.id ? 'Updating...' : 'Cycle Status'}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noApps} style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 32, fontStyle: 'italic' }}>
            No applications tracked yet. Start applying to jobs in the Jobs tab!
          </div>
        )}
      </div>
    </div>
  );
};

function capitalize(val: string): string {
  if (!val) return '';
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export default ApplicationsList;
