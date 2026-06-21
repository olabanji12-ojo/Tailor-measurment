import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { HistoryView } from './components/HistoryView';
import { SettingsScreen } from './components/SettingsScreen';
import { RecorderScreen } from './components/RecorderScreen';
import { SetupJobScreen } from './components/SetupJobScreen';
import { HomeScreen } from './components/HomeScreen';
import { ClientProfileScreen } from './components/ClientProfileScreen';
import { VirtualTryOn } from './components/VirtualTryOn';
import { AdminDiagnosticsScreen } from './components/AdminDiagnosticsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { getOfflineQueue, clearQueue } from './utils/db';
import { playSensorySound } from './hooks/useWhisper';
import { OptimizerScreen } from './components/optimizer/OptimizerScreen';

const NavBar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <nav className="bg-white/95 backdrop-blur-md border-t border-border-subtle pt-3.5 pb-6 grid grid-cols-4 items-center z-40 relative shadow-sm">
      <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${path === '/' ? 'text-accent animate-pulse' : 'text-text-muted hover:text-primary'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Home</span>
      </Link>
      
      <Link to="/tryon" className={`flex flex-col items-center gap-1 transition-colors ${path === '/tryon' ? 'text-accent' : 'text-text-muted hover:text-primary'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
        <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Virtual</span>
      </Link>

      <Link to="/archive" className={`flex flex-col items-center gap-1 transition-colors ${path === '/archive' || path.startsWith('/client/') || path === '/clients' ? 'text-accent' : 'text-text-muted hover:text-primary'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
        <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Archive</span>
      </Link>

      <Link to="/settings" className={`flex flex-col items-center gap-1 transition-colors ${path === '/settings' ? 'text-accent' : 'text-text-muted hover:text-primary'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Account</span>
      </Link>
    </nav>
  );
};

const AppContent: React.FC = () => {
  const { currentSession, clearSession, refreshSessions, globalSessions, globalSessionsLoading } = useAppContext();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewJobConfirm, setShowNewJobConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  const syncOfflineMeasurements = async () => {
    try {
      const queue = await getOfflineQueue();
      if (queue.length === 0) return;

      console.log(`Auto-Syncing ${queue.length} offline measurement sessions...`);
      const token = localStorage.getItem('tailor_token') || '';

      for (const item of queue) {
        await fetch(`${import.meta.env.VITE_API_URL}/measurements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shop-ID': user?.shop_name || 'Tailor',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            customer_name: item.customerName,
            gender: item.gender,
            garment: item.garments.join(', '),
            delivery_date: item.deadline,
            reminder_date: item.reminderDate,
            data: item.measurements,
            transcript: 'Offline Session Synchronized',
            unit: 'in',
            shop_id: user?.shop_name || 'Tailor',
            style_photos: item.photos || [],
            cloth_photos: [],
            total_cost: item.totalCost,
            amount_paid: item.amountPaid,
            client_photo: item.clientPhoto,
          })
        });
      }

      await clearQueue();
      if (refreshSessions) {
        refreshSessions(1);
      }
      console.log("Auto-Sync completed successfully!");
    } catch (err) {
      console.error("Auto-sync background failure:", err);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      syncOfflineMeasurements();
      const timer = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(timer);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for offline sessions on startup
    if (navigator.onLine) {
      syncOfflineMeasurements();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Overdue local alarm scheduler sweeper
  useEffect(() => {
    if (globalSessionsLoading || !globalSessions || globalSessions.length === 0) return;
    
    const isNotificationsEnabled = localStorage.getItem('tailor_notifications_enabled') === 'true';
    if (!isNotificationsEnabled || Notification.permission !== 'granted') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifiedDate = localStorage.getItem('tailor_last_notification_date');
    if (lastNotifiedDate === todayStr) return; // Prevent spamming, run once daily

    // Scan for matching active debtor alerts
    const overdueJobs = globalSessions.filter(s => {
      if (!s.reminder_date) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const remDate = new Date(s.reminder_date);
      remDate.setHours(0, 0, 0, 0);

      // Check if job is unpaid
      const hasBalance = (s.total_cost || 0) - (s.amount_paid || 0) > 0;
      
      return hasBalance && remDate <= today;
    });

    if (overdueJobs.length > 0) {
      // Sound alert chimes!
      playSensorySound('success');
      
      // Native system push alerts!
      new Notification("🧵 TailorVoice Production Alerts", {
        body: `You have ${overdueJobs.length} custom outfits waiting for sewing or balance collections today! Tap to check them.`,
        icon: '/logo.png',
        tag: 'production-reminders'
      });

      // Vibrate if mobile haptics is supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Mark as notified today!
      localStorage.setItem('tailor_last_notification_date', todayStr);
    }
  }, [globalSessions, globalSessionsLoading]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-light">
        <div className="flex flex-col items-center select-none">
          {/* Logo / Brand Name */}
          <h1 className="font-serif text-5xl font-medium text-primary tracking-tighter mb-6 animate-breath">
            TailorVoice
          </h1>
          {/* Elegant Gold Progress Line */}
          <div className="w-28 h-[1.5px] bg-accent/20 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-accent rounded-full animate-progress-cycle" />
          </div>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    const hasSeenOnboarding = localStorage.getItem('tailor_onboarded');
    
    return (
      <div className="h-screen overflow-y-auto custom-scrollbar">
        <Routes>
          {!hasSeenOnboarding && <Route path="/" element={<OnboardingScreen />} />}
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="*" element={hasSeenOnboarding ? <LoginScreen /> : <OnboardingScreen />} />
        </Routes>
      </div>
    );
  }

  const handleNewJobPress = () => {
    if (currentSession) {
      // Active session detected — ask for confirmation
      setShowNewJobConfirm(true);
    } else {
      navigate('/measure');
    }
  };

  const handleConfirmNewJob = () => {
    clearSession();
    setShowNewJobConfirm(false);
    navigate('/measure');
  };

  const isOnMeasurePage = location.pathname === '/measure' && !!currentSession;
  const showFloatingNewJob = ['/', '/archive'].includes(location.pathname);

  return (
    <div className="h-full flex flex-col bg-[#FDFDFD] text-[#111827] overflow-hidden font-sans relative">
      
      {/* Main Content Router */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/clients" element={<ClientProfileScreen />} />
          <Route path="/client/:id" element={<ClientProfileScreen />} />
          <Route path="/archive" element={<HistoryView />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/measure" element={currentSession ? <RecorderScreen /> : <SetupJobScreen />} />
          <Route path="/admin/diagnostics" element={<AdminDiagnosticsScreen />} />
          <Route path="/optimizer" element={<OptimizerScreen />} />
          <Route path="/tryon" element={<VirtualTryOn onClose={() => window.history.back()} clientName="Composition Lab" />} />
        </Routes>
      </main>

      {/* Floating Action Button (+ NEW JOB) — only on Home and Archive */}
      {showFloatingNewJob && (
        <div className="absolute bottom-[100px] left-0 right-0 flex justify-center z-50 pointer-events-none">
          <button 
            onClick={handleNewJobPress}
            className="pointer-events-auto bg-[#0F172A] text-white flex items-center gap-2 px-8 py-4 rounded-[32px] shadow-[0_8px_30px_rgba(15,23,42,0.3)] hover:scale-105 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span className="text-[11px] font-bold tracking-widest uppercase mt-0.5">NEW JOB</span>
          </button>
        </div>
      )}

      {/* NEW JOB Confirmation Dialog */}
      {showNewJobConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pb-10 px-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowNewJobConfirm(false)}
          />
          {/* Dialog Card */}
          <div className="relative bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-5 mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="font-serif text-2xl font-bold text-gray-900 text-center mb-2">Active Session</h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed mb-8">
              You have an active session for{' '}
              <span className="font-bold text-gray-900">{currentSession?.customerName}</span>.
              {' '}Starting a new job will discard this session.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmNewJob}
                className="w-full h-14 bg-[#0F172A] text-white rounded-full font-bold text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
              >
                Start New Job
              </button>
              <button
                onClick={() => setShowNewJobConfirm(false)}
                className="w-full h-14 bg-gray-100 text-gray-700 rounded-full font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIX #5: NavBar hidden on measure page to prevent accidental taps */}
      {!isOnMeasurePage && <NavBar />}

      {/* Offline Sync Alert Indicator */}
      {!isOnline && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[99] bg-rose-50/95 backdrop-blur-md border border-rose-100 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <svg className="text-rose-500 animate-pulse" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.58 3.51A9 9 0 1 1 2 12c0-1.7.47-3.29 1.29-4.66"></path>
            <path d="M22 2 2 22"></path>
          </svg>
          <span className="text-[9px] font-bold text-rose-950 uppercase tracking-widest mt-0.5">Offline — Stored Locally</span>
        </div>
      )}

      {/* Online Sync Success Indicator */}
      {showOnlineToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[99] bg-emerald-50/95 backdrop-blur-md border border-emerald-100 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <svg className="text-emerald-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.58 3.51A9 9 0 1 1 2 12c0-1.7.47-3.29 1.29-4.66"></path>
            <path d="m8 11 2 2 4-4"></path>
          </svg>
          <span className="text-[9px] font-bold text-emerald-950 uppercase tracking-widest mt-0.5">Online — Syncing Data</span>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
