import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Gender } from '../utils/templates';
import { playSensorySound } from '../hooks/useWhisper';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { SelectableCard } from './ui/SelectableCard';
import { useNavigate } from 'react-router-dom'

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
  const { user } = useAuth();

  const profileImage = localStorage.getItem(`profile_img_${user?.id}`) || '';
  const ownerName = user?.email.split('@')[0] || 'Tailor';

  const LIMIT = 20;
  const isLimitReached = totalSessions >= LIMIT;
  // const navigate = useNavigate();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [clientPhoto, setClientPhoto] = useState<string>('');
  const [isUploadingClientPhoto, setIsUploadingClientPhoto] = useState(false);
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
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

    if (parseFloat(amountPaid) > parseFloat(totalCost)) {
      playSensorySound('error');
      alert(`⚠️ Error: Deposit paid (₦${parseFloat(amountPaid).toLocaleString()}) cannot exceed the total cost (₦${parseFloat(totalCost).toLocaleString()}).`);
      return;
    }

    startSession({
      customerName: name,
      gender,
      garments: selectedGarments,
      deadline: deadline,
      reminderDate: reminderDate,
      totalCost: parseFloat(totalCost) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      photos: [],
      clientPhoto: clientPhoto || undefined,
      measurements: {}
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
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent block">Client Profile</span>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => clientPhotoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full bg-white border border-border-subtle flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-accent/40 shadow-sm overflow-hidden relative"
                >
                  {isUploadingClientPhoto ? (
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : clientPhoto ? (
                    <img src={clientPhoto} alt="Client" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center select-none opacity-60">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7E7571" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      <span className="text-[7px] text-text-muted font-bold mt-1 tracking-widest uppercase">Photo</span>
                    </div>
                  )}
                </div>

                <input ref={clientPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleClientPhotoUpload} />

                <div className="flex-1">
                  <Input
                    label="Client Name"
                    value={name}
                    onChange={setName}
                    required
                    id="clientName"
                    placeholder="Enter full name..."
                  />
                </div>
              </div>
              {isUploadingClientPhoto && (
                <div className="bg-bg-secondary/40 border border-accent/20 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Uploading to secure cloud...</span>
                </div>
              )}
              {clientPhoto && (
                <button
                  onClick={() => setClientPhoto('')}
                  className="text-[9px] text-red-500 font-bold uppercase tracking-widest h-9 px-4 border border-red-100 bg-red-50 rounded-xl flex items-center justify-center active:scale-95 transition-all mt-2"
                >
                  Remove photo
                </button>
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
