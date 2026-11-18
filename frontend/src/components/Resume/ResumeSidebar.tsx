import React from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye } from 'lucide-react';

interface ResumeSidebarProps {
  resumeTitle?: string;
  lastUpdated?: string;
  matchScore?: number;
  keywordsCount?: number;
  skillsCount?: number;
  experienceSummary?: string;
  educationSummary?: string;
}

const ResumeSidebar: React.FC<ResumeSidebarProps> = ({
  resumeTitle = 'No base resume uploaded',
  lastUpdated = 'Not uploaded yet',
  matchScore = 0,
  keywordsCount = 0,
  skillsCount = 0,
  experienceSummary = '—',
  educationSummary = '—',
}) => {
  return (
    <div className="neumo-card p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2 tracking-wider">
          Base Resume
        </h3>
        <div className="bg-neumo-light rounded-lg p-4 border border-neumo-border">
          <p className="font-semibold text-white text-sm mb-1 truncate" title={resumeTitle}>
            {resumeTitle}
          </p>
          <p className="text-xs text-gray-400">{lastUpdated}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3 tracking-wider">
          Overall Match Score
        </h3>
        <div className="relative w-full h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#10B981"
              strokeWidth="8"
              strokeDasharray={`${matchScore * 2.83} 283`}
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dasharray 0.5s ease',
              }}
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="24"
              fontWeight="bold"
              fill="#10B981"
              fontFamily="Space Grotesk"
            >
              {matchScore > 0 ? `${matchScore}%` : '—'}
            </text>
          </svg>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          {matchScore > 0 ? 'Average match across discovered jobs' : 'Run job discovery to score'}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3 tracking-wider">
          Resume Stats
        </h3>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Keywords</span>
          <span className="font-semibold text-white">{keywordsCount}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Skills Listed</span>
          <span className="font-semibold text-white">{skillsCount}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Experience</span>
          <span className="font-semibold text-white">{experienceSummary}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Education</span>
          <span className="font-semibold text-white">{educationSummary}</span>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-neumo-border">
        <Link
          to="/resume-builder"
          className="w-full neumo-btn text-sm inline-flex items-center justify-center gap-2 py-2"
        >
          <Edit size={16} />
          Open Resume Builder
        </Link>
        <Link
          to="/resume-versions"
          className="w-full neumo-btn text-sm inline-flex items-center justify-center gap-2 py-2"
        >
          <Eye size={16} />
          Manage All Versions
        </Link>
      </div>
    </div>
  );
};

export default ResumeSidebar;
