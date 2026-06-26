import React from 'react';

interface NeumorphicCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'raised' | 'inset' | 'flat';
  onClick?: () => void;
  noBorder?: boolean;
}

const NeumorphicCard: React.FC<NeumorphicCardProps> = ({
  children,
  className = '',
  variant = 'raised',
  onClick,
  noBorder = false,
}) => {
  const baseClasses =
    'rounded-2xl transition-all duration-300 ease-in-out cursor-pointer';

  const variantClasses = {
    raised: 'neumo-card hover:shadow-neumo-down',
    inset:
      'bg-neumo-surface shadow-neumo-inset hover:shadow-neumo-up border border-neumo-border',
    flat: 'bg-neumo-surface border border-neumo-border hover:bg-neumo-light',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${noBorder ? 'border-0' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default NeumorphicCard;
