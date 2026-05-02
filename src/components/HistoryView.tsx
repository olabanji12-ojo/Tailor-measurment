import React, { useEffect, useState, useRef } from 'react';
import { exportToImage } from '../utils/export';

interface MeasurementSession {
  id: string;
  customer_name: string;
  date: string;
  data: Record<string, number>;
  unit: string;
  style_photos?: string[];
  cloth_photos?: string[];
}

interface Props {
  shopName: string;
}

export const HistoryView: React.FC<Props> = ({ shopName }) => {
  const [sessions, setSessions] = useState<MeasurementSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<MeasurementSession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState<'style' | 'cloth' | null>(null);

  const styleInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('https://tailor-backend-9ilv.onrender.com/api/measurements', {
      headers: { 'X-Shop-ID': shopName },
    })
      .then(res => res.json())
      .then(data => {
        setSessions(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpdatePhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: 'style' | 'cloth') => {
    const file = e.target.files?.[0];
    if (!file || !selectedSession) return;

    setIsUploading(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'TailorVoice');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dcpvhegxr/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      const photoUrl = data.secure_url;

      const fieldName = type === 'style' ? 'style_photos' : 'cloth_photos';
      const currentPhotos = selectedSession[fieldName] || [];
      const updatedPhotos = [...currentPhotos, photoUrl].slice(0, 3);

      const response = await fetch(`https://tailor-backend-9ilv.onrender.com/api/measurements/${selectedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: updatedPhotos }),
      });

      if (response.ok) {
        const updatedSession = { ...selectedSession, [fieldName]: updatedPhotos };
        setSelectedSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
      }
    } catch (err) {
      alert("Failed to upload photo.");
    } finally {
      setIsUploading(null);
    }
  };

  const deletePhoto = async (idx: number, type: 'style' | 'cloth') => {
    if (!selectedSession) return;
    const fieldName = type === 'style' ? 'style_photos' : 'cloth_photos';
    const updatedPhotos = (selectedSession[fieldName] || []).filter((_, i) => i !== idx);

    try {
      const response = await fetch(`https://tailor-backend-9ilv.onrender.com/api/measurements/${selectedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: updatedPhotos }),
      });

      if (response.ok) {
        const updatedSession = { ...selectedSession, [fieldName]: updatedPhotos };
        setSelectedSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
      }
    } catch (err) {
      alert("Failed to delete photo.");
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedSession) return;
    if (!window.confirm(`Delete ${selectedSession.customer_name}'s record permanently?`)) return;
    try {
      const res = await fetch(`https://tailor-backend-9ilv.onrender.com/api/measurements/${selectedSession.id}`, {
        method: 'DELETE',
        headers: { 'X-Shop-ID': shopName },
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== selectedSession.id));
        setSelectedSession(null);
      }
    } catch {
      alert('Failed to delete record.');
    }
  };

  const handleUpdateValues = async () => {
    if (!selectedSession) return;
    try {
      const response = await fetch(`https://tailor-backend-9ilv.onrender.com/api/measurements/${selectedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: selectedSession.data }),
      });
      if (response.ok) {
        setIsEditing(false);
        setSessions(prev => prev.map(s => s.id === selectedSession.id ? selectedSession : s));
      }
    } catch (err) {
      alert("Failed to update record.");
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-300 animate-pulse text-[10px] font-black uppercase tracking-widest">Accessing Archive...</div>;

  return (
    <div className="flex flex-col gap-6 animate-slide-up relative pb-40">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Archive History</h2>
          <p className="text-gray-400 text-xs font-medium">Visual records and measurements.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white p-20 text-center text-gray-200 italic rounded-[32px] border border-gray-50">
          No records in archive yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              onClick={() => setSelectedSession(session)}
              className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 active:scale-95 transition-all cursor-pointer hover:border-primary/20"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl">👤</div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{session.customer_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] bg-primary/5 px-2 py-0.5 rounded text-primary font-black uppercase tracking-tighter">
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                    {((session.style_photos?.length || 0) > 0 || (session.cloth_photos?.length || 0) > 0) && <span className="text-[8px] text-gray-300 font-bold uppercase">📸 { (session.style_photos?.length || 0) + (session.cloth_photos?.length || 0) } Photos</span>}
                  </div>
                </div>
              </div>
              <div className="text-gray-100 font-black">→</div>
            </div>
          ))}
        </div>
      )}

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedSession(null); setIsEditing(false); }}></div>
          <div className="bg-white w-full rounded-t-[48px] p-10 flex flex-col gap-6 animate-bottom-sheet z-50 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto"></div>
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black tracking-tight">{selectedSession.customer_name}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Client Record Details</p>
              </div>
              <button onClick={() => setSelectedSession(null)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-xl">×</button>
            </div>

            {/* Scrollable Container START */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-40">
              
              {/* Style Photos Filmstrip */}
              <div className="mb-6 space-y-3">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">👗 Style References</span>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {(selectedSession.style_photos || []).map((url, idx) => (
                    <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 relative group">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => deletePhoto(idx, 'style')} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  {(selectedSession.style_photos?.length || 0) < 3 && (
                    <div onClick={() => styleInputRef.current?.click()} className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer">
                      {isUploading === 'style' ? <div className="animate-spin text-xs">⌛</div> : <span className="text-xl">📸</span>}
                    </div>
                  )}
                  <input type="file" ref={styleInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpdatePhoto(e, 'style')} />
                </div>
              </div>

              {/* Cloth Photos Filmstrip */}
              <div className="mb-8 space-y-3">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">🧵 Fabric Samples</span>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {(selectedSession.cloth_photos || []).map((url, idx) => (
                    <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 relative group">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => deletePhoto(idx, 'cloth')} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  {(selectedSession.cloth_photos?.length || 0) < 3 && (
                    <div onClick={() => clothInputRef.current?.click()} className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer">
                      {isUploading === 'cloth' ? <div className="animate-spin text-xs">⌛</div> : <span className="text-xl">🧵</span>}
                    </div>
                  )}
                  <input type="file" ref={clothInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpdatePhoto(e, 'cloth')} />
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Measurements ({selectedSession.unit.toUpperCase()})</span>
                  <button onClick={() => setIsEditing(!isEditing)} className="text-[9px] font-black text-primary uppercase bg-primary/5 px-3 py-1.5 rounded-lg">{isEditing ? 'Cancel' : 'Edit'}</button>
                </div>
                <div className="grid gap-2">
                  {Object.entries(selectedSession.data).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center py-1">
                      <span className="capitalize text-sm font-semibold text-gray-600">{key}</span>
                      {isEditing ? (
                        <input type="number" className="w-20 bg-gray-50 text-right font-bold text-primary px-2 py-1 rounded-lg text-sm" defaultValue={val} onChange={(e) => {
                          const newVal = parseFloat(e.target.value);
                          if (!isNaN(newVal)) setSelectedSession({...selectedSession, data: {...selectedSession.data, [key]: newVal}});
                        }} />
                      ) : (
                        <span className="text-lg font-bold text-primary">{val}<span className="text-[10px] ml-1 opacity-30">{selectedSession.unit}</span></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button onClick={() => exportToImage('history-measurement-sheet', selectedSession.customer_name)} className="py-5 rounded-[28px] border border-gray-100 text-[10px] font-black tracking-widest uppercase text-gray-400">Share Image</button>
                {isEditing ? (
                  <button onClick={handleUpdateValues} className="py-5 rounded-[28px] bg-primary text-black font-black text-[10px] tracking-widest uppercase shadow-xl">Save Changes</button>
                ) : (
                  <button onClick={() => setSelectedSession(null)} className="py-5 rounded-[28px] bg-gray-100 text-gray-500 font-black text-[10px] tracking-widest uppercase">Close Record</button>
                )}
              </div>
              {/* Delete Record */}
              <button
                onClick={handleDeleteRecord}
                className="w-full mt-3 py-4 rounded-[28px] border-2 border-dashed border-red-100 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
              >
                🗑️ Delete This Record Permanently
              </button>
            </div>
            {/* Scrollable Container END */}
          </div>
          
          {/* Hidden Measurement Sheet for Image Capture (Scoped to History) */}
          <div className="fixed -left-[9999px] top-0">
            <div id="history-measurement-sheet" className="w-[400px] bg-white p-10 font-sans text-[#1A1A1A]">
              <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase mb-1">{shopName || 'TailorVoice'}</h1>
                <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">Archive Record</p>
              </div>

              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-end border-b-2 border-gray-50 pb-2">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Client</span>
                  <span className="text-xl font-bold text-primary">{selectedSession.customer_name}</span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-gray-50 pb-2">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Date Saved</span>
                  <span className="text-sm font-bold">{new Date(selectedSession.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-end border-b-2 border-gray-50 pb-2">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Unit</span>
                  <span className="text-sm font-bold uppercase">{selectedSession.unit}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[32px] p-6 space-y-4">
                {Object.entries(selectedSession.data).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="capitalize text-[10px] font-black text-gray-400 uppercase tracking-widest">{key}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-gray-800">{val}</span>
                      <span className="text-[9px] font-bold text-gray-300 uppercase">{selectedSession.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <p className="text-[9px] font-black text-gray-200 uppercase tracking-widest">Built with TailorVoice AI 🧵</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
