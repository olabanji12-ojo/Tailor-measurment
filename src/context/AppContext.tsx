import React, { createContext, useContext, useState, useEffect } from 'react';

import { useLabels } from '../hooks/useLabels';
import { DEFAULT_TEMPLATES, type GarmentTemplate } from '../utils/templates';
import { useAuth } from './AuthContext';

interface CurrentSession {
  customerName: string;
  gender: 'male' | 'female' | null;
  garments: string[];
  deadline: string; // YYYY-MM-DD
  totalCost: number;
  amountPaid: number;
  photos: string[];
  clientPhoto?: string; // Optional Cloudinary URL of client's face photo
  measurements: Record<string, Record<string, number>>;
}

export interface ClientProfile {
  id: string;
  customer_name: string;
  date: string;
  gender: string;
  garment: string;
  data: any; 
  delivery_date: string;
  total_cost: number;
  amount_paid: number;
  style_photos: string[];
  client_photo?: string; // Optional client face photo URL
  unit: string;
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
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const updateGarmentTemplate = (garmentName: string, parts: string[]) => {
    setGarmentTemplates(prev => {
      const updated = prev.map(t => t.name === garmentName ? { ...t, parts } : t);
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
  const [globalSessions, setGlobalSessions] = useState<ClientProfile[]>([]);
  const [globalSessionsLoading, setGlobalSessionsLoading] = useState(true);
  const [totalSessions, setTotalSessions] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const refreshSessions = async (targetPage = 1, isLoadMore = false) => {
    if (!token) return;
    if (!isLoadMore) setGlobalSessionsLoading(true);
    
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
      
      setGlobalSessions(prev => targetPage === 1 ? newRecords : [...prev, ...newRecords]);
      setTotalSessions(result.total || 0);
      setPage(targetPage);
      setHasMore(result.data.length === 10); // Simple check if there's possibly more
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

  useEffect(() => {
    if (token) refreshSessions(1);
  }, [token]);

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
