import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAvatarThumbnailUrl } from '../services/imageUpload';

interface MeasurementSession {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  date: string;
  garment?: string;
  style_photos?: string[];
  cloth_photos?: string[];
  client_photo?: string;
  amount_paid?: number;
  total_cost?: number;
  delivery_date?: string;
  status?: string;
}

type FilterCategory = 'All' | 'Active' | 'Received' | 'Cutting' | 'Sewing' | 'Fitting' | 'Ready' | 'Delivered' | 'Needs Review';

const getStatusParam = (cat: FilterCategory): string => {
  switch (cat) {
    case 'All': return '';
    case 'Active': return 'active';
    case 'Received': return 'received';
    case 'Cutting': return 'cutting';
    case 'Sewing': return 'sewing';
    case 'Fitting': return 'fitting';
    case 'Ready': return 'ready';
    case 'Delivered': return 'delivered';
    case 'Needs Review': return 'needs_review';
    default: return '';
  }
};

export const HistoryView: React.FC = () => {
  const { setViewingProfile, refreshSessions, fetchArchiveRecords } = useAppContext();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const profileImage = localStorage.getItem(`profile_img_${user?.id}`) || '';
  const ownerName = user?.email.split('@')[0] || 'Tailor';

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');

  // Server-Side Archive records & Pagination state
  const [records, setRecords] = useState<MeasurementSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // AbortController ref to cancel superseded in-flight search requests
  const abortRef = useRef<AbortController | null>(null);

  // Categories list for scroll chips
  const categories: FilterCategory[] = [
    'All', 'Active', 'Received', 'Cutting', 'Sewing', 'Fitting', 'Ready', 'Delivered', 'Needs Review'
  ];

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Execute Server-Side Archive Search & Pagination
  const executeSearch = useCallback(async (targetPage = 1, isLoadMore = false) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    const statusParam = getStatusParam(activeFilter);

    try {
      const result = await fetchArchiveRecords({
        q: debouncedSearch,
        status: statusParam,
        page: targetPage,
        limit: 10,
        signal: controller.signal,
      });

      setRecords(prev => {
        if (targetPage === 1) {
          return (result.data as any[]) || [];
        }
        // Deduplicate records when appending next page
        const existingIds = new Set(prev.map(r => r.id));
        const filteredNew = ((result.data as any[]) || []).filter(r => !existingIds.has(r.id));
        return [...prev, ...filteredNew];
      });

      setTotalCount(result.total);
      setTotalPages(result.totalPages);
      setHasMore(result.hasMore);
      setPage(targetPage);
      setError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return; // Normal cancellation due to newer typing event
      }
      setError("We couldn't load your archive records. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, activeFilter, fetchArchiveRecords]);

  // Trigger search on query or filter category change (resets to page 1)
  useEffect(() => {
    setPage(1);
    executeSearch(1, false);
  }, [debouncedSearch, activeFilter, executeSearch]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      executeSearch(page + 1, true);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
  };

  // Formatting helpers
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (session: MeasurementSession) => {
    const status = session.status?.toLowerCase();
    switch (status) {
      case 'received':
        return { text: 'Received', color: 'bg-sky-50 text-sky-700 border border-sky-200/80' };
      case 'cutting':
        return { text: 'Cutting', color: 'bg-amber-50 text-amber-700 border border-amber-200/80' };
      case 'sewing':
        return { text: 'Sewing', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' };
      case 'fitting':
        return { text: 'Fitting', color: 'bg-purple-50 text-purple-700 border border-purple-200/80' };
      case 'ready':
        return { text: 'Ready', color: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold' };
      case 'delivered':
        return { text: 'Delivered', color: 'bg-slate-100 text-slate-600 border border-slate-200' };
      default:
        return { text: 'Needs Review', color: 'bg-rose-50 text-rose-600 border border-rose-200 font-semibold' };
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/measurements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setConfirmDeleteId(null);
      executeSearch(1, false);
      refreshSessions(1);
    } catch {
      alert('Could not delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-36 bg-[#FDFDFD] px-6 pt-6 max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto w-full">
      
      {/* Editorial Top Navigation Header */}
      <div className="flex justify-between items-center bg-transparent mb-6 select-none">
        <div>
          <span className="font-serif text-[10px] italic tracking-widest text-[#C49B27] block mb-1">YOUR CLIENTS</span>
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

      {/* Modern Rounded Search Input with Instant Clear and Indicator */}
      <div className="relative mb-6 flex items-center bg-white rounded-full p-1.5 border border-border-subtle shadow-sm focus-within:border-[#D4AF37] transition-colors">
        <input 
          type="text" 
          placeholder="Search by client name, phone, or garment..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent pl-4 text-xs font-semibold text-primary outline-none placeholder:text-text-muted/60"
        />
        {search && (
          <button
            onClick={handleClearSearch}
            className="mr-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-text-muted flex items-center justify-center text-xs font-bold transition-colors active:scale-90"
            title="Clear search"
          >
            ✕
          </button>
        )}
        <button 
          onClick={() => executeSearch(1, false)}
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

      {/* Subtitle count indicator & clear link */}
      <div className="flex justify-between items-center mb-6 select-none px-1">
        <span className="text-[10px] font-bold text-[#C49B27] uppercase tracking-widest">
          {totalCount} {totalCount === 1 ? 'RECORD' : 'RECORDS'} MATCHED
          {records.length > 0 && records.length < totalCount ? ` (SHOWING ${records.length})` : ''}
        </span>
        {debouncedSearch && (
          <button 
            onClick={handleClearSearch}
            className="text-[9px] font-bold text-text-muted hover:text-primary uppercase tracking-wider underline cursor-pointer"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Directory Archive Grid List */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {loading ? (
          <div className="col-span-full text-center py-16 bg-white rounded-[32px] border border-border-subtle p-6 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin text-2xl">⏳</div>
            <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Searching archives across database...</p>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-14 bg-white rounded-[32px] border border-rose-200 p-6 flex flex-col items-center justify-center gap-3 select-none">
            <div className="text-3xl">⚠️</div>
            <h4 className="font-serif text-lg font-bold text-primary">Connection Error</h4>
            <p className="text-[10px] text-rose-600 font-semibold max-w-sm">{error}</p>
            <button 
              onClick={() => executeSearch(page, false)}
              className="mt-3 px-8 py-2.5 rounded-full bg-primary text-white text-[9px] font-bold tracking-widest uppercase active:scale-95 transition-transform shadow-sm"
            >
              Retry Search
            </button>
          </div>
        ) : records.length === 0 ? (
          /* Empty Directory Landing Card */
          <div className="col-span-full text-center py-16 bg-white rounded-[32px] border-2 border-dashed border-border-subtle px-6 flex flex-col items-center justify-center gap-4 shadow-sm select-none">
            <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center text-3xl">📚</div>
            <div>
              <h4 className="font-serif text-xl font-bold text-primary">No Records Found</h4>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-2 max-w-[260px] leading-relaxed mb-6">
                {debouncedSearch 
                  ? `No orders matching "${debouncedSearch}" in ${activeFilter} category.` 
                  : `No historical orders found in the ${activeFilter} category.`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {debouncedSearch && (
                  <button 
                    onClick={handleClearSearch}
                    className="bg-[#FAF7F2] border border-border-subtle text-primary px-6 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Clear Filter
                  </button>
                )}
                <button 
                  onClick={() => navigate('/measure')}
                  className="bg-[#0F172A] hover:bg-black text-[#FAF7F2] px-8 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-md"
                >
                  Add New Client
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Client List Row Cards */
          records.map(session => {
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
                      {session.client_photo ? (
                        <img src={getAvatarThumbnailUrl(session.client_photo, 88)} alt={session.customer_name} className="w-full h-full object-cover" loading="lazy" />
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
                        Measured {displayDate} {session.customer_phone ? `• ${session.customer_phone}` : ''}
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
      {hasMore && !loading && (
        <div className="mt-8 flex justify-center pb-12 select-none">
          <button 
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-white border border-border-subtle rounded-full text-[9px] font-bold text-primary uppercase tracking-widest shadow-sm hover:border-[#D4AF37]/45 transition-colors active:scale-95 disabled:opacity-50"
          >
            {loadingMore ? 'Loading More Records...' : 'Load Older Directory Records'}
          </button>
        </div>
      )}

    </div>
  );
};
