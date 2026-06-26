import React from 'react';
import { Download, Share2, Edit, Eye } from 'lucide-react';

interface ResumeSidebarProps {
  resumeTitle?: string;
  lastUpdated?: string;
  matchScore?: number;
}

const ResumeSidebar: React.FC<ResumeSidebarProps> = ({
  resumeTitle = 'Senior Software Engineer Resume',
  lastUpdated = 'Updated 3 days ago',
  matchScore = 87,
}) => {
  return (
    <div className="neumo-card p-6 space-y-6">
      {/* Resume Preview Header */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-2 tracking-wider">
          Base Resume
        </h3>
        <div className="bg-neumo-light rounded-lg p-4 border border-neumo-border">
          <p className="font-semibold text-white text-sm mb-1">{resumeTitle}</p>
          <p className="text-xs text-gray-400">{lastUpdated}</p>
        </div>
      </div>

      {/* Match Score */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3 tracking-wider">
          Overall Match Score
        </h3>
        <div className="relative w-full h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="8"
            />
            {/* Progress circle */}
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
            {/* Center text */}
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="24"
              fontWeight="bold"
              fill="#10B981"
              fontFamily="Space Grotesk"
            >
              {matchScore}%
            </text>
          </svg>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Matching job requirements
        </p>
      </div>

      {/* Resume Stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase text-gray-300 mb-3 tracking-wider">
          Resume Stats
        </h3>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Keywords</span>
          <span className="font-semibold text-white">156</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Experience</span>
          <span className="font-semibold text-white">8 yrs</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Skills Listed</span>
          <span className="font-semibold text-white">42</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neumo-light border border-neumo-border">
          <span className="text-sm text-gray-300">Education</span>
          <span className="font-semibold text-white">2</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t border-neumo-border">
        <button className="w-full neumo-btn text-sm inline-flex items-center justify-center gap-2 py-2">
          <Eye size={16} />
          Preview
        </button>
        <button className="w-full neumo-btn text-sm inline-flex items-center justify-center gap-2 py-2">
          <Edit size={16} />
          Edit
        </button>
        <button className="w-full neumo-btn text-sm inline-flex items-center justify-center gap-2 py-2">
          <Download size={16} />
          Download
        </button>
        <button className="w-full neumo-btn text-sm inline-flex items-center justify-center gap-2 py-2">
          <Share2 size={16} />
          Share
        </button>
      </div>

      {/* Info Box */}
      <div className="neumo-card p-3 bg-accent-primary/5 border-l-4 border-accent-primary">
        <p className="text-xs text-gray-300">
          💡 <span className="font-semibold">Tip:</span> Update your base resume regularly to maintain accuracy in tailored variants.
        </p>
      </div>
    </div>
  );
};

export default ResumeSidebar;
