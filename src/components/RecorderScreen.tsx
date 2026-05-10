import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhisper } from '../hooks/useWhisper';
import { parseMeasurements } from '../utils/parser';
import { RecordingButton } from './RecordingButton';
import { NumPad } from './NumPad';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { playCaptureSound } from '../utils/soundUtils';
import { shareMeasurementCard } from '../utils/shareCard';

export const RecorderScreen: React.FC = () => {
  const { isListening, isTranscribing, transcript, toggleListening, clearTranscript } = useWhisper();
  const { unit, shopName, getLabel, findPartByLabel, currentSession, clearSession, updateSessionMeasurements, addGarmentToSession, removeGarmentFromSession, addCustomPart, customParts, garmentTemplates, refreshSessions } = useAppContext();
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
  const [numPadPart, setNumPadPart] = useState<string | null>(null);
  
  // Just Captured UI state
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [noMatchHint, setNoMatchHint] = useState(false);

  const [stylePhotos, setStylePhotos] = useState<string[]>([]);
  const [clothPhotos, setClothPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<'style' | 'cloth' | null>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  const activeGarmentName = currentSession?.garments[activeTabIdx] || '';
  const currentTemplate = garmentTemplates.find(t => t.name === activeGarmentName);
  const activeParts = currentTemplate ? Array.from(new Set([...currentTemplate.parts, ...customParts])) : [];
  const activeMeasurements = measurementsByGarment[activeGarmentName] || {};

  useEffect(() => {
    if (inputMode !== 'voice' || !transcript || !activeGarmentName) return;
    
    // Show the transcript preview in the UI
    setLastTranscript(transcript);
    
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
    } else {
      // ✅ FIX #4: Show hint when speech heard but no measurement parsed
      setNoMatchHint(true);
      setTimeout(() => setNoMatchHint(false), 4000);
    }

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
          data: measurementsByGarment,
          transcript,
          unit,
          shop_id: shopName,
          style_photos: [...stylePhotos, ...(currentSession.photos || [])],
          cloth_photos: clothPhotos,
          total_cost: currentSession.totalCost,
          amount_paid: currentSession.amountPaid,
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
      }
    } catch { alert('Backend Error.'); }
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
  const bgTheme = currentSession?.gender === 'female' ? 'bg-[#FFF1F2]' : currentSession?.gender === 'male' ? 'bg-[#EFF6FF]' : 'bg-[#FDFDFD]';

  return (
    <div className={`flex flex-col relative pb-40 min-h-full transition-colors duration-500 ${bgTheme}`}>
      
      {currentSession && (
        <div className="px-6 pt-8 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                NOW RECORDING
              </p>
              <h2 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">{currentSession.customerName} Session</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowHelp(true)}
                className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#0F172A] transition-all shadow-sm"
              >
                <span className="text-lg font-bold">?</span>
              </button>
              <button onClick={() => { if(window.confirm('Cancel current job?')) clearSession() }} className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-white/50 px-4 py-2 rounded-full border border-red-100 shadow-sm active:scale-95">
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
                        ? 'bg-[#0F172A] border-[#0F172A] text-white' 
                        : 'bg-white border-white text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span className="font-bold text-sm tracking-wide">{garment}</span>
                    {isComplete && <span className="bg-green-400 w-2 h-2 rounded-full"></span>}
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
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm hover:bg-red-200 transition-colors"
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
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 border-dashed bg-white/50 text-gray-500 hover:bg-white hover:text-[#0F172A] hover:border-[#0F172A] transition-all duration-300 shadow-sm"
            >
              <span className="font-bold text-sm tracking-wide">+ Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Measurement List (Floating Cards) */}
      <div className="px-6 py-2">
        
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Measurements ({unit})</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{filledCount}/{activeParts.length} Filled</span>
        </div>

        <div className="space-y-3">
          {activeParts.map((part) => {
            const value = activeMeasurements[part];
            const isManualActive = numPadPart === part;
            const isJustCaptured = lastCaptured === part;
            
            return (
              <div
                key={part}
                onClick={() => setNumPadPart(part)}
                className={`w-full px-6 py-5 flex justify-between items-center transition-all duration-300 cursor-pointer 
                  ${isJustCaptured ? 'animate-capture-pulse' : ''}
                  ${value 
                    ? 'bg-white rounded-xl shadow-sm border border-white' 
                    : isManualActive
                      ? 'bg-white rounded-xl shadow-md border border-[#0F172A]'
                      : 'bg-transparent border-2 border-dashed border-gray-300/50 rounded-xl hover:border-gray-400/50'}
                `}
              >
                <div>
                  <span className={`capitalize text-sm font-bold tracking-wide select-none transition-colors 
                    ${value ? 'text-[#0F172A]' : 'text-gray-400 italic'}`}
                  >
                    {getLabel(part)}
                  </span>
                  {/* The 'Just Captured' Indicator */}
                  {isJustCaptured && (
                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-0.5 animate-pulse">
                      Just Captured
                    </p>
                  )}
                </div>
                
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold transition-all ${value ? 'text-[#0F172A]' : 'text-gray-300'}`}>
                    {value || '--'}
                  </span>
                  <span className={`text-[12px] font-bold uppercase tracking-widest ${value ? 'text-[#0F172A]' : 'text-gray-300'}`}>
                    {unit}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Add Custom Measurement Button */}
          <button 
            onClick={() => setIsAddingCustomPart(true)}
            className="w-full px-6 py-4 flex items-center justify-center bg-transparent border-2 border-dashed border-gray-200 rounded-xl hover:border-[#0F172A] hover:text-[#0F172A] transition-all duration-300 text-gray-400"
          >
            <span className="text-[11px] font-bold uppercase tracking-widest">+ Add Custom Measurement</span>
          </button>

        </div>
      </div>

      {/* Floating Action Buttons Area */}
      <div className="fixed bottom-[110px] left-0 right-0 px-6 flex justify-between items-end z-40 pointer-events-none">
        
        {/* Toggle Mode */}
        <div className="pointer-events-auto flex flex-col gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-gray-100 shadow-lg">
          <button onClick={() => setInputMode('voice')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${inputMode === 'voice' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>🎙️</button>
          <button onClick={() => setInputMode('manual')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${inputMode === 'manual' ? 'bg-[#0F172A] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>⌨️</button>
        </div>

        {/* Voice Mic or Manual Save */}
        <div className="pointer-events-auto relative">
          {inputMode === 'voice' && isListening && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1">
              <div className="w-1 h-4 bg-[#0F172A]/40 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
              <div className="w-1.5 h-6 bg-[#0F172A]/60 rounded-full animate-[pulse_1s_ease-in-out_infinite_0.2s]"></div>
              <div className="w-1.5 h-8 bg-[#0F172A] rounded-full animate-[pulse_1s_ease-in-out_infinite_0.4s]"></div>
              <div className="w-1.5 h-6 bg-[#0F172A]/60 rounded-full animate-[pulse_1s_ease-in-out_infinite_0.2s]"></div>
              <div className="w-1 h-4 bg-[#0F172A]/40 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
            </div>
          )}

          {inputMode === 'voice' && isTranscribing && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center whitespace-nowrap">
              <div className="flex gap-1 mb-1">
                <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest">A.I. Thinking...</span>
            </div>
          )}

          {/* Transcript Preview Bubble */}
          {inputMode === 'voice' && lastTranscript && !isTranscribing && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[80vw] max-w-[300px] animate-in fade-in zoom-in duration-300">
              <div className={`backdrop-blur-xl text-white px-5 py-3 rounded-[24px] shadow-2xl border text-center ${
                noMatchHint 
                  ? 'bg-amber-600/90 border-amber-400/20' 
                  : 'bg-[#0F172A]/90 border-white/10'
              }`}>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest block mb-1">
                  {noMatchHint ? '⚠️ No measurement found' : 'I heard:'}
                </span>
                <p className="text-xs font-medium leading-relaxed italic">"{lastTranscript}"</p>
                {noMatchHint && (
                  <p className="text-[10px] text-amber-200 mt-1.5">Try: "Waist 34" or "Chest 42"</p>
                )}
              </div>
              {/* Little arrow tip */}
              <div className={`w-3 h-3 rotate-45 mx-auto -mt-1.5 border-r border-b ${noMatchHint ? 'bg-amber-600/90 border-amber-400/20' : 'bg-[#0F172A]/90 border-white/10'}`}></div>
            </div>
          )}

          {inputMode === 'voice' ? (
            <div className={`transform origin-bottom hover:scale-105 transition-all ${isTranscribing ? 'opacity-50 grayscale' : ''}`}>
               <RecordingButton isListening={isListening} onClick={toggleListening} />
            </div>
          ) : (
            <button onClick={() => setIsSaving(true)} className="bg-[#D4AF37] text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest shadow-[0_8px_24px_rgba(212,175,55,0.4)] hover:bg-[#b38f55] transition-colors">
              Save Job
            </button>
          )}
        </div>

        {/* Voice Save */}
        {inputMode === 'voice' && (
          <button onClick={() => setIsSaving(true)} className="pointer-events-auto bg-white/90 backdrop-blur-md text-[#0F172A] w-14 h-14 rounded-full flex items-center justify-center shadow-lg border border-gray-100 font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors">
            SAVE
          </button>
        )}
      </div>

      {/* Save Modal (Bottom Sheet) */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaved && setIsSaving(false)}></div>
          <div className="bg-white w-full rounded-t-[32px] p-8 flex flex-col gap-6 animate-bottom-sheet z-[110] shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar pb-20">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto"></div>
            
            <div className="text-center">
              <h3 className="font-serif text-3xl font-bold text-gray-900">Finalize</h3>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2">{currentSession?.customerName}</p>
            </div>

            {/* ✅ FIX #8: Save Confirmation Summary */}
            <div className="bg-[#F8F9FA] rounded-[24px] p-5 space-y-3 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Session Summary</p>
              
              {/* Client & Garments */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Client</span>
                <span className="text-sm font-bold text-gray-900">{currentSession?.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Garments</span>
                <span className="text-sm font-bold text-gray-900">{currentSession?.garments.join(', ')}</span>
              </div>

              {/* Measurements filled count per garment */}
              {currentSession?.garments.map(garment => {
                const count = Object.keys(measurementsByGarment[garment] || {}).length;
                const total = garmentTemplates.find(t => t.name === garment)?.parts.length || 0;
                return (
                  <div key={garment} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-medium">{garment}</span>
                    <span className={`text-sm font-bold ${count >= total ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {count}/{total} measurements
                    </span>
                  </div>
                );
              })}

              {/* Cost */}
              {(currentSession?.totalCost ?? 0) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-500 font-medium">Total Cost</span>
                  <span className="text-sm font-bold text-gray-900">₦{(currentSession?.totalCost ?? 0).toLocaleString()}</span>
                </div>
              )}
              {(currentSession?.amountPaid ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Deposit Paid</span>
                  <span className="text-sm font-bold text-emerald-600">₦{(currentSession?.amountPaid ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {/* Photo Uploads */}
            <div className="space-y-3 mt-4">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block">Style References</span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {stylePhotos.map((url, idx) => (
                  <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 relative group">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setStylePhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                {stylePhotos.length < 3 && (
                  <div onClick={() => styleInputRef.current?.click()} className="w-24 h-24 bg-[#F8F9FA] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-[#0F172A] hover:bg-gray-50 transition-colors">
                    {isUploading === 'style' ? <div className="animate-spin text-xl">⌛</div> : <span className="text-2xl opacity-50">📸</span>}
                  </div>
                )}
                <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'style')} />
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block">Fabric Samples</span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {clothPhotos.map((url, idx) => (
                  <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 relative group">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setClothPhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                {clothPhotos.length < 3 && (
                  <div onClick={() => clothInputRef.current?.click()} className="w-24 h-24 bg-[#F8F9FA] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-[#0F172A] hover:bg-gray-50 transition-colors">
                    {isUploading === 'cloth' ? <div className="animate-spin text-xl">⌛</div> : <span className="text-2xl opacity-50">🧵</span>}
                  </div>
                )}
                <input type="file" ref={clothInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'cloth')} />
              </div>
            </div>

            <button onClick={handleSaveToBackend} disabled={isSaved} className={`mt-6 w-full h-16 rounded-full font-bold text-sm tracking-widest uppercase transition-all shadow-lg flex items-center justify-center ${!isSaved ? 'bg-[#0F172A] text-white hover:bg-black' : 'bg-[#ECFDF5] text-[#059669] shadow-none'}`}>
              {isSaved ? '✓ ARCHIVED SUCCESSFULLY' : 'ARCHIVE JOB'}
            </button>

            {isSaved && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Archived ✔ — Share with your client:
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
                    } catch (e) { /* User cancelled share */ }
                    finally { setIsSharing(false); }
                  }}
                  disabled={isSharing}
                  className="w-full h-14 bg-[#D4AF37] text-[#0F172A] rounded-full font-bold text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
                >
                  {isSharing ? (
                    <div className="w-4 h-4 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  )}
                  {isSharing ? 'Generating Card...' : 'Send Measurement Card'}
                </button>

                {/* Google Calendar Button */}
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-white border-2 border-gray-100 text-gray-900 rounded-full font-bold text-[11px] tracking-widest uppercase flex items-center justify-center gap-3 shadow-sm hover:border-[#0F172A] transition-all active:scale-95"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* NumPad */}
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

      {/* Add Garment Modal */}
      {isAddingGarment && currentSession && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddingGarment(false)}></div>
          <div className="bg-white w-full rounded-t-[32px] p-8 flex flex-col gap-6 animate-bottom-sheet z-[110] shadow-2xl pb-12">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto"></div>
            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold text-gray-900">Add Garment</h3>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2">To {currentSession.customerName}'s Job</p>
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
                      setActiveTabIdx(currentSession.garments.length); // Will switch to the new tab
                      setIsAddingGarment(false);
                    }}
                    className="h-14 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#0F172A] hover:text-[#0F172A] transition-all duration-300 font-bold text-sm text-gray-700"
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddingCustomPart(false)}></div>
          <div className="bg-white w-full rounded-t-[32px] p-8 flex flex-col gap-6 animate-bottom-sheet z-[110] shadow-2xl pb-12">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto"></div>
            <div className="text-center">
              <h3 className="font-serif text-2xl font-bold text-gray-900">Custom Measurement</h3>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2">Add a specific body part</p>
            </div>
            
            <div className="mt-2 space-y-4">
              <input 
                type="text" 
                value={newCustomPart}
                onChange={e => setNewCustomPart(e.target.value)}
                placeholder="e.g., Elbow, Inseam..."
                className="w-full h-14 bg-[#F8F9FA] rounded-xl border border-gray-200 px-4 text-lg font-medium outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all"
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
                className="w-full h-14 bg-[#0F172A] text-white rounded-xl font-bold uppercase tracking-widest disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-md"
              >
                Add Measurement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Help Overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md" onClick={() => setShowHelp(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 relative animate-in zoom-in-95 duration-300 shadow-2xl">
            <h3 className="font-serif text-3xl font-bold text-gray-900 mb-2">Speak to Atelier</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium">Your AI assistant is listening for your intent.</p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Standard Capture</p>
                  <p className="text-gray-700 font-bold">"Waist 34", "Shoulder 20"</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Voice Commands</p>
                  <p className="text-gray-700 font-bold">"Next", "Clear Waist", "Finish"</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Add Custom Parts</p>
                  <p className="text-gray-700 font-bold">"Add Neck Drop 5"</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowHelp(false)}
              className="mt-10 w-full h-14 bg-[#0F172A] text-white rounded-full font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {/* Success Celebration Overlay */}
      {isSaved && (
        <div className="fixed inset-0 z-[300] bg-[#0F172A] flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="w-24 h-24 rounded-full border-4 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] relative animate-in zoom-in duration-700">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
          <h2 className="font-serif text-4xl font-bold text-white mb-2 text-center">Atelier Success</h2>
          <p className="text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.3em] text-center mb-8">
            {currentSession?.customerName}'s Data Secured
          </p>
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#D4AF37] animate-progress-fast"></div>
          </div>
        </div>
      )}
    </div>
  );
};
