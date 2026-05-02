import React, { useState, useEffect, useRef } from 'react';
import { useWhisper } from './hooks/useWhisper';
import { parseMeasurements, MEASUREMENT_PARTS } from './utils/parser';
import { RecordingButton } from './components/RecordingButton';
import { HistoryView } from './components/HistoryView';
import { NumPad } from './components/NumPad';
import { exportToPDF } from './utils/export';
import { useLabels } from './hooks/useLabels';
import { useShopIdentity } from './hooks/useShopIdentity';

const App: React.FC = () => {
  const { isListening, transcript, toggleListening, clearTranscript } = useWhisper();

  const [activeNav, setActiveNav] = useState<'recorder' | 'history' | 'settings'>('recorder');
  const [inputMode, setInputMode] = useState<'voice' | 'manual'>('voice');
  const [finalMeasurements, setFinalMeasurements] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const { shopName, saveShopName, isSetup } = useShopIdentity();
  const [shopInput, setShopInput] = useState('');
  const { getLabel, renameLabel, resetLabel, resetAllLabels, findPartByLabel, hasCustomLabel, customLabels, allParts, addCustomPart, removeCustomPart } = useLabels();

  // NumPad state
  const [numPadPart, setNumPadPart] = useState<string | null>(null);
  // Inline rename state (Option 1)
  const [renamingPart, setRenamingPart] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  // Add new label state
  const [addingLabel, setAddingLabel] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');

  // Photo State
  const [stylePhotos, setStylePhotos] = useState<string[]>([]);
  const [clothPhotos, setClothPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<'style' | 'cloth' | null>(null);

  const styleInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('https://tailor-backend-9ilv.onrender.com/api/customers')
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, [activeNav]);

  // Voice Mode: also match custom labels in transcript
  useEffect(() => {
    if (inputMode !== 'voice' || !transcript) return;
    const { structured, standaloneNumbers } = parseMeasurements(transcript);
    // Also check custom labels in the raw transcript
    const words = transcript.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const matchedPart = findPartByLabel(words[i]);
      const num = parseFloat(words[i + 1]);
      if (matchedPart && !isNaN(num)) structured[matchedPart] = num;
    }
    setFinalMeasurements(prev => {
      const next = { ...prev, ...structured };
      if (standaloneNumbers.length > 0) {
        let idx = 0;
        for (const part of MEASUREMENT_PARTS) {
          if (idx >= standaloneNumbers.length) break;
          if (!next[part]) { next[part] = standaloneNumbers[idx]; idx++; }
        }
      }
      return next;
    });
  }, [transcript, inputMode]);

  // NumPad: Clear a single measurement value
  const handleNumPadClear = () => {
    if (!numPadPart) return;
    setFinalMeasurements(p => {
      const next = { ...p };
      delete next[numPadPart];
      return next;
    });
    setNumPadPart(null);
  };

  // NumPad: Confirm value for a part
  const handleNumPadConfirm = (value: number) => {
    if (!numPadPart) return;
    setFinalMeasurements(p => ({ ...p, [numPadPart]: value }));
    setNumPadPart(null);
  };

  // NumPad: Confirm value and advance to next part
  const handleNumPadNext = (value: number) => {
    if (!numPadPart) return;
    setFinalMeasurements(p => ({ ...p, [numPadPart]: value }));
    const currentIdx = MEASUREMENT_PARTS.indexOf(numPadPart);
    const nextPart = MEASUREMENT_PARTS[currentIdx + 1];
    setNumPadPart(nextPart || null);
  };

  // Open NumPad (only in manual mode)
  const handleCardTap = (part: string) => {
    if (inputMode === 'manual') setNumPadPart(part);
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
    if (!customerName) return;
    try {
      const res = await fetch('https://tailor-backend-9ilv.onrender.com/api/measurements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Shop-ID': shopName,
        },
        body: JSON.stringify({
          customer_name: customerName,
          data: finalMeasurements,
          transcript,
          unit,
          shop_id: shopName,
          style_photos: stylePhotos,
          cloth_photos: clothPhotos,
        }),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => {
          setIsSaved(false); setIsSaving(false);
          setFinalMeasurements({}); setCustomerName('');
          setStylePhotos([]); setClothPhotos([]);
          clearTranscript();
        }, 1500);
      }
    } catch { alert('Backend Error.'); }
  };

  const hasData = Object.keys(finalMeasurements).length > 0;
  const nextExpectedPart = allParts.find(p => !finalMeasurements[p]);
  const filledCount = Object.keys(finalMeasurements).length;

  // First-launch: show shop name prompt
  if (!isSetup) {
    return (
      <div className="h-screen flex items-end justify-center bg-[#FDFDFD]">
        <div className="bg-white w-full rounded-t-[48px] p-10 flex flex-col gap-6 shadow-2xl animate-bottom-sheet">
          <div className="text-center">
            <span className="text-4xl block mb-4">🧵</span>
            <h2 className="text-3xl font-black tracking-tight">Welcome to TailorVoice</h2>
            <p className="text-gray-400 text-sm font-medium mt-2">Enter your shop name to get started.<br/>This keeps your records private.</p>
          </div>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Emman's Tailors..."
            value={shopInput}
            onChange={e => setShopInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && shopInput.trim()) saveShopName(shopInput); }}
            className="w-full bg-gray-50 border-b-4 border-primary/20 py-4 text-2xl outline-none focus:border-primary transition-colors font-bold text-center"
          />
          <button
            onClick={() => { if (shopInput.trim()) saveShopName(shopInput); }}
            disabled={!shopInput.trim()}
            className={`py-5 rounded-[32px] font-black text-sm tracking-widest uppercase transition-all ${
              shopInput.trim() ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-300'
            }`}
          >
            Enter My Workshop →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#FDFDFD] text-[#1A1A1A] overflow-hidden font-sans relative">

      {/* Header */}
      <header className="px-6 py-5 bg-white flex justify-between items-center border-b border-gray-50 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight">TailorVoice</h1>
        </div>
        <div className="flex bg-gray-50 p-1 rounded-xl">
          <button onClick={() => setUnit('in')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${unit === 'in' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}>IN</button>
          <button onClick={() => setUnit('cm')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${unit === 'cm' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}>CM</button>
        </div>
      </header>

      <main className="flex-1 relative overflow-y-auto custom-scrollbar pb-32">
        {activeNav === 'history' ? (
          <div className="p-6"><HistoryView shopName={shopName} /></div>
        ) : activeNav === 'settings' ? (
          <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">System Status</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Backend Server</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${backendStatus === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{backendStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* Option 2: My Labels Management */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">My Labels</h3>
                {Object.keys(customLabels).length > 0 && (
                  <button onClick={resetAllLabels} className="text-[9px] font-black text-red-400 uppercase tracking-widest">Reset Names</button>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {allParts.map(part => (
                  <div key={part} className="px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {!MEASUREMENT_PARTS.includes(part) && (
                        <span className="text-[8px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded uppercase">Custom</span>
                      )}
                      <span className="text-[9px] font-bold text-gray-300 uppercase w-16 truncate">{part}</span>
                      <span className="text-[9px] text-gray-200">→</span>
                      {renamingPart === part ? (
                        <input
                          autoFocus
                          value={renameInput}
                          onChange={e => setRenameInput(e.target.value)}
                          onBlur={() => { renameLabel(part, renameInput); setRenamingPart(null); }}
                          onKeyDown={e => { if (e.key === 'Enter') { renameLabel(part, renameInput); setRenamingPart(null); } if (e.key === 'Escape') setRenamingPart(null); }}
                          className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg outline-none border border-primary/20 w-28"
                        />
                      ) : (
                        <span className={`text-sm font-bold capitalize ${hasCustomLabel(part) ? 'text-primary' : 'text-gray-400'}`}>
                          {getLabel(part)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setRenamingPart(part); setRenameInput(getLabel(part)); }} className="text-[9px] font-black text-gray-300 uppercase hover:text-primary transition-colors">✏️</button>
                      {hasCustomLabel(part) && <button onClick={() => resetLabel(part)} className="text-[9px] font-black text-red-300 uppercase">↩</button>}
                      {!MEASUREMENT_PARTS.includes(part) && (
                        <button onClick={() => removeCustomPart(part)} className="text-[9px] font-black text-red-400 uppercase">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Add New Label */}
              <div className="px-6 py-4 border-t border-gray-50">
                {addingLabel ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newLabelInput}
                      onChange={e => setNewLabelInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newLabelInput.trim()) { addCustomPart(newLabelInput); setNewLabelInput(''); setAddingLabel(false); }
                        if (e.key === 'Escape') { setAddingLabel(false); setNewLabelInput(''); }
                      }}
                      placeholder="e.g. Neck Drop..."
                      className="flex-1 bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold outline-none border border-primary/20"
                    />
                    <button
                      onClick={() => { if (newLabelInput.trim()) { addCustomPart(newLabelInput); setNewLabelInput(''); setAddingLabel(false); } }}
                      className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                    >Add</button>
                    <button onClick={() => { setAddingLabel(false); setNewLabelInput(''); }} className="text-gray-300 px-2 text-lg">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingLabel(true)}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-100 text-[10px] font-black text-gray-300 uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all"
                  >
                    + Add New Label
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-white border border-red-50 text-red-500 font-bold rounded-2xl">Factory Reset</button>
          </div>
        ) : (
          <div className="flex flex-col">

            {/* 🎛️ Mode Toggle */}
            <div className="px-6 pt-6">
              <div className="flex bg-gray-100/60 p-1.5 rounded-[20px] border border-gray-100">
                <button
                  onClick={() => setInputMode('voice')}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-[15px] transition-all ${inputMode === 'voice' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                >
                  <span>🎙️</span> Voice
                </button>
                <button
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-[15px] transition-all ${inputMode === 'manual' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                >
                  <span>⌨️</span> Manual
                </button>
              </div>
            </div>

            {/* Voice Mode: Live Transcript Monitor */}
            {inputMode === 'voice' && (
              <div className="px-6 pt-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm min-h-[90px] flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-widest text-primary font-black">Live Translation</label>
                    {(transcript || hasData) && (
                      <div className="flex gap-4">
                        <button onClick={() => setIsSaving(true)} className="text-[10px] text-primary font-black tracking-widest">SAVE</button>
                        <button onClick={clearTranscript} className="text-[10px] text-gray-300 font-bold">RESET</button>
                      </div>
                    )}
                  </div>
                  <p className="text-lg text-gray-400 font-light leading-snug">
                    {transcript || <span className="opacity-20 italic text-sm">Speak values to fill the list...</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Manual Mode: Progress Bar */}
            {inputMode === 'manual' && (
              <div className="px-6 pt-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Progress</span>
                    <div className="flex items-center gap-4">
                      {hasData && (
                        <button
                          onClick={() => { if (window.confirm('Reset all measurements?')) { setFinalMeasurements({}); clearTranscript(); } }}
                          className="text-[10px] font-black text-red-400 uppercase tracking-widest"
                        >
                          RESET ALL
                        </button>
                      )}
                      {hasData && <button onClick={() => setIsSaving(true)} className="text-[10px] text-primary font-black tracking-widest">SAVE</button>}
                      <span className="text-[10px] font-black text-gray-400">{filledCount} / {allParts.length}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(filledCount / allParts.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-2">
                    {filledCount === allParts.length ? '✓ All measurements filled' : `Tap a card below to enter a value`}
                  </p>
                </div>
              </div>
            )}

            {/* Measurement List */}
            <div className="px-6 py-4">
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Measurements ({unit.toUpperCase()})</span>
                  {inputMode === 'voice' && nextExpectedPart && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                      <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Waiting: {nextExpectedPart}</span>
                    </div>
                  )}
                  {inputMode === 'manual' && (
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Tap to fill</span>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {allParts.map((part) => {
                    const value = finalMeasurements[part];
                    const isFocused = inputMode === 'voice' && nextExpectedPart === part;
                    const isManualActive = numPadPart === part;
                    const displayLabel = getLabel(part);
                    return (
                      <div
                        key={part}
                        onClick={() => handleCardTap(part)}
                        className={`px-6 py-4 flex justify-between items-center transition-all duration-200 ${
                          isFocused ? 'bg-primary/5' :
                          isManualActive ? 'bg-primary/10' :
                          inputMode === 'manual' ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
                        }`}
                      >
                        {/* Option 1: Double-tap label to rename inline */}
                        {renamingPart === part ? (
                          <input
                            autoFocus
                            value={renameInput}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setRenameInput(e.target.value)}
                            onBlur={() => { renameLabel(part, renameInput); setRenamingPart(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') { renameLabel(part, renameInput); setRenamingPart(null); } if (e.key === 'Escape') setRenamingPart(null); }}
                            className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg outline-none border border-primary/20 w-28"
                          />
                        ) : (
                          <span
                            onDoubleClick={e => { e.stopPropagation(); setRenamingPart(part); setRenameInput(displayLabel); }}
                            className={`capitalize text-sm font-semibold select-none ${value ? 'text-gray-900' : isFocused || isManualActive ? 'text-primary' : 'text-gray-300'} ${hasCustomLabel(part) ? 'text-primary' : ''}`}
                            title="Double-tap to rename"
                          >
                            {displayLabel}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          {inputMode === 'manual' && !value && (
                            <span className="text-[8px] font-black text-gray-200 uppercase">tap</span>
                          )}
                          <span className={`text-xl font-bold transition-all ${value ? 'text-primary' : 'text-gray-100'}`}>
                            {value || '00'}
                            <span className="text-[10px] ml-1 opacity-30 font-medium">{unit}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Add New Label at bottom of list */}
                <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50">
                  {addingLabel ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newLabelInput}
                        onChange={e => setNewLabelInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newLabelInput.trim()) { addCustomPart(newLabelInput); setNewLabelInput(''); setAddingLabel(false); }
                          if (e.key === 'Escape') { setAddingLabel(false); setNewLabelInput(''); }
                        }}
                        placeholder="Add new measurement..."
                        className="flex-1 bg-white px-4 py-2 rounded-xl text-sm font-bold outline-none border border-primary/20 shadow-sm"
                      />
                      <button
                        onClick={() => { if (newLabelInput.trim()) { addCustomPart(newLabelInput); setNewLabelInput(''); setAddingLabel(false); } }}
                        className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg"
                      >Add</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingLabel(true)}
                      className="w-full py-3 text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                      <span>+</span> Add Custom Measurement
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Voice Mode: Floating Mic */}
            {inputMode === 'voice' && (
              <div className="fixed bottom-28 left-0 right-0 flex justify-center z-40 pointer-events-none">
                <div className="pointer-events-auto">
                  <RecordingButton isListening={isListening} onClick={toggleListening} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Save Modal */}
      {isSaving && (
        <div className="absolute inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSaved && setIsSaving(false)}></div>
          <div className="bg-white w-full rounded-t-[48px] p-10 flex flex-col gap-6 animate-bottom-sheet z-50 shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto"></div>
            <div className="text-center">
              <h3 className="text-2xl font-black">Archive Record</h3>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">Add reference & fabric photos</p>
            </div>
            <div className="space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">👗 Style References ({stylePhotos.length}/3)</span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {stylePhotos.map((url, idx) => (
                  <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 relative group">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setStylePhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                {stylePhotos.length < 3 && (
                  <div onClick={() => styleInputRef.current?.click()} className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer">
                    {isUploading === 'style' ? <div className="animate-spin">⌛</div> : <span className="text-xl">📸</span>}
                  </div>
                )}
                <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'style')} />
              </div>
            </div>
            <div className="space-y-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">🧵 Fabric Samples ({clothPhotos.length}/3)</span>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {clothPhotos.map((url, idx) => (
                  <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 relative group">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => setClothPhotos(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                {clothPhotos.length < 3 && (
                  <div onClick={() => clothInputRef.current?.click()} className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer">
                    {isUploading === 'cloth' ? <div className="animate-spin">⌛</div> : <span className="text-xl">🧵</span>}
                  </div>
                )}
                <input type="file" ref={clothInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'cloth')} />
              </div>
            </div>
            <input autoFocus type="text" placeholder="Customer Name..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-gray-50 border-b-4 border-primary/20 py-4 text-3xl outline-none focus:border-primary transition-colors font-bold text-center" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => exportToPDF(customerName || 'Client', finalMeasurements, unit)} className="py-5 rounded-3xl border border-gray-100 text-[10px] font-black tracking-widest uppercase text-gray-400">PDF</button>
              <button onClick={handleSaveToBackend} disabled={!customerName || isSaved} className={`py-5 rounded-3xl font-black text-[10px] tracking-widest uppercase ${customerName && !isSaved ? 'bg-primary text-black' : 'bg-gray-100 text-gray-300'}`}>
                {isSaved ? '✓ DONE' : 'SAVE CLOUD'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boutique NumPad */}
      {numPadPart && (
        <NumPad
          activePart={numPadPart}
          currentValue={finalMeasurements[numPadPart]}
          unit={unit}
          onConfirm={handleNumPadConfirm}
          onNext={handleNumPadNext}
          onClear={handleNumPadClear}
          onClose={() => setNumPadPart(null)}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-50 px-10 py-6 flex justify-between items-center z-50 relative">
        <button onClick={() => setActiveNav('recorder')} className={`flex flex-col items-center gap-1.5 transition-all ${activeNav === 'recorder' ? 'text-primary scale-110' : 'text-gray-300'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          <span className="text-[9px] font-black uppercase">Recorder</span>
        </button>
        <button onClick={() => setActiveNav('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeNav === 'history' ? 'text-primary scale-110' : 'text-gray-300'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[9px] font-black uppercase">Archive</span>
        </button>
        <button onClick={() => setActiveNav('settings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeNav === 'settings' ? 'text-primary scale-110' : 'text-gray-300'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[9px] font-black uppercase">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
