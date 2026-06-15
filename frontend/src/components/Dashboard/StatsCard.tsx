import React from 'react';
import './Dashboard.module.css';

interface StatsCardProps {
  icon: string;
  label: string;
  value: number | string;
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, trend }) => {
  return (
    <div className="stats-card glass">
      <div className="stats-icon">{icon}</div>
      <div className="stats-content">
        <div className="stats-label">{label}</div>
        <div className="stats-value">{value}</div>
        {trend && <div className="stats-trend">{trend}</div>}
      </div>
    </div>
  );
};

export default StatsCard;
