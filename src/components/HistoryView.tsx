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
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive' | 'Fittings' | 'Delivered'>('All');
  
  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Categories list for scroll chips
  const categories: ('All' | 'Active' | 'Inactive' | 'Fittings' | 'Delivered')[] = [
    'All', 'Active', 'Inactive', 'Fittings', 'Delivered'
  ];

  // Formatting helpers
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (session: MeasurementSession) => {
    const isPast = session.delivery_date ? new Date(session.delivery_date) < new Date() : false;
    if (isPast) {
      return { text: 'Delivered', color: 'bg-emerald-50/50 border border-emerald-200/50 text-emerald-700' };
    }
    return { text: 'Fitting', color: 'bg-[#FAF7F2] border border-[#D4AF37]/35 text-[#C49B27]' };
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

  // 1. Text search filtering
  const textFilteredSessions = globalSessions.filter(s => 
    s.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    (s.garment && s.garment.toLowerCase().includes(search.toLowerCase()))
  );

  // 2. Category chip filtering
  const filteredSessions = textFilteredSessions.filter(s => {
    if (activeFilter === 'All') return true;
    
    const isPast = s.delivery_date ? new Date(s.delivery_date) < new Date() : false;
    
    if (activeFilter === 'Active') {
      return s.delivery_date && !isPast;
    }
    if (activeFilter === 'Inactive') {
      return !s.delivery_date;
    }
    if (activeFilter === 'Fittings') {
      // Outfits that still have unpaid balance or active sewing
      const owesBalance = (s.total_cost || 0) - (s.amount_paid || 0) > 0;
      return owesBalance && !isPast;
    }
    if (activeFilter === 'Delivered') {
      return isPast;
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-full pb-36 bg-[#FDFDFD] px-6 pt-6 max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto w-full">
      
      {/* Editorial Top Navigation Header */}
      <div className="flex justify-between items-center bg-transparent mb-6 select-none">
        <div>
          <span className="font-serif text-[10px] italic tracking-widest text-[#C49B27] block mb-1">ATELIER DIRECTORY</span>
          <h1 className="font-serif text-3.5xl font-bold tracking-tight uppercase leading-none text-primary">
            Client Archive
          </h1>
        </div>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-border-subtle shadow-sm bg-white">
          {profileImage ? (
            <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <img src={`https://ui-avatars.com/api/?name=${ownerName}&background=0F172A&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      {/* Modern Rounded Search Input with Circular Gold Button */}
      <div className="relative mb-6 flex items-center bg-white rounded-full p-1.5 border border-border-subtle shadow-sm">
        <input 
          type="text" 
          placeholder="Search client archives..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent pl-4 text-xs font-semibold text-primary outline-none placeholder:text-text-muted/60"
        />
        <button 
          className="w-9 h-9 rounded-full bg-[#D4AF37] flex items-center justify-center text-white active:scale-95 transition-transform shadow-sm"
          title="Search"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Horizontal Scrolling Category Chips */}
      <div className="flex gap-2 overflow-x-auto md:flex-wrap pb-4 pt-1 mb-4 -mx-6 px-6 md:mx-0 md:px-0 select-none scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                isActive 
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-sm' 
                  : 'bg-[#FAF7F2] border-border-subtle text-text-muted hover:border-[#D4AF37]/35'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Subtitle count indicator */}
      <div className="flex justify-between items-center mb-6 select-none px-1">
        <span className="text-[10px] font-bold text-[#C49B27] uppercase tracking-widest">
          {filteredSessions.length} {filteredSessions.length === 1 ? 'RECORD' : 'RECORDS'} MATCHED
        </span>
      </div>

      {/* Directory Archive Grid List */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {globalSessionsLoading ? (
          <div className="col-span-full text-center py-12 bg-white rounded-[32px] border border-border-subtle p-6">
            <div className="animate-spin text-2xl mb-3">⏳</div>
            <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Syncing Archives...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          /* Empty Directory Landing Card */
          <div className="col-span-full text-center py-16 bg-white rounded-[32px] border-2 border-dashed border-border-subtle px-6 flex flex-col items-center justify-center gap-4 shadow-sm select-none">
            <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center text-3xl">📚</div>
            <div>
              <h4 className="font-serif text-xl font-bold text-primary">No Records Found</h4>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-2 max-w-[220px] leading-relaxed mb-6">
                Refine your filters or search keywords above.
              </p>
              <button 
                onClick={() => navigate('/measure')}
                className="bg-[#0F172A] hover:bg-black text-[#FAF7F2] px-8 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-md"
              >
                Add New Client
              </button>
            </div>
          </div>
        ) : (
          /* Client List Row Cards */
          filteredSessions.map(session => {
            const badge = getStatusBadge(session);
            const garmentName = session.garment || 'Bespoke Order';
            const displayDate = session.date ? formatDate(session.date) : 'Unknown Date';
            const photos = session.style_photos || [];

            return (
              <div 
                key={session.id} 
                className="bg-white rounded-[28px] p-5 shadow-sm border border-border-subtle flex flex-col gap-4 transition-transform active:scale-[0.98] hover:border-[#D4AF37]/25 relative"
              >
                {/* Upper client row */}
                <div 
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => { setViewingProfile(session as any); navigate(`/client/${session.id}`); }}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Circle avatar with thick sand border outline */}
                    <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-accent/20 bg-[#FAF7F2] flex items-center justify-center shadow-inner">
                      {(session as any).client_photo ? (
                        <img src={(session as any).client_photo} alt={session.customer_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-serif text-sm font-bold text-accent uppercase">
                          {session.customer_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-primary tracking-wide leading-snug uppercase">
                        {session.customer_name}
                      </h3>
                      <p className="text-text-muted text-[10px] font-sans font-medium mt-0.5">
                        Measured {displayDate}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Badge in Gold-Sand / Emerald-Sand style */}
                  <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${badge.color}`}>
                    {badge.text}
                  </div>
                </div>

                {/* Bottom line: photos list, garment label, and delete action */}
                <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-1">
                  <div 
                    className="flex items-center gap-2.5 cursor-pointer"
                    onClick={() => { setViewingProfile(session as any); navigate(`/client/${session.id}`); }}
                  >
                    {photos.length > 0 ? (
                      <div className="flex -space-x-2.5">
                        {photos.slice(0, 3).map((photoUrl, idx) => (
                          <div key={idx} className="w-6.5 h-6.5 rounded-full border border-white overflow-hidden bg-gray-100 relative shadow-sm z-[1]">
                            <img src={photoUrl} alt="Style Reference" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-6.5 h-6.5 rounded-full bg-bg-secondary flex items-center justify-center border border-border-subtle shadow-sm">
                        <span className="text-[9px]">📐</span>
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      {garmentName}
                    </span>
                  </div>

                  {/* Inline Delete Sweeper Controls */}
                  {confirmDeleteId === session.id ? (
                    <div className="flex items-center gap-1.5 select-none animate-in fade-in duration-200">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[8.5px] font-bold text-text-muted uppercase tracking-widest px-3 h-8 rounded-full bg-[#FAF7F2] border border-border-subtle active:scale-95 transition-transform"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deletingId === session.id}
                        className="text-[8.5px] font-bold text-white uppercase tracking-widest px-3 h-8 rounded-full bg-rose-500 active:scale-95 transition-transform"
                      >
                        {deletingId === session.id ? '...' : 'Confirm'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id); }}
                      className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-border-subtle flex items-center justify-center text-text-muted hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all duration-300 active:scale-90"
                      title="Delete Record"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                        <path d="M10 11v6M14 11v6"></path>
                        <path d="M9 6V4h6v2"></path>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginated load trigger */}
      {hasMore && !globalSessionsLoading && (
        <div className="mt-8 flex justify-center pb-12 select-none">
          <button 
            onClick={loadMore}
            className="px-8 py-3 bg-white border border-border-subtle rounded-full text-[9px] font-bold text-primary uppercase tracking-widest shadow-sm hover:border-[#D4AF37]/45 transition-colors active:scale-95"
          >
            Load Older Directory Records
          </button>
        </div>
      )}

    </div>
  );
};
