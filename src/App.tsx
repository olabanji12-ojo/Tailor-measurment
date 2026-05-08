import React from 'react';
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
    <nav className="bg-white/90 backdrop-blur-md border-t border-gray-100 px-8 pt-4 pb-8 flex justify-between items-center z-40 relative">
      <Link to="/" className={`flex flex-col items-center gap-1.5 transition-colors ${path === '/' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${path === '/' ? 'bg-[#0F172A] text-white' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
      </Link>
      
      <Link to="/clients" className={`flex flex-col items-center gap-1.5 transition-colors ${path === '/clients' || path.startsWith('/client/') ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span className="text-[9px] font-bold tracking-widest uppercase">CLIENTS</span>
      </Link>

      <div className="w-16"></div>

      <Link to="/measure" className={`flex flex-col items-center gap-1.5 transition-colors ${path === '/measure' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6" y2="10"></line><line x1="10" y1="6" x2="10" y2="10"></line><line x1="14" y1="6" x2="14" y2="10"></line><line x1="18" y1="6" x2="18" y2="10"></line></svg>
        <span className="text-[9px] font-bold tracking-widest uppercase">MEASURE</span>
      </Link>

      <Link to="/archive" className={`flex flex-col items-center gap-1.5 transition-colors ${path === '/archive' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        <span className="text-[9px] font-bold tracking-widest uppercase">ARCHIVE</span>
      </Link>

      <Link to="/settings" className={`flex flex-col items-center gap-1.5 transition-colors ${path === '/settings' ? 'text-[#0F172A]' : 'text-gray-400'}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span className="text-[9px] font-bold tracking-widest uppercase">SETTINGS</span>
      </Link>
    </nav>
  );
};

const AppContent: React.FC = () => {
  const { currentSession } = useAppContext();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

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

      {/* Floating Action Button (+ NEW JOB) */}
      <div className="absolute bottom-[80px] left-0 right-0 flex justify-center z-50 pointer-events-none">
        <button 
          onClick={() => navigate('/measure')}
          className="pointer-events-auto bg-[#0F172A] text-white flex items-center gap-2 px-8 py-4 rounded-[32px] shadow-[0_8px_30px_rgba(15,23,42,0.3)] hover:scale-105 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="text-[11px] font-bold tracking-widest uppercase mt-0.5">NEW JOB</span>
        </button>
      </div>

      <NavBar />
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
