import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Gender } from '../utils/templates';

export const SetupJobScreen: React.FC = () => {
  const { startSession, garmentTemplates, totalSessions } = useAppContext();
  const { user } = useAuth();
  
  const profileImage = localStorage.getItem(`profile_img_${user?.id}`) || '';
  const ownerName = user?.email.split('@')[0] || 'Tailor';
  
  const LIMIT = 20;
  const isLimitReached = totalSessions >= LIMIT;

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [clientPhoto, setClientPhoto] = useState<string>('');
  const [isUploadingClientPhoto, setIsUploadingClientPhoto] = useState(false);
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Dynamically get garments based on selected gender
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleClientPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingClientPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'TailorVoice');
      const res = await fetch('https://api.cloudinary.com/v1_1/dcpvhegxr/image/upload', {
        method: 'POST', body: formData
      });
      const data = await res.json();
      setClientPhoto(data.secure_url);
    } catch { alert('Photo upload failed.'); }
    finally { setIsUploadingClientPhoto(false); }
  };

  const handleStart = () => {
    if (!name || !gender || selectedGarments.length === 0) return;
    startSession({
      customerName: name,
      gender,
      garments: selectedGarments,
      deadline: deadline,
      totalCost: parseFloat(totalCost) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      photos,
      clientPhoto: clientPhoto || undefined,
      measurements: {}
    });
  };

  return (
    <div className="flex flex-col min-h-full pb-32">

      {/* Top App Bar */}
      <div className="px-6 py-4 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-xl font-bold tracking-tight text-gray-900">TailorVoice</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Free Plan</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
          {profileImage ? (
            <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <img src={`https://ui-avatars.com/api/?name=${ownerName}&background=0F172A&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
          )}
        </div>
      </div>
    </div>

      <div className="px-6 md:px-12 pt-6 md:pt-10 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto w-full transition-all duration-300">
        {/* Header Section */}
        <header className="mb-8">
          <h2 className="font-serif text-4xl font-bold text-gray-900 tracking-tight">New Project</h2>
          <p className="text-gray-500 mt-2">Initialize your bespoke measurement session.</p>
        </header>

        <div className="space-y-8">

          {/* Client Name + Optional Photo */}
          <section className="space-y-4">
            <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 block">CLIENT NAME</label>
            <div className="flex items-center gap-4">
              {/* Optional Client Photo */}
              <div
                onClick={() => clientPhotoInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-[#0F172A] hover:bg-gray-50 transition-all overflow-hidden relative"
              >
                {isUploadingClientPhoto ? (
                  <div className="w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
                ) : clientPhoto ? (
                  <img src={clientPhoto} alt="Client" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span className="text-[8px] text-gray-400 font-bold mt-0.5">PHOTO</span>
                  </div>
                )}
              </div>
              <input ref={clientPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleClientPhotoUpload} />
              <div className="relative group flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-12 bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#0F172A] focus:ring-0 px-0 transition-all duration-300 text-lg font-medium text-gray-900 placeholder:text-gray-300 outline-none"
                  placeholder="Enter full name..."
                />
              </div>
            </div>
            {clientPhoto && (
              <button onClick={() => setClientPhoto('')} className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                Remove photo
              </button>
            )}
          </section>

          {/* Gender Selection */}
          <section className="space-y-4">
            <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 block">GENDER CONTEXT</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Female */}
              <button
                onClick={() => { setGender('female'); setSelectedGarments([]); }}
                className={`aspect-[4/3] flex flex-col items-center justify-center rounded-[24px] border-2 transition-all duration-300 ${
                  gender === 'female' ? 'bg-[#FFF1F2] border-pink-200 shadow-sm' : 'bg-[#F8F9FA] border-transparent hover:border-gray-200 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Female silhouette — dress shape */}
                <svg className={`w-10 h-10 mb-2 ${gender === 'female' ? 'text-pink-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="3" />
                  <path d="M8 10 C8 10 7 12 6 16 L10 16 L9 21 L15 21 L14 16 L18 16 C17 12 16 10 16 10 C15 10 14 8 12 8 C10 8 9 10 8 10 Z" />
                </svg>
                <span className={`font-bold text-sm ${gender === 'female' ? 'text-pink-900' : 'text-gray-500'}`}>Female</span>
              </button>

              {/* Male */}
              <button
                onClick={() => { setGender('male'); setSelectedGarments([]); }}
                className={`aspect-[4/3] flex flex-col items-center justify-center rounded-[24px] border-2 transition-all duration-300 ${
                  gender === 'male' ? 'bg-[#EFF6FF] border-blue-200 shadow-sm' : 'bg-[#F8F9FA] border-transparent hover:border-gray-200 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Male silhouette — suit/tie shape */}
                <svg className={`w-10 h-10 mb-2 ${gender === 'male' ? 'text-blue-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="3" />
                  <path d="M9 9 L7 21 L10 21 L12 15 L14 21 L17 21 L15 9 L13 9 L12 12 L11 9 Z" />
                  <path d="M9 9 C9 9 8 10 8 11 L10 11 L9 9 Z" />
                  <path d="M15 9 C15 9 16 10 16 11 L14 11 L15 9 Z" />
                </svg>
                <span className={`font-bold text-sm ${gender === 'male' ? 'text-blue-900' : 'text-gray-500'}`}>Male</span>
              </button>
            </div>
          </section>

          {/* Garment Selection (Multi-Select) */}
          <section className={`space-y-4 transition-all duration-500 ${gender ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
            <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 block">
              SELECT GARMENTS <span className="text-gray-400 font-normal normal-case ml-1">(Tap multiple)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {availableGarments.length === 0 && !gender && (
                <p className="text-sm text-gray-400">Select a gender to see garments</p>
              )}
              {availableGarments.map((g, idx) => {
                const isSelected = selectedGarments.includes(g);
                return (
                  <button
                    key={idx}
                    onClick={() => handleGarmentToggle(g)}
                    className={`h-12 px-6 flex items-center justify-center rounded-full border shadow-sm transition-all duration-300 font-bold text-sm ${isSelected
                        ? 'bg-[#0F172A] border-[#0F172A] text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#0F172A] hover:text-[#0F172A]'
                      }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Financials (Optional) */}
          <section className={`space-y-4 transition-all duration-500 ${selectedGarments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
            <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 block">FINANCIALS <span className="text-gray-400 font-normal normal-case ml-1">(Optional)</span></label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-400 font-medium">₦</span>
                <input
                  type="number"
                  value={totalCost}
                  onChange={e => setTotalCost(e.target.value)}
                  className="w-full h-12 bg-white rounded-[16px] pl-8 pr-4 text-sm font-bold text-gray-900 border-2 border-gray-100 focus:border-[#0F172A] focus:ring-0 outline-none transition-colors"
                  placeholder="Total Cost"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-400 font-medium">₦</span>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full h-12 bg-white rounded-[16px] pl-8 pr-4 text-sm font-bold text-gray-900 border-2 border-gray-100 focus:border-[#0F172A] focus:ring-0 outline-none transition-colors"
                  placeholder="Deposit Paid"
                />
              </div>
            </div>
          </section>

          {/* Delivery Date */}
          <section className={`space-y-4 transition-all duration-500 ${selectedGarments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
            <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 block">DELIVERY DEADLINE</label>
            <div className="relative group">
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full h-12 bg-transparent border-0 border-b-2 border-gray-200 focus:border-[#0F172A] focus:ring-0 px-0 transition-all duration-300 text-lg font-medium text-gray-900 outline-none cursor-pointer"
              />
              <div className="absolute right-0 top-3 text-gray-400 pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
            </div>
          </section>

          {/* Style References */}
          <section className={`space-y-4 transition-all duration-500 ${selectedGarments.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
            <div className="flex justify-between items-end">
              <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 block">STYLE REFERENCES</label>
              <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">{photos.length} added</span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
              {photos.map((photo, i) => (
                <div key={i} className="w-24 h-32 rounded-2xl overflow-hidden flex-shrink-0 relative group border border-gray-200">
                  <img src={photo} alt="Reference" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[9px] tracking-widest font-bold uppercase border border-white/30 px-2 py-1 rounded">Remove</span>
                  </button>
                </div>
              ))}
              
              <label className="w-24 h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-[#0F172A] hover:text-[#0F172A] hover:bg-gray-50 transition-all flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span className="text-[9px] font-bold mt-2 uppercase tracking-widest">UPLOAD</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </section>

          {/* Primary Action */}
          <div className="pt-2">
            {isLimitReached ? (
              <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-6 text-center space-y-4">
                <p className="text-sm font-bold text-amber-900">You've reached your free limit of {LIMIT} clients.</p>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">Upgrade to Unlimited for just ₦2,500/month to keep growing your boutique.</p>
                <button 
                  onClick={() => window.open('https://paystack.com/', '_blank')}
                  className="w-full h-12 bg-[#D4AF37] text-white rounded-full font-bold text-[11px] tracking-widest uppercase shadow-lg active:scale-95"
                >Upgrade to Premium</button>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={!name || !gender || selectedGarments.length === 0}
                className={`w-full h-16 rounded-full font-bold text-lg shadow-[0_12px_24px_rgba(15,23,42,0.15)] transition-all flex items-center justify-center gap-3 ${(!name || !gender || selectedGarments.length === 0)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-[#0F172A] text-white hover:bg-black active:scale-95'
                  }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6" y2="10"></line>
                  <line x1="10" y1="6" x2="10" y2="10"></line>
                  <line x1="14" y1="6" x2="14" y2="10"></line>
                  <line x1="18" y1="6" x2="18" y2="10"></line>
                </svg>
                Start Measuring
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
