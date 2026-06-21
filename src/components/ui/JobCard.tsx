import React from 'react';
import { Card } from './Card';

interface JobCardProps {
  clientName: string;
  garmentType: string;
  deliveryDate: string;
  status?: string;
  onClick?: () => void;
}

// Custom inline SVG drawings for the swatches
const GarmentSVG: React.FC<{ type: string }> = ({ type }) => {
  const t = type.toLowerCase();
  
  if (t.includes('suit') || t.includes('jacket') || t.includes('coat')) {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        {/* Hanger hook outline */}
        <path d="M12 4c0-1.5 1-2.5 2-2.5a1.5 1.5 0 1 0-3 0c0 1 1 2.5 1 2.5" strokeWidth="1" />
        {/* Suit lapels and collar outline */}
        <path d="M6 4l3 5-1.5 3.5M18 4l-3 5 1.5 3.5" />
        {/* Torso body profile */}
        <path d="M6 4L4 10l1 10h14l1-10-2-6Z" fill="currentColor" fillOpacity="0.02" />
        {/* Center fold & details */}
        <path d="M12 9v11" />
        <path d="M9 4.5l3 4.5 3-4.5" />
        {/* Pockets */}
        <path d="M5.5 14.5h3.5M15 14.5h3.5" />
        {/* Buttons */}
        <circle cx="12" cy="12" r="0.7" fill="currentColor" />
        <circle cx="12" cy="15" r="0.7" fill="currentColor" />
      </svg>
    );
  }

  if (t.includes('shirt') || t.includes('top') || t.includes('blouse')) {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M12 4c0-1.5 1-2.5 2-2.5a1.5 1.5 0 1 0-3 0c0 1 1 2.5 1 2.5" strokeWidth="1" />
        {/* Collar */}
        <path d="M8 4.5l4 3.5 4-3.5L12 4.5Z" fill="currentColor" fillOpacity="0.04" />
        {/* Sleeves and body */}
        <path d="M8 4.5L3 7v4.5l3-1V20h12v-9.5l3 1V7l-5-2.5" />
        {/* Placket */}
        <path d="M12 8v12" />
        {/* Buttons */}
        <circle cx="12" cy="11" r="0.6" fill="currentColor" />
        <circle cx="12" cy="14" r="0.6" fill="currentColor" />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" />
      </svg>
    );
  }

  if (t.includes('trouser') || t.includes('pant') || t.includes('shorts')) {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        {/* Hanger hook outline */}
        <path d="M12 4c0-1.5 1-2.5 2-2.5a1.5 1.5 0 1 0-3 0" strokeWidth="1" />
        {/* Waistband */}
        <rect x="7" y="5" width="10" height="2" rx="0.5" fill="currentColor" fillOpacity="0.04" />
        {/* Legs outline */}
        <path d="M7 7l-1 14h3.5l1.5-9 1.5 9h3.5l-1-14Z" />
        {/* Zipper fly details */}
        <path d="M12 7v3.5a1 1 0 0 0 1 1" />
      </svg>
    );
  }

  // Fallback: Custom Agbada/Draped gown outline
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
      <path d="M12 4c0-1.5 1-2.5 2-2.5a1.5 1.5 0 1 0-3 0" strokeWidth="1" />
      {/* Neck embroidery loop */}
      <path d="M9 4.5v2a3 3 0 0 0 6 0v-2" fill="currentColor" fillOpacity="0.04" />
      {/* Flowing Agbada drape profile */}
      <path d="M9 4.5L2 6.5l3 13.5h14l3-13.5-7-2" />
      {/* Embroidery stitching line */}
      <path d="M12 8.5v6" />
    </svg>
  );
};

export const JobCard: React.FC<JobCardProps> = ({
  clientName,
  garmentType,
  deliveryDate,
  status = 'Upcoming',
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      bg="white"
      shadow="md"
      className="w-44 lg:w-48 p-4 flex flex-col justify-between select-none active:scale-[0.98] border border-primary/2 flex-shrink-0"
    >
      {/* Top Graphic Box */}
      <div className="w-full h-24 bg-bg-secondary/40 border border-primary/2 rounded-[20px] flex items-center justify-center">
        <GarmentSVG type={garmentType} />
      </div>

      {/* Narrative Section */}
      <div className="flex flex-col items-start text-left mt-3">
        <span className="font-serif text-sm font-semibold text-primary truncate w-full">
          {clientName}
        </span>
        <span className="font-sans text-[9px] tracking-wide text-text-muted mt-1 truncate w-full">
          {deliveryDate}
        </span>
      </div>

      {/* Action Button Badge */}
      <div className="w-full h-8 bg-primary hover:bg-primary/95 text-white rounded-full font-sans text-[8px] font-black tracking-widest uppercase flex items-center justify-center mt-3 transition-colors shrink-0">
        {status}
      </div>
    </Card>
  );
};
