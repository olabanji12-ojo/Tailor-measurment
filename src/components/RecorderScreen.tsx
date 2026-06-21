import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhisper, playSensorySound } from '../hooks/useWhisper';
import { parseMeasurements } from '../utils/parser';
import { NumPad } from './NumPad';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { playCaptureSound } from '../utils/soundUtils';
import { shareMeasurementCard } from '../utils/shareCard';
import { saveOfflineMeasurement } from '../utils/db';
import { MeasurementCard } from './ui/MeasurementCard';
import { VideoWrapper } from './ui/VideoWrapper';


export const RecorderScreen: React.FC = () => {
  const { isListening, isTranscribing, transcript, voiceQuota, recordingSeconds, recordingLimit, toggleListening, clearTranscript } = useWhisper();
  const { unit, shopName, getLabel, findPartByLabel, currentSession, startSession, clearSession, updateSessionMeasurements, addGarmentToSession, removeGarmentFromSession, addCustomPart, customParts, garmentTemplates, refreshSessions } = useAppContext();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState<'voice' | 'manual'>('voice');
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [isAddingGarment, setIsAddingGarment] = useState(false);
  const [isAddingCustomPart, setIsAddingCustomPart] = useState(false);
  const [newCustomPart, setNewCustomPart] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  const [measurementsByGarment, setMeasurementsByGarment] = useState<Record<string, Record<string, number>>>(() => {
    // Restore from persisted session if available
    if (currentSession?.measurements && Object.keys(currentSession.measurements).length > 0) {
      return currentSession.measurements;
    }
    const init: Record<string, Record<string, number>> = {};
    if (currentSession?.garments) {
      currentSession.garments.forEach(g => { init[g] = {}; });
    }
    return init;
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentSession?.customerName || '');
  const [numPadPart, setNumPadPart] = useState<string | null>(null);
  const [targetedPart, setTargetedPart] = useState<string | null>(null);
  
  // Just Captured UI state
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [noMatchHint, setNoMatchHint] = useState(false);

  const [stylePhotos, setStylePhotos] = useState<string[]>([]);
  const [clothPhotos, setClothPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<'style' | 'cloth' | null>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  // Voice quota state
  const [showQuotaSheet, setShowQuotaSheet] = useState(false);
  const [showQuotaInfo, setShowQuotaInfo] = useState(false);

  // Derived voice state from quota
  const voiceState = (() => {
    if (voiceQuota.is_admin) return 'normal';
    if (voiceQuota.warning_level === 'exceeded') return 'exceeded';
    if (voiceQuota.warning_level === 'urgent') return 'urgent';
    if (voiceQuota.warning_level === 'warning') return 'warning';
    return 'normal';
  })();

  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec > 0 ? ` ${sec}s` : ''}`;
  };

  const activeGarmentName = currentSession?.garments[activeTabIdx] || '';
  const currentTemplate = garmentTemplates.find(t => t.name === activeGarmentName);
  const activeParts = currentTemplate ? Array.from(new Set([...currentTemplate.parts, ...customParts])) : [];
  const activeMeasurements = measurementsByGarment[activeGarmentName] || {};

  useEffect(() => {
    if (inputMode !== 'voice' || !transcript || !activeGarmentName) return;
    
    // Show the transcript preview in the UI
    setLastTranscript(transcript);

    // 🎤 Card-Level Micro-Mic Trigger Handling
    if (targetedPart) {
      const match = transcript.match(/\d+(\.\d+)?/);
      if (match) {
        const val = parseFloat(match[0]);
        setMeasurementsByGarment(prev => ({
          ...prev,
          [activeGarmentName]: { ...prev[activeGarmentName], [targetedPart]: val }
        }));
        updateSessionMeasurements(activeGarmentName, targetedPart, val);
        setLastCaptured(targetedPart);
        playCaptureSound();
        setTargetedPart(null);
        clearTranscript();
        setTimeout(() => setLastCaptured(null), 2000);
        return;
      }
    }
    
    const result = parseMeasurements(transcript);
    let capturedSomething = false;

    // Handle Commands
    result.commands.forEach(cmd => {
      switch (cmd.type) {
        case 'finish':
          setIsSaving(true);
          break;
        case 'clear':
          if (cmd.target) {
            const target = findPartByLabel(cmd.target);
            if (target) {
              setMeasurementsByGarment(prev => ({
                ...prev,
                [activeGarmentName]: { ...prev[activeGarmentName], [target]: 0 }
              }));
              // We delete it from the object effectively
              setMeasurementsByGarment(prev => {
                const next = { ...prev[activeGarmentName] };
                delete next[target];
                return { ...prev, [activeGarmentName]: next };
              });
            }
          } else {
            setLastCaptured(null);
          }
          break;
        case 'next':
          const nextEmptyIdx = activeParts.findIndex(p => !activeMeasurements[p]);
          if (nextEmptyIdx !== -1) {
            // Simplified: jump focus to next empty
          }
          break;
        case 'add':
          if (cmd.target && cmd.value) {
            const safePart = cmd.target.toLowerCase().replace(/\s+/g, '_');
            addCustomPart(safePart);
            setMeasurementsByGarment(prev => ({
              ...prev,
              [activeGarmentName]: { ...prev[activeGarmentName], [safePart]: cmd.value! }
            }));
            setLastCaptured(safePart);
            playCaptureSound();
            capturedSomething = true;
          }
          break;
      }
    });

    // Handle Measurements
    Object.entries(result.measurements).forEach(([part, val]) => {
      // Exact match first, then fuzzy (prevents 'length' matching wrong garment's field)
      const targetKey = 
        activeParts.find(p => p.toLowerCase() === part.toLowerCase()) ||
        activeParts.find(p => p.toLowerCase().includes(part.toLowerCase()));

      if (targetKey && activeMeasurements[targetKey] !== val) {
        // Update local UI state
        setMeasurementsByGarment(prev => ({
          ...prev,
          [activeGarmentName]: { ...prev[activeGarmentName], [targetKey]: val }
        }));
        // ✅ FIX #1: Also persist to context (and localStorage via AppContext effect)
        updateSessionMeasurements(activeGarmentName, targetKey, val);
        setLastCaptured(targetKey);
        playCaptureSound();
        capturedSomething = true;
      }
    });

    if (capturedSomething) {
      setTimeout(() => setLastCaptured(null), 2000);
      setNoMatchHint(false);
      setTimeout(() => setLastTranscript(null), 4000);
      clearTranscript();
      return;
    }

    // 🧠 AI Fallback Calibrator Bridge: If heuristic parsing failed, call Go Server /api/parse-voice!
    const triggerAIFallback = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/parse-voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: transcript })
        });
        
        if (!res.ok) throw new Error('AI Translator Unavailable');
        
        const aiParsed: Record<string, number> = await res.json();
        let aiCaptured = false;

        Object.entries(aiParsed).forEach(([part, val]) => {
          const targetKey = 
            activeParts.find(p => p.toLowerCase() === part.toLowerCase()) ||
            activeParts.find(p => p.toLowerCase().includes(part.toLowerCase()));

          if (targetKey && activeMeasurements[targetKey] !== val) {
            setMeasurementsByGarment(prev => ({
              ...prev,
              [activeGarmentName]: { ...prev[activeGarmentName], [targetKey]: val }
            }));
            updateSessionMeasurements(activeGarmentName, targetKey, val);
            setLastCaptured(targetKey);
            playCaptureSound();
            aiCaptured = true;
          }
        });

        if (aiCaptured) {
          setTimeout(() => setLastCaptured(null), 2000);
          setNoMatchHint(false);
        } else {
          setNoMatchHint(true);
          setTimeout(() => setNoMatchHint(false), 4000);
        }
      } catch (err) {
        console.error('Failed to parse with AI:', err);
        setNoMatchHint(true);
        setTimeout(() => setNoMatchHint(false), 4000);
      }
    };

    triggerAIFallback();

    // Clear UI transcript after 4 seconds
    setTimeout(() => setLastTranscript(null), 4000);

    // CRITICAL: Clear engine transcript after processing
    clearTranscript();
  }, [transcript]);

  const handleNumPadClear = () => {
    if (!numPadPart || !activeGarmentName) return;
    setMeasurementsByGarment(prev => {
      const nextTab = { ...prev[activeGarmentName] };
      delete nextTab[numPadPart];
      return { ...prev, [activeGarmentName]: nextTab };
    });
    setNumPadPart(null);
  };

  const handleNumPadConfirm = (value: number) => {
    if (!numPadPart || !activeGarmentName) return;
    setMeasurementsByGarment(prev => ({
      ...prev,
      [activeGarmentName]: { ...prev[activeGarmentName], [numPadPart]: value }
    }));
    setNumPadPart(null);
  };

  const handleNumPadNext = (value: number) => {
    if (!numPadPart || !activeGarmentName) return;
    setMeasurementsByGarment(prev => ({
      ...prev,
      [activeGarmentName]: { ...prev[activeGarmentName], [numPadPart]: value }
    }));
    const currentIdx = activeParts.indexOf(numPadPart);
    const nextPart = activeParts[currentIdx + 1];
    setNumPadPart(nextPart || null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'style' | 'cloth') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'TailorVoice');
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dcpvhegxr/image/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (type === 'style') setStylePhotos(prev => [...prev, data.secure_url].slice(0, 3));
      else setClothPhotos(prev => [...prev, data.secure_url].slice(0, 3));
    } catch { alert("Upload failed."); }
    finally { setIsUploading(null); }
  };

  const handleSaveToBackend = async () => {
    if (!currentSession?.customerName) return;

    // Offline Save Safeguard
    if (!navigator.onLine) {
      try {
        await saveOfflineMeasurement({
          customerName: currentSession.customerName,
          gender: currentSession.gender || 'other',
          garments: currentSession.garments,
          deadline: currentSession.deadline,
          reminderDate: currentSession.reminderDate,
          totalCost: currentSession.totalCost || 0,
          amountPaid: currentSession.amountPaid || 0,
          photos: [...stylePhotos, ...(currentSession.photos || [])],
          clientPhoto: currentSession.clientPhoto || undefined,
          measurements: measurementsByGarment
        });
        
        playSensorySound('success');
        setIsSaved(true);
        setTimeout(() => {
          setIsSaving(false);
          clearTranscript();
          clearSession();
          navigate('/');
        }, 3500);
      } catch (err) {
        console.error("IndexedDB cache save failed:", err);
        playSensorySound('error');
        alert("⚠️ Error: Offline local cache failed to save.");
      }
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/measurements`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Shop-ID': shopName,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: currentSession.customerName,
          gender: currentSession.gender,
          garment: currentSession.garments.join(', '), 
          delivery_date: currentSession.deadline,
          reminder_date: currentSession.reminderDate,
          data: measurementsByGarment,
          transcript,
          unit,
          shop_id: shopName,
          style_photos: [...stylePhotos, ...(currentSession.photos || [])],
          cloth_photos: clothPhotos,
          total_cost: currentSession.totalCost,
          amount_paid: currentSession.amountPaid,
          client_photo: currentSession.clientPhoto,
        }),
      });
      if (res.ok) {
        setIsSaved(true);
        refreshSessions(1); // Trigger background sync
        setTimeout(() => {
          setIsSaving(false);
          clearTranscript();
          clearSession();
          navigate('/');
        }, 3500); // 3.5 seconds of celebration
      } else {
        throw new Error('Server returned non-ok status');
      }
    } catch (err) { 
      // Fallback to offline local cache if server fails
      try {
        await saveOfflineMeasurement({
          customerName: currentSession.customerName,
          gender: currentSession.gender || 'other',
          garments: currentSession.garments,
          deadline: currentSession.deadline,
          reminderDate: currentSession.reminderDate,
          totalCost: currentSession.totalCost || 0,
          amountPaid: currentSession.amountPaid || 0,
          photos: [...stylePhotos, ...(currentSession.photos || [])],
          clientPhoto: currentSession.clientPhoto || undefined,
          measurements: measurementsByGarment
        });
        
        playSensorySound('success');
        setIsSaved(true);
        setTimeout(() => {
          setIsSaving(false);
          clearTranscript();
          clearSession();
          navigate('/');
        }, 3500);
      } catch (dbErr) {
        playSensorySound('error');
        alert('Server Error & Local cache failed to save.');
      }
    }
  };

  const getGoogleCalendarUrl = () => {
    if (!currentSession) return '';
    const title = encodeURIComponent(`DELIVERY: ${currentSession.customerName} - ${currentSession.garments.join(', ')}`);
    // Format YYYYMMDD
    const dateStr = currentSession.deadline.replace(/-/g, '');
    const dates = `${dateStr}/${dateStr}`; 
    const details = encodeURIComponent(`Job for ${currentSession.customerName}.\nItems: ${currentSession.garments.join(', ')}\nTotal: ₦${currentSession.totalCost}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
  };

  const filledCount = Object.keys(activeMeasurements).length;
  return (
    <div className={`flex flex-col relative ${inputMode === 'voice' ? 'pb-72' : 'pb-40'} lg:pb-12 lg:ml-[40%] lg:w-[60%] min-h-full transition-all duration-500 bg-bg-light text-primary`}>
      
      {currentSession && (
        <div className="px-6 pt-8 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
                NOW RECORDING
              </p>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="font-serif text-2xl font-bold text-primary tracking-tight bg-transparent border-b-2 border-accent outline-none w-full max-w-[200px]"
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      if (currentSession && editedName.trim()) {
                        startSession({ ...currentSession, customerName: editedName.trim() });
                      }
                      setIsEditingName(false);
                    }}
                    className="text-[10px] font-bold text-accent uppercase tracking-widest"
                  >Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditedName(currentSession?.customerName || ''); setIsEditingName(true); }}>
                  <h2 className="font-serif text-3xl font-bold text-primary tracking-tight">{currentSession?.customerName} Session</h2>
                  <svg className="w-4 h-4 text-accent/40 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowHelp(true)}
                className="w-10 h-10 rounded-full bg-bg-secondary/40 border border-border-subtle flex items-center justify-center text-accent hover:text-primary transition-all shadow-sm"
              >
                <span className="text-lg font-bold">?</span>
              </button>
              <button onClick={() => { if(window.confirm('Cancel current job?')) clearSession() }} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-bg-secondary/40 px-4 py-2 rounded-full border border-border-subtle shadow-sm active:scale-95">
                Cancel
              </button>
            </div>
          </div>

          {/* GARMENT TABS */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {currentSession.garments.map((garment, idx) => {
              const isActive = activeTabIdx === idx;
              const tabFilledCount = Object.keys(measurementsByGarment[garment] || {}).length;
              const tabTotalParts = garmentTemplates.find(t => t.name === garment)?.parts.length || 0;
              const isComplete = tabFilledCount >= tabTotalParts;

              return (
                <div key={garment} className="relative group">
                  <button 
                    onClick={() => { setActiveTabIdx(idx); clearTranscript(); }}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full border transition-all duration-300 shadow-sm ${
                      isActive 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-white border-border-subtle text-text-muted hover:border-accent/40'
                    }`}
                  >
                    <span className="font-bold text-sm tracking-wide">{garment}</span>
                    {isComplete && <span className="bg-accent w-2 h-2 rounded-full"></span>}
                  </button>
                  {isActive && currentSession.garments.length > 1 && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (window.confirm(`Remove ${garment} from this session?`)) {
                           removeGarmentFromSession(garment);
                           setActiveTabIdx(0);
                        }
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm hover:bg-rose-200 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* ADD GARMENT PILL */}
            <button 
              onClick={() => setIsAddingGarment(true)}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full border border-dashed border-border-subtle bg-white/50 text-text-muted hover:bg-white hover:text-primary hover:border-accent transition-all duration-300 shadow-sm"
            >
              <span className="font-bold text-sm tracking-wide">+ Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Measurement List (Floating Cards) */}
      <div className="px-6 py-2">
        
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Measurements ({unit})</span>
          <span className="text-[9px] font-bold text-accent uppercase tracking-widest">{filledCount}/{activeParts.length} Filled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeParts.map((part) => {
            const value = activeMeasurements[part];
            const isActive = numPadPart === part || targetedPart === part;
            const isJustCaptured = lastCaptured === part;
            
            return (
              <div key={part} className={isJustCaptured ? 'animate-capture-pulse' : ''}>
                <MeasurementCard
                  label={getLabel(part)}
                  value={value || ''}
                  isActive={isActive}
                  onClick={() => {
                    if (inputMode === 'voice') {
                      if (targetedPart === part && isListening) {
                        setTargetedPart(null);
                        toggleListening();
                      } else {
                        setTargetedPart(part);
                        if (!isListening) toggleListening();
                      }
                    } else {
                      setNumPadPart(part);
                    }
                  }}
                  unit={unit}
                />
              </div>
            );
          })}

          {/* Add Custom Measurement Button */}
          <button 
            onClick={() => setIsAddingCustomPart(true)}
            className="w-full h-16 flex items-center justify-center bg-transparent border-2 border-dashed border-border-subtle rounded-[24px] hover:border-accent hover:text-accent transition-all duration-300 text-text-muted"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">+ Add Custom Measurement</span>
          </button>

        </div>
      </div>

      {/* Sleek Dynamic Input Dock Controls */}
      <div className={`fixed ${inputMode === 'voice' ? 'bottom-[250px]' : 'bottom-[85px]'} lg:bottom-24 lg:left-[40%] left-0 right-0 z-50 px-6 flex flex-col gap-3 pointer-events-none transition-all duration-500`}>
        
        {/* Floating Subtitle / Ticker ribbon */}
        {lastTranscript && (
          <div className={`mx-auto w-full max-w-[450px] rounded-2xl px-4 py-3 text-center text-xs font-medium text-white shadow-lg pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            noMatchHint ? 'bg-amber-600/95 border border-amber-500/20' : 'bg-primary/95 border border-white/5'
          }`}>
            <span className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-0.5">
              {noMatchHint ? '⚠️ No Match Found' : 'Transcribed Voice:'}
            </span>
            <p className="italic font-sans">"{lastTranscript}"</p>
            {noMatchHint && (
              <p className="text-[9px] text-amber-200 mt-1">Try: "Waist 32" or tap a card to speak numbers directly.</p>
            )}
          </div>
        )}

        {/* Voice Quota Warning Toast */}
        {(voiceState === 'warning' || voiceState === 'urgent') && !isListening && (
          <div className={`mx-auto w-full max-w-[450px] rounded-2xl px-4 py-3 text-center text-xs font-medium text-white shadow-lg pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            voiceState === 'urgent'
              ? 'bg-orange-600/95 border border-orange-500/20'
              : 'bg-amber-500/95 border border-amber-400/20'
          }`}>
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest block mb-0.5">
              {voiceState === 'urgent' ? '⚠️ Almost Out of Voice' : '🎙️ Voice Running Low'}
            </span>
            <p className="font-semibold">{formatSeconds(voiceQuota.remaining_seconds)} remaining this month</p>
            <p className="text-[9px] text-white/60 mt-0.5">Manual keypad is always free ✏️</p>
          </div>
        )}

        {/* 🎙️ Tappable Voice Usage Pill — always visible in voice mode */}
        {inputMode === 'voice' && !voiceQuota.is_admin && (
          <div className="relative w-full max-w-[450px] mx-auto flex justify-end pointer-events-auto">
            <button
              onClick={() => setShowQuotaInfo(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 ${
                voiceState === 'exceeded'
                  ? 'bg-primary/20 text-text-muted'
                  : voiceState === 'urgent'
                  ? 'bg-orange-100 text-orange-600'
                  : voiceState === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-white/80 text-text-muted hover:text-primary'
              } backdrop-blur-sm shadow-sm border border-border-subtle`}
            >
              <span>🎙️</span>
              <span>
                {formatSeconds(voiceQuota.used_seconds)} / {Math.floor(voiceQuota.limit_seconds / 60)}m
              </span>
            </button>

            {/* Tooltip popover — appears when pill is tapped */}
            {showQuotaInfo && (
              <>
                {/* Tap-outside to dismiss */}
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowQuotaInfo(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 z-[70] w-64 bg-primary text-white rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 border border-white/5">
                  <div className="text-[9px] font-bold text-accent uppercase tracking-widest mb-2">Voice Quota</div>
                  <p className="text-sm leading-relaxed font-sans">
                    You've used{' '}
                    <span className={`font-bold ${
                      voiceState === 'exceeded' ? 'text-text-muted'
                      : voiceState === 'urgent' ? 'text-orange-400'
                      : voiceState === 'warning' ? 'text-amber-400'
                      : 'text-accent'
                    }`}>
                      {formatSeconds(voiceQuota.used_seconds)}
                    </span>{' '}
                    of your{' '}
                    <span className="font-bold text-white">
                      {Math.floor(voiceQuota.limit_seconds / 60)} min
                    </span>{' '}
                    free monthly voice quota.{' '}
                    {voiceQuota.remaining_seconds > 0 ? (
                      <>
                        You have{' '}
                        <span className="font-bold text-white">
                          {formatSeconds(voiceQuota.remaining_seconds)}
                        </span>{' '}
                        remaining.
                      </>
                    ) : (
                      <span className="text-rose-400 font-bold">Your quota is fully used.</span>
                    )}
                  </p>
                  {voiceQuota.resets_on && (
                    <p className="text-[10px] text-white/40 mt-2 font-medium">
                      Resets {voiceQuota.resets_on} · Manual keypad always free ✏️
                    </p>
                  )}
                  {/* Downward caret */}
                  <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-primary rotate-45 rounded-sm border-r border-b border-white/5" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 🎙️ Dark Espresso Bottom/Sidebar Voice Dome Overlay */}
      <div className={`
        ${inputMode === 'voice' ? 'flex' : 'hidden lg:flex'}
        fixed bottom-0 left-0 right-0 z-50 bg-primary text-white rounded-t-[48px] px-6 pt-6 pb-10 flex-col items-center gap-5 shadow-[0_-16px_48px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-500
        lg:fixed lg:top-0 lg:left-0 lg:bottom-0 lg:right-auto lg:w-[40%] lg:h-full lg:rounded-none lg:px-8 lg:py-12 lg:justify-center lg:shadow-[16px_0_48px_rgba(0,0,0,0.15)] lg:animate-none
      `}>
        {/* Top Notch Bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mb-1 lg:hidden"></div>

        {/* Time & Recording Status */}
        <div className="flex flex-col items-center gap-1.5">
          {isListening ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">RECORDING VOICE</span>
              </div>
              <span className={`font-serif text-3xl font-bold tracking-tight text-white tabular-nums ${
                recordingSeconds >= recordingLimit - 5 ? 'text-orange-400' : 'text-accent'
              }`}>
                0:{String(recordingSeconds).padStart(2, '0')}
              </span>
            </div>
          ) : isTranscribing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0s]"></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest">AI TRANSLATING...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.22em]">VOICE PORTAL</span>
              <span className="text-xs text-white/50">Ready to record</span>
            </div>
          )}
          
          <p className="text-xs text-white/60 font-sans text-center px-6 truncate max-w-sm">
            {isListening ? (targetedPart ? `Capturing value for: ${getLabel(targetedPart)}` : 'Listening for measurements...') : 'Tap the animation node to start recording'}
          </p>
        </div>

        {/* Central Loop Video / Circular Mic Button */}
        <div className="flex items-center justify-between w-full max-w-xs px-4 mt-2">
          {/* Left side button: Toggle Manual Keypad Mode */}
          <button
            onClick={() => {
              setInputMode('manual');
              setTargetedPart(null);
            }}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-transform flex items-center justify-center border border-white/5 text-lg"
            title="Manual Input Mode"
          >
            ⌨️
          </button>

          {/* Center circular soundwave animation wrapper */}
          <div className="relative">
            <button
              onClick={() => {
                if (voiceState === 'exceeded') {
                  setShowQuotaSheet(true);
                  return;
                }
                setInputMode('voice');
                setTargetedPart(null);
                toggleListening();
              }}
              className={`w-28 h-28 rounded-full flex items-center justify-center p-1.5 transition-all duration-300 relative ${
                isListening
                  ? 'bg-rose-500/20 border-4 border-rose-500 animate-pulse shadow-[0_0_24px_rgba(239,68,68,0.3)]'
                  : 'bg-white/5 border-2 border-accent/40 hover:border-accent shadow-md shadow-primary/20'
              }`}
            >
              <VideoWrapper
                src="/tailor-animation/voice-recognition-animation-gif-download-12817365.mp4"
                containerClassName="w-full h-full rounded-full !rounded-full bg-white overflow-hidden border-none"
                className="w-[90%] h-[90%] object-contain"
              />
            </button>

            {/* Ping Ring for live active listing */}
            {isListening && (
              <div className="absolute -inset-2.5 border-2 border-rose-500/20 rounded-full animate-ping pointer-events-none"></div>
            )}
          </div>

          {/* Right side button: Finalize Session */}
          <button
            onClick={() => setIsSaving(true)}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-transform flex items-center justify-center text-white shadow-lg shadow-emerald-500/10 text-xl font-bold"
            title="Finalize Session"
          >
            ✓
          </button>
        </div>
      </div>

      {/* ⌨️ Manual Mode floating bar */}
      {inputMode === 'manual' && (
        <div className="fixed bottom-6 left-0 lg:left-[40%] right-0 z-50 px-6 pointer-events-none">
          <div className="w-full max-w-[450px] mx-auto bg-white/95 backdrop-blur-md rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.1)] border border-border-subtle px-4 py-2.5 flex items-center justify-between gap-3 pointer-events-auto">
            {/* Toggle voice button */}
            <button
              onClick={() => {
                setInputMode('voice');
                setNumPadPart(null);
              }}
              className="w-10 h-10 rounded-full bg-bg-secondary hover:bg-bg-secondary/80 flex items-center justify-center text-lg active:scale-95 transition-transform border border-border-subtle"
              title="Switch to Voice Mode"
            >
              🎙️
            </button>
            
            <div className="flex-1 text-center text-xs text-text-muted font-medium font-sans">
              Keypad Input Active
            </div>

            {/* Save Button */}
            <button
              onClick={() => setIsSaving(true)}
              className="bg-primary hover:bg-primary/95 text-white px-6 h-10 rounded-full font-bold text-[10px] tracking-wider uppercase active:scale-95 transition-transform shadow-md"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Save Modal (Bottom Sheet / Centered Overlay) */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-primary/45 backdrop-blur-sm" onClick={() => !isSaved && setIsSaving(false)}></div>
          <div className="bg-bg-light w-full lg:max-w-lg lg:rounded-3xl lg:mb-8 rounded-t-[32px] p-8 flex flex-col gap-6 animate-bottom-sheet z-[110] shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar pb-20 border-t border-accent/15">
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto lg:hidden"></div>
            
            <div className="text-center">
              <h3 className="font-serif text-3xl font-bold text-primary">Finalize Session</h3>
              <p className="text-[11px] font-bold text-accent uppercase tracking-widest mt-2">{currentSession?.customerName}</p>
            </div>

            {/* Session Summary Card */}
            <div className="bg-bg-secondary/40 rounded-[24px] p-5 space-y-3 border border-border-subtle shadow-inner">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-3">Atelier Overview</p>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted font-medium">Client</span>
                <span className="text-sm font-bold text-primary font-serif">{currentSession?.customerName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted font-medium">Garments</span>
                <span className="text-sm font-bold text-primary">{currentSession?.garments.join(', ')}</span>
              </div>

              {currentSession?.garments.map(garment => {
                const count = Object.keys(measurementsByGarment[garment] || {}).length;
                const total = garmentTemplates.find(t => t.name === garment)?.parts.length || 0;
                return (
                  <div key={garment} className="flex justify-between items-center">
                    <span className="text-sm text-text-muted font-medium">{garment}</span>
                    <span className={`text-sm font-bold ${count >= total ? 'text-emerald-600' : 'text-accent'}`}>
                      {count}/{total} fields filled
                    </span>
                  </div>
                );
              })}

              {(currentSession?.totalCost ?? 0) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                  <span className="text-sm text-text-muted font-medium">Total Cost</span>
                  <span className="text-sm font-bold text-primary font-sans">₦{(currentSession?.totalCost ?? 0).toLocaleString()}</span>
                </div>
              )}
              
              {(currentSession?.amountPaid ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted font-medium">Deposit Paid</span>
                  <span className="text-sm font-bold text-emerald-600 font-sans">₦{(currentSession?.amountPaid ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {/* Style Reference Photo Uploads */}
            <div className="space-y-3 mt-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] block">Style References</span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {stylePhotos.map((url, idx) => (
                  <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-border-subtle relative group shadow-sm">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setStylePhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-primary/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                {stylePhotos.length < 3 && (
                  <div onClick={() => styleInputRef.current?.click()} className="w-24 h-24 bg-bg-secondary/40 rounded-2xl border-2 border-dashed border-border-subtle flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-accent/40 hover:bg-bg-secondary/60 transition-colors">
                    {isUploading === 'style' ? <div className="animate-spin text-xl">⌛</div> : <span className="text-2xl opacity-50">📸</span>}
                  </div>
                )}
                <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'style')} />
              </div>
            </div>

            {/* Fabric Samples Photo Uploads */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] block">Fabric Samples</span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {clothPhotos.map((url, idx) => (
                  <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-border-subtle relative group shadow-sm">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setClothPhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-primary/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                {clothPhotos.length < 3 && (
                  <div onClick={() => clothInputRef.current?.click()} className="w-24 h-24 bg-bg-secondary/40 rounded-2xl border-2 border-dashed border-border-subtle flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-accent/40 hover:bg-bg-secondary/60 transition-colors">
                    {isUploading === 'cloth' ? <div className="animate-spin text-xl">⌛</div> : <span className="text-2xl opacity-50">🧵</span>}
                  </div>
                )}
                <input type="file" ref={clothInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'cloth')} />
              </div>
            </div>

            {/* Main Action Button */}
            <button 
              onClick={handleSaveToBackend} 
              disabled={isSaved} 
              className={`mt-4 w-full h-16 rounded-full font-bold text-sm tracking-widest uppercase transition-all shadow-lg flex items-center justify-center border ${
                !isSaved 
                  ? 'bg-primary text-white hover:bg-primary/95 border-primary shadow-primary/10' 
                  : 'bg-bg-secondary/80 text-accent border-accent/25 shadow-none'
              }`}
            >
              {isSaved ? '✓ ARCHIVED IN ATELIER' : 'ARCHIVE JOB'}
            </button>

            {isSaved && (
              <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                <p className="text-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Securely Logged — Share with Client:
                </p>

                {/* Share Card Button */}
                <button
                  onClick={async () => {
                    if (!currentSession) return;
                    setIsSharing(true);
                    try {
                      await shareMeasurementCard({
                        customerName: currentSession.customerName,
                        shopName,
                        garments: currentSession.garments,
                        measurementsByGarment,
                        getLabel,
                        unit,
                        deliveryDate: currentSession.deadline,
                        totalCost: currentSession.totalCost,
                        amountPaid: currentSession.amountPaid,
                      });
                    } catch (e) { /* Share canceled */ }
                    finally { setIsSharing(false); }
                  }}
                  disabled={isSharing}
                  className="w-full h-14 bg-accent text-primary rounded-full font-bold text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
                >
                  {isSharing ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  )}
                  {isSharing ? 'Generating Card...' : 'Send Measurement Card'}
                </button>

                {/* Google Calendar Link */}
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-white border border-border-subtle text-primary rounded-full font-bold text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 shadow-sm hover:border-accent transition-all active:scale-[0.98] text-center"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Add to Google Calendar
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NumPad manual popup overlay */}
      {numPadPart && (
        <NumPad
          activePart={numPadPart}
          currentValue={activeMeasurements[numPadPart]}
          unit={unit}
          onConfirm={handleNumPadConfirm}
          onNext={handleNumPadNext}
          onClear={handleNumPadClear}
          onClose={() => setNumPadPart(null)}
        />
      )}

      {/* Voice Quota Exceeded Sheet */}
      {showQuotaSheet && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowQuotaSheet(false)}></div>
          <div className="bg-bg-light w-full lg:max-w-md lg:rounded-3xl lg:mb-8 rounded-t-[32px] p-8 flex flex-col gap-4 animate-bottom-sheet z-[110] shadow-2xl pb-12 border-t border-accent/15">
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto lg:hidden"></div>
            <div className="text-center">
              <div className="w-16 h-16 bg-bg-secondary/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-subtle text-2xl">
                🔒
              </div>
              <h3 className="font-serif text-2xl font-bold text-primary">Voice Limit Reached</h3>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                You've used all 15 minutes of your free monthly voice quota.
              </p>
              {voiceQuota.resets_on && (
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-3">
                  Resets on {voiceQuota.resets_on}
                </p>
              )}
            </div>
            <div className="bg-bg-secondary/40 rounded-2xl p-4 text-center border border-border-subtle">
              <p className="text-sm font-bold text-primary">✏️ Manual keypad is free & unlimited</p>
              <p className="text-xs text-text-muted mt-1">Tap any measurement row to enter numbers manually</p>
            </div>
            <button
              onClick={() => {
                setShowQuotaSheet(false);
                setInputMode('manual');
              }}
              className="w-full h-14 bg-primary hover:bg-primary/95 text-white rounded-full font-bold uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all"
            >
              Switch to Manual Keypad
            </button>
          </div>
        </div>
      )}

      {/* Add Garment Modal */}
      {isAddingGarment && currentSession && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsAddingGarment(false)}></div>
          <div className="bg-bg-light w-full lg:max-w-md lg:rounded-3xl lg:mb-8 rounded-t-[32px] p-8 flex flex-col gap-6 animate-bottom-sheet z-[110] shadow-2xl pb-12 border-t border-accent/15">
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto lg:hidden"></div>
            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold text-primary">Add Garment</h3>
              <p className="text-[11px] font-bold text-accent uppercase tracking-widest mt-2">To {currentSession.customerName}'s Job</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              {garmentTemplates
                .filter(t => t.recommendedFor.includes(currentSession.gender || 'male'))
                .map(t => t.name)
                .filter(g => !currentSession.garments.includes(g))
                .map(garment => (
                  <button
                    key={garment}
                    onClick={() => {
                      addGarmentToSession(garment);
                      setActiveTabIdx(currentSession.garments.length);
                      setIsAddingGarment(false);
                    }}
                    className="h-14 flex items-center justify-center bg-white border border-border-subtle rounded-xl shadow-sm hover:border-accent hover:text-primary transition-all duration-300 font-bold text-sm text-text-muted"
                  >
                    + {garment}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Part Modal */}
      {isAddingCustomPart && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsAddingCustomPart(false)}></div>
          <div className="bg-bg-light w-full lg:max-w-md lg:rounded-3xl lg:mb-8 rounded-t-[32px] p-8 flex flex-col gap-6 animate-bottom-sheet z-[110] shadow-2xl pb-12 border-t border-accent/15">
            <div className="w-12 h-1.5 bg-border-subtle rounded-full mx-auto lg:hidden"></div>
            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold text-primary">Custom Field</h3>
              <p className="text-[11px] font-bold text-accent uppercase tracking-widest mt-2">Add a custom body part measurement</p>
            </div>
            
            <div className="mt-2 space-y-4">
              <input 
                type="text" 
                value={newCustomPart}
                onChange={e => setNewCustomPart(e.target.value)}
                placeholder="e.g., Elbow Width, Cuff..."
                className="w-full h-14 bg-bg-secondary/45 rounded-xl border border-border-subtle px-4 text-lg font-medium outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-primary"
                autoFocus
              />
              <button
                disabled={!newCustomPart.trim()}
                onClick={() => {
                  const safePart = newCustomPart.trim().toLowerCase().replace(/\s+/g, '_');
                  addCustomPart(safePart);
                  setNewCustomPart('');
                  setIsAddingCustomPart(false);
                }}
                className="w-full h-14 bg-primary text-white rounded-xl font-bold uppercase tracking-widest disabled:opacity-50 disabled:bg-primary/20 transition-all shadow-md"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Help Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md" onClick={() => setShowHelp(false)}></div>
          <div className="bg-bg-light w-full max-w-sm rounded-[40px] p-8 relative animate-in zoom-in-95 duration-300 shadow-2xl border border-accent/10">
            <h3 className="font-serif text-3xl font-bold text-primary mb-2">Speak to Atelier</h3>
            <p className="text-text-muted text-sm mb-8 font-medium font-sans">Natural voice dictation guides your hands.</p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-bg-secondary text-accent flex items-center justify-center flex-shrink-0 font-bold border border-border-subtle">1</div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Standard Capture</p>
                  <p className="text-primary font-bold font-sans">"Waist 34", "Shoulder 20"</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-bg-secondary text-accent flex items-center justify-center flex-shrink-0 font-bold border border-border-subtle">2</div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Navigation Commands</p>
                  <p className="text-primary font-bold font-sans">"Next", "Clear Waist", "Finish"</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-bg-secondary text-accent flex items-center justify-center flex-shrink-0 font-bold border border-border-subtle">3</div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Inline Custom addition</p>
                  <p className="text-primary font-bold font-sans">"Add Neck Drop 5"</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="mt-10 w-full h-14 bg-primary text-white rounded-full font-bold uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Success Celebration Overlay */}
      {isSaved && (
        <div className="fixed inset-0 z-[300] bg-primary flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-accent rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="w-24 h-24 rounded-full border-4 border-accent flex items-center justify-center text-accent relative animate-in zoom-in duration-700">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
          <h2 className="font-serif text-4xl font-bold text-white mb-2 text-center">Atelier Success</h2>
          <p className="text-accent text-[11px] font-bold uppercase tracking-[0.3em] text-center mb-8">
            {currentSession?.customerName}'s Data Secured
          </p>
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-accent animate-progress-cycle"></div>
          </div>
        </div>
      )}
    </div>
  );
};

