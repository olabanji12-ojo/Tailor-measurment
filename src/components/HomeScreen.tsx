import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { JobCard } from './ui/JobCard';

export const HomeScreen: React.FC = () => {
  const { shopName, setViewingProfile, globalSessions, globalSessionsLoading } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const profileImage = localStorage.getItem(`profile_img_${user?.id}`) || '';
  const ownerName = user?.email.split('@')[0] || 'Tailor';

  const [activeTab, setActiveTab] = useState<'atelier' | 'analytics'>('atelier');
  const [promptClient, setPromptClient] = useState<{ id: string; name: string; balance: number; garment: string } | null>(null);
  const [enteredPhone, setEnteredPhone] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  // Math Calculations for Dashboard
  const activeJobsList = globalSessions.filter(s => s.delivery_date && new Date(s.delivery_date) >= new Date());
  const activeJobsCount = activeJobsList.length;

  const totalRevenuePipeline = globalSessions.reduce((sum, s) => sum + (s.total_cost || 0), 0);
  const totalRevenuePaid = globalSessions.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const totalOutstandingDebt = globalSessions.reduce((sum, s) => {
    const debt = (s.total_cost || 0) - (s.amount_paid || 0);
    return sum + (debt > 0 ? debt : 0);
  }, 0);

  // Check how many active jobs have hit their reminder date or passed it
  const overdueRemindersCount = globalSessions.filter(s => {
    if (!s.reminder_date) return false;
    const isActive = !s.delivery_date || new Date(s.delivery_date) >= new Date();
    const hasBalance = (s.total_cost || 0) - (s.amount_paid || 0) > 0;
    return isActive && hasBalance && new Date(s.reminder_date) <= new Date();
  }).length;

  // Filter list of debtors
  const debtors = globalSessions.filter(s => (s.total_cost || 0) - (s.amount_paid || 0) > 0);

  const formattedRevenuePaid = totalRevenuePaid >= 1000 
    ? `₦${(totalRevenuePaid/1000).toFixed(1)}k` 
    : `₦${totalRevenuePaid}`;

  const formattedRevenuePipeline = totalRevenuePipeline >= 1000 
    ? `₦${(totalRevenuePipeline/1000).toFixed(1)}k` 
    : `₦${totalRevenuePipeline}`;

  const formattedDebt = totalOutstandingDebt >= 1000 
    ? `₦${(totalOutstandingDebt/1000).toFixed(1)}k` 
    : `₦${totalOutstandingDebt}`;

  const recentClients = globalSessions.slice(0, 3);
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

  // Carousel Upcoming Jobs List
  const upcomingJobs = globalSessions
    .filter(s => s.delivery_date && new Date(s.delivery_date) >= new Date())
    .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());

  const handleSendReminder = (client: any) => {
    const balance = Math.max(0, (client.total_cost || 0) - (client.amount_paid || 0));
    const cachedPhone = localStorage.getItem(`phone_${client.id}`);
    if (cachedPhone) {
      triggerWhatsApp(client, cachedPhone, balance);
    } else {
      setPromptClient({ id: client.id, name: client.customer_name, balance, garment: client.garment || 'outfit' });
      setEnteredPhone('');
    }
  };

  const triggerWhatsApp = (client: any, phone: string, balance: number) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Hello ${client.customer_name || client.name}! 🧵 This is a friendly reminder from ${user?.shop_name || shopName} regarding your ${client.garment || 'outfit'}. The garment is ready! The outstanding balance is ₦${balance.toLocaleString()}. Please let us know when you'd like to drop by to collect. Thank you! ✨`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const submitPhonePrompt = () => {
    if (!promptClient || !enteredPhone.trim()) return;
    localStorage.setItem(`phone_${promptClient.id}`, enteredPhone.trim());
    const client = globalSessions.find(s => s.id === promptClient.id);
    if (client) {
      triggerWhatsApp(client, enteredPhone.trim(), promptClient.balance);
    }
    setPromptClient(null);
  };

  return (
    <div className="flex flex-col min-h-full pb-36 relative font-sans text-primary">
      <div className="max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto w-full">
      
        {/* Top App Bar */}
        <div className="px-6 py-5 flex justify-between items-center bg-transparent">
          <span className="font-serif text-2xl font-semibold tracking-tighter text-primary">
            TailorVoice
          </span>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-bg-secondary overflow-hidden border border-accent/20 shadow-sm">
              {profileImage ? (
                <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://ui-avatars.com/api/?name=${ownerName}&background=FAF7F2&color=1B120F`} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        </div>

        {/* Greeting Header */}
        <div className="px-6 mt-4">
          <span className="text-[9px] font-bold text-accent tracking-[0.3em] uppercase block mb-1">
            Digital Atelier
          </span>
          <h2 className="font-serif text-3.5xl leading-tight font-medium text-primary">
            {getGreeting()}<br />
            <span className="italic font-normal">{user?.shop_name || shopName}</span>
          </h2>
          <p className="text-text-muted mt-2 text-xs leading-relaxed">
            {globalSessionsLoading ? 'Crunching records...' : `Monitor pending fittings, total pipeline values, and collections.`}
          </p>
        </div>

        {/* Premium Sliding Segmented Tab Control */}
        <div className="px-6 mt-6">
          <div className="bg-bg-secondary/60 p-1 rounded-2xl flex gap-1 border border-primary/2">
            <button 
              onClick={() => setActiveTab('atelier')}
              className={`flex-1 py-3 text-center rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 relative z-10 ${
                activeTab === 'atelier' ? 'bg-white text-primary shadow-sm border border-primary/2' : 'text-text-muted hover:text-primary'
              }`}
            >
              Atelier Feed
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-3 text-center rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 relative z-10 ${
                activeTab === 'analytics' ? 'bg-white text-primary shadow-sm border border-primary/2' : 'text-text-muted hover:text-primary'
              }`}
            >
              Analytics Board
            </button>
          </div>
        </div>

        {/* -------------------- TAB 1: ATELIER FEED -------------------- */}
        {activeTab === 'atelier' && (
          <div className="animate-in fade-in duration-300 md:grid md:grid-cols-5 md:gap-8 md:px-6 mt-8">
            {/* Left Column: Stats & Recent Clients */}
            <div className="md:col-span-2 space-y-6">
              {/* Quick Stats Grid */}
              <div className="px-6 md:px-0 grid grid-cols-2 gap-4">
                <Card bg="white" shadow="sm" className="p-5 border border-primary/2">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-accent mb-1">Active Fittings</p>
                  <p className="text-3xl font-bold text-primary font-sans">{globalSessionsLoading ? '-' : activeJobsCount}</p>
                </Card>
                <Card bg="white" shadow="sm" className="p-5 border border-primary/2">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-accent mb-1">Cash In Hand</p>
                  <p className="text-3xl font-bold text-primary font-sans">{globalSessionsLoading ? '-' : formattedRevenuePaid}</p>
                </Card>
              </div>

              {/* Recent Clients List */}
              <div className="px-6 md:px-0">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Recent Clients</h3>
                  <button onClick={() => navigate('/archive')} className="text-[10px] font-bold text-primary underline underline-offset-4 tracking-wider uppercase hover:text-accent transition-colors">View All</button>
                </div>

                <div className="space-y-3">
                  {globalSessionsLoading ? (
                    <p className="text-xs text-text-muted font-medium">Loading records...</p>
                  ) : recentClients.length === 0 ? (
                    <Card bg="white" shadow="md" className="p-10 border border-dashed border-primary/10 text-center flex flex-col items-center gap-4">
                      <div className="w-14 h-14 bg-bg-secondary rounded-full flex items-center justify-center border border-accent/15">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="6" x2="12" y2="18"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-serif text-xl font-medium text-primary">Your Atelier is Empty</h4>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1.5">Start your first fitting to log records here.</p>
                      </div>
                      <button 
                        onClick={() => navigate('/measure')}
                        className="mt-2 bg-primary hover:bg-primary/95 text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg transition-transform active:scale-95"
                      >
                        Start Measurement
                      </button>
                    </Card>
                  ) : (
                    recentClients.map((client, i) => (
                      <div 
                        key={i} 
                        onClick={() => { setViewingProfile(client); navigate(`/client/${client.id}`); }}
                        className="flex items-center justify-between p-4 bg-white rounded-[24px] border border-border-subtle shadow-sm shadow-primary/1 hover:border-accent/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden shadow-inner border border-border-subtle bg-bg-secondary flex items-center justify-center">
                            {client.client_photo ? (
                              <img src={client.client_photo} alt={client.customer_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-xs text-primary">
                                {getInitials(client.customer_name)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-primary text-sm leading-none">{client.customer_name}</p>
                            <p className="text-[9px] text-text-muted mt-1.5 uppercase tracking-widest">{client.garment || 'Custom Fitting'}</p>
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Upcoming Deadlines */}
            <div className="md:col-span-3">
              {upcomingJobs.length > 0 && (
                <div className="mt-8 md:mt-0 select-none">
                  <div className="px-6 md:px-0 flex justify-between items-end mb-4">
                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Garment Fittings</h3>
                    <span className="text-[9px] font-bold text-accent tracking-widest uppercase">{upcomingJobs.length} Pending</span>
                  </div>
                  
                  {/* Horizontal Scroll Box on mobile, Grid on desktop */}
                  <div className="flex md:grid md:grid-cols-2 gap-4 overflow-x-auto md:overflow-x-visible px-6 md:px-0 pb-6 md:pb-0 custom-scrollbar scroll-smooth snap-x snap-mandatory">
                    {upcomingJobs.map((job) => (
                      <div key={job.id} className="snap-center">
                        <JobCard 
                          clientName={job.customer_name}
                          garmentType={job.garment || 'Custom Outfit'}
                          deliveryDate={new Date(job.delivery_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          status={Math.max(0, (job.total_cost || 0) - (job.amount_paid || 0)) > 0 ? 'Collect Balance' : 'Ready'}
                          onClick={() => { setViewingProfile(job); navigate(`/client/${job.id}`); }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 2: BOUTIQUE ANALYTICS -------------------- */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-300 md:grid md:grid-cols-5 md:gap-8 md:px-6 mt-8">
            
            {/* Left Column: Analytics Stats & Optimizer Link */}
            <div className="md:col-span-2 space-y-6 px-6 md:px-0">
              {/* Extended Analytics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card bg="white" shadow="sm" className="p-5 border border-primary/2 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-accent mb-1">Expected Pipe</p>
                    <p className="text-2xl font-bold text-primary font-sans">{globalSessionsLoading ? '-' : formattedRevenuePipeline}</p>
                  </div>
                  <span className="text-[9px] font-bold text-text-muted block mt-3">Expected Revenue</span>
                </Card>

                <div className="bg-rose-50/20 p-5 rounded-[24px] border border-rose-100 shadow-sm flex flex-col justify-between h-36">
                  <div>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-rose-700 mb-1">Debts Owed</p>
                    <p className="text-2xl font-bold text-rose-800 font-sans">{globalSessionsLoading ? '-' : formattedDebt}</p>
                  </div>
                  {overdueRemindersCount > 0 ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-rose-100/60 border border-rose-200 text-rose-800 text-[8px] font-bold uppercase tracking-widest mt-3 w-fit">
                      {overdueRemindersCount} Reminders
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-rose-500 block mt-3">Outstanding</span>
                  )}
                </div>
              </div>

              {/* Fabric Layout Optimizer Card */}
              <div 
                onClick={() => navigate('/optimizer')}
                className="bg-primary hover:bg-primary/95 rounded-[28px] p-6 shadow-[0_12px_40px_rgba(27,18,15,0.12)] text-white flex items-center justify-between cursor-pointer hover:scale-[1.01] active:scale-95 transition-all border border-accent/25"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                      <line x1="6" y1="6" x2="6" y2="10"></line>
                      <line x1="10" y1="6" x2="10" y2="10"></line>
                      <line x1="14" y1="6" x2="14" y2="10"></line>
                      <line x1="18" y1="6" x2="18" y2="10"></line>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-serif text-lg font-medium text-[#FAF7F2]">Zero-Waste Optimizer</h4>
                    <p className="text-[9px] text-[#FAF7F2]/60 font-bold uppercase tracking-widest mt-0.5">Optimize pattern nesting cuts</p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>

            {/* Right Column: Collections Feed */}
            <div className="md:col-span-3 px-6 md:px-0 mt-8 md:mt-0">
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Collections Feed</h3>
                
                <div className="space-y-3 pb-8">
                  {globalSessionsLoading ? (
                    <p className="text-xs text-text-muted font-medium">Crunching records...</p>
                  ) : debtors.length === 0 ? (
                    <Card bg="white" shadow="sm" className="p-8 border border-dashed border-primary/10 text-center py-10">
                      <span className="text-2xl block mb-2">💸</span>
                      <h4 className="font-serif text-lg font-medium text-primary">Paid In Full</h4>
                      <p className="text-[9px] text-[#059669] font-bold uppercase tracking-widest mt-1">Zero outstanding balances detected.</p>
                    </Card>
                  ) : (
                    debtors.map((debtor, index) => {
                      const balance = (debtor.total_cost || 0) - (debtor.amount_paid || 0);
                      return (
                        <div 
                          key={index}
                          className="bg-white rounded-[24px] border border-border-subtle p-4 shadow-sm flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-bg-secondary border border-border-subtle flex items-center justify-center">
                              {debtor.client_photo ? (
                                <img src={debtor.client_photo} alt={debtor.customer_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-xs text-primary">
                                  {getInitials(debtor.customer_name)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-primary text-sm leading-none">{debtor.customer_name}</p>
                              <p className="text-[9px] font-bold text-red-500 mt-1.5">Owes ₦{balance.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Send WhatsApp reminder */}
                          <button
                            onClick={() => handleSendReminder(debtor)}
                            className="h-10 px-4 bg-[#F5EFE6] hover:bg-[#ebdcc3] active:scale-95 transition-all rounded-full flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase border border-accent/20 text-primary"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Remind
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

      </div>

      {/* -------------------- PHONE PROMPT DIALOG DIALOG -------------------- */}
      {promptClient && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pb-10 px-6">
          <div 
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setPromptClient(null)}
          />
          <div className="relative bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-300 border border-primary/5">
            <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mb-5 mx-auto border border-accent/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <h3 className="font-serif text-2xl font-bold text-gray-900 text-center mb-2">WhatsApp Contact</h3>
            <p className="text-xs text-text-muted text-center leading-relaxed mb-6">
              Enter phone contact for <span className="font-bold text-primary">{promptClient.name}</span> to open reminder link.
            </p>

            <div className="space-y-4">
              <input 
                type="text"
                value={enteredPhone}
                onChange={e => setEnteredPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitPhonePrompt()}
                placeholder="E.g. +2348012345678"
                className="w-full h-12 bg-bg-secondary rounded-2xl px-4 text-sm font-bold text-primary border border-border-subtle focus:border-accent text-center outline-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitPhonePrompt}
                  className="flex-1 h-12 bg-primary hover:bg-primary/95 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-transform"
                >
                  Send
                </button>
                <button
                  onClick={() => setPromptClient(null)}
                  className="px-6 h-12 bg-bg-secondary text-primary rounded-full font-bold text-xs uppercase tracking-widest border border-border-subtle active:scale-95 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
