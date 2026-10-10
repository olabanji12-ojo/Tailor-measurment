import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  bg?: 'white' | 'sand' | 'linen';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  shadow = 'md',
  onClick,
  bg = 'white',
}) => {
  const baseClasses = 'rounded-[32px] overflow-hidden transition-all duration-300';
  
  const bgClasses = {
    white: 'bg-white',
    sand: 'bg-bg-secondary',
    linen: 'bg-bg-light',
  };

  const shadowClasses = {
    none: 'shadow-none',
    sm: 'shadow-[0_8px_24px_rgba(27,18,15,0.015)] border border-primary/2',
    md: 'shadow-[0_20px_40px_rgba(27,18,15,0.03)] border border-primary/2',
    lg: 'shadow-[0_32px_60px_rgba(27,18,15,0.05)] border border-primary/2',
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:translate-y-[-2px] active:scale-[0.99]'
    : '';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${bgClasses[bg]} ${shadowClasses[shadow]} ${interactiveClasses} ${className}`}
    >
      {children}
    </div>
  );
};
