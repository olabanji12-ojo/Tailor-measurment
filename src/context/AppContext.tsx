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
  photos: string[]; // base64 strings for now
}

export interface ClientProfile {
  id: string;
  customer_name: string;
  date: string;
  gender: string;
  garment: string;
  data: any; // Flexible to support flat or nested measurements
  delivery_date: string;
  total_cost: number;
  amount_paid: number;
  style_photos: string[];
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
  refreshSessions: (targetPage?: number, isLoadMore?: boolean) => void;
  loadMore: () => void;
  hasMore: boolean;

  // Garment Templates
  garmentTemplates: GarmentTemplate[];
  updateGarmentTemplate: (garmentName: string, parts: string[]) => void;

  // Session State
  currentSession: CurrentSession | null;
  startSession: (session: CurrentSession) => void;
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
  const shopName = user?.shop_name || '';

  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [viewingProfile, setViewingProfile] = useState<ClientProfile | null>(null);

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
  const saveShopName = () => {}; // Legacy placeholder

  const startSession = (session: CurrentSession) => setCurrentSession(session);
  const clearSession = () => setCurrentSession(null);
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
      // Don't allow removing the very last garment
      if (prev.garments.length <= 1) return prev; 
      return { ...prev, garments: prev.garments.filter(g => g !== garment) };
    });
  };

  // Global Data Source (Single Source of Truth)
  const [globalSessions, setGlobalSessions] = useState<ClientProfile[]>([]);
  const [globalSessionsLoading, setGlobalSessionsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const refreshSessions = async (targetPage = 1, isLoadMore = false) => {
    if (!token) return;
    if (!isLoadMore) setGlobalSessionsLoading(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/measurements?page=${targetPage}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      
      const newRecords = (result.data || []).filter((s: any) => s.customer_name && s.customer_name.trim() !== '');
      
      setGlobalSessions(prev => targetPage === 1 ? newRecords : [...prev, ...newRecords]);
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
        startSession, clearSession, addGarmentToSession, removeGarmentFromSession,
        shopName, saveShopName, isSetup,
        globalSessions, globalSessionsLoading, refreshSessions,
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
