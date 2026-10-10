import React from 'react';

interface MeasurementCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({ title, subtitle, children, icon, action }) => {
  return (
    <div className="glass group p-8 flex flex-col h-full transition-all duration-500 hover:border-white/20">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">{title}</h3>
            {subtitle && <p className="text-[10px] text-primary/60 font-semibold">{subtitle}</p>}
          </div>
        </div>
        {action && action}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
