import React, { useEffect, useState } from 'react';
import { exportToPDF } from '../utils/export';

interface MeasurementSession {
  id: string;
  customer_name: string;
  date: string;
  data: Record<string, number>;
  unit: string;
}

export const HistoryView: React.FC = () => {
  const [sessions, setSessions] = useState<MeasurementSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<MeasurementSession | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8080/api/measurements')
      .then(res => res.json())
      .then(data => {
        setSessions(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpdate = async () => {
    if (!selectedSession) return;
    try {
      const response = await fetch(`http://localhost:8080/api/measurements/${selectedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedSession.data),
      });
      if (response.ok) {
        setIsEditing(false);
        setSessions(prev => prev.map(s => s.id === selectedSession.id ? selectedSession : s));
      }
    } catch (err) {
      alert("Failed to update record.");
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-300 animate-pulse">Accessing Archive...</div>;

  return (
    <div className="flex flex-col gap-6 animate-slide-up relative">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Archive History</h2>
          <p className="text-gray-400 text-xs">Tap a record to view or edit details.</p>
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
              className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 active:scale-95 transition-all cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-gray-900">{session.customer_name}</h3>
                  <span className="text-[8px] bg-gray-50 px-2 py-1 rounded text-gray-400 uppercase font-black">
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {Object.keys(session.data).length} measurements recorded
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); exportToPDF(session.customer_name, session.data, session.unit); }}
                className="text-[10px] font-black text-primary tracking-widest uppercase px-4 py-2 bg-primary/5 rounded-xl"
              >
                PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Details / Edit Bottom Sheet */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedSession(null); setIsEditing(false); }}></div>
          <div className="bg-white w-full rounded-t-[48px] p-10 flex flex-col gap-6 animate-bottom-sheet z-50 shadow-2xl max-h-[85vh]">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto"></div>
            
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{selectedSession.customer_name}</h3>
                <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">{selectedSession.unit.toUpperCase()} Measurements</p>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-[10px] font-black text-primary uppercase bg-primary/5 px-4 py-2 rounded-xl"
              >
                {isEditing ? 'CANCEL' : 'EDIT VALUES'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-gray-50">
              {Object.entries(selectedSession.data).map(([key, val]) => (
                <div key={key} className="py-4 flex justify-between items-center">
                  <span className="capitalize text-sm font-semibold text-gray-600">{key}</span>
                  {isEditing ? (
                    <input 
                      type="number" 
                      className="w-20 bg-gray-50 text-right font-bold text-primary px-2 py-1 rounded"
                      defaultValue={val}
                      onChange={(e) => {
                        const newVal = parseFloat(e.target.value);
                        if (!isNaN(newVal)) {
                          setSelectedSession({
                            ...selectedSession,
                            data: { ...selectedSession.data, [key]: newVal }
                          });
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xl font-bold text-primary">{val}<span className="text-[10px] ml-1 opacity-30">{selectedSession.unit}</span></span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                onClick={() => exportToPDF(selectedSession.customer_name, selectedSession.data, selectedSession.unit)}
                className="py-5 rounded-3xl border border-gray-100 text-[10px] font-black tracking-widest uppercase text-gray-400"
              >
                PDF
              </button>
              {isEditing ? (
                <button 
                  onClick={handleUpdate}
                  className="py-5 rounded-3xl bg-primary text-black font-black text-[10px] tracking-widest uppercase shadow-xl"
                >
                  SAVE CHANGES
                </button>
              ) : (
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="py-5 rounded-3xl bg-gray-100 text-gray-500 font-black text-[10px] tracking-widest uppercase"
                >
                  CLOSE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
