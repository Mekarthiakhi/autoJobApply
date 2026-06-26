import React from 'react';
import { TrendingUp } from 'lucide-react';

interface FitScoreBadgeProps {
  score: number;
  className?: string;
}

const FitScoreBadge: React.FC<FitScoreBadgeProps> = ({ score, className = '' }) => {
  // Determine color based on score
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'bg-accent-success/20 text-accent-success border-accent-success/30';
    if (value >= 60) return 'bg-accent-info/20 text-accent-info border-accent-info/30';
    if (value >= 40) return 'bg-accent-warning/20 text-accent-warning border-accent-warning/30';
    return 'bg-accent-error/20 text-accent-error border-accent-error/30';
  };

  const getScoreLabel = (value: number) => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Fair';
    return 'Low';
  };

  const getScoreIcon = (value: number) => {
    return value >= 60 ? '↗' : '↘';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-1.5 ${getScoreColor(score)}`}>
        <span className="font-mono font-bold">{score}%</span>
        <span className="text-xs">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
};

export default FitScoreBadge;
