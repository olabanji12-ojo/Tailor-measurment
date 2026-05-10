import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

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
  const { setViewingProfile, globalSessions, globalSessionsLoading, hasMore, loadMore, refreshSessions } = useAppContext();
  const { user, token } = useAuth();
  
  const profileImage = localStorage.getItem(`profile_img_${user?.id}`) || '';
  const ownerName = user?.email.split('@')[0] || 'Tailor';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      return { text: 'Overdue', color: 'text-amber-600 bg-amber-50' };
    }
    if (session.amount_paid === 0 && session.total_cost && session.total_cost > 0) {
      return { text: 'Unpaid', color: 'text-red-500 bg-red-50' };
    }
    return { text: 'Active', color: 'text-emerald-500 bg-emerald-50' };
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/measurements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setConfirmDeleteId(null);
      refreshSessions(1);
    } catch {
      alert('Could not delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
      
      {/* Top App Bar */}
      <div className="-mx-6 -mt-6 px-6 py-4 flex justify-between items-center bg-transparent mb-4">
        <h1 className="font-serif text-xl font-bold tracking-tight text-gray-900">TailorVoice</h1>
        {/* ✅ FIX #7: Removed dead hamburger button */}
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shadow-sm">
          {profileImage ? (
            <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <img src={`https://ui-avatars.com/api/?name=${ownerName}&background=0F172A&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
          )}
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
          <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200 px-6 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-[#F8F9FA] rounded-full flex items-center justify-center text-4xl grayscale opacity-50">📚</div>
            <div>
              <h4 className="font-serif text-2xl font-bold text-gray-900">Archives are Empty</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 max-w-[200px] leading-relaxed mb-4">
                Your completed boutique sessions will be secured here automatically.
              </p>
              <button 
                onClick={() => navigate('/measure')}
                className="bg-[#0F172A] text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md"
              >
                Start New Job
              </button>
            </div>
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
                className="bg-white rounded-[28px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-gray-50 flex flex-col gap-4 transition-transform active:scale-95 relative"
              >
                {/* Header Row */}
                <div 
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => { setViewingProfile(session as any); navigate(`/client/${session.id}`); }}
                >
                  <div className="flex items-center gap-3">
                    {/* Client photo or initials */}
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {(session as any).client_photo ? (
                        <img src={(session as any).client_photo} alt={session.customer_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#0F172A] flex items-center justify-center text-white font-bold text-xs">
                          {session.customer_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-gray-900">{session.customer_name}</h3>
                      <p className="text-gray-400 text-xs font-medium mt-0.5">Last session: {displayDate}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badge.color}`}>
                    {badge.text}
                  </div>
                </div>

                {/* Footer Row (Photos & Garment & Delete) */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3">
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
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{garmentName}</span>
                  </div>

                  {/* Delete button */}
                  {confirmDeleteId === session.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5 rounded-full bg-gray-100"
                      >Cancel</button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deletingId === session.id}
                        className="text-[10px] font-bold text-white uppercase tracking-widest px-3 py-1.5 rounded-full bg-red-500 active:scale-95 transition-transform"
                      >
                        {deletingId === session.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id); }}
                      className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
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
