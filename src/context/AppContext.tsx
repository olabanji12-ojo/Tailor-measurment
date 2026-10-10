import React, { createContext, useContext, useState, useEffect } from 'react';

import { useLabels } from '../hooks/useLabels';
import { DEFAULT_TEMPLATES, type GarmentTemplate, type Gender } from '../utils/templates';
import { useAuth } from './AuthContext';

interface CurrentSession {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  gender: 'male' | 'female' | null;
  garments: string[];
  deadline: string; // YYYY-MM-DD
  reminderDate: string; // YYYY-MM-DD
  totalCost: number;
  amountPaid: number;
  photos: string[];
  clientPhoto?: string; // Optional Cloudinary URL of client's face photo
  measurements: Record<string, Record<string, number>>;
}

export type ProductionStatus = 'received' | 'cutting' | 'sewing' | 'fitting' | 'ready' | 'delivered';

export interface StatusHistoryEntry {
  previous_status: string;
  new_status: string;
  timestamp: string;
  updated_by: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'pos' | 'other' | string;
  date: string;
  note?: string;
  idempotency_key?: string;
  created_by?: string;
  created_at?: string;
}

export interface ClientProfile {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  date: string;
  gender: string;
  garment: string;
  data: any; 
  delivery_date: string;
  reminder_date?: string;
  total_cost: number;
  amount_paid: number;
  style_photos: string[];
  cloth_photos?: string[];
  client_photo?: string; // Optional client face photo URL
  unit: string;
  status?: ProductionStatus | string;
  status_history?: StatusHistoryEntry[];
  payments?: PaymentRecord[];
}

export interface DebtorRecord {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  garment: string;
  total_cost: number;
  amount_paid: number;
  outstanding_balance: number;
  delivery_date: string;
  reminder_date?: string;
  status: string;
  client_photo?: string;
}

export interface AnalyticsSummary {
  total_revenue_pipeline: number;
  total_revenue_paid: number;
  total_outstanding_debt: number;
  active_jobs_count: number;
  completed_jobs_count: number;
  overdue_jobs_count: number;
  debtors_count: number;
  debtors: DebtorRecord[];
}

interface AppContextType {
  // App State
  unit: 'in' | 'cm';
  setUnit: (unit: 'in' | 'cm') => void;
  backendStatus: 'online' | 'offline' | 'checking';
  setBackendStatus: (status: 'online' | 'offline' | 'checking') => void;
  
  viewingProfile: ClientProfile | null;
  setViewingProfile: (profile: ClientProfile | null) => void;

