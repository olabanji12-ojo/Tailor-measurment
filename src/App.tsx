import React, { useState, useEffect } from 'react';
import { useWhisper } from './hooks/useWhisper';
import { parseMeasurements, MEASUREMENT_PARTS } from './utils/parser';
import { RecordingButton } from './components/RecordingButton';
import { HistoryView } from './components/HistoryView';
import { exportToPDF } from './utils/export';

const App: React.FC = () => {
  const { isListening, transcript, toggleListening, clearTranscript } = useWhisper();
  
  const [activeTab, setActiveTab] = useState<'recorder' | 'history' | 'settings'>('recorder');
  const [finalMeasurements, setFinalMeasurements] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [isSaved, setIsSaved] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Check backend status
  useEffect(() => {
    fetch('http://localhost:8080/api/customers')
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, [activeTab]);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('tailor_session');
    if (saved) {
      const data = JSON.parse(saved);
      setFinalMeasurements(data.measurements || {});
      setCustomerName(data.customerName || '');
      setUnit(data.unit || 'in');
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    const session = { measurements: finalMeasurements, customerName, unit };
    localStorage.setItem('tailor_session', JSON.stringify(session));
  }, [finalMeasurements, customerName, unit]);

  // Real-time processing
  useEffect(() => {
    if (!transcript) return;

    const { structured, standaloneNumbers } = parseMeasurements(transcript);
    
    setFinalMeasurements(prev => {
      const next = { ...prev, ...structured };
      
      // If there are standalone numbers, assign them to the next empty fields in order
      if (standaloneNumbers.length > 0) {
        let currentNumIdx = 0;
        for (const part of MEASUREMENT_PARTS) {
          if (currentNumIdx >= standaloneNumbers.length) break;
          // Only assign to empty fields
          if (!next[part]) {
            next[part] = standaloneNumbers[currentNumIdx];
            currentNumIdx++;
          }
        }
      }
      return next;
    });
  }, [transcript]);

  const hasData = Object.keys(finalMeasurements).length > 0;
  const nextExpectedPart = MEASUREMENT_PARTS.find(p => !finalMeasurements[p]);

  const handleManualEdit = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFinalMeasurements(prev => ({ ...prev, [key]: numValue }));
    }
    setEditingKey(null);
  };

  const handleSaveToBackend = async () => {
    if (!customerName) return;

    try {
      const response = await fetch('http://localhost:8080/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          data: finalMeasurements,
          transcript: transcript, // We could send the full transcript here if we tracked it
          unit: unit
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => {
          setIsSaved(false);
          setIsSaving(false);
          setFinalMeasurements({});
          setCustomerName('');
          clearTranscript();
        }, 1500);
        localStorage.removeItem('tailor_session');
      }
    } catch (err) {
      alert('Backend Error. Run "go run main.go"');
    }
  };

  const clearAll = () => {
    if (window.confirm('Reset app?')) {
      setFinalMeasurements({});
      setCustomerName('');
      clearTranscript();
      localStorage.removeItem('tailor_session');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FDFDFD] text-[#1A1A1A] overflow-hidden font-sans relative">
      
      {/* Header */}
      <header className="px-6 py-5 bg-white flex justify-between items-center border-b border-gray-50 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </div>
          <h1 className="text-lg font-bold tracking-tight">TailorVoice</h1>
        </div>
        <div className="flex bg-gray-50 p-1 rounded-xl">
          <button onClick={() => setUnit('in')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${unit === 'in' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}>IN</button>
          <button onClick={() => setUnit('cm')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${unit === 'cm' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}>CM</button>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 relative overflow-y-auto scrollbar-hide pb-32">
        {activeTab === 'history' ? (
          <div className="p-6"><HistoryView /></div>
        ) : activeTab === 'settings' ? (
          <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">System Status</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Backend Server</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${backendStatus === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{backendStatus.toUpperCase()}</span>
              </div>
            </div>
            <button onClick={clearAll} className="w-full py-4 bg-white border border-red-50 text-red-500 font-bold rounded-2xl">Reset Local Data</button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* 1. Live Transcript Area */}
            <div className="px-6 pt-6">
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm min-h-[100px] flex flex-col relative">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] uppercase tracking-widest text-primary font-black">Live Translation</label>
                  {(transcript || hasData) && (
                    <div className="flex gap-4">
                      <button onClick={() => setIsSaving(true)} className="text-[10px] text-primary font-black tracking-widest">SAVE RECORD</button>
                      <button onClick={clearTranscript} className="text-[10px] text-gray-300 font-bold">RESET</button>
                    </div>
                  )}
                </div>
                <p className="text-lg text-gray-400 font-light leading-snug">
                  {transcript || <span className="opacity-20 italic">Speak values to fill the list...</span>}
                </p>
              </div>
            </div>

            {/* 2. ACTIVE LIST (The "Option C" Interface) */}
            <div className="px-6 py-6 space-y-4">
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Measurement List</span>
                    {nextExpectedPart && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                        <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Waiting for {nextExpectedPart}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={clearAll}
                    className="text-[10px] font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                  >
                    RESET ALL
                  </button>
                </div>
                <div className="max-h-[350px] overflow-y-auto scrollbar-hide divide-y divide-gray-50">
                  {MEASUREMENT_PARTS.map((part) => {
                    const value = finalMeasurements[part];
                    const isFocused = nextExpectedPart === part;
                    
                    return (
                      <div key={part} className={`px-6 py-4 flex justify-between items-center transition-all duration-300 ${isFocused ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className={`capitalize text-sm font-semibold ${value ? 'text-gray-900' : isFocused ? 'text-primary' : 'text-gray-300'}`}>
                            {part}
                          </span>
                          {isFocused && <span className="text-[8px] font-black text-primary/50 uppercase tracking-tighter">NEXT</span>}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {editingKey === part ? (
                            <input
                              autoFocus
                              className="w-16 bg-white text-right outline-none rounded-lg px-2 py-1 text-primary font-bold border border-primary/30"
                              defaultValue={value}
                              onBlur={(e) => handleManualEdit(part, e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleManualEdit(part, (e.target as HTMLInputElement).value)}
                            />
                          ) : (
                            <button onClick={() => setEditingKey(part)} className={`text-xl font-bold transition-all ${value ? 'text-primary' : 'text-gray-100'}`}>
                              {value || '00'}<span className="text-[10px] ml-1 opacity-30 font-medium">{unit}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Floating Voice Hub */}
            <div className="fixed bottom-28 left-0 right-0 flex justify-center z-40">
              <RecordingButton isListening={isListening} onClick={toggleListening} />
            </div>
          </div>
        )}
      </main>

      {/* Save Modal */}
      {isSaving && (
        <div className="absolute inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSaved && setIsSaving(false)}></div>
          <div className="bg-white w-full rounded-t-[48px] p-10 flex flex-col gap-6 animate-bottom-sheet z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.3)]">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto"></div>
            <div className="text-center">
              <h3 className="text-2xl font-black tracking-tight">Finalize & Archive</h3>
              <p className="text-gray-400 text-sm mt-1 font-medium">Record for client profile:</p>
            </div>
            <input 
              autoFocus
              type="text"
              placeholder="Enter Client Name..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-gray-50 border-b-4 border-primary/20 py-5 text-3xl outline-none focus:border-primary transition-colors font-bold text-center placeholder:text-gray-200"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button onClick={() => exportToPDF(customerName || 'Client', finalMeasurements, unit)} className="py-5 rounded-3xl border border-gray-100 text-[10px] font-black tracking-widest uppercase text-gray-400">PDF</button>
              <button onClick={handleSaveToBackend} disabled={!customerName || isSaved} className={`py-5 rounded-3xl font-black text-[10px] tracking-widest uppercase ${customerName && !isSaved ? 'bg-primary text-black' : 'bg-gray-100 text-gray-300'}`}>
                {isSaved ? '✓ DONE' : 'SAVE CLOUD'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white border-t border-gray-50 px-10 py-6 flex justify-between items-center z-50 relative">
        <button onClick={() => setActiveTab('recorder')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'recorder' ? 'text-primary scale-110' : 'text-gray-300'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          <span className="text-[9px] font-black uppercase">Recorder</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-primary scale-110' : 'text-gray-300'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[9px] font-black uppercase">Archive</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'text-primary scale-110' : 'text-gray-300'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[9px] font-black uppercase">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;