import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { GarmentTemplate } from '../utils/templates';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { unit, setUnit, garmentTemplates, updateGarmentTemplate, shopName, saveShopName } = useAppContext();
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'main' | 'templates' | 'edit_template'>('main');
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [tempShopName, setTempShopName] = useState(user?.shop_name || shopName);
  const [tempOwnerName, setTempOwnerName] = useState(user?.email.split('@')[0] || 'Tailor'); 
  const [profileImage, setProfileImage] = useState(localStorage.getItem(`profile_img_${user?.id}`) || '');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GarmentTemplate | null>(null);
  const [newPart, setNewPart] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('tailor_sound_muted') === 'true');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('tailor_notifications_enabled') === 'true');

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'TailorVoice'); // Reusing your preset

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dcpvhegxr/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setProfileImage(data.secure_url);
      localStorage.setItem(`profile_img_${user.id}`, data.secure_url);
    } catch (err) {
      alert("Failed to upload profile image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPart = () => {
    if (!newPart.trim() || !selectedTemplate) return;
    const cleanPart = newPart.trim().toLowerCase();
    if (selectedTemplate.parts.includes(cleanPart)) return;

    const newParts = [...selectedTemplate.parts, cleanPart];
    updateGarmentTemplate(selectedTemplate.name, newParts);
    setSelectedTemplate({ ...selectedTemplate, parts: newParts });
    setNewPart('');
  };

  const handleRemovePart = (part: string) => {
    if (!selectedTemplate) return;
    const newParts = selectedTemplate.parts.filter(p => p !== part);
    updateGarmentTemplate(selectedTemplate.name, newParts);
    setSelectedTemplate({ ...selectedTemplate, parts: newParts });
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return;
    const name = newTemplateName.trim();
    const exists = garmentTemplates.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert("This garment type already exists.");
      return;
    }
    const newT: GarmentTemplate = { name, parts: [], recommendedFor: ['male', 'female'] };
    updateGarmentTemplate(name, []);
    setSelectedTemplate(newT);
    setNewTemplateName('');
    setActiveView('edit_template');
  };

  if (activeView === 'templates') {
    return (
      <div className="flex flex-col min-h-full pb-36 bg-[#FDFDFD] px-6 pt-6">
        {/* Top App Bar */}
        <div className="py-5 flex items-center gap-4 bg-transparent mb-6 select-none">
          <button 
            onClick={() => setActiveView('main')} 
            className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center text-primary active:scale-95 transition-transform shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <span className="font-serif text-[10px] italic tracking-widest text-[#C49B27] block mb-1">ATELIER TEMPLATES</span>
            <h1 className="font-serif text-2xl font-bold text-primary uppercase">Garment Types</h1>
          </div>
        </div>
        
        <div className="space-y-4">
          {garmentTemplates.map(template => (
            <div 
              key={template.name}
              onClick={() => { setSelectedTemplate(template); setActiveView('edit_template'); }}
              className="bg-white rounded-[24px] p-5 shadow-sm border border-border-subtle flex justify-between items-center cursor-pointer hover:border-[#D4AF37]/35 transition-colors"
            >
              <div>
                <h3 className="font-serif text-lg font-bold text-primary uppercase tracking-wide">{template.name}</h3>
                <p className="text-[9px] text-[#C49B27] font-bold tracking-widest uppercase mt-1">
                  {template.parts.length} REQUIRED MEASUREMENTS
                </p>
              </div>
              <svg className="w-5 h-5 text-[#D4AF37]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>

        <div className="h-[1px] bg-border-subtle my-8"></div>

        {/* Create Custom Garment Template Card */}
        <div className="bg-white rounded-[32px] p-6 border-2 border-dashed border-border-subtle shadow-sm">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-1">Create Custom Garment</h3>
          <p className="text-[10px] text-text-muted mb-4 leading-relaxed">Define a brand new outfit category for your voice recordings.</p>
          <div className="flex gap-2">
            <input 
              type="text"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTemplate()}
              placeholder="E.g. Kaftan, Senator, Suit..."
              className="flex-1 h-12 bg-[#FAF7F2] border border-border-subtle rounded-xl px-4 text-xs font-bold focus:border-[#D4AF37] focus:ring-0 outline-none placeholder:text-text-muted/65"
            />
            <button 
              onClick={handleCreateTemplate}
              className="px-6 bg-[#0F172A] hover:bg-black text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors active:scale-95"
            >
              Create
            </button>
          </div>
        </div>

      </div>
    );
  }

  if (activeView === 'edit_template' && selectedTemplate) {
    return (
      <div className="flex flex-col min-h-full pb-36 bg-[#FDFDFD] px-6 pt-6">
        {/* Top App Bar */}
        <div className="py-5 flex items-center gap-4 bg-transparent mb-6 select-none">
          <button 
            onClick={() => setActiveView('templates')} 
            className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center text-primary active:scale-95 transition-transform shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <span className="font-serif text-[10px] italic tracking-widest text-[#C49B27] block mb-1">EDIT TEMPLATE SPEC</span>
            <h1 className="font-serif text-2xl font-bold text-primary uppercase">{selectedTemplate.name}</h1>
          </div>
        </div>
        
        <div className="bg-white rounded-[28px] border border-border-subtle shadow-sm p-6 mb-6">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">REQUIRED SPECS</h3>
          <div className="flex flex-wrap gap-2.5">
            {selectedTemplate.parts.map(part => (
              <div key={part} className="bg-[#FAF7F2] border border-border-subtle rounded-full pl-4 pr-1 py-1 flex items-center gap-2">
                <span className="text-xs font-bold text-primary capitalize">{part}</span>
                <button 
                  onClick={() => handleRemovePart(part)} 
                  className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-text-muted hover:text-rose-500 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mb-4">
          <input 
            type="text" 
            value={newPart}
            onChange={e => setNewPart(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPart()}
            placeholder="E.g. Neck Drop, Bicep..."
            className="w-full h-14 bg-white border border-border-subtle rounded-2xl pl-6 pr-14 text-sm font-bold focus:border-[#D4AF37] focus:ring-0 outline-none placeholder:text-text-muted/65"
          />
          <button 
            onClick={handleAddPart}
            className="absolute right-2 top-2 bottom-2 w-10 bg-[#0F172A] text-white rounded-xl flex items-center justify-center hover:bg-black active:scale-95 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-text-muted mt-2 px-4 leading-relaxed">
          Adding a part here teaches the AI model to listen for it specifically when you are recording a {selectedTemplate.name}.
        </p>
      </div>
    );
  }

  // Voice quota stats calculations
  let quota = { used_seconds: 0, limit_seconds: 600, remaining_seconds: 600, warning_level: 'none', resets_on: '', is_admin: false };
  try {
    const stored = localStorage.getItem('voice_quota');
    if (stored) quota = JSON.parse(stored);
  } catch {}
  const pct = Math.min((quota.used_seconds / quota.limit_seconds) * 100, 100);
  const usedMin = Math.floor(quota.used_seconds / 60);
  const usedSec = quota.used_seconds % 60;
  const totalMin = Math.floor(quota.limit_seconds / 60);

  return (
    <div className="flex flex-col min-h-full pb-36 bg-[#FDFDFD] px-6 pt-6">
      
      {/* Top App Bar Header */}
      <div className="py-5 flex justify-between items-center bg-transparent mb-6 select-none">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center text-primary active:scale-95 transition-transform shadow-sm"
          title="Back to Dashboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2 className="font-serif text-[11px] italic tracking-wide text-text-muted">Atelier Settings</h2>
        <div className="w-10 h-10" />
      </div>

      {/* Profile Photo & Name Section */}
      <div className="flex flex-col items-center mb-8">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full border-[3px] border-accent p-0.5 shadow-md bg-white cursor-pointer hover:opacity-90 transition-opacity mb-4"
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-[#FAF7F2] flex items-center justify-center">
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : profileImage ? (
              <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${tempOwnerName}&background=0F172A&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfileUpload} />
        </div>

        {isEditingShop ? (
          <div className="space-y-4 bg-white p-6 rounded-[28px] border border-accent shadow-lg animate-in zoom-in-95 w-full max-w-sm">
            <div>
              <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Shop Name</label>
              <input 
                type="text" 
                value={tempShopName} 
                onChange={e => setTempShopName(e.target.value)}
                className="w-full bg-[#FAF7F2] rounded-xl px-4 py-3 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Owner Name</label>
              <input 
                type="text" 
                value={tempOwnerName} 
                onChange={e => setTempOwnerName(e.target.value)}
                className="w-full bg-[#FAF7F2] rounded-xl px-4 py-3 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => { saveShopName(tempShopName); setIsEditingShop(false); }}
                className="flex-1 h-12 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md active:scale-95 transition-all"
              >
                Save Profile
              </button>
              <button 
                onClick={() => { setTempShopName(shopName); setIsEditingShop(false); }}
                className="px-6 h-12 bg-white text-text-muted rounded-full text-[10px] font-bold uppercase tracking-widest border border-border-subtle active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center relative group w-full px-4 select-none">
            <h2 className="font-serif text-3.5xl font-semibold text-primary tracking-wide leading-tight mb-1 uppercase">
              {user?.shop_name || shopName}
            </h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">
              Artisan: {tempOwnerName} • {user?.email}
            </p>
            <button 
              onClick={() => setIsEditingShop(true)}
              className="mx-auto h-9 px-4 bg-[#FAF7F2] hover:bg-bg-secondary hover:text-primary transition-colors text-text-muted rounded-full text-[9px] font-bold uppercase tracking-widest border border-border-subtle flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Voice Usage Meter */}
      {!quota.is_admin && (
        <section className="mb-8">
          <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3.5 block select-none">
            Voice Usage
          </h3>
          <div className="bg-white rounded-[24px] p-5 border border-border-subtle shadow-sm">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-bold text-primary">Monthly Voice Quota</span>
              <span className="text-xs font-mono font-bold text-accent">
                {usedMin}m {usedSec > 0 ? `${usedSec}s` : ''} / {totalMin}m
              </span>
            </div>
            <div className="w-full h-2 bg-[#FAF7F2] rounded-full overflow-hidden mb-3 border border-black/5">
              <div
                className="h-full rounded-full transition-all duration-500 bg-accent"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-text-muted select-none">
              <span>
                {pct >= 100
                  ? '🔒 Limit reached — use manual keypad'
                  : pct >= 80
                  ? '⚠️ Running low on voice minutes'
                  : '✅ Voice quota available'}
              </span>
              {quota.resets_on && (
                <span className="font-bold uppercase tracking-wider text-[9px]">
                  Resets {quota.resets_on}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* System Preferences */}
      <section className="mb-8">
        <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3.5 block select-none">
          System Preferences
        </h3>
        <div className="bg-white rounded-[28px] border border-border-subtle overflow-hidden shadow-sm divide-y divide-border-subtle">
          
          {/* Measurement Units */}
          <div className="flex justify-between items-center px-5 py-4">
            <div>
              <span className="text-[13px] font-bold text-primary block leading-none mb-1">Measurement Units</span>
              <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider">Active: {unit === 'in' ? 'Inches' : 'cm'}</span>
            </div>
            
            <div 
              onClick={() => setUnit(unit === 'in' ? 'cm' : 'in')}
              className={`w-13 h-7 rounded-full p-0.5 cursor-pointer transition-colors duration-300 flex items-center relative ${
                unit === 'in' ? 'bg-[#D4AF37]' : 'bg-[#FAF7F2] border border-border-subtle'
              }`}
            >
              <div 
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-[8px] font-bold ${
                  unit === 'in' ? 'translate-x-6 text-[#C49B27]' : 'translate-x-0 text-text-muted'
                }`}
              >
                {unit === 'in' ? 'IN' : 'CM'}
              </div>
            </div>
          </div>

          {/* Sensory Chimes */}
          <div className="flex justify-between items-center px-5 py-4">
            <div>
              <span className="text-[13px] font-bold text-primary block leading-none mb-1">Sensory Chimes</span>
              <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider">Active: {soundMuted ? 'Muted' : 'Sound Enabled'}</span>
            </div>

            <div 
              onClick={() => {
                const newMuted = !soundMuted;
                setSoundMuted(newMuted);
                localStorage.setItem('tailor_sound_muted', String(newMuted));
              }}
              className={`w-13 h-7 rounded-full p-0.5 cursor-pointer transition-colors duration-300 flex items-center relative ${
                !soundMuted ? 'bg-[#D4AF37]' : 'bg-[#FAF7F2] border border-border-subtle'
              }`}
            >
              <div 
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-[8px] font-bold ${
                  !soundMuted ? 'translate-x-6 text-[#C49B27]' : 'translate-x-0 text-text-muted'
                }`}
              >
                {!soundMuted ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="flex justify-between items-center px-5 py-4">
            <div>
              <span className="text-[13px] font-bold text-primary block leading-none mb-1">System Alerts</span>
              <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider">Active: {notificationsEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>

            <div 
              onClick={async () => {
                const nextState = !notificationsEnabled;
                if (nextState) {
                  if (!('Notification' in window)) {
                    alert("This browser does not support system notifications.");
                    return;
                  }
                  const permission = await Notification.requestPermission();
                  if (permission !== 'granted') {
                    alert("Alerts blocked. Please enable notification permissions in your browser settings.");
                    return;
                  }
                }
                setNotificationsEnabled(nextState);
                localStorage.setItem('tailor_notifications_enabled', String(nextState));
              }}
              className={`w-13 h-7 rounded-full p-0.5 cursor-pointer transition-colors duration-300 flex items-center relative ${
                notificationsEnabled ? 'bg-[#D4AF37]' : 'bg-[#FAF7F2] border border-border-subtle'
              }`}
            >
              <div 
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-[8px] font-bold ${
                  notificationsEnabled ? 'translate-x-6 text-[#C49B27]' : 'translate-x-0 text-text-muted'
                }`}
              >
                {notificationsEnabled ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operations */}
      <section className="mb-8">
        <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3.5 block select-none">
          Operations
        </h3>
        <div className="bg-white rounded-[28px] border border-border-subtle overflow-hidden shadow-sm divide-y divide-border-subtle">
          
          {/* Manage Garment Templates */}
          <div 
            onClick={() => setActiveView('templates')} 
            className="flex justify-between items-center px-6 py-5 cursor-pointer hover:bg-bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3 select-none">
              <span className="text-lg">🧵</span>
              <span className="text-[13px] font-bold text-primary">Manage Garment Templates</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>

          {/* System Diagnostics */}
          {user?.email === 'emmanuel@example.com' && (
            <div 
              onClick={() => navigate('/admin/diagnostics')} 
              className="flex justify-between items-center px-6 py-5 cursor-pointer hover:bg-violet-50/40 transition-colors"
            >
              <div className="flex items-center gap-3 select-none">
                <span className="text-lg">⚙️</span>
                <span className="text-[13px] font-bold text-primary">System Diagnostics</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          )}

          {/* Logout */}
          <div 
            onClick={logout} 
            className="flex justify-between items-center px-6 py-5 cursor-pointer hover:bg-rose-50/50 transition-colors"
          >
            <div className="flex items-center gap-3 select-none">
              <span className="text-lg text-rose-500">📤</span>
              <span className="text-[13px] font-bold text-rose-700">Sign Out</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
