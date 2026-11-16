import React from 'react';
import { Users, Eye, Layers, CheckCircle, Briefcase, Award } from 'lucide-react';

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  description?: string;
  conversionFromPrevious?: number;
}

interface ApplicationFunnelProps {
  stages?: FunnelStage[];
}

const defaultIcons: Record<string, React.ReactNode> = {
  'Jobs Discovered': <Eye size={18} />,
  'Shortlisted': <Users size={18} />,
  'Applications Prepared': <Layers size={18} />,
  'Approved by Candidate': <CheckCircle size={18} />,
  'Submitted to Platform': <Briefcase size={18} />,
  'Interviews Scheduled': <Award size={18} />,
};

const defaultColors: Record<string, { color: string; bgColor: string }> = {
  'Jobs Discovered': { color: 'text-indigo-400', bgColor: 'bg-indigo-950/60' },
  'Shortlisted': { color: 'text-teal-400', bgColor: 'bg-teal-950/60' },
  'Applications Prepared': { color: 'text-purple-400', bgColor: 'bg-purple-950/60' },
  'Approved by Candidate': { color: 'text-emerald-400', bgColor: 'bg-emerald-950/60' },
  'Submitted to Platform': { color: 'text-blue-400', bgColor: 'bg-blue-950/60' },
  'Interviews Scheduled': { color: 'text-amber-400', bgColor: 'bg-amber-950/60' },
};

export const ApplicationFunnel: React.FC<ApplicationFunnelProps> = ({ stages = [] }) => {
  if (!stages || stages.length === 0) {
    return (
      <div className="glass-dark p-8 rounded-xl text-center border border-gray-800 text-gray-400">
        No application pipeline events recorded yet. Run job discovery agents to begin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const visualWidth = Math.max(8, Math.min(100, stage.percentage));
          const styling = defaultColors[stage.name] || { color: 'text-gray-300', bgColor: 'bg-gray-800' };
          const icon = defaultIcons[stage.name] || <Layers size={18} />;

          return (
            <div key={index} className="glass-dark rounded-xl p-4 border border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${styling.bgColor} ${styling.color}`}>
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{stage.name}</h3>
                    <p className="text-xs text-gray-400">{stage.description || `${stage.count} events`}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-extrabold font-mono ${styling.color}`}>
                    {stage.count}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    {stage.percentage}%
                  </p>
                </div>
              </div>

              {/* Stage Progress Bar */}
              <div className="h-4 rounded-full bg-gray-950 overflow-hidden border border-gray-800/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styling.bgColor} border-r-2 border-indigo-400`}
                  style={{ width: `${visualWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationFunnel;
