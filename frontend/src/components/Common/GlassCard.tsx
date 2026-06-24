import React from 'react';
import './GlassCard.css';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  dark = false,
  onClick,
}) => {
  return (
    <div
      className={`glass-card ${dark ? 'glass-card-dark' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;
