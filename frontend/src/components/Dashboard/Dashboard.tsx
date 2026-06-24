import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../../api/auth';
import StatsCard from './StatsCard';
import { Search, Sparkles, Calendar, Gift, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalJobsFound: 2,
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

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-indigo"></div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Secondary Nav */}
      <div className="flex gap-6 mb-8">
        <Link to="/dashboard" className="px-6 py-2 bg-[#2d2d44] text-white rounded-lg font-medium">
          Dashboard
        </Link>
        <Link to="/settings" className="px-6 py-2 text-gray-400 hover:text-white transition-colors font-medium">
          Settings
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Jobs Found */}
          <StatsCard
            icon={<Search size={20} />}
            label="Jobs Found"
            value={stats.totalJobsFound || 2}
            borderColor="border-neon-indigo"
            iconBg="bg-neon-indigo/20"
            iconColor="text-neon-indigo"
            className="h-full"
          >
            <div className="flex items-end gap-1 mb-2 h-12">
              {[20, 30, 25, 40, 35, 50, 60].map((height, i) => (
                <div key={i} className="flex-1 bg-neon-indigo/80 rounded-sm" style={{ height: `${height}%` }}></div>
              ))}
            </div>
            <div className="text-neon-emerald text-sm font-medium flex items-center gap-1">
              <span>↗</span> +2 this week
            </div>
          </StatsCard>

          {/* Total Matches */}
          <StatsCard
            icon={<Sparkles size={20} />}
            label="Total Matches"
            value={stats.totalMatches}
            borderColor="border-neon-purple"
            iconBg="bg-neon-purple/20"
            iconColor="text-neon-purple"
            className="h-full"
          >
            <div className="text-gray-400 text-sm font-medium mt-auto">
              Waiting for matches
            </div>
          </StatsCard>

          {/* Interviews */}
          <StatsCard
            icon={<Calendar size={20} />}
            label="Interviews"
            value={stats.interviews}
            borderColor="border-neon-amber"
            iconBg="bg-neon-amber/20"
            iconColor="text-neon-amber"
            className="h-full"
          >
            <div className="flex gap-2 mb-2">
              <div className="flex-1 h-1 bg-[#2d2d44] rounded-full"></div>
              <div className="flex-1 h-1 bg-[#2d2d44] rounded-full"></div>
              <div className="flex-1 h-1 bg-[#2d2d44] rounded-full"></div>
            </div>
            <div className="text-gray-500 text-sm font-medium">
              No interviews scheduled
            </div>
          </StatsCard>

          {/* Offers */}
          <StatsCard
            icon={<Gift size={20} />}
            label="Offers"
            value={stats.offers}
            borderColor="border-neon-rose"
            iconBg="bg-neon-rose/20"
            iconColor="text-neon-rose"
            className="h-full relative"
          >
            <div className="text-gray-400 text-sm font-medium mt-auto">
              Keep applying!
            </div>
            {/* The circular arrow button between cards from the image mockup */}
            <div className="absolute -left-10 bottom-8 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-800 shadow-lg z-10 hidden md:flex cursor-pointer hover:bg-gray-300 transition-colors">
              ↓
            </div>
          </StatsCard>
        </div>

        {/* Tall Right Card */}
        <div className="bg-card-bg rounded-xl border-t-[3px] border-neon-emerald p-6 flex flex-col h-full">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-neon-emerald/20 text-neon-emerald">
            <Target size={20} />
          </div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
            Success Rate
          </h3>
          <div className="text-white text-4xl font-semibold mb-8">
            {stats.successRate}%
          </div>
          
          <div className="flex items-center gap-6 mb-12">
            {/* Circular Progress */}
            <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-[#2d2d44]">
              <div className="absolute inset-1 rounded-full bg-card-bg flex items-center justify-center">
                <span className="text-neon-emerald text-sm font-bold">0%</span>
              </div>
            </div>
            <div className="text-gray-400 text-sm leading-tight flex-1">
              Apply to more jobs to track
            </div>
          </div>

          <div className="mt-auto border-t border-[#2d2d44] pt-8">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              Applications
            </h3>
            <div className="text-white text-4xl font-semibold mb-6">
              {stats.totalApplications}
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 text-sm font-medium rounded-full w-max">
                Applied
              </div>
              <div className="px-4 py-1.5 bg-amber-500/20 text-amber-500 text-sm font-medium rounded-full w-max">
                Pending
              </div>
              <div className="px-4 py-1.5 bg-rose-500/20 text-rose-500 text-sm font-medium rounded-full w-max">
                Rejected
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
