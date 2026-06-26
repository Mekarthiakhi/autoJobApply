import React, { useState } from 'react';
import { Zap, TrendingUp, BookOpen, Award } from 'lucide-react';

interface Skill {
  name: string;
  proficiency: number; // 0-100
  relevance: number; // 0-100
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
  targetRole = 'Senior Full Stack Engineer',
  currentSkills = [
    { name: 'TypeScript', proficiency: 95, relevance: 95, priority: 'high', resourceCount: 3 },
    { name: 'React', proficiency: 92, relevance: 90, priority: 'high', resourceCount: 4 },
    { name: 'Node.js', proficiency: 88, relevance: 85, priority: 'high', resourceCount: 2 },
    { name: 'PostgreSQL', proficiency: 80, relevance: 80, priority: 'medium', resourceCount: 2 },
    { name: 'Docker', proficiency: 75, relevance: 75, priority: 'medium', resourceCount: 1 },
  ],
  recommendedSkills = [
    { name: 'System Design', proficiency: 45, relevance: 100, priority: 'high', estimatedHours: 40 },
    { name: 'AWS', proficiency: 50, relevance: 90, priority: 'high', estimatedHours: 30 },
    { name: 'GraphQL', proficiency: 60, relevance: 75, priority: 'medium', estimatedHours: 20 },
    { name: 'Kubernetes', proficiency: 40, relevance: 70, priority: 'medium', estimatedHours: 35 },
    { name: 'Testing Best Practices', proficiency: 65, relevance: 80, priority: 'medium', estimatedHours: 15 },
  ],
  completionRate = 62,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'recommended'>('current');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

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
    <div
      key={skill.name}
      className="neumo-card p-4 cursor-pointer transition-all hover:bg-neumo-light/50"
      onClick={() => setExpandedSkill(expandedSkill === skill.name ? null : skill.name)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm">{skill.name}</h4>
          <p className="text-xs text-gray-400 mt-1">
            Proficiency: <span className="text-white font-medium">{skill.proficiency}%</span>
          </p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getPriorityBg(skill.priority)} ${getPriorityColor(skill.priority)}`}
        >
          {skill.priority.charAt(0).toUpperCase() + skill.priority.slice(1)}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-3">
        {/* Proficiency Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Proficiency</span>
            <span className="text-xs font-semibold text-white">{skill.proficiency}%</span>
          </div>
          <div className="w-full h-2 bg-neumo-highlight rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-500"
              style={{ width: `${skill.proficiency}%` }}
            />
          </div>
        </div>

        {/* Relevance Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Relevance</span>
            <span className="text-xs font-semibold text-white">{skill.relevance}%</span>
          </div>
          <div className="w-full h-2 bg-neumo-highlight rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-success transition-all duration-500"
              style={{ width: `${skill.relevance}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expandedSkill === skill.name && (
        <div className="border-t border-neumo-border pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-neumo-light">
              <p className="text-xs text-gray-400">Learning Resources</p>
              <p className="font-semibold text-white">
                {skill.resourceCount || skill.estimatedHours || 0}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-neumo-light">
              <p className="text-xs text-gray-400">Estimated Hours</p>
              <p className="font-semibold text-white">
                {skill.estimatedHours ? `${skill.estimatedHours}h` : 'N/A'}
              </p>
            </div>
          </div>
          <button className="w-full neumo-btn text-sm py-2 text-accent-primary">
            Learn More →
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-semibold text-white mb-2">Skills Gap Analysis</h2>
        <p className="text-sm text-gray-400">
          Target Role: <span className="font-semibold text-accent-primary">{targetRole}</span>
        </p>
      </div>

      {/* Overall Progress */}
      <div className="neumo-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-300 tracking-wider">
            Skills Completion
          </h3>
          <span className="text-3xl font-display font-bold text-accent-success">{completionRate}%</span>
        </div>

        <div className="w-full h-3 bg-neumo-highlight rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-success transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        <p className="text-xs text-gray-400">
          You have {5 - Math.floor(recommendedSkills.filter((s) => s.proficiency < 70).length)} skills to
          strengthen to reach {targetRole} level
        </p>
      </div>

      {/* Tabs */}
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
          Current Skills ({currentSkills.length})
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
          Recommended ({recommendedSkills.length})
        </button>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeTab === 'current' && currentSkills.map((skill) => <SkillBar key={skill.name} skill={skill} />)}
        {activeTab === 'recommended' && recommendedSkills.map((skill) => <SkillBar key={skill.name} skill={skill} />)}
      </div>

      {/* Recommendations */}
      <div className="neumo-card p-6 bg-accent-primary/5 border-l-4 border-accent-primary">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Zap size={18} className="text-accent-primary" />
          Top Recommendations
        </h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <span className="text-accent-primary font-bold">1.</span>
            <span>
              Focus on <span className="font-semibold">System Design</span> - critical for your target role
              (Estimated: 40 hours)
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <span className="text-accent-primary font-bold">2.</span>
            <span>
              Build <span className="font-semibold">AWS experience</span> to complement your infrastructure
              knowledge (Estimated: 30 hours)
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <span className="text-accent-primary font-bold">3.</span>
            <span>
              Your <span className="font-semibold">TypeScript & React</span> skills are excellent - highlight these
            </span>
          </li>
        </ul>
      </div>

      {/* Learning Roadmap */}
      <div className="neumo-card p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-accent-success" />
          Suggested Learning Path (12 weeks)
        </h3>

        <div className="space-y-3">
          {[
            { week: '1-3', skill: 'System Design', effort: 'High' },
            { week: '4-6', skill: 'AWS Fundamentals', effort: 'High' },
            { week: '7-9', skill: 'Kubernetes & Orchestration', effort: 'Medium' },
            { week: '10-12', skill: 'Advanced Testing Patterns', effort: 'Medium' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-neumo-light border border-neumo-border">
              <div className="w-12 h-12 rounded-lg bg-accent-primary/20 flex items-center justify-center text-accent-primary font-semibold text-sm">
                W{item.week.split('-')[0]}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm">{item.skill}</p>
                <p className="text-xs text-gray-400">Weeks {item.week}</p>
              </div>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                item.effort === 'High'
                  ? 'bg-accent-error/20 text-accent-error'
                  : 'bg-accent-warning/20 text-accent-warning'
              }`}>
                {item.effort}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillsGapAnalysis;
