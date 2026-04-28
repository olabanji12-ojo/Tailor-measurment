import React, { useEffect, useState } from 'react';
import { MeasurementCard } from './MeasurementCard';
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

  useEffect(() => {
    fetch('http://localhost:8080/api/measurements')
      .then(res => res.json())
      .then(data => {
        setSessions(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">Loading measurement history...</div>;

  return (
    <div className="flex flex-col gap-8 animate-slide-up">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Archive History</h2>
          <p className="text-gray-500 text-sm">View and export past measurement sessions.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="glass p-20 text-center text-gray-700 italic">
          No records found in the archive.
        </div>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="glass p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-primary/30 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-medium text-white">{session.customer_name}</h3>
                  <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-500 uppercase font-bold tracking-widest">
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {Object.entries(session.data).slice(0, 4).map(([key, val]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-600 capitalize mr-1">{key}:</span>
                      <span className="text-primary font-mono">{val}{session.unit}</span>
                    </div>
                  ))}
                  {Object.keys(session.data).length > 4 && (
                    <span className="text-xs text-gray-700">+{Object.keys(session.data).length - 4} more</span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => exportToPDF(session.customer_name, session.data, session.unit)}
                className="bg-primary/10 text-primary hover:bg-primary hover:text-black px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all"
              >
                Export PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
