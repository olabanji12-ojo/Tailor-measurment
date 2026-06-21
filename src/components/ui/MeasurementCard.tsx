import React from 'react';

interface MeasurementCardProps {
  label: string;
  value: string | number;
  isActive: boolean;
  onClick: () => void;
  unit?: string;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({
  label,
  value,
  isActive,
  onClick,
  unit = 'in',
}) => {
  const displayValue = value ? `${label}: ${value} ${unit}` : 'Tap to record';

  return (
    <div
      onClick={onClick}
      className={`w-full h-20 px-6 rounded-[24px] flex items-center justify-between border cursor-pointer select-none transition-all duration-300 active:scale-[0.99] ${
        isActive
          ? 'border-accent bg-bg-secondary/45 shadow-[0_8px_24px_rgba(212,175,55,0.06)]'
          : 'border-border-subtle bg-white hover:border-accent/40 shadow-sm shadow-primary/1'
      }`}
    >
      {/* Label and Value */}
      <div className="flex flex-col justify-center items-start text-left">
        <span
          className={`font-serif text-lg leading-none transition-colors ${
            isActive ? 'text-primary font-bold' : 'text-primary font-medium'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-sans text-xs tracking-wide mt-1.5 transition-colors ${
            isActive ? 'text-accent font-medium' : 'text-text-muted'
          }`}
        >
          {displayValue}
        </span>
      </div>

      {/* Chevron Indicator */}
      <div className="flex items-center justify-center">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${
            isActive ? 'translate-x-0.5 scale-110 opacity-100' : 'opacity-70'
          }`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
};
