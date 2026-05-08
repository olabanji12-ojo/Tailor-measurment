import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const HomeScreen: React.FC = () => {
  const { shopName, setViewingProfile, globalSessions, globalSessionsLoading } = useAppContext();
  const navigate = useNavigate();

  const totalRevenue = globalSessions.reduce((sum, s) => sum + (s.total_cost || 0), 0);
  const activeJobs = globalSessions.filter(s => !s.delivery_date || new Date(s.delivery_date) >= new Date()).length;
  
  const formattedRevenue = totalRevenue >= 1000 
    ? `$${(totalRevenue/1000).toFixed(1)}k` 
    : `$${totalRevenue}`;

  const recentClients = globalSessions.slice(0, 3);

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

  const upcomingJob = globalSessions
    .filter(s => s.delivery_date && new Date(s.delivery_date) >= new Date())
    .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime())[0];

  return (
    <div className="flex flex-col min-h-full pb-40">
      <div className="max-w-lg mx-auto w-full">
      
      {/* Top App Bar */}
      <div className="px-6 py-4 flex justify-between items-center bg-transparent">
        <h1 className="font-serif text-xl font-bold tracking-tight text-gray-900">TailorVoice</h1>
        <div className="flex items-center gap-4">
          <button className="text-gray-900">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
            {/* Avatar Placeholder */}
            <img src="https://ui-avatars.com/api/?name=Stitches&background=random" alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Greeting Header */}
      <div className="px-6 mt-6">
        <h2 className="font-serif text-4xl leading-tight font-bold text-gray-900">
          Good Morning,<br />
          {shopName || 'Stitches by Emma'}
        </h2>
        <p className="text-gray-500 mt-2 text-sm">
          {globalSessionsLoading ? 'Crunching numbers...' : `You have ${activeJobs} active jobs scheduled.`}
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="px-6 mt-8 grid grid-cols-2 gap-4">
        <div className="bg-[#F8F9FA] p-5 rounded-[24px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">Active Jobs</p>
          <p className="text-3xl font-bold text-gray-900">{globalSessionsLoading ? '-' : activeJobs}</p>
        </div>
        <div className="bg-[#F8F9FA] p-5 rounded-[24px] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{globalSessionsLoading ? '-' : formattedRevenue}</p>
        </div>
      </div>

      {/* Upcoming Deadlines Widget */}
      {upcomingJob && (
        <div className="px-6 mt-8">
          <div className="bg-[#F8F9FA] rounded-[32px] p-6 border border-gray-100 relative overflow-hidden cursor-pointer hover:border-[#0F172A] transition-colors" onClick={() => { setViewingProfile(upcomingJob); navigate(`/client/${upcomingJob.id}`); }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">Upcoming Deadline</p>
                <h3 className="font-serif text-2xl font-bold text-gray-900 leading-tight truncate">{upcomingJob.garment || 'Custom Fitting'}</h3>
              </div>
              <span className="bg-[#0F172A] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                Next
              </span>
            </div>

            <div className="flex gap-5">
              {/* Image Placeholder */}
              <div className="w-32 h-44 rounded-[24px] overflow-hidden bg-gray-200 flex-shrink-0 shadow-inner">
                {upcomingJob.style_photos && upcomingJob.style_photos.length > 0 ? (
                  <img src={upcomingJob.style_photos[0]} alt="Style" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0F172A] flex items-center justify-center">
                    <span className="text-4xl">✂️</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col justify-between py-1">
                <div>
                  <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">Client</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug truncate max-w-[100px]">{upcomingJob.customer_name}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">Delivery</p>
                  <p className="text-sm font-bold text-gray-900">{new Date(upcomingJob.delivery_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-1">Balance</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      ${Math.max(0, (upcomingJob.total_cost || 0) - (upcomingJob.amount_paid || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Clients List */}
      <div className="px-6 mt-10">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-[11px] font-bold tracking-widest uppercase text-gray-600">Recent Clients</h3>
          <button onClick={() => navigate('/archive')} className="text-[11px] font-medium text-gray-900 underline underline-offset-4">View All</button>
        </div>

        <div className="space-y-3">
          {globalSessionsLoading ? (
            <p className="text-xs text-gray-400 font-medium">Loading records...</p>
          ) : recentClients.length === 0 ? (
            <div className="bg-[#F8F9FA] rounded-[24px] border border-dashed border-gray-200 p-6 text-center">
              <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">No Clients Yet</p>
            </div>
          ) : (
            recentClients.map((client, i) => (
              <div 
                key={i} 
                onClick={() => { setViewingProfile(client); navigate(`/client/${client.id}`); }}
                className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-[24px] border border-gray-100 hover:border-[#0F172A] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm bg-[#0F172A] text-white">
                    {getInitials(client.customer_name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{client.customer_name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-widest">{client.garment || 'Custom Fitting'}</p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            ))
          )}
        </div>
      </div>

      </div>
    </div>
  );
};
