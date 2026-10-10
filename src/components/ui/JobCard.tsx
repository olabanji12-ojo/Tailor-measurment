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

interface JobCardProps {
  clientName: string;
  garmentType: string;
  deliveryDate: string;
  status?: string;
  isOverdue?: boolean;
  onClick?: () => void;
}

const getJobCardStatusStyle = (status?: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case 'received':
      return { label: 'Received', style: 'bg-sky-50 text-sky-700 border border-sky-200/80' };
    case 'cutting':
      return { label: 'Cutting', style: 'bg-amber-50 text-amber-700 border border-amber-200/80' };
    case 'sewing':
      return { label: 'Sewing', style: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' };
    case 'fitting':
      return { label: 'Fitting', style: 'bg-purple-50 text-purple-700 border border-purple-200/80' };
    case 'ready':
      return { label: 'Ready for Collection', style: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-black' };
    case 'delivered':
      return { label: 'Delivered', style: 'bg-slate-100 text-slate-600 border border-slate-200 font-semibold' };
    default:
      return { label: 'Needs Review', style: 'bg-rose-50 text-rose-600 border border-rose-200/80 font-bold' };
  }
};

export const JobCard: React.FC<JobCardProps> = ({
  clientName,
  garmentType,
  deliveryDate,
  status,
  isOverdue,
  onClick,
}) => {
  const statusConfig = getJobCardStatusStyle(status);

  return (
    <Card
      onClick={onClick}
      bg="white"
      shadow="md"
      className="w-44 lg:w-48 p-4 flex flex-col justify-between select-none active:scale-[0.98] border border-primary/5 hover:border-accent/40 transition-all flex-shrink-0 relative group"
    >
      {/* Top Graphic Box with optional Overdue ribbon */}
      <div className="w-full h-24 bg-bg-secondary/40 border border-primary/2 rounded-[20px] flex items-center justify-center relative overflow-hidden">
        <GarmentSVG type={garmentType} />
        {isOverdue && status?.toLowerCase() !== 'delivered' && (
          <div className="absolute top-2 right-2 bg-rose-500 text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
            Overdue
          </div>
        )}
      </div>

      {/* Narrative Section */}
      <div className="flex flex-col items-start text-left mt-3">
        <span className="font-serif text-sm font-semibold text-primary truncate w-full group-hover:text-accent transition-colors">
          {clientName}
        </span>
        <div className="flex items-center gap-1.5 mt-1 w-full">
          <span className={`font-sans text-[9px] tracking-wide truncate ${isOverdue && status?.toLowerCase() !== 'delivered' ? 'text-rose-600 font-bold' : 'text-text-muted'}`}>
            {deliveryDate || 'No date set'}
          </span>
        </div>
      </div>

      {/* Persisted Production Stage Badge */}
      <div className={`w-full h-8 rounded-full font-sans text-[8px] tracking-wider uppercase flex items-center justify-center mt-3 transition-colors shrink-0 shadow-xs ${statusConfig.style}`}>
        {statusConfig.label}
      </div>
    </Card>
  );
};
