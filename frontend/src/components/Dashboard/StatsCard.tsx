import React from 'react';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  children?: React.ReactNode;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  icon, 
  label, 
  value, 
  borderColor, 
  iconBg,
  iconColor,
  children,
  className = '' 
}) => {
  return (
    <div className={`bg-card-bg rounded-xl border-t-[3px] ${borderColor} p-6 flex flex-col ${className}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
        {label}
      </h3>
      
      <div className="text-white text-4xl font-semibold mb-4">
        {value}
      </div>
      
      <div className="mt-auto flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default StatsCard;
