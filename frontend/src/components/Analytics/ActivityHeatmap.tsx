import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface HeatmapDay {
  date: string;
  day: string;
  week: number;
  count: number;
  intensity: number; // 0-100
}

interface ActivityHeatmapProps {
  title?: string;
  data?: HeatmapDay[];
  onDayHover?: (day: HeatmapDay) => void;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  title = '12-Week Activity Heatmap',
  data = generateMockData(),
  onDayHover,
}) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return 'bg-neumo-light border-neumo-border';
    if (intensity < 25) return 'bg-accent-info/30 border-accent-info/50';
    if (intensity < 50) return 'bg-accent-info/60 border-accent-info';
    if (intensity < 75) return 'bg-accent-success/60 border-accent-success';
    return 'bg-accent-success border-accent-success';
  };

  const getIntensityLabel = (intensity: number): string => {
    if (intensity === 0) return 'No activity';
    if (intensity < 25) return 'Low';
    if (intensity < 50) return 'Medium';
    if (intensity < 75) return 'High';
    return 'Very High';
  };

  // Group data by weeks
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-display font-semibold text-white mb-2 flex items-center gap-2">
          <Calendar size={20} className="text-accent-primary" />
          {title}
        </h3>
        <p className="text-sm text-gray-400">
          Each cell represents applications sent on that day
        </p>
      </div>

      {/* Heatmap Grid */}
      <div className="neumo-card p-6 space-y-6">
        {/* Day Labels */}
        <div className="flex gap-2">
          <div className="w-12"></div>
          <div className="flex-1 grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Week Rows */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-2 items-start">
              {/* Week Number */}
              <div className="w-12 pt-1 text-xs font-semibold text-gray-400">
                W{weekIndex + 1}
              </div>

              {/* Days Grid */}
              <div className="flex-1 grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="relative group"
                    onMouseEnter={() => {
                      setHoveredDay(day);
                      onDayHover?.(day);
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Heatmap Cell */}
                    <div
                      className={`w-full aspect-square rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${getIntensityColor(day.intensity)}`}
                      title={`${day.date}: ${day.count} applications`}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.count}
                        </span>
                      </div>
                    </div>

                    {/* Tooltip */}
                    {hoveredDay === day && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                        <div className="neumo-card p-3 whitespace-nowrap text-xs">
                          <p className="font-semibold text-white">{day.date}</p>
                          <p className="text-gray-300">
                            {day.count} application{day.count !== 1 ? 's' : ''}
                          </p>
                          <p className="text-gray-400">{getIntensityLabel(day.intensity)} activity</p>
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-neumo-surface border border-neumo-border transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="border-t border-neumo-border pt-4">
          <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
            Activity Level
          </p>
          <div className="grid grid-cols-5 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-neumo-light border border-neumo-border"></div>
              <span className="text-xs text-gray-400">None</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-accent-info/30 border border-accent-info/50"></div>
              <span className="text-xs text-gray-400">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-accent-info/60 border border-accent-info"></div>
              <span className="text-xs text-gray-400">Med</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-accent-success/60 border border-accent-success"></div>
              <span className="text-xs text-gray-400">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-accent-success border border-accent-success"></div>
              <span className="text-xs text-gray-400">Very High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="neumo-card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Most Active Day</p>
          <p className="text-lg font-semibold text-accent-success">
            {data.reduce((max, d) => (d.count > max.count ? d : max)).day}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.reduce((max, d) => (d.count > max.count ? d : max)).count} apps
          </p>
        </div>

        <div className="neumo-card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Total Applications</p>
          <p className="text-lg font-semibold text-accent-primary">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Last 12 weeks</p>
        </div>

        <div className="neumo-card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Average Per Day</p>
          <p className="text-lg font-semibold text-accent-info">
            {Math.round(
              data.reduce((sum, d) => sum + d.count, 0) / data.filter((d) => d.count > 0).length
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">Active days</p>
        </div>

        <div className="neumo-card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Streak</p>
          <p className="text-lg font-semibold text-accent-warning">12 days</p>
          <p className="text-xs text-gray-500 mt-1">Current streak</p>
        </div>
      </div>

      {/* Insights */}
      <div className="neumo-card p-6 bg-accent-primary/5 border-l-4 border-accent-primary">
        <h4 className="font-semibold text-white mb-3">📊 Heatmap Insights</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>• Consistent application volume with average {Math.round(data.reduce((sum, d) => sum + d.count, 0) / 12)} per day</li>
          <li>• Peak activity on weekdays, lower on weekends</li>
          <li>• Most productive week: Week {weeks.findIndex((w) => w.reduce((s, d) => s + d.count, 0) === Math.max(...weeks.map((w) => w.reduce((s, d) => s + d.count, 0)))) + 1}</li>
          <li>• Maintaining consistent effort increases your visibility to recruiters</li>
        </ul>
      </div>
    </div>
  );
};

// Mock data generator
function generateMockData(): HeatmapDay[] {
  const data: HeatmapDay[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 84); // 12 weeks ago

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 84; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const dayName = dayNames[dayOfWeek];

    // Generate realistic data with higher activity on weekdays
    let baseCount = dayOfWeek === 0 || dayOfWeek === 6 ? 2 : 5;
    const variation = Math.floor(Math.random() * 8);
    const count = baseCount + variation;

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      day: dayName,
      week: Math.floor(i / 7) + 1,
      count,
      intensity: Math.min(100, (count / 13) * 100), // Normalize to 0-100
    });
  }

  return data;
}

export default ActivityHeatmap;
