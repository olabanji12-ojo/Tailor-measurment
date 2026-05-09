import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useWhisper } from '../hooks/useWhisper';
import { RecordingButton } from './RecordingButton';
import { VirtualTryOn } from './VirtualTryOn';

export const ClientProfileScreen: React.FC = () => {
  const { viewingProfile, setViewingProfile, globalSessionsLoading, refreshSessions, findPartByLabel } = useAppContext();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { isListening, transcript, toggleListening } = useWhisper();

  const [isEditing, setIsEditing] = React.useState(false);
  const [editTotalCost, setEditTotalCost] = React.useState<number>(0);
  const [editAmountPaid, setEditAmountPaid] = React.useState<number>(0);
  const [editMeasurements, setEditMeasurements] = React.useState<Record<string, number>>({});
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showTryOn, setShowTryOn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten nested data for easy editing
  const flattenData = (obj: any, prefix = ''): Record<string, number> => {
    let flattened: Record<string, number> = {};
    if (!obj) return flattened;
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix} ${key}` : key;
      if (typeof value === 'number') {
        flattened[newKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(flattened, flattenData(value, newKey));
      }
    }
    return flattened;
  };

  useEffect(() => {
    if (viewingProfile) {
      setEditTotalCost(viewingProfile.total_cost || 0);
      setEditAmountPaid(viewingProfile.amount_paid || 0);
      setEditMeasurements(flattenData(viewingProfile.data));
    }
  }, [viewingProfile, isEditing]);

  // Voice Merging Logic (Continuous Listen)
  useEffect(() => {
    if (!isEditing || !transcript) return;
    
    const words = transcript.toLowerCase().split(/\s+/);
    
    let newlyCapturedKey: string | null = null;

    // Try to match voice words to existing measurement keys
    for (let i = 0; i < words.length - 1; i++) {
      const labelCandidate = words[i];
      const num = parseFloat(words[i+1]);
      if (isNaN(num)) continue;

      // Find if this label matches any existing key (or part of it)
      const existingKey = Object.keys(editMeasurements).find(k => 
        k.toLowerCase().includes(labelCandidate)
      );

      if (existingKey) {
        setEditMeasurements(prev => ({ ...prev, [existingKey]: num }));
        newlyCapturedKey = existingKey;
      } else {
        // If not found in existing, check global parts
        const globalPart = findPartByLabel(labelCandidate);
        if (globalPart) {
          setEditMeasurements(prev => ({ ...prev, [globalPart]: num }));
          newlyCapturedKey = globalPart;
        }
      }
    }

    if (newlyCapturedKey) {
      setLastCaptured(newlyCapturedKey);
      setTimeout(() => setLastCaptured(null), 3000);
    }
  }, [transcript, isEditing]);

  const handleSave = async () => {
    if (!viewingProfile) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/measurements/${viewingProfile.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          total_cost: Number(editTotalCost),
          amount_paid: Number(editAmountPaid),
          data: editMeasurements
        })
      });

      if (response.ok) {
        setIsEditing(false);
        refreshSessions(); // Refresh the global list
        // Update local state too
        setViewingProfile({
          ...viewingProfile,
          total_cost: Number(editTotalCost),
          amount_paid: Number(editAmountPaid),
          data: editMeasurements
        });
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleDelete = async () => {
    if (!viewingProfile) return;
    if (!window.confirm(`Are you sure you want to delete ${viewingProfile.customer_name}'s record?`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/measurements/${viewingProfile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        refreshSessions();
        navigate('/archive');
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (!viewingProfile) {
    return (
      <div className="flex flex-col min-h-full pb-32 bg-[#FDFDFD] justify-center items-center h-screen">
         <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
            {globalSessionsLoading ? 'Loading Profile...' : 'No Client Selected'}
         </p>
         {!globalSessionsLoading && (
           <button onClick={() => navigate('/archive')} className="mt-4 px-6 py-3 bg-[#0F172A] text-white rounded-full text-[10px] tracking-widest font-bold uppercase">
             Back to Archives
           </button>
         )}
      </div>
    );
  }

  // Calculate real balance
  const balanceOwed = (viewingProfile.total_cost || 0) - (viewingProfile.amount_paid || 0);

  // Parse measurements (handling both flat and nested JSON maps)
  const measurements: { label: string, value: number }[] = [];
  const parseData = (dataObj: any, prefix = '') => {
    if (!dataObj) return;
    for (const [key, value] of Object.entries(dataObj)) {
      if (typeof value === 'number') {
        measurements.push({ label: prefix ? `${prefix} ${key}` : key, value });
      } else if (typeof value === 'object' && value !== null) {
        parseData(value, key);
      }
    }
  };
  parseData(viewingProfile.data);

  const displayDate = viewingProfile.date ? new Date(viewingProfile.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
  const dueDate = viewingProfile.delivery_date ? new Date(viewingProfile.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date';

  // Format fabrics
  const fabrics = (viewingProfile.style_photos || []).map((url, i) => ({
    name: `Reference ${i + 1}`,
    url
  }));

  return (
    <div className="flex flex-col min-h-full pb-44 bg-[#FDFDFD]">
      
      {/* Top App Bar */}
      <div className="-mx-6 -mt-6 px-6 py-4 flex justify-between items-center bg-transparent mb-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shadow-sm">
            <img src="https://ui-avatars.com/api/?name=J+S&background=random" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-gray-900">TailorVoice</h1>
        </div>
        <button className="text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>
      </div>

      {/* Client Header */}
      <div className="flex justify-between items-start mb-8 px-1">
        <div>
          <h2 className="font-serif text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-3">
            {viewingProfile.customer_name}
          </h2>
          <div className="flex gap-2 items-center">
            {isEditing ? (
              <div className="flex flex-col gap-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total Cost (₦)</label>
                  <input 
                    type="number" 
                    value={editTotalCost} 
                    onChange={e => setEditTotalCost(Number(e.target.value))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold border-none focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Amount Paid (₦)</label>
                  <input 
                    type="number" 
                    value={editAmountPaid} 
                    onChange={e => setEditAmountPaid(Number(e.target.value))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold border-none focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>
              </div>
            ) : (
              <>
                {balanceOwed > 0 && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-500 text-[11px] font-bold tracking-wide uppercase border border-red-100">
                    Owes ₦{balanceOwed}
                  </div>
                )}
                {balanceOwed <= 0 && viewingProfile.total_cost > 0 && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-bold tracking-wide uppercase border border-green-100">
                    Paid in Full
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`w-12 h-12 flex-shrink-0 rounded-full border flex items-center justify-center shadow-sm transition-all ${
              isEditing ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isEditing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            )}
          </button>
          
          <button 
            onClick={() => isEditing ? setIsEditing(false) : handleDelete()}
            className={`w-12 h-12 flex-shrink-0 rounded-full border flex items-center justify-center shadow-sm transition-all ${
              isEditing ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-red-50 border-red-100 text-red-400 hover:bg-red-100'
            }`}
          >
            {isEditing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Selected Fabrics */}
      {fabrics.length > 0 && (
        <div className="mb-10 px-1">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">Style References</h3>
          <div className="grid grid-cols-2 gap-4">
            {fabrics.map((fabric, idx) => (
              <div key={idx} className="relative aspect-square rounded-[20px] overflow-hidden shadow-sm border border-gray-100 group">
                <img src={fabric.url} alt={fabric.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-3 border-t border-white/40">
                  <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">{fabric.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body Measurements */}
      {measurements.length > 0 && (
        <div className="mb-10 px-1">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Body Measurements</h3>
              <span className="text-[10px] text-gray-400 italic">Updated {displayDate}</span>
            </div>
            
            {/* Minimal Search Button/Input */}
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Search part..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`transition-all duration-500 bg-[#F8F9FA] rounded-full text-[10px] font-bold px-4 py-2 border-none focus:ring-2 focus:ring-[#0F172A]/10 outline-none ${searchTerm ? 'w-32 opacity-100' : 'w-24 opacity-60 hover:opacity-100'}`}
              />
              <svg className="absolute right-3 w-3 h-3 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {isEditing ? (
              <>
                {Object.entries(editMeasurements)
                  .filter(([label]) => label.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(([label, value], idx) => (
                  <div 
                    key={idx} 
                    className={`bg-white border rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-300 ${
                      lastCaptured === label ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 leading-tight">{label}</span>
                    {lastCaptured === label && <p className="text-[8px] font-bold text-green-500 uppercase tracking-widest mb-1 animate-pulse">Just Updated</p>}
                    <input 
                      type="number" 
                      value={value} 
                      onChange={e => setEditMeasurements({...editMeasurements, [label]: Number(e.target.value)})}
                      className="w-full bg-gray-50 rounded-lg px-2 py-1 text-xl font-bold border-none focus:ring-0"
                    />
                  </div>
                ))}
                
                {/* Manual Add New Field */}
                {isAddingNew ? (
                  <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-[24px] p-5 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Part Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Inseam"
                          value={newLabel}
                          onChange={e => setNewLabel(e.target.value)}
                          className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold border-none shadow-sm focus:ring-2 focus:ring-[#0F172A]/10"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Value ({viewingProfile.unit || 'in'})</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={newValue}
                          onChange={e => setNewValue(e.target.value)}
                          className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold border-none shadow-sm focus:ring-2 focus:ring-[#0F172A]/10"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => {
                          if (newLabel && newValue) {
                            setEditMeasurements({...editMeasurements, [newLabel]: Number(newValue)});
                            setNewLabel(''); setNewValue(''); setIsAddingNew(false);
                          }
                        }}
                        className="flex-1 h-12 bg-[#0F172A] text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md"
                      >
                        Add to Profile
                      </button>
                      <button onClick={() => setIsAddingNew(false)} className="px-6 h-12 bg-white text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gray-100 shadow-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsAddingNew(true)}
                    className="col-span-2 h-16 border-2 border-dashed border-gray-200 rounded-[24px] flex items-center justify-center text-gray-400 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-widest">+ Add New Measurement</span>
                  </button>
                )}
              </>
            ) : (
              measurements
                .filter(m => m.label.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((m, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 leading-tight">{m.label}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{m.value}</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase">{viewingProfile.unit || 'in'}</span>
                    </div>
                  </div>
                ))
            )}
            
            {/* Search Empty State */}
            {searchTerm && measurements.filter(m => m.label.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <div className="col-span-2 py-10 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">No match for "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')} className="mt-2 text-[#0F172A] text-[10px] font-bold underline underline-offset-4 uppercase tracking-widest">Clear Search</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A.I. Design Tools */}
      <div className="px-1 mb-10">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">A.I. Design Tools</h3>
        <button 
          onClick={() => setShowTryOn(true)}
          className="w-full bg-gradient-to-r from-[#0F172A] to-[#1e293b] rounded-[24px] p-6 shadow-xl flex items-center gap-4 text-white group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="text-left">
            <h4 className="font-serif text-xl font-bold mb-0.5">Virtual Try-On</h4>
            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Preview Fabrics & Colors</p>
          </div>
          <div className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </button>
      </div>

      {/* Active Order Pill */}
      <div className="px-1 mb-20">
        <div className="bg-[#0F172A] rounded-[32px] p-6 shadow-xl flex justify-between items-center text-white cursor-pointer hover:bg-black transition-colors">
          <div>
            <h4 className="font-serif text-xl font-bold mb-1">Active Order</h4>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">{viewingProfile.garment || 'Custom Fitting'}</p>
          </div>
          <div className="text-right">
            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">DUE DATE</span>
            <span className="font-bold text-sm tracking-wide">{dueDate}</span>
          </div>
        </div>
      </div>

      {/* Floating Voice Control in Edit Mode */}
      {isEditing && (
        <div className="fixed bottom-[110px] left-0 right-0 flex flex-col items-center gap-3 z-[60] animate-in slide-in-from-bottom-4 pointer-events-none">
          {isListening && (
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border border-gray-100 shadow-xl flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Listening for commands...</p>
            </div>
          )}
          <div className="pointer-events-auto">
            <RecordingButton isListening={isListening} onClick={toggleListening} />
          </div>
        </div>
      )}

      {/* Virtual Try-On Lab Overlay */}
      {showTryOn && (
        <VirtualTryOn 
          clientName={viewingProfile.customer_name} 
          onClose={() => setShowTryOn(false)} 
        />
      )}
    </div>
  );
};