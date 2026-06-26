import React, { useState } from 'react';
import { Sparkles, Copy, Download, Zap, TrendingUp, Eye, Trash2 } from 'lucide-react';

interface VariantMetrics {
  originalMatch: number;
  improvedMatch: number;
  keywordsAdded: number;
  sectionsOptimized: number;
}

interface ResumeVariantProps {
  id: string;
  title: string;
  jobTitle: string;
  company?: string;
  matchScore: number;
  improvement: number;
  createdAt: string;
  keywordsAdded: string[];
  sectionsOptimized: string[];
  metrics: VariantMetrics;
  isPinned?: boolean;
  onPin?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

const ResumeVariant: React.FC<ResumeVariantProps> = ({
  id,
  title,
  jobTitle,
  company,
  matchScore,
  improvement,
  createdAt,
  keywordsAdded,
  sectionsOptimized,
  metrics,
  isPinned,
  onPin,
  onDownload,
  onDelete,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getImprovementColor = (improvement: number) => {
    if (improvement > 10) return 'text-accent-success';
    if (improvement > 5) return 'text-accent-info';
    return 'text-accent-warning';
  };

  return (
    <div className="neumo-card p-6 space-y-4 border-l-4 border-accent-primary">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-accent-primary" />
            <h3 className="font-semibold text-white">{title}</h3>
          </div>
          <p className="text-sm text-gray-400 mb-1">
            {jobTitle}
            {company && ` · ${company}`}
          </p>
          <p className="text-xs text-gray-500">{createdAt}</p>
        </div>

        {/* Match Score Badge */}
        <div className="text-right">
          <div className="inline-flex flex-col items-end">
            <span className="text-2xl font-display font-bold text-accent-success">
              {matchScore}%
            </span>
            <span className={`text-xs font-semibold ${getImprovementColor(improvement)}`}>
              ↗ +{improvement}%
            </span>
          </div>
        </div>
      </div>

      {/* Match Comparison Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Match Improvement</span>
          <span className="text-xs font-semibold text-white">
            {metrics.originalMatch}% → {metrics.improvedMatch}%
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-2 bg-neumo-highlight rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-500"
              style={{ width: `${metrics.originalMatch}%` }}
            />
          </div>
          <div className="flex-1 h-2 bg-neumo-highlight rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-success"
              style={{ width: `${metrics.improvedMatch}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Changes Summary */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-neumo-light border border-neumo-border">
        <div>
          <p className="text-xs text-gray-400 mb-1">Keywords Added</p>
          <p className="text-lg font-semibold text-accent-primary">
            +{metrics.keywordsAdded}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Sections Optimized</p>
          <p className="text-lg font-semibold text-accent-success">
            {metrics.sectionsOptimized}
          </p>
        </div>
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="space-y-4 pt-4 border-t border-neumo-border">
          {/* Keywords Added */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-gray-300 mb-2 tracking-wider">
              Keywords Added
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywordsAdded.slice(0, 8).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full bg-accent-primary/20 text-accent-primary text-xs font-medium"
                >
                  {keyword}
                </span>
              ))}
              {keywordsAdded.length > 8 && (
                <span className="px-2.5 py-1 rounded-full bg-neumo-light text-gray-400 text-xs font-medium">
                  +{keywordsAdded.length - 8} more
                </span>
              )}
            </div>
          </div>

          {/* Sections Optimized */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-gray-300 mb-2 tracking-wider">
              Optimized Sections
            </h4>
            <div className="space-y-1">
              {sectionsOptimized.map((section, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-accent-success">✓</span>
                  {section}
                </div>
              ))}
            </div>
          </div>

          {/* Comparison Stats */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-accent-success/5 border border-accent-success/20">
            <div>
              <p className="text-xs text-gray-400">Before</p>
              <p className="font-semibold text-white">{metrics.originalMatch}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">After</p>
              <p className="font-semibold text-accent-success">{metrics.improvedMatch}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-neumo-border">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="neumo-btn flex-1 text-sm inline-flex items-center justify-center gap-2 py-2"
        >
          <Eye size={14} />
          {showDetails ? 'Hide' : 'View'} Details
        </button>

        <button
          onClick={onDownload}
          className="neumo-btn p-2 text-sm"
          title="Download variant"
        >
          <Download size={16} className="text-accent-primary" />
        </button>

        <button
          onClick={onPin}
          className={`neumo-btn p-2 text-sm ${isPinned ? 'bg-accent-primary/20' : ''}`}
          title={isPinned ? 'Unpin variant' : 'Pin variant'}
        >
          <Zap size={16} className={isPinned ? 'text-accent-primary' : 'text-gray-400'} />
        </button>

        <button
          onClick={onDelete}
          className="neumo-btn p-2 text-sm"
          title="Delete variant"
        >
          <Trash2 size={16} className="text-accent-error" />
        </button>
      </div>
    </div>
  );
};

export default ResumeVariant;
