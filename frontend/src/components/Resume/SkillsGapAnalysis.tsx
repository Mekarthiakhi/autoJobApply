import React, { useState } from 'react';
import { Zap, Award } from 'lucide-react';

export interface Skill {
  name: string;
  proficiency: number;
  relevance: number;
  priority: 'high' | 'medium' | 'low';
  resourceCount?: number;
  estimatedHours?: number;
}

interface SkillsGapAnalysisProps {
  targetRole?: string;
  currentSkills?: Skill[];
  recommendedSkills?: Skill[];
  completionRate?: number;
}

const SkillsGapAnalysis: React.FC<SkillsGapAnalysisProps> = ({
  targetRole = 'Your Target Role',
  currentSkills = [],
  recommendedSkills = [],
  completionRate = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'recommended'>('current');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-accent-error';
      case 'medium':
        return 'text-accent-warning';
      case 'low':
        return 'text-accent-info';
      default:
        return 'text-gray-400';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-accent-error/10 border-accent-error/20';
      case 'medium':
        return 'bg-accent-warning/10 border-accent-warning/20';
      case 'low':
        return 'bg-accent-info/10 border-accent-info/20';
      default:
        return 'bg-neumo-light border-neumo-border';
    }
  };

  const SkillBar: React.FC<{ skill: Skill }> = ({ skill }) => (
    <div key={skill.name} className="neumo-card p-4 transition-all hover:bg-neumo-light/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm">{skill.name}</h4>
          <p className="text-xs text-gray-400 mt-1">
            Relevance: <span className="text-white font-medium">{skill.relevance}%</span>
          </p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getPriorityBg(skill.priority)} ${getPriorityColor(skill.priority)}`}
        >
          {skill.priority.charAt(0).toUpperCase() + skill.priority.slice(1)}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Coverage</span>
            <span className="text-xs font-semibold text-white">{skill.proficiency}%</span>
          </div>
          <div className="w-full h-2 bg-neumo-highlight rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-500"
              style={{ width: `${skill.proficiency}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold text-white mb-2">Skills Gap Analysis</h2>
        <p className="text-sm text-gray-400">
          Target Role: <span className="font-semibold text-accent-primary">{targetRole}</span>
        </p>
      </div>

      <div className="neumo-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-300 tracking-wider">
            Skills Coverage
          </h3>
          <span className="text-3xl font-display font-bold text-accent-success">
            {currentSkills.length + recommendedSkills.length > 0 ? `${completionRate}%` : '—'}
          </span>
        </div>

        <div className="w-full h-3 bg-neumo-highlight rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-success transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        <p className="text-xs text-gray-400">
          {currentSkills.length === 0
            ? 'Upload your resume to extract your skills and compare them against live job requirements.'
            : recommendedSkills.length === 0
            ? `${currentSkills.length} skills extracted from your resume. Run job discovery to detect missing skills.`
            : `${currentSkills.length} matched skills on your resume · ${recommendedSkills.length} missing requirement(s) found in discovered jobs.`}
        </p>
      </div>

      <div className="flex gap-3 border-b border-neumo-border">
        <button
          onClick={() => setActiveTab('current')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${
            activeTab === 'current'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Award className="inline mr-2" size={16} />
          Resume Skills ({currentSkills.length})
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`pb-3 px-4 font-medium text-sm transition-colors ${
            activeTab === 'recommended'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Zap className="inline mr-2" size={16} />
          Missing Skills ({recommendedSkills.length})
        </button>
      </div>

      {activeTab === 'current' && (
        currentSkills.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentSkills.map((skill) => <SkillBar key={skill.name} skill={skill} />)}
          </div>
        ) : (
          <div className="neumo-card p-8 text-center text-sm text-gray-400">
            No skills parsed yet. Upload your resume to extract your technical skills.
          </div>
        )
      )}

      {activeTab === 'recommended' && (
        recommendedSkills.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendedSkills.map((skill) => <SkillBar key={skill.name} skill={skill} />)}
          </div>
        ) : (
          <div className="neumo-card p-8 text-center text-sm text-gray-400">
            No missing skills detected yet. Discover jobs to compare job requirements against your resume.
          </div>
        )
      )}
    </div>
  );
};

export default SkillsGapAnalysis;
