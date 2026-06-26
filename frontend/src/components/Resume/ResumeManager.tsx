import React, { useState } from 'react';
import { Plus, Sparkles, TrendingUp, FileText } from 'lucide-react';
import ResumeSidebar from './ResumeSidebar';
import ResumeVariant from './ResumeVariant';
import SkillsGapAnalysis from './SkillsGapAnalysis';

interface Variant {
  id: string;
  title: string;
  jobTitle: string;
  company?: string;
  matchScore: number;
  improvement: number;
  createdAt: string;
  keywordsAdded: string[];
  sectionsOptimized: string[];
  metrics: {
    originalMatch: number;
    improvedMatch: number;
    keywordsAdded: number;
    sectionsOptimized: number;
  };
  isPinned?: boolean;
}

const ResumeManager: React.FC = () => {
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: '1',
      title: 'Google Software Engineer',
      jobTitle: 'Senior Software Engineer',
      company: 'Google',
      matchScore: 94,
      improvement: 12,
      createdAt: 'Created 2 days ago',
      keywordsAdded: [
        'System Design',
        'Distributed Systems',
        'Go',
        'Protocol Buffers',
        'Microservices',
        'Cloud Infrastructure',
      ],
      sectionsOptimized: ['Experience', 'Skills', 'Projects'],
      metrics: {
        originalMatch: 82,
        improvedMatch: 94,
        keywordsAdded: 23,
        sectionsOptimized: 3,
      },
      isPinned: true,
    },
    {
      id: '2',
      title: 'Microsoft Full Stack Developer',
      jobTitle: 'Full Stack Developer',
      company: 'Microsoft',
      matchScore: 87,
      improvement: 9,
      createdAt: 'Created 4 days ago',
      keywordsAdded: [
        'Azure',
        'C#',
        '.NET',
        'SQL Server',
        'React',
        'TypeScript',
        'DevOps',
      ],
      sectionsOptimized: ['Experience', 'Technical Skills', 'Certifications'],
      metrics: {
        originalMatch: 78,
        improvedMatch: 87,
        keywordsAdded: 18,
        sectionsOptimized: 3,
      },
    },
    {
      id: '3',
      title: 'Startup Backend Engineer',
      jobTitle: 'Backend Engineer',
      company: 'Early-Stage Startup',
      matchScore: 82,
      improvement: 8,
      createdAt: 'Created 1 week ago',
      keywordsAdded: [
        'Startup',
        'MVP',
        'Rapid Development',
        'Agile',
        'Full Ownership',
        'Scaling',
      ],
      sectionsOptimized: ['Experience', 'Projects', 'Achievements'],
      metrics: {
        originalMatch: 74,
        improvedMatch: 82,
        keywordsAdded: 15,
        sectionsOptimized: 3,
      },
    },
    {
      id: '4',
      title: 'Amazon Staff Engineer',
      jobTitle: 'Staff Engineer',
      company: 'Amazon',
      matchScore: 78,
      improvement: 6,
      createdAt: 'Created 2 weeks ago',
      keywordsAdded: [
        'Leadership',
        'Mentorship',
        'Architecture',
        'Java',
        'AWS',
        'Large Scale',
      ],
      sectionsOptimized: ['Experience', 'Leadership', 'Impact Metrics'],
      metrics: {
        originalMatch: 72,
        improvedMatch: 78,
        keywordsAdded: 12,
        sectionsOptimized: 3,
      },
    },
  ]);

  const [activeTab, setActiveTab] = useState<'variants' | 'skills'>('variants');
  const [sortBy, setSortBy] = useState<'recent' | 'match' | 'improvement'>('recent');

  const sortedVariants = [...variants].sort((a, b) => {
    if (sortBy === 'match') return b.matchScore - a.matchScore;
    if (sortBy === 'improvement') return b.improvement - a.improvement;
    return 0; // recent (default order)
  });

  const pinnedVariants = sortedVariants.filter((v) => v.isPinned);
  const unpinnedVariants = sortedVariants.filter((v) => !v.isPinned);

  const handleDeleteVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleTogglePin = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isPinned: !v.isPinned } : v))
    );
  };

  const stats = {
    totalVariants: variants.length,
    averageMatch: Math.round(
      variants.reduce((sum, v) => sum + v.matchScore, 0) / variants.length
    ),
    totalKeywordsAdded: variants.reduce(
      (sum, v) => sum + v.metrics.keywordsAdded,
      0
    ),
    skillsToImprove: 5,
  };

  return (
    <div className="w-full space-y-8 fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Resume Manager
          </h1>
          <p className="text-gray-400 text-sm">
            Create AI-tailored resume variants and close your skills gaps
          </p>
        </div>
        <button className="neumo-btn inline-flex items-center gap-2 text-sm bg-accent-primary text-white shadow-glow-blue">
          <Plus size={16} />
          Create New Variant
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Variants */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-primary/10">
            <FileText className="w-6 h-6 text-accent-primary" />
          </div>
          <h3 className="kpi-label">Resume Variants</h3>
          <div className="kpi-value text-3xl mt-2">{stats.totalVariants}</div>
          <p className="text-xs text-gray-500 mt-2">AI-generated versions</p>
        </div>

        {/* Average Match Score */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-success/10">
            <TrendingUp className="w-6 h-6 text-accent-success" />
          </div>
          <h3 className="kpi-label">Avg Match Score</h3>
          <div className="kpi-value text-3xl mt-2">{stats.averageMatch}%</div>
          <p className="text-xs text-accent-success mt-2">↗ Consistently high</p>
        </div>

        {/* Keywords Added */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-info/10">
            <Sparkles className="w-6 h-6 text-accent-info" />
          </div>
          <h3 className="kpi-label">Keywords Added</h3>
          <div className="kpi-value text-3xl mt-2">+{stats.totalKeywordsAdded}</div>
          <p className="text-xs text-gray-500 mt-2">Across all variants</p>
        </div>

        {/* Skills to Improve */}
        <div className="neumo-card p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-warning/10">
            <span className="text-xl">📚</span>
          </div>
          <h3 className="kpi-label">Skills to Improve</h3>
          <div className="kpi-value text-3xl mt-2">{stats.skillsToImprove}</div>
          <p className="text-xs text-gray-500 mt-2">See gap analysis</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-neumo-border">
        <button
          onClick={() => setActiveTab('variants')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${
            activeTab === 'variants'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <FileText className="inline mr-2" size={16} />
          Resume Variants
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${
            activeTab === 'skills'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <span className="inline mr-2">📊</span>
          Skills Gap Analysis
        </button>
      </div>

      {/* Content */}
      {activeTab === 'variants' && (
        <div className="space-y-8">
          {/* Sort Options */}
          <div className="flex gap-3">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'recent'
                  ? 'bg-accent-primary text-white shadow-glow-blue'
                  : 'neumo-btn'
              }`}
            >
              Most Recent
            </button>
            <button
              onClick={() => setSortBy('match')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'match'
                  ? 'bg-accent-primary text-white shadow-glow-blue'
                  : 'neumo-btn'
              }`}
            >
              Highest Match
            </button>
            <button
              onClick={() => setSortBy('improvement')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'improvement'
                  ? 'bg-accent-primary text-white shadow-glow-blue'
                  : 'neumo-btn'
              }`}
            >
              Most Improved
            </button>
          </div>

          {/* Pinned Variants */}
          {pinnedVariants.length > 0 && (
            <div>
              <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-accent-primary">⭐</span>
                Pinned Variants ({pinnedVariants.length})
              </h2>
              <div className="space-y-4">
                {pinnedVariants.map((variant) => (
                  <ResumeVariant
                    key={variant.id}
                    {...variant}
                    isPinned={true}
                    onPin={() => handleTogglePin(variant.id)}
                    onDelete={() => handleDeleteVariant(variant.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Variants */}
          {unpinnedVariants.length > 0 && (
            <div>
              <h2 className="text-lg font-display font-semibold text-white mb-4">
                Other Variants ({unpinnedVariants.length})
              </h2>
              <div className="space-y-4">
                {unpinnedVariants.map((variant) => (
                  <ResumeVariant
                    key={variant.id}
                    {...variant}
                    isPinned={false}
                    onPin={() => handleTogglePin(variant.id)}
                    onDelete={() => handleDeleteVariant(variant.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Skills Gap Analysis */}
          <div className="lg:col-span-2">
            <SkillsGapAnalysis targetRole="Senior Full Stack Engineer" />
          </div>

          {/* Sidebar */}
          <div>
            <ResumeSidebar />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="neumo-card p-6 bg-accent-primary/5 border-l-4 border-accent-primary">
        <h3 className="text-sm font-semibold text-accent-primary mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Create variants for different roles to maximize match scores</li>
          <li>• Pin your top 2-3 variants for quick access</li>
          <li>• Close your skills gaps to improve overall resume quality</li>
          <li>• Download and share your variants with recruiters</li>
        </ul>
      </div>
    </div>
  );
};

export default ResumeManager;
