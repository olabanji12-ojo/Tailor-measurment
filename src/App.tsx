import React, { useMemo, useState, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { parseMeasurements } from './utils/parser';
import { RecordingButton } from './components/RecordingButton';
import { HistoryView } from './components/HistoryView';
import { exportToPDF } from './utils/export';

const App: React.FC = () => {
  const { isListening, transcript, error, toggleListening, clearTranscript } = useSpeechRecognition();
  
  const [activeTab, setActiveTab] = useState<'recorder' | 'history' | 'settings'>('recorder');
  const [manualMeasurements, setManualMeasurements] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [isSaved, setIsSaved] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // For the Save Modal

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tailor_session');
    if (saved) {
      const data = JSON.parse(saved);
      setManualMeasurements(data.measurements || {});
      setCustomerName(data.customerName || '');
      setUnit(data.unit || 'in');
    }
  }, []);

  // Save to LocalStorage whenever data changes
  useEffect(() => {
    const session = { measurements: manualMeasurements, customerName, unit };
    localStorage.setItem('tailor_session', JSON.stringify(session));
  }, [manualMeasurements, customerName, unit]);

  const measurements = useMemo(() => {
    const voiceResults = parseMeasurements(transcript);
    return { ...voiceResults, ...manualMeasurements };
  }, [transcript, manualMeasurements]);

  const hasData = Object.keys(measurements).length > 0;

  const handleManualEdit = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setManualMeasurements(prev => ({ ...prev, [key]: numValue }));
    }
    setEditingKey(null);
  };

  const handleSaveToBackend = async () => {
    if (!customerName) {
      alert("Please enter a customer name first.");
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          data: measurements,
          transcript: transcript,
          unit: unit
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => {
          setIsSaved(false);
          setIsSaving(false);
          setManualMeasurements({});
          setCustomerName('');
          clearTranscript();
        }, 2000);
        localStorage.removeItem('tailor_session');
      } else {
        alert('Failed to save to cloud.');
      }
    } catch (err) {
      alert('Network error. Check if the Go backend is running.');
    }
  };

  const clearAll = () => {
    if (window.confirm('Reset all data?')) {
      setManualMeasurements({});
      setCustomerName('');
      clearTranscript();
      localStorage.removeItem('tailor_session');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-bg-light text-text-main overflow-hidden font-sans relative">
      
      {/* Top Header */}
      <header className="px-6 py-4 bg-white flex justify-between items-center border-b border-gray-100 z-30">
        <h1 className="text-xl font-bold tracking-tight">
          Tailor<span className="text-primary font-black">Voice</span>
        </h1>
        <div className="flex bg-gray-50 p-1 rounded-xl">
          <button onClick={() => setUnit('in')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${unit === 'in' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}>IN</button>
          <button onClick={() => setUnit('cm')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${unit === 'cm' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}>CM</button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 relative overflow-y-auto scrollbar-hide pb-24">
        {activeTab === 'history' ? (
          <div className="p-6">
            <HistoryView />
          </div>
        ) : activeTab === 'settings' ? (
          <div className="p-6 flex flex-col gap-6 animate-slide-up">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
              <label className="text-[10px] uppercase tracking-widest text-primary font-black mb-2 block">Application Info</label>
              <p className="text-gray-500 text-sm font-medium">TailorVoice Engine v0.1.5</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Storage Status</span>
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</span>
              </div>
            </div>
            <button onClick={clearAll} className="w-full py-4 text-red-500 font-bold text-sm bg-white rounded-2xl shadow-sm border border-gray-50 hover:bg-red-50 transition-colors">Reset All Session Data</button>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-slide-up">
            {/* 1. TOP AREA: LIVE TRANSLATION (Per user request) */}
            <div className="p-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 min-h-[120px] flex flex-col">
                <label className="text-[10px] uppercase tracking-widest text-primary font-black mb-3 block">Live Translation</label>
                <div className="flex-1 text-lg text-gray-400 font-light leading-snug">
                  {transcript || <span className="italic opacity-30">Recording will appear here as you speak...</span>}
                </div>
              </div>
            </div>

            {/* 2. MIDDLE AREA: VOICE HUB */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-10">
              <RecordingButton isListening={isListening} onClick={toggleListening} />
              {error && <p className="text-red-500 text-xs mt-4 animate-pulse bg-red-50 px-3 py-1 rounded-full border border-red-100">{error}</p>}
            </div>

            {/* 3. QUICK DATA OVERVIEW (Inline, no sheet needed unless saving) */}
            {hasData && (
              <div className="px-6 pb-4">
                <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white flex justify-between items-center">
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                    {Object.entries(measurements).map(([key, val]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-[8px] uppercase text-gray-400 font-bold">{key}</span>
                        <span className="text-sm font-bold text-primary">{val}{unit}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setIsSaving(true)}
                    className="ml-4 bg-text-main text-white px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg active:scale-95 transition-all"
                  >
                    Save Record
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Save Modal (OPay style confirmation) */}
      {isSaving && (
        <div className="absolute inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaved && setIsSaving(false)}></div>
          <div className="bg-white w-full rounded-t-[40px] p-10 flex flex-col gap-6 animate-bottom-sheet z-50">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-2"></div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold tracking-tight">Finalize & Archive</h3>
              <p className="text-gray-400 text-sm mt-1">Please enter a name for this measurement record.</p>
            </div>

            <div className="mt-4">
              <label className="text-[10px] uppercase tracking-widest text-primary font-black mb-2 block">Client Name</label>
              <input 
                autoFocus
                type="text"
                placeholder="Ex: John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-gray-50 border-b-2 border-primary/20 py-4 text-2xl outline-none focus:border-primary transition-colors font-medium text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={() => exportToPDF(customerName || 'Client', measurements, unit)}
                className="py-5 rounded-2xl border border-gray-100 text-[10px] font-black tracking-widest uppercase text-gray-500"
              >
                Download PDF
              </button>
              <button 
                onClick={handleSaveToBackend}
                disabled={!customerName || isSaved}
                className={`py-5 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all ${customerName && !isSaved ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'bg-gray-100 text-gray-400'}`}
              >
                {isSaved ? '✓ SAVED' : 'CONFIRM SAVE'}
              </button>
            </div>
            
            {!isSaved && (
              <button onClick={() => setIsSaving(false)} className="text-[10px] text-gray-400 font-bold tracking-widest uppercase text-center mt-2">Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation (OPay Style) */}
      <nav className="bg-white border-t border-gray-100 px-10 py-6 flex justify-between items-center nav-shadow z-40 relative">
        <button onClick={() => setActiveTab('recorder')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'recorder' ? 'text-primary scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <svg className="w-6 h-6" fill={activeTab === 'recorder' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-[10px] font-bold tracking-tighter">Recorder</span>
        </button>
        
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <svg className="w-6 h-6" fill={activeTab === 'history' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold tracking-tighter">Archive</span>
        </button>

        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'text-primary scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
          <svg className="w-6 h-6" fill={activeTab === 'settings' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-bold tracking-tighter">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;