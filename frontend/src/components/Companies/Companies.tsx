import React, { useState } from 'react';
import { Sparkles, Plus, Download } from 'lucide-react';
import CompaniesTable from './CompaniesTable';
import AIDiscoverModal from './AIDiscoverModal';

const Companies: React.FC = () => {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const stats = {
    totalCompanies: 142,
    activeTargets: 87,
    averageFitScore: 78,
    applicationsThisWeek: 23,
  };

  return (
    <div className="w-full space-y-8 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Target Companies
          </h1>
          <p className="text-gray-400 text-sm">
            Manage your target companies and discover new opportunities with AI
          </p>
        </div>
        <div className="flex gap-3">
          <button className="neumo-btn inline-flex items-center gap-2 text-sm">
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="neumo-btn inline-flex items-center gap-2 text-sm bg-accent-primary text-white shadow-glow-blue hover:shadow-glow-blue"
          >
            <Sparkles size={16} />
            Discover with AI
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Companies */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-primary/10">
            <Plus className="w-6 h-6 text-accent-primary" />
          </div>
          <h3 className="kpi-label">Total Companies</h3>
          <div className="kpi-value text-3xl mt-2">{stats.totalCompanies}</div>
          <p className="text-xs text-gray-500 mt-2">In your database</p>
        </div>

        {/* Active Targets */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-success/10">
            <span className="text-xl">🎯</span>
          </div>
          <h3 className="kpi-label">Active Targets</h3>
          <div className="kpi-value text-3xl mt-2">{stats.activeTargets}</div>
          <p className="text-xs text-gray-500 mt-2">Actively applying</p>
        </div>

        {/* Average Fit Score */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-success/10">
            <span className="text-xl">📊</span>
          </div>
          <h3 className="kpi-label">Avg Fit Score</h3>
          <div className="kpi-value text-3xl mt-2">{stats.averageFitScore}%</div>
          <p className="text-xs text-accent-success mt-2">↗ +5% this week</p>
        </div>

        {/* Applications This Week */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-info/10">
            <span className="text-xl">📬</span>
          </div>
          <h3 className="kpi-label">Applications</h3>
          <div className="kpi-value text-3xl mt-2">{stats.applicationsThisWeek}</div>
          <p className="text-xs text-gray-500 mt-2">This week</p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="neumo-card p-6 bg-accent-primary/5 border-l-4 border-accent-primary">
        <h3 className="text-sm font-semibold text-accent-primary mb-2">💡 Pro Tip</h3>
        <p className="text-sm text-gray-300">
          Use the <span className="font-semibold">"Discover with AI"</span> feature to automatically find companies that match your skills and experience. The AI analyzes market trends and your profile to suggest the best opportunities.
        </p>
      </div>

      {/* Companies Table */}
      <div>
        <h2 className="text-xl font-display font-semibold text-white mb-4">
          All Companies
        </h2>
        <CompaniesTable />
      </div>

      {/* AI Discover Modal */}
      <AIDiscoverModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onDiscover={() => {
          setIsAIModalOpen(false);
          // Handle discover logic here
          console.log('Discovering companies with AI...');
        }}
      />
    </div>
  );
};

export default Companies;
