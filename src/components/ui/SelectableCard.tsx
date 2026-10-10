import React from 'react';

interface SelectableCardProps {
  selected: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'large' | 'square';
  className?: string;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  onClick,
  title,
  children,
  size = 'square',
  className = '',
}) => {
  const baseClasses =
    'flex flex-col items-center justify-between cursor-pointer transition-all duration-300 select-none active:scale-[0.97] border';

  const sizeClasses = {
    large: 'w-full h-56 lg:h-64 p-5 rounded-[32px] shadow-sm shadow-primary/2',
    square: 'aspect-square w-full p-4 rounded-[24px] shadow-sm shadow-primary/1',
  };

  const selectedClasses = selected
    ? 'border-accent bg-bg-secondary/40 shadow-[0_8px_30px_rgba(212,175,55,0.08)]'
    : 'border-border-subtle bg-white hover:border-accent/40';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${selectedClasses} ${className}`}
    >
      {/* Visual content container */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        {children}
      </div>

      {/* Optional Title Label */}
      {title && (
        <span
          className={`font-sans text-[10px] tracking-wider uppercase mt-2 transition-colors duration-300 ${
            selected ? 'text-primary font-bold' : 'text-text-muted font-medium'
          }`}
        >
          {title}
        </span>
      )}
    </div>
  );
};
