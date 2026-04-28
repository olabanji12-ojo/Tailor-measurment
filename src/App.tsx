import React, { useMemo, useState, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { parseMeasurements } from './utils/parser';
import { RecordingButton } from './components/RecordingButton';
import { MeasurementCard } from './components/MeasurementCard';

const App: React.FC = () => {
  const { isListening, transcript, error, toggleListening, clearTranscript } = useSpeechRecognition();
  
  const [manualMeasurements, setManualMeasurements] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [isSaved, setIsSaved] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tailor_session');
    if (saved) {
      const data = JSON.parse(saved);
      setManualMeasurements(data.measurements || {});
      setCustomerName(data.customerName || '');
      setUnit(data.unit || 'in');
    }
  }, []);

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

  const handleSave = async () => {
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
        setTimeout(() => setIsSaved(false), 3000);
        // Clear session after save
        setManualMeasurements({});
        setCustomerName('');
        clearTranscript();
        localStorage.removeItem('tailor_session');
      } else {
        console.error('Failed to save to backend');
        alert('Could not save to backend. Is the server running?');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error. Check console for details.');
    }
  };

  const clearAll = () => {
    if (window.confirm('Clear all session data?')) {
      setManualMeasurements({});
      setCustomerName('');
      clearTranscript();
      localStorage.removeItem('tailor_session');
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen flex flex-col py-12 px-6">
      {/* Header Section */}
      <header className="mb-16 flex flex-col md:flex-row justify-between items-center gap-8 animate-slide-up">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-bold tracking-tighter mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            TailorVoice<span className="text-primary font-light">.</span>
          </h1>
          <p className="text-gray-500 font-medium tracking-wide">PROFESSIONAL MEASUREMENT SUITE</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            {(['in', 'cm'] as const).map((u) => (
              <button 
                key={u}
                onClick={() => setUnit(u)}
                className={`px-6 py-2 text-xs rounded-xl transition-all duration-300 font-bold uppercase tracking-widest ${unit === u ? 'bg-primary text-black' : 'text-gray-500 hover:text-white'}`}
              >
                {u === 'in' ? 'Inches' : 'Metric'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-12 max-w-5xl mx-auto w-full">
        
        {/* Profile Card */}
        <div className="glass p-10 animate-slide-up [animation-delay:100ms] group">
          <div className="flex flex-col gap-4">
            <label className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">Active Client Profile</label>
            <input 
              type="text"
              placeholder="Start typing client name..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-transparent border-none p-0 text-3xl outline-none placeholder:text-gray-800 text-white font-light selection:bg-primary/30"
            />
            <div className="h-px w-full bg-gradient-to-r from-primary/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500 origin-left"></div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm animate-pulse flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            {error}
          </div>
        )}

        {/* Voice Hub */}
        <div className="animate-slide-up [animation-delay:200ms]">
          <RecordingButton isListening={isListening} onClick={toggleListening} />
        </div>

        {/* Data Grid */}
        <div className="grid lg:grid-cols-2 gap-8 w-full animate-slide-up [animation-delay:300ms]">
          <MeasurementCard 
            title="Live Stream" 
            subtitle="VOICE-TO-TEXT ENGINE"
            action={<button onClick={clearTranscript} className="text-[10px] text-gray-500 hover:text-white tracking-widest font-bold">RESET</button>}
          >
            {/* Added fixed height and overflow for better mobile UX */}
            <div className="h-[200px] lg:h-[300px] overflow-y-auto text-xl text-gray-400 font-light leading-relaxed selection:bg-primary/20 scrollbar-hide">
              {transcript || <span className="text-gray-800 italic">Waiting for voice input...</span>}
            </div>
          </MeasurementCard>

          <MeasurementCard 
            title="Extraction" 
            subtitle={`STRUCTURED DATA (${unit.toUpperCase()})`}
            action={<span className="text-[10px] text-primary font-bold">TAP VALUE TO EDIT</span>}
          >
            {/* Added fixed height and overflow for better mobile UX */}
            <div className="h-[200px] lg:h-[300px] overflow-y-auto scrollbar-hide">
              {!hasData ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-800 gap-3">
                  <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  <p className="italic text-sm">No measurements detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(measurements).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors px-2 rounded-lg">
                      <span className="capitalize text-sm text-gray-300 font-medium tracking-wide">{key}</span>
                      {editingKey === key ? (
                        <input
                          autoFocus
                          className="w-20 bg-primary/20 text-right outline-none rounded-lg px-3 py-1 text-primary font-bold border border-primary/30"
                          defaultValue={value}
                          onBlur={(e) => handleManualEdit(key, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleManualEdit(key, (e.target as HTMLInputElement).value)}
                        />
                      ) : (
                        <button 
                          onClick={() => setEditingKey(key)}
                          className="font-mono text-primary text-2xl font-light hover:scale-110 transition-transform origin-right"
                        >
                          {value}<span className="text-xs ml-1 opacity-40 font-sans">{unit}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </MeasurementCard>
        </div>

        {/* Action Center */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-8 animate-slide-up [animation-delay:400ms] pb-20">
          <button onClick={clearAll} className="text-[10px] font-black tracking-[0.4em] text-gray-700 hover:text-red-500 transition-colors uppercase">
            Clear Active Session
          </button>
          
          <button
            disabled={!hasData || isListening || !customerName}
            onClick={handleSave}
            className={`
              group relative px-16 py-5 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all duration-500
              ${hasData && !isListening && customerName
                ? 'bg-white text-black hover:bg-primary shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:-translate-y-1'
                : 'bg-gray-900 text-gray-700 cursor-not-allowed border border-white/5'
              }
            `}
          >
            <span className="relative z-10">{isSaved ? '✓ Archive Secured' : 'Archive Measurements'}</span>
            {hasData && customerName && <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity rounded-2xl"></div>}
          </button>
        </div>
      </main>

      <footer className="py-8 border-t border-white/5 text-center flex flex-col gap-2">
        <p className="text-[10px] text-gray-700 font-bold tracking-[0.5em] uppercase">Built for Modern Ateliers</p>
        <p className="text-[9px] text-gray-800">TailorVoice Engine &copy; 2024 &bull; Technical Alpha v0.1.2</p>
      </footer>
    </div>
  );
};

export default App;