  // Global Data
  globalSessions: ClientProfile[];
  globalSessionsLoading: boolean;
  totalSessions: number;
  refreshSessions: (targetPage?: number, isLoadMore?: boolean) => void;
  loadMore: () => void;
  hasMore: boolean;
  updateMeasurementStatus: (id: string, newStatus: ProductionStatus) => Promise<boolean>;
  fetchArchiveRecords: (params: { q?: string; status?: string; page?: number; limit?: number; signal?: AbortSignal }) => Promise<{
    data: ClientProfile[];
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>;
  recordMeasurementPayment: (id: string, payment: {
    amount: number;
    method: string;
    date?: string;
    note?: string;
    idempotency_key?: string;
  }) => Promise<{ success: boolean; updated?: any; error?: string }>;

  // Boutique Analytics Summary (Authoritative Tenant Totals)
  analyticsSummary: AnalyticsSummary | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  refreshAnalytics: () => Promise<void>;

  // Garment Templates
  garmentTemplates: GarmentTemplate[];
  updateGarmentTemplate: (garmentName: string, parts: string[]) => void;

  // Session State
  currentSession: CurrentSession | null;
  startSession: (session: CurrentSession) => void;
  updateSessionMeasurements: (garment: string, part: string, value: number, isDelete?: boolean) => void;
  clearSession: () => void;
  addGarmentToSession: (garment: string) => void;
  removeGarmentFromSession: (garment: string) => void;

  // Shop Identity
  shopName: string;
  saveShopName: (name: string) => void;
  isSetup: boolean;

  // Labels
  customLabels: Record<string, string>;
  customParts: string[];
  allParts: string[];
  getLabel: (part: string) => string;
  renameLabel: (part: string, newLabel: string) => void;
  resetLabel: (part: string) => void;
  resetAllLabels: () => void;
  addCustomPart: (partName: string) => void;
  removeCustomPart: (partName: string) => void;
  findPartByLabel: (word: string) => string | null;
  hasCustomLabel: (part: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { handleUnauthorized } = useAuth();
  const shopName = user?.shop_name || '';

  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  // Initialize Session from localStorage
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(() => {
    const saved = localStorage.getItem('current_tailor_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [viewingProfile, setViewingProfile] = useState<ClientProfile | null>(null);

  // Sync Session to localStorage
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('current_tailor_session', JSON.stringify(currentSession));
    } else {
      localStorage.removeItem('current_tailor_session');
    }
  }, [currentSession]);

  // Garment Templates Persistence
  const [garmentTemplates, setGarmentTemplates] = useState<GarmentTemplate[]>(() => {
    const saved = localStorage.getItem('garmentTemplates');
    if (!saved) return DEFAULT_TEMPLATES;
    try {
      const parsed = JSON.parse(saved) as GarmentTemplate[];
      // Merge default parts into matching templates, migrating legacy 'Agbada / Buba' to 'Agbada'
      const merged = DEFAULT_TEMPLATES.map(def => {
        const existing = parsed.find(p => 
          p.name.toLowerCase() === def.name.toLowerCase() ||
          (def.name === 'Agbada' && p.name.toLowerCase() === 'agbada / buba')
        );
        if (!existing) return def;
        // Combine parts, preserving custom additions while ensuring all default parts are present
        const combinedParts = Array.from(new Set([...def.parts, ...existing.parts]));
        return { ...def, parts: combinedParts };
      });
      // Also retain user-defined custom templates that are not in DEFAULT_TEMPLATES
      parsed.forEach(custom => {
        if (!merged.some(m => m.name.toLowerCase() === custom.name.toLowerCase() || (custom.name.toLowerCase() === 'agbada / buba'))) {
          merged.push(custom);
        }
      });
      return merged;
    } catch (e) {
      return DEFAULT_TEMPLATES;
    }
  });

  const updateGarmentTemplate = (garmentName: string, parts: string[]) => {
    setGarmentTemplates(prev => {
      const exists = prev.some(t => t.name.toLowerCase() === garmentName.toLowerCase());
      let updated;
      if (exists) {
        updated = prev.map(t => t.name.toLowerCase() === garmentName.toLowerCase() ? { ...t, parts } : t);
      } else {
        updated = [...prev, { name: garmentName, parts, recommendedFor: ['male', 'female'] as Gender[] }];
      }
      localStorage.setItem('garmentTemplates', JSON.stringify(updated));
      return updated;
    });
  };

  const labels = useLabels();
  const isSetup = !!user;
  const saveShopName = () => {}; 

  const startSession = (session: CurrentSession) => setCurrentSession(session);
  const clearSession = () => {
    setCurrentSession(null);
    localStorage.removeItem('current_tailor_session');
  };

  const updateSessionMeasurements = (garment: string, part: string, value: number, isDelete = false) => {
    setCurrentSession(prev => {
      if (!prev) return null;
      const nextMeasurements = { ...prev.measurements };
      if (!nextMeasurements[garment]) nextMeasurements[garment] = {};
      
      if (isDelete) {
        delete nextMeasurements[garment][part];
      } else {
        nextMeasurements[garment][part] = value;
      }
      
      return { ...prev, measurements: nextMeasurements };
    });
  };

  const addGarmentToSession = (garment: string) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      if (prev.garments.includes(garment)) return prev;
      return { ...prev, garments: [...prev.garments, garment] };
    });
  };
  const removeGarmentFromSession = (garment: string) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      if (prev.garments.length <= 1) return prev; 
      return { ...prev, garments: prev.garments.filter(g => g !== garment) };
    });
  };

  // Global Data Source (Single Source of Truth)
  const [globalSessions, setGlobalSessions] = useState<ClientProfile[]>(() => {
    const saved = localStorage.getItem('global_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [globalSessionsLoading, setGlobalSessionsLoading] = useState(() => {
    const saved = localStorage.getItem('global_sessions');
    return saved ? false : true; // If cached sessions exist, show them instantly and fetch in background
  });
  const [totalSessions, setTotalSessions] = useState(() => {
    const saved = localStorage.getItem('global_sessions_total');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Authoritative Server-Side Analytics Summary State
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(() => {
    const saved = localStorage.getItem('tailor_analytics_summary');
    return saved ? JSON.parse(saved) : null;
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const refreshAnalytics = async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error(`Analytics summary failed with status ${res.status}`);
      }
      const data: AnalyticsSummary = await res.json();
      setAnalyticsSummary(data);
      localStorage.setItem('tailor_analytics_summary', JSON.stringify(data));
      setAnalyticsError(null);
    } catch (err: any) {
      console.error('Failed to fetch analytics summary:', err);
      setAnalyticsError(err.message || 'Analytics fetch error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const refreshSessions = async (targetPage = 1, isLoadMore = false) => {
    if (!token) return;
    if (!isLoadMore && globalSessions.length === 0) setGlobalSessionsLoading(true);
    
    // Automatically trigger analytics refresh on first page load
    if (targetPage === 1 && !isLoadMore) {
      refreshAnalytics().catch(() => {});
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/measurements?page=${targetPage}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Handle expired token gracefully
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await res.json();
      
      const newRecords = (result.data || []).filter((s: any) => s.customer_name && s.customer_name.trim() !== '');
      
      setGlobalSessions(prev => {
        const updated = targetPage === 1 ? newRecords : [...prev, ...newRecords];
        localStorage.setItem('global_sessions', JSON.stringify(updated));
        return updated;
      });
      setTotalSessions(result.total || 0);
      localStorage.setItem('global_sessions_total', String(result.total || 0));
      setPage(targetPage);
      setHasMore(typeof result.hasMore === 'boolean' ? result.hasMore : (result.data || []).length === 10);
      setGlobalSessionsLoading(false);
      setBackendStatus('online');
    } catch (err) {
      setGlobalSessionsLoading(false);
      setBackendStatus('offline');
    }
  };

  const loadMore = () => {
    if (!globalSessionsLoading && hasMore) {
      refreshSessions(page + 1, true);
    }
  };

  const fetchArchiveRecords = async ({
    q = '',
    status = '',
    page = 1,
    limit = 10,
    signal,
  }: {
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
    signal?: AbortSignal;
  }) => {
    if (!token) {
      return { data: [], total: 0, totalPages: 0, hasMore: false };
    }
    const queryParams = new URLSearchParams();
    if (q.trim()) queryParams.set('q', q.trim());
    if (status.trim() && status !== 'all') queryParams.set('status', status.trim());
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));

    const res = await fetch(`${import.meta.env.VITE_API_URL}/measurements?${queryParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal,
    });

    if (res.status === 401) {
      handleUnauthorized();
      return { data: [], total: 0, totalPages: 0, hasMore: false };
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch records: ${res.status}`);
    }
    const result = await res.json();
    const validData = (result.data || []).filter((s: any) => s.customer_name && s.customer_name.trim() !== '');
    return {
      data: validData,
      total: result.total || 0,
      totalPages: result.totalPages || 0,
      hasMore: typeof result.hasMore === 'boolean' ? result.hasMore : (result.data || []).length === limit,
    };
  };

  useEffect(() => {
    if (token) {
      refreshSessions(1);
      refreshAnalytics().catch(() => {});
    } else {
      setGlobalSessions([]);
      setTotalSessions(0);
      setViewingProfile(null);
      setGlobalSessionsLoading(false);
      setAnalyticsSummary(null);
      localStorage.removeItem('tailor_analytics_summary');
    }
  }, [token]);

  const updateMeasurementStatus = async (id: string, newStatus: ProductionStatus): Promise<boolean> => {
    if (!token) return false;

    // Previous snapshots for rollback
    const prevSessions = [...globalSessions];
    const prevViewingProfile = viewingProfile ? { ...viewingProfile } : null;

    // Optimistic UI update
    setGlobalSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, status: newStatus } : s);
      localStorage.setItem('global_sessions', JSON.stringify(updated));
      return updated;
    });
    if (viewingProfile && viewingProfile.id === id) {
      setViewingProfile({ ...viewingProfile, status: newStatus });
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/measurements/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        throw new Error(`Failed to update status: ${res.statusText}`);
      }

      const updatedRecord = await res.json();
      setGlobalSessions(prev => {
        const updated = prev.map(s => s.id === id ? { 
          ...s, 
          status: updatedRecord.status, 
          status_history: updatedRecord.status_history 
        } : s);
        localStorage.setItem('global_sessions', JSON.stringify(updated));
        return updated;
      });
      if (viewingProfile && viewingProfile.id === id) {
        setViewingProfile(prev => prev ? { 
          ...prev, 
          status: updatedRecord.status, 
          status_history: updatedRecord.status_history 
        } : null);
      }
      // Re-fetch authoritative analytics when status changes (e.g. to/from 'delivered')
      refreshAnalytics().catch(() => {});
      return true;
    } catch (err) {
      console.error('Status update failed, rolling back:', err);
      setGlobalSessions(prevSessions);
      localStorage.setItem('global_sessions', JSON.stringify(prevSessions));
      if (prevViewingProfile) {
        setViewingProfile(prevViewingProfile);
      }
      return false;
    }
  };

  const recordMeasurementPayment = async (
    id: string,
    payment: {
      amount: number;
      method: string;
      date?: string;
      note?: string;
      idempotency_key?: string;
    }
  ): Promise<{ success: boolean; updated?: any; error?: string }> => {
    if (!token) return { success: false, error: 'Unauthorized: login required' };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/measurements/${id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payment)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to record payment (${res.status})`);
      }

      const resData = await res.json();
      const updatedM = resData.measurement;

      // Update globalSessions in state and localStorage so dashboard updates immediately
      setGlobalSessions(prev => {
        const updated = prev.map(s => s.id === id ? {
          ...s,
          amount_paid: updatedM.amount_paid,
          payments: updatedM.payments
        } : s);
        localStorage.setItem('global_sessions', JSON.stringify(updated));
        return updated;
      });

      // Update viewingProfile if currently open
      if (viewingProfile && viewingProfile.id === id) {
        setViewingProfile(prev => prev ? {
          ...prev,
          amount_paid: updatedM.amount_paid,
          payments: updatedM.payments
        } : null);
      }

      // Re-fetch authoritative analytics across entire boutique collection
      refreshAnalytics().catch(() => {});

      return { success: true, updated: updatedM };
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      return { success: false, error: err.message || 'Payment recording failed.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        unit, setUnit,
        backendStatus, setBackendStatus,
        viewingProfile,
        setViewingProfile,
        garmentTemplates,
        updateGarmentTemplate,
        currentSession,
        startSession, updateSessionMeasurements, clearSession, addGarmentToSession, removeGarmentFromSession,
        shopName, saveShopName, isSetup,
        globalSessions, globalSessionsLoading, totalSessions, refreshSessions,
        hasMore, loadMore,
        updateMeasurementStatus,
        fetchArchiveRecords,
        recordMeasurementPayment,
        analyticsSummary, analyticsLoading, analyticsError, refreshAnalytics,
        ...labels
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
