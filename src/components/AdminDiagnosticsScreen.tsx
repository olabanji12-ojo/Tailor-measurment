import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { playSensorySound } from '../hooks/useWhisper';

interface DiagnosticData {
  system: {
    status: string;
    uptime: string;
    goroutines: number;
    ram_usage_mb: number;
    db_status: string;
    db_latency_ms: number;
    redis_status: string;
    redis_latency_ms: number;
  };
  ateliers: {
    total_registered_shops: number;
    total_tailor_users: number;
    total_customers: number;
    total_measurements: number;
  };
  voice_ai: {
    total_whisper_minutes: number;
    estimated_cost_usd: number;
    average_latency_ms: number;
  };
}

export const AdminDiagnosticsScreen: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // System console simulation logs
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Admin Diagnostics session initialized.`,
    `[${new Date().toLocaleTimeString()}] Authenticating session parameters...`,
  ]);

  useEffect(() => {
    if (user && user.email !== 'emmanuel@example.com') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/diagnostics`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('Unauthorized Access or API server error.');
        }
        const json = await res.json();
        setData(json);
        setLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Telemetry successfully fetched from Go Backend.`,
          `[${new Date().toLocaleTimeString()}] Database latency: ${json.system.db_latency_ms}ms | Status: ${json.system.db_status.toUpperCase()}`,
        ]);
        playSensorySound('success');
      } catch (err: any) {
        setError(err.message || 'Server Fetch Failed');
        setLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ❌ Failed to fetch telemetry: ${err.message || 'Server Offline'}`
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagnostics();
  }, [refreshCount, token]);

  const handleRefresh = () => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Refreshing telemetry logs...`]);
    setRefreshCount(prev => prev + 1);
  };

  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💾 Manual backup triggered. Contacting Go backend...`]);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to trigger backup.');
      }
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ Backup complete! ${json.message}`,
      ]);
      playSensorySound('success');
      alert('Database backup successfully generated and archived in GitHub private repository!');
    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Backup failed: ${err.message || 'Server error'}`
      ]);
      alert('Backup failed: ' + (err.message || 'Server error'));
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-6 font-sans relative overflow-x-hidden pb-24">
      {/* Background radial gradient */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-rose-600/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="flex justify-between items-center mb-8 relative z-10">
        <div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors mb-2 text-sm font-semibold tracking-wider uppercase"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Settings
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
            Telemetry Control
          </h1>
        </div>

        <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg disabled:opacity-50"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={isLoading ? 'animate-spin text-violet-400' : ''}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
        </button>
      </header>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center max-w-lg mx-auto relative z-10">
          <span className="text-4xl mb-4 block">🚨</span>
          <h3 className="text-lg font-bold text-red-400 mb-2">Diagnostics Fetch Failed</h3>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button 
            onClick={handleRefresh}
            className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-transform"
          >
            Retry Connection
          </button>
        </div>
      ) : isLoading && !data ? (
        <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
          <p className="text-sm text-slate-400 font-medium">Aggregating system statistics...</p>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Section 1: Database aggregate counts */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-violet-300 mb-4 flex items-center gap-2">
              <span>📊</span> Multi-Tenant Ateliers
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Shops</span>
                <p className="text-3xl font-extrabold text-white mt-1">{data.ateliers.total_registered_shops}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Active Tailors</span>
                <p className="text-3xl font-extrabold text-white mt-1">{data.ateliers.total_tailor_users}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Atelier Clients</span>
                <p className="text-3xl font-extrabold text-white mt-1">{data.ateliers.total_customers}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Saved Outfits</span>
                <p className="text-3xl font-extrabold text-white mt-1">{data.ateliers.total_measurements}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Server runtime metrics */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-pink-300 mb-4 flex items-center gap-2">
              <span>⚡</span> System Telemetry
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Go Engine Status</span>
                <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Database Latency</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  <span className="text-violet-400">⚡</span> {data.system.db_latency_ms}ms
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Redis Cache Status</span>
                <span className={`text-sm font-bold uppercase flex items-center gap-2 ${data.system.redis_status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${data.system.redis_status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {data.system.redis_status}
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Redis Cache Latency</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  <span className="text-pink-400">⚡</span> {data.system.redis_latency_ms}ms
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Active RAM Allocated</span>
                <span className="text-sm font-bold text-white">
                  {data.system.ram_usage_mb.toFixed(2)} MB
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Active Goroutines</span>
                <span className="text-sm font-bold text-violet-300">
                  {data.system.goroutines} threads
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={handleTriggerBackup}
                  disabled={isBackingUp}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBackingUp ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Uploading Backup...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Trigger Database Backup</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: AI Expense Control */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-300 mb-4 flex items-center gap-2">
              <span>🎙️</span> AI Wallet Expense Tracker
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Audio Transcribed</span>
                  <p className="text-2xl font-extrabold text-white mt-1">
                    {data.voice_ai.total_whisper_minutes.toFixed(1)} mins
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Estimated Cost</span>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1">
                    ${data.voice_ai.estimated_cost_usd.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <span className="text-sm font-semibold text-slate-300">Avg Translation Latency</span>
                <span className="text-sm font-bold text-violet-300">
                  {data.voice_ai.average_latency_ms}ms
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Live Server Console Logs & payload monitors */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl md:col-span-2">
            <h2 className="text-lg font-bold text-violet-300 mb-4 flex items-center gap-2">
              <span>🖥️</span> Live Diagnostics Operations Log
            </h2>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-xs text-emerald-400 space-y-2 h-44 overflow-y-auto custom-scrollbar">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed whitespace-pre-wrap select-all">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
};
