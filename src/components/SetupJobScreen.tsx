import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Gender } from '../utils/templates';
import { playSensorySound } from '../hooks/useWhisper';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { SelectableCard } from './ui/SelectableCard';
import { useNavigate } from 'react-router-dom';
import { cacheCustomers, searchCachedCustomers, type CustomerRecord } from '../utils/db';
import { uploadImage, getAvatarThumbnailUrl, type UploadProgressInfo } from '../services/imageUpload';
import { formatBytes } from '../utils/imageCompressor';

// ─── GENDER SILHOUETTE VECTOR DRAWINGS ───
const SilhouetteSVG: React.FC<{ gender: 'male' | 'female' }> = ({ gender }) => {
  if (gender === 'female') {
    return (
      <svg width="44" height="88" viewBox="0 0 24 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <circle cx="12" cy="7" r="2.8" />
        <path d="M11.5 9.8v2.2h1V9.8" />
        <path d="M8 12c1 0 2-0.5 4-0.5s3 0.5 4 0.5" />
        <path d="M8 12c-0.5 2-0.8 6-0.8 12m9.6-12c0.5 2 0.8 6 0.8 12" />
        <path d="M8 12c0.5 3 0.5 6 1.5 9c1 3-0.5 3 0.5 3" />
        <path d="M16 12c-0.5 3-0.5 6-1.5 9c-1 3 0.5 3-0.5 3" />
        <path d="M10 24c-1 3-1.5 6-1.5 12" />
        <path d="M14 24c1 3 1.5 6 1.5 12" />
      </svg>
    );
  }

  return (
    <svg width="44" height="88" viewBox="0 0 24 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
      <circle cx="12" cy="7" r="3" />
      <path d="M11 10v2h2v-2" />
      <path d="M7 12h10" />
      <path d="M7 12c-0.5 2-1 6-1 12m12-12c0.5 2 1 6 1 12" />
      <path d="M7 12l1 12h8l1-12" />
      <path d="M8 24l1.5 12h5l1.5-12" />
      <path d="M9.5 36l-0.5 8M14.5 36l0.5 8" />
    </svg>
  );
};

// ─── GARMENT LINE ART DRAWINGS ───
const GarmentGridSVG: React.FC<{ type: string }> = ({ type }) => {
  const t = type.toLowerCase();

  if (t.includes('agbada')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M2 8L7 4l5 2 5-2 5 4-2 14H4L2 8Z" fill="currentColor" fillOpacity="0.03" />
        <path d="M7 4v16M17 4v16" strokeDasharray="1 2" />
        <path d="M10 6l2 3 2-3" />
        <path d="M12 9v11" />
      </svg>
    );
  }

  if (t.includes('senator') || t.includes('kaftan')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M7 5l5 2 5-2 2 15H5L7 5Z" fill="currentColor" fillOpacity="0.03" />
        <path d="M10 5v6h4V5" />
        <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
        <circle cx="12" cy="9.5" r="0.6" fill="currentColor" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (t.includes('buba') || t.includes('sokoto')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M6 5.5l6 1.5 6-1.5 1.5 14H4.5L6 5.5Z" fill="currentColor" fillOpacity="0.03" />
        <circle cx="12" cy="6" r="2.5" />
        <path d="M6 8l-3 4v7h2.5" />
        <path d="M18 8l3 4v7h-2.5" />
      </svg>
    );
  }

  if (t.includes('cap') || t.includes('fila')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M4 14c0-3.5 3-7 8-7s8 3.5 8 7" />
        <path d="M3 15h18v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3Z" fill="currentColor" fillOpacity="0.06" />
        <path d="M12 7c-2 2-3 4-3 7M15 7c-1 2-1 4-1 7" strokeDasharray="1 1.5" />
      </svg>
    );
  }

  if (t.includes('suit') || t.includes('jacket') || t.includes('coat')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M6 4l3 5-1.5 3.5M18 4l-3 5 1.5 3.5" />
        <path d="M6 4L4 10l1 10h14l1-10-2-6Z" fill="currentColor" fillOpacity="0.02" />
        <path d="M12 9v11" />
        <path d="M9 4.5l3 4.5 3-4.5" />
        <circle cx="12" cy="12" r="0.7" fill="currentColor" />
        <circle cx="12" cy="15" r="0.7" fill="currentColor" />
      </svg>
    );
  }

  if (t.includes('shirt') || t.includes('top') || t.includes('blouse')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M8 4.5l4 3.5 4-3.5L12 4.5Z" fill="currentColor" fillOpacity="0.04" />
        <path d="M8 4.5L3 7v4.5l3-1V20h12v-9.5l3 1V7l-5-2.5" />
        <path d="M12 8v12" />
        <circle cx="12" cy="11" r="0.6" fill="currentColor" />
        <circle cx="12" cy="14" r="0.6" fill="currentColor" />
      </svg>
    );
  }

  if (t.includes('trouser') || t.includes('pant') || t.includes('shorts')) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <rect x="7" y="5" width="10" height="2" rx="0.5" fill="currentColor" fillOpacity="0.04" />
        <path d="M7 7l-1 14h3.5l1.5-9 1.5 9h3.5l-1-14Z" />
        <path d="M12 7v3.5a1 1 0 0 0 1 1" />
      </svg>
    );
  }

  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
      <path d="M9 4.5v2a3 3 0 0 0 6 0v-2" fill="currentColor" fillOpacity="0.04" />
      <path d="M9 4.5L2 6.5l3 13.5h14l3-13.5-7-2" />
      <path d="M12 8.5v6" />
    </svg>
  );
};

