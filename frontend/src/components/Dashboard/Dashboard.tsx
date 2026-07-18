import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../../api/auth';
import { Search, Sparkles, Target, ArrowUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalJobsFound: 247,
    totalApplications: 34,
    totalMatches: 89,
    successRate: 64,
    interviews: 7,
    offers: 2,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardAPI.getDashboard();
        if (response.data?.stats) {
          setStats(response.data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C63FF]"></div>
      </div>
    );

  return (
    <div className="content fade-in">
      <div className="section-header">
        <div>
          <div className="section-title">Overview</div>
          <div className="section-sub">Your job hunt at a glance · Week of Jun 23</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon blue"><Search size={17} color="#A5A0FF" /></div>
          <div className="kpi-num">{stats.totalJobsFound}</div>
          <div className="kpi-label">Jobs Found</div>
          <div className="kpi-trend"><ArrowUp size={11} className="inline mr-1" /> 18 new today</div>
        </div>
        
        <div className="kpi-card kpi-green">
          <div className="kpi-icon green"><Sparkles size={17} color="#4ADE80" /></div>
          <div className="kpi-num">{stats.totalMatches}</div>
          <div className="kpi-label">Total Matches</div>
          <div className="kpi-trend"><ArrowUp size={11} className="inline mr-1" /> above 80% score</div>
        </div>
        
        <div className="kpi-card kpi-amber">
          <div className="kpi-icon amber"><Target size={17} color="#FBBF24" /></div>
          <div className="kpi-num" style={{ color: '#FBBF24' }}>{stats.successRate}%</div>
          <div className="kpi-label">Success Rate</div>
          <div className="kpi-trend" style={{ color: '#FBBF24' }}><ArrowUp size={11} className="inline mr-1" /> +8% vs last week</div>
        </div>
      </div>

      <div className="stat-strip" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-cell">
          <div className="stat-label">Applications</div>
          <div className="stat-val">{stats.totalApplications}</div>
          <div className="stat-delta">this week</div>
        </div>
        
        <div className="stat-cell">
          <div className="stat-label">Interviews</div>
          <div className="stat-val amber">{stats.interviews}</div>
          <div className="stat-delta up"><ArrowUp size={11} className="inline mr-1" /> 3 scheduled</div>
        </div>
        
        <div className="stat-cell">
          <div className="stat-label">Offers</div>
          <div className="stat-val green">{stats.offers}</div>
          <div className="stat-delta up"><ArrowUp size={11} className="inline mr-1" /> 1 pending review</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
