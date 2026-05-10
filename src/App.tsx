import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { HistoryView } from './components/HistoryView';
import { SettingsScreen } from './components/SettingsScreen';
import { RecorderScreen } from './components/RecorderScreen';
import { SetupJobScreen } from './components/SetupJobScreen';
import { HomeScreen } from './components/HomeScreen';
import { ClientProfileScreen } from './components/ClientProfileScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { OnboardingScreen } from './components/OnboardingScreen';

const NavBar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <nav className="bg-white/90 backdrop-blur-md border-t border-gray-100 pt-3 pb-8 grid grid-cols-5 items-start z-40 relative">
      <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${path === '/' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${path === '/' ? 'bg-[#0F172A] text-white' : 'text-gray-400'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
      </Link>
      
      <Link to="/clients" className={`flex flex-col items-center gap-1 transition-colors ${path === '/clients' || path.startsWith('/client/') ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <div className="w-12 h-12 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <span className="text-[9px] font-bold tracking-widest uppercase">CLIENTS</span>
      </Link>

      <Link to="/measure" className={`flex flex-col items-center gap-1 transition-colors ${path === '/measure' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <div className="w-12 h-12 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6" y2="10"></line><line x1="10" y1="6" x2="10" y2="10"></line><line x1="14" y1="6" x2="14" y2="10"></line><line x1="18" y1="6" x2="18" y2="10"></line></svg>
        </div>
        <span className="text-[9px] font-bold tracking-widest uppercase">MEASURE</span>
      </Link>

      <Link to="/archive" className={`flex flex-col items-center gap-1 transition-colors ${path === '/archive' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <div className="w-12 h-12 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        </div>
        <span className="text-[9px] font-bold tracking-widest uppercase">ARCHIVE</span>
      </Link>

      <Link to="/settings" className={`flex flex-col items-center gap-1 transition-colors ${path === '/settings' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <div className="w-12 h-12 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </div>
        <span className="text-[9px] font-bold tracking-widest uppercase">SETTINGS</span>
      </Link>
    </nav>
  );
};

const AppContent: React.FC = () => {
  const { currentSession, clearSession } = useAppContext();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewJobConfirm, setShowNewJobConfirm] = useState(false);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#FDFDFD]">
      <div className="animate-pulse flex flex-col items-center">
        <span className="text-4xl mb-4">🧵</span>
        <div className="h-1 w-20 bg-gray-100 rounded-full"></div>
      </div>
    </div>;
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

  const isOnMeasurePage = location.pathname === '/measure';

  return (
    <div className="h-screen flex flex-col bg-[#FDFDFD] text-[#111827] overflow-hidden font-sans relative">
      
      {/* Main Content Router */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/clients" element={<div className="p-6"><ClientProfileScreen /></div>} />
          <Route path="/client/:id" element={<div className="p-6"><ClientProfileScreen /></div>} />
          <Route path="/archive" element={<div className="p-6"><HistoryView /></div>} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/measure" element={currentSession ? <RecorderScreen /> : <SetupJobScreen />} />
        </Routes>
      </main>

      {/* Floating Action Button (+ NEW JOB) — hidden on measure page */}
      {!isOnMeasurePage && (
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
