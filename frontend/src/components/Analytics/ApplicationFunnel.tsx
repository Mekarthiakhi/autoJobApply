import React from 'react';
import { TrendingDown, Users, Eye, MessageSquare, Briefcase, Gift } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  conversionFromPrevious?: number;
}

interface ApplicationFunnelProps {
  stages?: FunnelStage[];
}

const ApplicationFunnel: React.FC<ApplicationFunnelProps> = ({
  stages = [
    {
      name: 'Applications Sent',
      count: 487,
      percentage: 100,
      icon: <Users size={20} />,
      color: 'text-accent-primary',
      bgColor: 'bg-accent-primary/20',
      conversionFromPrevious: undefined,
    },
    {
      name: 'Profile Viewed',
      count: 142,
      percentage: 29.2,
      icon: <Eye size={20} />,
      color: 'text-accent-info',
      bgColor: 'bg-accent-info/20',
      conversionFromPrevious: 29,
    },
    {
      name: 'Messages Received',
      count: 54,
      percentage: 11.1,
      icon: <MessageSquare size={20} />,
      color: 'text-accent-warning',
      bgColor: 'bg-accent-warning/20',
      conversionFromPrevious: 38,
    },
    {
      name: 'Interviews',
      count: 18,
      percentage: 3.7,
      icon: <Briefcase size={20} />,
      color: 'text-accent-success',
      bgColor: 'bg-accent-success/20',
      conversionFromPrevious: 33,
    },
    {
      name: 'Offers',
      count: 3,
      percentage: 0.6,
      icon: <Gift size={20} />,
      color: 'text-accent-success',
      bgColor: 'bg-accent-success/20',
      conversionFromPrevious: 17,
    },
  ],
}) => {
  const maxWidth = 600; // pixels

  return (
    <div className="space-y-8">
      {/* Funnel Stages */}
      <div className="space-y-6">
        {stages.map((stage, index) => {
          const stageWidth = (stage.percentage / 100) * maxWidth;

          return (
            <div key={index} className="space-y-2">
              {/* Stage Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stage.bgColor}`}>
                    <span className={stage.color}>{stage.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{stage.name}</h3>
                    <p className="text-xs text-gray-400">{stage.count} total</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lg" style={{ color: stage.color.replace('text-', '') }}>
                    {stage.percentage}%
                  </div>
                  {stage.conversionFromPrevious && (
                    <p className="text-xs text-gray-400">
                      {stage.conversionFromPrevious}% conversion
                    </p>
                  )}
                </div>
              </div>

              {/* Stage Bar */}
              <div className="h-12 rounded-lg bg-neumo-light border border-neumo-border relative overflow-hidden">
                <div
                  className={`h-full rounded-lg transition-all duration-500 ${stage.bgColor} border-r-2`}
                  style={{
                    width: `${stage.percentage}%`,
                    borderColor: stage.color.replace('text-', 'border-'),
                  }}
                >
                  {/* Animated fill */}
                  <div className="h-full flex items-center justify-end pr-4">
                    <span className={`font-semibold text-sm ${stage.color}`}>
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drop-off Analysis */}
              {index < stages.length - 1 && (
                <div className="pl-10 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className="text-accent-error" />
                    <span>
                      {stages[index].count - stages[index + 1].count} dropped off (
                      {(
                        ((stages[index].count - stages[index + 1].count) /
                          stages[index].count) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="neumo-card p-6 bg-accent-primary/5 border-l-4 border-accent-primary">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingDown size={18} className="text-accent-primary" />
          Funnel Insights
        </h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            • <span className="font-semibold">29.2%</span> of applications are viewed by recruiters
          </p>
          <p>
            • <span className="font-semibold">38%</span> conversion rate from viewed to message
          </p>
          <p>
            • <span className="font-semibold">3.7%</span> of applications lead to interviews
          </p>
          <p>
            • <span className="font-semibold">0.6%</span> overall offer rate (3 of 487)
          </p>
        </div>
      </div>

      {/* Improvement Recommendations */}
      <div className="neumo-card p-6 bg-accent-warning/5 border-l-4 border-accent-warning">
        <h3 className="font-semibold text-white mb-3">Optimization Opportunities</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>✓ Focus on getting more profiles viewed (currently 29%)</li>
          <li>✓ Improve resume match score to increase view rate</li>
          <li>✓ Personalize cover letters to boost response rate</li>
          <li>✓ Target companies with higher historical response rates</li>
        </ul>
      </div>
    </div>
  );
};

export default ApplicationFunnel;
