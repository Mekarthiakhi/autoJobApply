import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../../api/auth';
import StatsCard from './StatsCard';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalJobsFound: 0,
    totalApplications: 0,
    totalMatches: 0,
    successRate: 0,
    interviews: 0,
    offers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardAPI.getDashboard();
        setStats(response.data.stats);
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div className={styles.dashboardLoading}>Loading...</div>;

  return (
    <div className={`${styles.dashboard} glass-dark`}>
      <h1 className={styles.dashboardTitle}>Dashboard</h1>
      <div className={styles.statsGrid}>
        <StatsCard
          icon="🔍"
          label="Jobs Found"
          value={stats.totalJobsFound}
          trend="↑"
        />
        <StatsCard
          icon="✨"
          label="Total Matches"
          value={stats.totalMatches}
          trend="↑"
        />
        <StatsCard
          icon="📝"
          label="Applications"
          value={stats.totalApplications}
          trend="→"
        />
        <StatsCard
          icon="🎯"
          label="Success Rate"
          value={`${stats.successRate}%`}
          trend="↑"
        />
        <StatsCard
          icon="📅"
          label="Interviews"
          value={stats.interviews}
          trend="↑"
        />
        <StatsCard
          icon="🎉"
          label="Offers"
          value={stats.offers}
          trend="↑"
        />
      </div>
    </div>
  );
};

export default Dashboard;