export const SetupJobScreen: React.FC = () => {
  const navigate = useNavigate();
  const { startSession, garmentTemplates, totalSessions } = useAppContext();
  const { user, token } = useAuth();

  const profileImage = localStorage.getItem(`profile_img_${user?.id}`) || '';
  const ownerName = user?.email.split('@')[0] || 'Tailor';

  const LIMIT = 20;
  const isLimitReached = totalSessions >= LIMIT;

  // Form State
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [clientPhoto, setClientPhoto] = useState<string>('');
  const [isUploadingClientPhoto, setIsUploadingClientPhoto] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedPhotoFile, setFailedPhotoFile] = useState<File | null>(null);
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete & Suggestions State
  const [suggestions, setSuggestions] = useState<CustomerRecord[]>([]);
  const [recentClients, setRecentClients] = useState<CustomerRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [preloadedMeasurements, setPreloadedMeasurements] = useState<Record<string, Record<string, number>> | null>(null);
  const [pastMeasurementsCount, setPastMeasurementsCount] = useState(0);
  const [pastFittings, setPastFittings] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Initial load of recent clients (from cache then API)
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const cached = await searchCachedCustomers('', 8);
        if (cached && cached.length > 0) {
          setRecentClients(cached);
        }
        if (token) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/customers?limit=8`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data: CustomerRecord[] = await res.json();
            if (Array.isArray(data)) {
              setRecentClients(data);
              await cacheCustomers(data);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load recent clients', err);
      }
    };
    loadRecent();
  }, [token]);

  // Debounced search for clients
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions(recentClients);
      setIsSearching(false);
      return;
    }

    if (customerId) return;

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        let results: CustomerRecord[] = [];
        if (token) {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/customers?q=${encodeURIComponent(name.trim())}&limit=6`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              results = await res.json();
              if (Array.isArray(results) && results.length > 0) {
                await cacheCustomers(results);
              }
            }
          } catch {
            // Network fallback
          }
        }
        if (!results || results.length === 0) {
          results = await searchCachedCustomers(name.trim(), 6);
        }
        setSuggestions(results || []);
      } catch (err) {
        console.error('Customer autocomplete search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [name, token, customerId, recentClients]);

  const handleSelectCustomer = async (c: CustomerRecord) => {
    playSensorySound('success');
    setCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    if (c.gender === 'male' || c.gender === 'female') {
      setGender(c.gender);
    }
    if (c.client_photo) {
      setClientPhoto(c.client_photo);
    }
    setShowSuggestions(false);

    // Fetch past measurements
    try {
      if (token) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/customers/${c.id}/measurements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPastMeasurementsCount(data.length);
            setPastFittings(data);
          } else {
            setPastMeasurementsCount(0);
            setPastFittings([]);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch customer history', err);
    }
  };

  const handleApplyPastMeasurements = () => {
    if (!pastFittings || pastFittings.length === 0) return;
    const latest = pastFittings[0];
    if (latest && latest.data) {
      setPreloadedMeasurements(latest.data);
      if (latest.garment && selectedGarments.length === 0) {
        const parts = latest.garment.split(',').map((g: string) => g.trim()).filter(Boolean);
        if (parts.length > 0) {
          setSelectedGarments(parts);
        }
      }
      playSensorySound('success');
    }
  };

  const handleUnlinkClient = () => {
    setCustomerId(undefined);
    setPreloadedMeasurements(null);
    setPastMeasurementsCount(0);
    setPastFittings([]);
  };

  const isDepositInvalid = parseFloat(amountPaid) > 0 && parseFloat(totalCost) > 0 && parseFloat(amountPaid) > parseFloat(totalCost);

  const updateDeadlineAndReminder = (newDeadlineStr: string) => {
    setDeadline(newDeadlineStr);
    const newD = new Date(newDeadlineStr);
    newD.setDate(newD.getDate() - 2);
    setReminderDate(newD.toISOString().split('T')[0]);
  };

  const availableGarments = gender
    ? garmentTemplates.filter(t => t.recommendedFor.includes(gender)).map(t => t.name)
    : [];

  const handleGarmentToggle = (garmentName: string) => {
    setSelectedGarments(prev => {
      if (prev.includes(garmentName)) {
        return prev.filter(g => g !== garmentName);
      }
      return [...prev, garmentName];
    });
  };

  const executePhotoUpload = async (file: File) => {
    setIsUploadingClientPhoto(true);
    setUploadError(null);
    setUploadProgressPercent(0);
    setUploadProgressText('Optimizing image...');
    setFailedPhotoFile(null);

    try {
      const result = await uploadImage(file, {
        category: 'avatar',
        token: token || undefined,
        onProgress: (info: UploadProgressInfo) => {
          const pct = info.progressPercent ?? info.percentage ?? 0;
          setUploadProgressPercent(pct);
          if (info.stage === 'compressing') {
            setUploadProgressText(`Compressing photo... (${formatBytes(info.originalBytes || info.originalSize || 0)} → ~${formatBytes(info.compressedBytes || info.compressedSize || 0)})`);
          } else if (info.stage === 'uploading') {
            setUploadProgressText(`Uploading (${pct}%)...`);
          } else if (info.stage === 'retrying') {
            setUploadProgressText('Network hiccup, retrying upload...');
          }
        }
      });

      setClientPhoto(result.url);
      setUploadProgressText('');
      setUploadProgressPercent(0);
    } catch (err: any) {
      console.error('Client photo upload error:', err);
      const msg = err?.message || 'Photo upload failed. Check connection.';
      setUploadError(msg);
      setFailedPhotoFile(file);
    } finally {
      setIsUploadingClientPhoto(false);
      if (clientPhotoInputRef.current) {
        clientPhotoInputRef.current.value = '';
      }
    }
  };

  const handleClientPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executePhotoUpload(file);
  };

  const handleStart = () => {
    if (!name || !gender || selectedGarments.length === 0) return;

    if (parseFloat(amountPaid) > parseFloat(totalCost)) {
      playSensorySound('error');
      alert(`⚠️ Error: Deposit paid (₦${parseFloat(amountPaid).toLocaleString()}) cannot exceed the total cost (₦${parseFloat(totalCost).toLocaleString()}).`);
      return;
    }

    startSession({
      customerId,
      customerName: name,
      customerPhone: phone.trim() || undefined,
      gender,
      garments: selectedGarments,
      deadline: deadline,
      reminderDate: reminderDate,
      totalCost: parseFloat(totalCost) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      photos: [],
      clientPhoto: clientPhoto || undefined,
      measurements: preloadedMeasurements || {}
    });
  };

  return (
    <div className="flex flex-col min-h-full pb-36 font-sans text-primary">
      {/* Top App Bar */}
      <div className="px-6 py-5 flex justify-between items-center bg-transparent">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center text-primary active:scale-95 transition-transform shadow-sm"
          title="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-bg-secondary border border-accent/20 rounded-full flex items-center gap-2 select-none shadow-sm">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Atelier Plan</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-bg-secondary overflow-hidden border border-accent/20">
            {profileImage ? (
              <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${ownerName}&background=FAF7F2&color=1B120F`} alt="Avatar" className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto w-full transition-all duration-300">

        {/* Header Section */}
        <header className="mb-8">
          <h2 className="font-serif text-4xl font-medium text-primary tracking-tighter leading-none">New Fitting</h2>
          <p className="text-text-muted mt-2 text-xs">Initialize a new bespoke client measurement card.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pb-12 space-y-8 md:space-y-0">

          {/* Left Column: Profile, Gender, Financials */}
          <div className="space-y-8">
            {/* Client Name + Optional Photo */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Client Profile</span>
                {customerId && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-in fade-in duration-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Returning Client
                  </span>
                )}
              </div>

              {/* Returning Client Linked Banner */}
              {customerId && (
                <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-[#FAF7F2] to-white border border-[#D4AF37]/35 rounded-xl shadow-2xs animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#C49B27] text-xs">
                      ✓
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Atelier Profile Linked</p>
                      <p className="text-[8px] text-text-muted">Measurements will save directly to this client card</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlinkClient}
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest px-2.5 py-1 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
                  >
                    ✕ Unlink
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div
                  onClick={() => clientPhotoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full bg-white border border-border-subtle flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-accent/40 shadow-sm overflow-hidden relative"
                >
                  {isUploadingClientPhoto ? (
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : clientPhoto ? (
                    <img src={getAvatarThumbnailUrl(clientPhoto, 128)} alt="Client" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center select-none opacity-60">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7E7571" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      <span className="text-[7px] text-text-muted font-bold mt-1 tracking-widest uppercase">Photo</span>
                    </div>
                  )}
                </div>

                <input ref={clientPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleClientPhotoUpload} />

                <div className="flex-1 space-y-3">
                  {/* Client Name with Autocomplete */}
                  <div ref={dropdownRef} className="relative">
                    <Input
                      label="Client Name"
                      value={name}
                      onChange={(val) => {
                        setName(val);
                        if (customerId) setCustomerId(undefined);
                        setShowSuggestions(true);
                      }}
                      required
                      id="clientName"
                      placeholder="Enter full name or search..."
                      autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && (suggestions.length > 0 || isSearching) && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-accent/25 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3.5 py-1.5 bg-bg-secondary/60 border-b border-accent/15 flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-accent">
                            {name.trim() ? 'Matching Atelier Clients' : 'Recent Clients'}
                          </span>
                          {isSearching && (
                            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                        <div className="max-h-56 overflow-y-auto divide-y divide-border-subtle/40 custom-scrollbar">
                          {suggestions.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectCustomer(c);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3 active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-bg-secondary border border-accent/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                  {c.client_photo ? (
                                    <img src={getAvatarThumbnailUrl(c.client_photo, 64)} alt={c.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-primary font-serif">
                                      {c.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-primary truncate font-sans">{c.name}</p>
                                  <p className="text-[10px] text-text-muted font-mono">{c.phone || 'No phone'}</p>
                                </div>
                              </div>
                              {c.gender && (
                                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-bg-secondary text-primary border border-accent/15 flex-shrink-0">
                                  {c.gender}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        {name.trim() && (
                          <div className="p-2 border-t border-accent/15 bg-bg-secondary/30">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setShowSuggestions(false);
                              }}
                              className="w-full text-center py-1 text-[9px] font-bold text-accent hover:text-primary uppercase tracking-widest transition-colors"
                            >
                              + Create New Client "{name}"
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Recent Client Pills */}
                  {!customerId && !name && recentClients.length > 0 && (
                    <div className="pt-0.5">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted shrink-0">Recent:</span>
                        {recentClients.slice(0, 4).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="shrink-0 h-6 px-2.5 bg-bg-secondary/60 hover:bg-bg-secondary border border-accent/20 rounded-full text-[9px] font-bold text-primary tracking-wide transition-all active:scale-95 flex items-center gap-1"
                          >
                            <span className="w-1 h-1 rounded-full bg-accent"></span>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Input
                    label="Phone Number (WhatsApp)"
                    value={phone}
                    onChange={setPhone}
                    id="clientPhone"
                    placeholder="e.g. 0801 234 5678 or +234..."
                    type="tel"
                  />
                </div>
              </div>

              {/* Past Measurements Pre-Load Banner */}
              {pastMeasurementsCount > 0 && (
                <div className="bg-[#FAF7F2] border border-[#D4AF37]/35 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#C49B27] shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {preloadedMeasurements ? 'Past Measurements Loaded' : `Found ${pastMeasurementsCount} Past Fitting${pastMeasurementsCount > 1 ? 's' : ''}`}
                      </p>
                      <p className="text-[9px] text-text-muted truncate">
                        {preloadedMeasurements ? 'Baseline measurements ready in fitting card' : 'Pre-fill previous measurements to save time'}
                      </p>
                    </div>
                  </div>
                  {!preloadedMeasurements ? (
                    <button
                      type="button"
                      onClick={handleApplyPastMeasurements}
                      className="h-7 px-3 bg-accent text-white text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-all shrink-0"
                    >
                      Pre-fill
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPreloadedMeasurements(null);
                      }}
                      className="text-[9px] text-text-muted hover:text-red-500 font-bold uppercase tracking-wider shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {isUploadingClientPhoto && (
                <div className="bg-bg-secondary/60 border border-accent/25 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-bold tracking-wider">
                    <span className="text-primary uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin inline-block" />
                      {uploadProgressText || 'Processing image...'}
                    </span>
                    <span className="text-accent font-mono">{uploadProgressPercent}%</span>
                  </div>
                  <div className="w-full bg-border-subtle/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-accent h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && !isUploadingClientPhoto && (
                <div className="bg-red-50 border border-red-200/80 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold text-xs mt-0.5">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-red-800">Photo Upload Failed</p>
                      <p className="text-[9px] text-red-600 break-words">{uploadError}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {failedPhotoFile && (
                      <button
                        type="button"
                        onClick={() => executePhotoUpload(failedPhotoFile)}
                        className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-all"
                      >
                        ↻ Retry Upload
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setUploadError(null); setFailedPhotoFile(null); }}
                      className="text-[9px] text-text-muted hover:text-primary font-bold uppercase tracking-wider px-2 py-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {clientPhoto && !isUploadingClientPhoto && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => clientPhotoInputRef.current?.click()}
                    className="text-[9px] text-primary font-bold uppercase tracking-widest h-8 px-3 border border-border-subtle bg-white hover:bg-bg-secondary rounded-lg flex items-center justify-center active:scale-95 transition-all"
                  >
                    Change photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientPhoto('')}
                    className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase tracking-widest h-8 px-3 border border-red-100 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center active:scale-95 transition-all"
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </section>

            {/* Gender Selection */}
            <section className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Gender Context</span>
              <div className="grid grid-cols-2 gap-4">
                <SelectableCard
                  selected={gender === 'female'}
                  onClick={() => { setGender('female'); setSelectedGarments([]); }}
                  title="Feminine"
                  size="large"
                >
                  <SilhouetteSVG gender="female" />
                </SelectableCard>

                <SelectableCard
                  selected={gender === 'male'}
                  onClick={() => { setGender('male'); setSelectedGarments([]); }}
                  title="Masculine"
                  size="large"
                >
                  <SilhouetteSVG gender="male" />
                </SelectableCard>
              </div>
            </section>

            {/* Financials inputs */}
            <section className={`space-y-4 transition-all duration-500 ${gender ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Financials (Optional)</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-0 bottom-2 text-text-muted font-sans font-medium text-base z-20">₦</span>
                  <input
                    type="number"
                    value={totalCost}
                    onChange={e => {
                      const val = e.target.value;
                      if (Number(val) < 0) return;
                      setTotalCost(val);
                    }}
                    className="w-full h-12 bg-transparent border-0 border-b border-border-subtle focus:border-accent text-base font-bold text-primary pl-5 outline-none transition-colors"
                    placeholder="Total Cost"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-0 bottom-2 text-text-muted font-sans font-medium text-base z-20">₦</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => {
                      const val = e.target.value;
                      if (Number(val) < 0) return;
                      setAmountPaid(val);
                    }}
                    className={`w-full h-12 bg-transparent border-0 border-b pl-5 text-base font-bold outline-none transition-all duration-300 ${isDepositInvalid
                      ? 'border-red-300 focus:border-red-500 text-red-900'
                      : 'border-border-subtle focus:border-accent text-primary'
                      }`}
                    placeholder="Deposit Paid"
                  />
                </div>
              </div>

              {/* Quick-Tap Payment Presets */}
              {parseFloat(totalCost) > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(String(Math.round(parseFloat(totalCost) * 0.5)))}
                    className="h-8 px-4 bg-bg-secondary/40 border border-accent/20 hover:border-accent rounded-full text-[9px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
                  >
                    50% Deposit (₦{Math.round(parseFloat(totalCost) * 0.5).toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totalCost)}
                    className="h-8 px-4 bg-bg-secondary/40 border border-accent/20 hover:border-accent rounded-full text-[9px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
                  >
                    Full Payment (₦{parseFloat(totalCost).toLocaleString()})
                  </button>
                </div>
              )}

              {isDepositInvalid && (
                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest animate-in fade-in duration-300 mt-2 px-1">
                  ⚠️ Warning: Deposit exceeds total cost
                </p>
              )}
            </section>
          </div>

          {/* Right Column: Garments, Dates, Styles & Action Button */}
          <div className="space-y-8">
            {/* Garment Selection Grid */}
            <section className={`space-y-4 transition-all duration-500 ${gender ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Select Garments</span>
                <span className="text-[8px] text-text-muted font-bold tracking-widest uppercase mb-0.5">Tap multiple</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {availableGarments.map((g, idx) => {
                  const isSelected = selectedGarments.includes(g);
                  return (
                    <SelectableCard
                      key={idx}
                      selected={isSelected}
                      onClick={() => handleGarmentToggle(g)}
                      title={g}
                      size="square"
                    >
                      <GarmentGridSVG type={g} />
                    </SelectableCard>
                  );
                })}
              </div>
            </section>

            {/* Delivery & Reminder Dates */}
            <section className={`space-y-4 transition-all duration-500 ${selectedGarments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Delivery Date */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Delivery Deadline</span>
                  <div className="relative group">
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => updateDeadlineAndReminder(e.target.value)}
                      className="w-full h-12 bg-transparent border-0 border-b border-border-subtle focus:border-accent px-0 transition-all duration-300 text-base font-semibold text-primary outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Reminder Date */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Reminder Date</span>
                  <div className="relative group">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      className="w-full h-12 bg-transparent border-0 border-b border-border-subtle focus:border-accent px-0 transition-all duration-300 text-base font-semibold text-primary outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Presets Slider */}
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mt-3">
                {[
                  { label: '+3 Days', days: 3 },
                  { label: '1 Week', days: 7 },
                  { label: '2 Weeks', days: 14 },
                  { label: '1 Month', days: 30 }
                ].map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + opt.days);
                      updateDeadlineAndReminder(d.toISOString().split('T')[0]);
                    }}
                    className="flex-shrink-0 h-8 px-4 bg-bg-secondary/40 border border-accent/20 hover:border-accent rounded-xl text-[9px] font-bold text-primary uppercase tracking-widest transition-colors active:scale-95"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>



            {/* Primary Action Button */}
            <div className="pt-4 shrink-0">
              {isLimitReached ? (
                <Card bg="sand" shadow="sm" className="p-6 text-center space-y-4 border border-accent/20">
                  <p className="text-sm font-bold text-primary">You've reached your free limit of {LIMIT} clients.</p>
                  <p className="text-xs text-text-muted leading-relaxed">Upgrade to Atelier Unlimited for just ₦2,500/month to continue.</p>
                  <Button
                    variant="primary"
                    onClick={() => window.open('https://paystack.com/', '_blank')}
                    className="w-full h-12"
                  >Upgrade Plan</Button>
                </Card>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleStart}
                  disabled={!name || !gender || selectedGarments.length === 0}
                  className="w-full h-14"
                >
                  Start Measuring
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
