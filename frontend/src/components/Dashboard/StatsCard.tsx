import React from 'react';
import styles from './Dashboard.module.css';

interface StatsCardProps {
  icon: string;
  label: string;
  value: number | string;
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, trend }) => {
  return (
    <div className={`${styles.statsCard} glass`}>
      <div className={styles.statsIcon}>{icon}</div>
      <div className={styles.statsContent}>
        <div className={styles.statsLabel}>{label}</div>
        <div className={styles.statsValue}>{value}</div>
        {trend && <div className={styles.statsTrend}>{trend}</div>}
      </div>
    </div>
  );
};

export default StatsCard;
