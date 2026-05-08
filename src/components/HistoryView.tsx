import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface MeasurementSession {
  id: string;
  customer_name: string;
  date: string;
  garment?: string;
  style_photos?: string[];
  cloth_photos?: string[];
  amount_paid?: number;
  total_cost?: number;
  delivery_date?: string;
}



export const HistoryView: React.FC = () => {
  const { setViewingProfile, globalSessions, globalSessionsLoading, hasMore, loadMore } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredSessions = globalSessions.filter(s => 
    s.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    (s.garment && s.garment.toLowerCase().includes(search.toLowerCase()))
  );

  // Helper to format date string
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper to determine status badge
  const getStatusBadge = (session: MeasurementSession) => {
    const isPast = session.delivery_date ? new Date(session.delivery_date) < new Date() : false;
    if (isPast) {
      return { text: 'Delivered', color: 'text-gray-500 bg-gray-100' };
    }
    if (session.amount_paid === 0 && session.total_cost && session.total_cost > 0) {
      return { text: 'Unpaid', color: 'text-red-500 bg-red-50' };
    }
    // Defaulting to Completed for aesthetics as shown in design
    return { text: 'Active', color: 'text-emerald-500 bg-emerald-50' };
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
      
      {/* Top App Bar (If rendering without the p-6 wrapper in App.tsx, we need px-0 here, but we are inside p-6, so we'll use negative margins to pull it out) */}
      <div className="-mx-6 -mt-6 px-6 py-4 flex justify-between items-center bg-transparent mb-4">
        <div className="flex items-center gap-4">
          <button className="text-gray-900">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 className="font-serif text-xl font-bold tracking-tight text-gray-900">TailorVoice</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shadow-sm">
          <img src="https://ui-avatars.com/api/?name=Stitches&background=random" alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search archives..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 pl-10 pr-4 bg-[#F8F9FA] border-none rounded-full text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0F172A]/10 outline-none transition-all"
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-end mb-6 px-1">
        <h2 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">Archives</h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">{globalSessions.length} TOTAL</span>
      </div>

      {/* List */}
      <div className="space-y-4">
        {globalSessionsLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin text-2xl">⏳</div>
            <p className="text-gray-400 text-sm mt-2 font-bold tracking-widest uppercase">Loading Archives...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-10 bg-[#F8F9FA] rounded-[24px] border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm font-bold tracking-widest uppercase">No Records Found</p>
          </div>
        ) : (
          filteredSessions.map(session => {
            const badge = getStatusBadge(session);
            const garmentName = session.garment || 'Unknown Garment';
            const displayDate = session.date ? formatDate(session.date) : 'Unknown Date';
            const photos = session.style_photos || [];

            return (
              <div 
                key={session.id} 
                onClick={() => {
                  setViewingProfile(session as any);
                  navigate(`/client/${session.id}`);
                }}
                className="bg-white rounded-[28px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-gray-50 flex flex-col gap-4 transition-transform hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-gray-900">{session.customer_name}</h3>
                    <p className="text-gray-500 font-medium mt-1">Last session: {displayDate}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badge.color}`}>
                    {badge.text}
                  </div>
                </div>

                {/* Footer Row (Images & Garment) */}
                <div className="flex items-center gap-3 mt-2">
                  
                  {/* Overlapping Photo Circles */}
                  {photos.length > 0 ? (
                    <div className="flex -space-x-3">
                      {photos.slice(0, 3).map((photoUrl, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-100 relative shadow-sm z-[1]">
                          <img src={photoUrl} alt="Style" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] border-2 border-white flex items-center justify-center shadow-sm">
                      <span className="text-[10px] text-white">📏</span>
                    </div>
                  )}

                  {/* Garment Name */}
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {garmentName}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {hasMore && !globalSessionsLoading && (
        <div className="mt-8 flex justify-center pb-10">
          <button 
            onClick={loadMore}
            className="px-8 py-3 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-900 uppercase tracking-widest shadow-sm hover:border-[#0F172A] transition-colors"
          >
            Load Older Records
          </button>
        </div>
      )}

    </div>
  );
};
