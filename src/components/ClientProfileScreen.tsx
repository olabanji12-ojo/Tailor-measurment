import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useWhisper, playSensorySound } from '../hooks/useWhisper';
import { VirtualTryOn } from './VirtualTryOn';
import { exportToImage } from '../utils/imageExport';
import { shareMeasurementCard } from '../utils/shareCard';
import { parseMeasurements } from '../utils/parser';

const ANATOMICAL_LIMITS: Record<string, { min: number; max: number; label: string }> = {
  neck: { min: 10, max: 25, label: "Neck Size" },
  shoulder: { min: 12, max: 30, label: "Shoulder Width" },
  chest: { min: 25, max: 80, label: "Chest Circumference" },
  waist: { min: 20, max: 75, label: "Waist Size" },
  hip: { min: 25, max: 85, label: "Hip Size" },
  sleeve: { min: 10, max: 40, label: "Sleeve Length" },
  inseam: { min: 15, max: 48, label: "Inseam" },
  length: { min: 20, max: 75, label: "Garment Length" }
};



export const ClientProfileScreen: React.FC = () => {
  const { viewingProfile, setViewingProfile, globalSessionsLoading, refreshSessions, shopName } = useAppContext();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { isListening, transcript, toggleListening } = useWhisper();

  const [isEditing, setIsEditing] = React.useState(false);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editGarment, setEditGarment] = useState<string>('');
  const [editTotalCost, setEditTotalCost] = React.useState<number>(0);
  const [editAmountPaid, setEditAmountPaid] = React.useState<number>(0);
  const [editDeliveryDate, setEditDeliveryDate] = React.useState<string>('');
  const [editReminderDate, setEditReminderDate] = React.useState<string>('');
  const [editMeasurements, setEditMeasurements] = React.useState<Record<string, number>>({});
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showTryOn, setShowTryOn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePartField, setActivePartField] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // 🌟 HCI Usability Additions
  const [borderStatus, setBorderStatus] = useState<'idle' | 'success' | 'anomaly'>('idle');

  const [activeWarning, setActiveWarning] = useState<{ part: string; value: number; message: string } | null>(null);

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
      setEditCustomerName(viewingProfile.customer_name || '');
      setEditGarment(viewingProfile.garment || '');
      setEditTotalCost(viewingProfile.total_cost || 0);
      setEditAmountPaid(viewingProfile.amount_paid || 0);
      setEditMeasurements(flattenData(viewingProfile.data));
      setEditDeliveryDate(viewingProfile.delivery_date || '');
      setEditReminderDate(viewingProfile.reminder_date || '');
    }
  }, [viewingProfile, isEditing]);



  // Safe manual updating with history logs
  const updateMeasurementDirectly = (key: string, val: number) => {
    if (val < 0) return;
    setEditMeasurements(prev => ({ ...prev, [key]: val }));
  };

  const handleBlur = (key: string, val: number) => {
    setActivePartField(null);
    if (val <= 0) return;

    // Check outlier boundary on blur
    const normalizedKey = key.toLowerCase();
    const matchedLimitKey = Object.keys(ANATOMICAL_LIMITS).find(k => normalizedKey.includes(k));
    if (matchedLimitKey) {
      const limit = ANATOMICAL_LIMITS[matchedLimitKey];
      if (val < limit.min || val > limit.max) {
        playSensorySound('error');
        setBorderStatus('anomaly');
        setTimeout(() => setBorderStatus('idle'), 1500);
        setActiveWarning({
          part: key,
          value: val,
          message: `${limit.label} of ${val}" is statistically anomalous (Standard range: ${limit.min}" - ${limit.max}").`
        });
      }
    }
  };

  const confirmAnomaly = () => {
    if (!activeWarning) return;
    const { part, value } = activeWarning;
    setEditMeasurements(prev => ({ ...prev, [part]: value }));
    setActiveWarning(null);
    playSensorySound('success');
    setBorderStatus('success');
    setTimeout(() => setBorderStatus('idle'), 1000);
  };

  const rejectAnomaly = () => {
    setActiveWarning(null);
  };

  // Voice Merging Logic (Continuous Listen) with Advanced Voice Parser
  useEffect(() => {
    if (!isEditing || !transcript) return;
    
    const result = parseMeasurements(transcript);
    let capturedSomething = false;

    // Handle structural commands from voice
    result.commands.forEach(cmd => {
      if (cmd.type === 'finish') {
        handleSave();
      } else if (cmd.type === 'add' && cmd.target && cmd.value) {
        const safePart = cmd.target.toLowerCase().replace(/\s+/g, '_');
        setEditMeasurements(prev => ({ ...prev, [safePart]: cmd.value! }));
        setLastCaptured(safePart);
        capturedSomething = true;
      }
    });

    // Handle measurements
    Object.entries(result.measurements).forEach(([part, val]) => {
      const targetKey = 
        Object.keys(editMeasurements).find(k => k.toLowerCase() === part.toLowerCase()) ||
        Object.keys(editMeasurements).find(k => k.toLowerCase().includes(part.toLowerCase()));

      if (targetKey && editMeasurements[targetKey] !== val) {
        const normalizedKey = targetKey.toLowerCase();
        const matchedLimitKey = Object.keys(ANATOMICAL_LIMITS).find(k => normalizedKey.includes(k));
        
        if (matchedLimitKey) {
          const limit = ANATOMICAL_LIMITS[matchedLimitKey];
          if (val < limit.min || val > limit.max) {
            playSensorySound('error');
            setBorderStatus('anomaly');
            setTimeout(() => setBorderStatus('idle'), 1500);
            setActiveWarning({
              part: targetKey,
              value: val,
              message: `${limit.label} of ${val}" is statistically anomalous (Standard range: ${limit.min}" - ${limit.max}").`
            });
            return;
          }
        }

        setEditMeasurements(prev => ({ ...prev, [targetKey]: val }));
        setLastCaptured(targetKey);
        capturedSomething = true;
      }
    });

    if (capturedSomething) {
      playSensorySound('success');
      setBorderStatus('success');
      setTimeout(() => {
        setLastCaptured(null);
        setBorderStatus('idle');
      }, 1500);
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
          customer_name: editCustomerName,
          garment: editGarment,
          total_cost: Number(editTotalCost),
          amount_paid: Number(editAmountPaid),
          delivery_date: editDeliveryDate,
          reminder_date: editReminderDate,
          data: editMeasurements
        })
      });

      if (response.ok) {
        setIsEditing(false);
        refreshSessions(); // Refresh the global list
        // Update local state too
        setViewingProfile({
          ...viewingProfile,
          customer_name: editCustomerName,
          garment: editGarment,
          total_cost: Number(editTotalCost),
          amount_paid: Number(editAmountPaid),
          delivery_date: editDeliveryDate,
          reminder_date: editReminderDate,
          data: editMeasurements
        });
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };



  if (!viewingProfile) {
    return (
      <div className="flex flex-col min-h-full pb-32 bg-[#FDFDFD] justify-center items-center">
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
  const displayReminderDate = viewingProfile.reminder_date ? new Date(viewingProfile.reminder_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date';

  // Format fabrics
  const fabrics = (viewingProfile.style_photos || []).map((url, i) => ({
    name: `Reference ${i + 1}`,
    url
  }));

  return (
    <div className={`flex flex-col min-h-full pb-44 bg-bg-light px-6 transition-all duration-300 ${
      borderStatus === 'success' ? 'ring-8 ring-emerald-400/30' :
      borderStatus === 'anomaly' ? 'ring-8 ring-rose-500/40' : ''
    }`}>
      
      {/* Premium Top Navigation Bar */}
      <div className="py-5 flex justify-between items-center bg-transparent mb-2">
        <button 
          onClick={() => navigate('/archive')}
          className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center text-primary active:scale-95 transition-transform shadow-sm"
          title="Back to Archives"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div className="flex gap-2">
          {isEditing ? (
            <button 
              onClick={handleSave}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
            >
              Save
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="h-10 px-5 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md"
            >
              Edit
            </button>
          )}
          {isEditing && (
            <button 
              onClick={() => setIsEditing(false)}
              className="h-10 px-5 bg-white border border-border-subtle text-text-muted rounded-full text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Dossier info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Centered Client Profile Photo */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full border-[3px] border-accent p-0.5 shadow-md bg-white">
              <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary flex items-center justify-center">
                {viewingProfile.client_photo ? (
                  <img src={viewingProfile.client_photo} alt={viewingProfile.customer_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-3xl font-bold text-accent">
                    {viewingProfile.customer_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Client Header Name */}
          <div className="text-center px-4">
            {isEditing ? (
              <div className="space-y-1.5 text-left w-full">
                <label className="text-[10px] font-bold text-accent uppercase tracking-widest block">Customer Name</label>
                <input 
                  type="text" 
                  value={editCustomerName}
                  onChange={e => setEditCustomerName(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-2xl px-4 py-3 text-lg font-bold font-serif text-primary focus:border-accent outline-none shadow-sm"
                  placeholder="Client Name"
                />
              </div>
            ) : (
              <>
                <span className="font-serif text-[11px] italic tracking-wide text-text-muted">Cormorant Garamond</span>
                <h2 className="font-serif text-3.5xl font-semibold text-primary tracking-wide leading-tight mt-1 uppercase">
                  {viewingProfile.customer_name}
                </h2>
              </>
            )}
          </div>

          {/* Balance Badges */}
          {!isEditing && (
            <div className="flex justify-center">
              {balanceOwed > 0 ? (
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold tracking-wide uppercase border border-rose-100">
                  Owes ₦{balanceOwed}
                </div>
              ) : viewingProfile.total_cost > 0 ? (
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold tracking-wide uppercase border border-emerald-100">
                  Paid in Full
                </div>
              ) : null}
            </div>
          )}

          {/* Side-by-side Actions (WhatsApp & Share) */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  const cachedPhone = localStorage.getItem(`phone_${viewingProfile.id}`) || '';
                  const message = `Hello ${viewingProfile.customer_name}! 🧵 This is a friendly update regarding your fitting. Your measurements are logged in our atelier.`;
                  const cleanPhone = cachedPhone.replace(/\D/g, '');
                  if (cleanPhone) {
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                  } else {
                    const phone = prompt("Enter client phone number:", "");
                    if (phone) {
                      localStorage.setItem(`phone_${viewingProfile.id}`, phone);
                      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                    }
                  }
                }}
                className="h-12 bg-bg-secondary/60 hover:bg-bg-secondary hover:text-primary transition-colors text-text-muted rounded-2xl font-sans text-xs font-semibold flex items-center justify-center gap-2 border border-border-subtle active:scale-98"
              >
                <span className="text-sm">💬</span> WhatsApp
              </button>
              
              <button
                onClick={async () => {
                  setIsSharing(true);
                  try {
                    await shareMeasurementCard({
                      customerName: viewingProfile.customer_name,
                      shopName,
                      garments: viewingProfile.garment ? [viewingProfile.garment] : [],
                      measurementsByGarment: { [viewingProfile.garment || 'Outfit']: editMeasurements },
                      getLabel: (p) => p,
                      unit: viewingProfile.unit || 'in',
                      deliveryDate: viewingProfile.delivery_date || '',
                      totalCost: viewingProfile.total_cost,
                      amountPaid: viewingProfile.amount_paid,
                    });
                  } catch (e) { }
                  finally { setIsSharing(false); }
                }}
                className="h-12 bg-bg-secondary/60 hover:bg-bg-secondary hover:text-primary transition-colors text-text-muted rounded-2xl font-sans text-xs font-semibold flex items-center justify-center gap-2 border border-border-subtle active:scale-98"
              >
                {isSharing ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-sm">🔗</span>
                )}
                {isSharing ? 'Sharing...' : 'Share'}
              </button>
            </div>
          )}

          {/* Active Order Pill / Order Edit Form */}
          <div className="px-1">
            {isEditing ? (
              <div className="bg-white border border-border-subtle rounded-[32px] p-6 shadow-sm space-y-4">
                <h4 className="font-serif text-lg font-semibold text-primary border-b border-border-subtle pb-2">Order Details</h4>
                
                <div>
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Garment Type</label>
                  <input 
                    type="text" 
                    value={editGarment}
                    onChange={e => setEditGarment(e.target.value)}
                    className="w-full bg-bg-secondary/45 rounded-xl px-4 py-2.5 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
                    placeholder="e.g. Senator, Kaftan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Total Cost (₦)</label>
                    <input 
                      type="number" 
                      value={editTotalCost || ''}
                      onChange={e => setEditTotalCost(Number(e.target.value))}
                      className="w-full bg-bg-secondary/45 rounded-xl px-4 py-2.5 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Amount Paid (₦)</label>
                    <input 
                      type="number" 
                      value={editAmountPaid || ''}
                      onChange={e => setEditAmountPaid(Number(e.target.value))}
                      className="w-full bg-bg-secondary/45 rounded-xl px-4 py-2.5 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Reminder Date</label>
                    <input 
                      type="date" 
                      value={editReminderDate}
                      onChange={e => setEditReminderDate(e.target.value)}
                      className="w-full bg-bg-secondary/45 rounded-xl px-4 py-2.5 text-sm font-bold border border-border-subtle focus:border-accent outline-none text-text-muted"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Delivery Date</label>
                    <input 
                      type="date" 
                      value={editDeliveryDate}
                      onChange={e => setEditDeliveryDate(e.target.value)}
                      className="w-full bg-bg-secondary/45 rounded-xl px-4 py-2.5 text-sm font-bold border border-border-subtle focus:border-accent outline-none text-text-muted"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-primary rounded-[32px] p-6 shadow-xl flex justify-between items-center text-white cursor-pointer hover:bg-black transition-colors border border-accent/15">
                <div>
                  <h4 className="font-serif text-lg font-medium text-accent">Active Order</h4>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">{viewingProfile.garment || 'Custom Outfit'}</p>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="text-right">
                    <span className="block text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">REMINDER</span>
                    <span className="font-bold text-xs tracking-wide text-accent">{displayReminderDate}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/20"></div>
                  <div className="text-right">
                    <span className="block text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">DUE DATE</span>
                    <span className="font-bold text-xs tracking-wide">{dueDate}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Atelier Actions (optimizer, calendar, download) */}
          <div className="px-1 space-y-4">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest">Atelier Tools</h3>
            
            <button 
              onClick={() => navigate(`/optimizer?client=${viewingProfile.id}`)}
              className="w-full bg-primary hover:bg-primary/95 border border-accent/20 rounded-[28px] p-6 shadow-md flex items-center gap-4 text-white group active:scale-95 transition-all"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6" y2="10"></line>
                  <line x1="10" y1="6" x2="10" y2="10"></line>
                  <line x1="14" y1="6" x2="14" y2="10"></line>
                  <line x1="18" y1="6" x2="18" y2="10"></line>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-serif text-lg font-medium text-[#FAF7F2]">How Many Yards Do I Need?</h4>
                <p className="text-[9px] text-[#FAF7F2]/60 font-bold uppercase tracking-widest">Calculate fabric for this client</p>
              </div>
              <div className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </button>

            {/* Virtual Try-On Styling Lab */}
            <button 
              onClick={() => setShowTryOn(true)}
              className="w-full bg-white border border-border-subtle rounded-[24px] p-6 shadow-sm flex items-center gap-4 text-primary group active:scale-95 transition-all hover:border-accent/40"
            >
              <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-accent shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 21a6 6 0 0 0-12 0" />
                  <circle cx="12" cy="10" r="4" />
                  <path d="M12 2v2M12 14v4" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-serif text-lg font-semibold">Virtual Try-On</h4>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Live mannequin styling lab</p>
              </div>
              <div className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </button>

            <button 
              onClick={() => exportToImage('measurement-export-card', `Measurement_${viewingProfile.customer_name.replace(/\s+/g, '_')}`)}
              className="w-full bg-white border border-border-subtle rounded-[24px] p-6 shadow-sm flex items-center gap-4 text-primary group active:scale-95 transition-all hover:border-accent/40"
            >
              <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-accent shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-serif text-lg font-semibold">Download Card</h4>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Export shareable image</p>
              </div>
              <div className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </button>

            <a 
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('DELIVERY: ' + viewingProfile.customer_name + ' - ' + viewingProfile.garment)}&dates=${viewingProfile.delivery_date.replace(/-/g, '')}/${viewingProfile.delivery_date.replace(/-/g, '')}&details=${encodeURIComponent('Job for ' + viewingProfile.customer_name + '\nTotal: ₦' + (viewingProfile.total_cost || 0))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white border border-border-subtle rounded-[24px] p-6 shadow-sm flex items-center gap-4 text-primary group active:scale-95 transition-all hover:border-accent/40"
            >
              <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-accent shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-serif text-lg font-semibold">Save to Calendar</h4>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Schedule delivery timeline</p>
              </div>
              <div className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </a>
          </div>

          {/* Selected Style Reference Photos */}
          {fabrics.length > 0 && (
            <div className="px-1">
              <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-4">Style References</h3>
              <div className="grid grid-cols-2 gap-4">
                {fabrics.map((fabric, idx) => (
                  <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden shadow-sm border border-border-subtle group">
                    <img src={fabric.url} alt={fabric.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-3 border-t border-white/40">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{fabric.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Body Specs */}
        <div className="lg:col-span-2">
          {/* Body Measurements cards grid */}
          {Object.keys(editMeasurements).length > 0 && (
            <div className="px-1">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Body Specs</h3>
                  <span className="text-[9px] text-text-muted italic">Updated {displayDate}</span>
                </div>
                
                {/* Minimal Search Button/Input */}
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={`transition-all duration-500 bg-white border border-border-subtle rounded-full text-[10px] font-bold px-4 py-2 focus:border-accent outline-none ${searchTerm ? 'w-32' : 'w-24 opacity-70 focus:opacity-100'}`}
                  />
                  <svg className="absolute right-3 w-3 h-3 text-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Active Warning Banner for Outliers */}
              {activeWarning && (
                <div className="mb-6 bg-rose-50 border border-rose-100 rounded-[28px] p-5 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-start gap-3">
                    <span className="text-xl text-rose-500 mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">Outlier Metric Warning</h4>
                      <p className="text-xs text-rose-700 mt-1 leading-relaxed">{activeWarning.message}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={confirmAnomaly} 
                      className="flex-1 h-11 bg-rose-950 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md"
                    >
                      Keep Value
                    </button>
                    <button 
                      onClick={rejectAnomaly} 
                      className="px-6 h-11 bg-white border border-rose-200 text-rose-900 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                    >
                      Fix
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Grid Layout for metrics - 3 columns on lg viewports */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(editMeasurements)
                  .filter(([label]) => label.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(([label, value]) => {
                    const isActive = activePartField === label;
                    const isJustCaptured = lastCaptured === label;
                    
                    return (
                      <div 
                        key={label}
                        onClick={() => {
                          setActivePartField(label);
                          if (!isEditing) setIsEditing(true);
                        }}
                        className={`bg-white rounded-[24px] p-5 border flex flex-col justify-between h-28 relative cursor-pointer select-none transition-all duration-300 active:scale-[0.97] shadow-sm ${
                          isActive 
                            ? 'border-accent bg-bg-secondary/20 shadow-[0_8px_24px_rgba(212,175,55,0.08)]' 
                            : 'border-border-subtle hover:border-accent/40'
                        }`}
                      >
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${
                            isActive ? 'text-accent' : 'text-text-muted'
                          }`}>
                            {label.replace(/_/g, ' ')}
                          </span>
                          {isJustCaptured && (
                            <p className="text-[7px] font-bold text-green-500 uppercase tracking-widest mt-0.5 animate-pulse">Just Updated</p>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 mt-2">
                          {isEditing && isActive ? (
                            <input 
                              type="number" 
                              value={value || ''} 
                              onChange={e => updateMeasurementDirectly(label, Number(e.target.value))}
                              onBlur={() => handleBlur(label, value)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-transparent p-0 text-2xl font-bold font-sans text-primary outline-none focus:ring-0 border-none"
                              autoFocus
                            />
                          ) : (
                            <span className="text-2xl font-bold font-sans text-primary leading-none">
                              {value ? `${value}"` : '--'}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] text-text-muted font-sans font-medium">
                            {label.toLowerCase() === 'chest' ? 'Gold trim' : 'Units'}
                          </span>
                        </div>

                        {/* Pencil Edit Icon */}
                        <div className="absolute bottom-4 right-4">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Add custom measurements inside edit mode */}
              {isEditing && (
                <div className="mt-4">
                  {isAddingNew ? (
                    <div className="bg-white border border-accent/20 rounded-[28px] p-6 shadow-md animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Part Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Inseam"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            className="w-full bg-bg-secondary/45 rounded-xl px-4 py-3 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">Value ({viewingProfile.unit || 'in'})</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            className="w-full bg-bg-secondary/45 rounded-xl px-4 py-3 text-sm font-bold border border-border-subtle focus:border-accent outline-none"
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
                          className="flex-1 h-12 bg-primary text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md active:scale-95 transition-all"
                        >
                          Add Field
                        </button>
                        <button onClick={() => setIsAddingNew(false)} className="px-6 h-12 bg-white text-text-muted rounded-full text-[10px] font-bold uppercase tracking-widest border border-border-subtle shadow-sm active:scale-95 transition-all">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingNew(true)}
                      className="w-full h-16 border-2 border-dashed border-border-subtle rounded-[24px] flex items-center justify-center text-text-muted hover:border-accent hover:text-accent transition-all duration-300"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">+ Add Custom Measurement</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Floating Action/Status Control Bar in Edit Mode */}
      {isEditing && (
        <div className="fixed bottom-[110px] left-0 right-0 z-50 px-6 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-full max-w-[450px] mx-auto bg-white/95 backdrop-blur-md rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-border-subtle px-4 py-2.5 flex items-center justify-between gap-3 pointer-events-auto">
            {/* Mic Toggle Button */}
            <button
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 border ${
                isListening 
                  ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20' 
                  : 'bg-[#FAF7F2] border-border-subtle text-primary hover:bg-[#FAF7F2]/80'
              }`}
              title={isListening ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {isListening ? (
                <span className="flex gap-1 items-center">
                  <span className="w-1 bg-white h-3 rounded-full animate-pulse"></span>
                  <span className="w-1 bg-white h-4 rounded-full animate-pulse [animation-delay:0.15s]"></span>
                  <span className="w-1 bg-white h-3 rounded-full animate-pulse [animation-delay:0.3s]"></span>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            
            {/* Status Text Indicator */}
            <div className="flex-1 text-center text-xs font-semibold font-sans tracking-wide text-text-muted flex items-center justify-center gap-2">
              {isListening ? (
                <>
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                  <span className="text-rose-600 font-bold uppercase tracking-wider text-[10px]">Listening...</span>
                </>
              ) : (
                <span className="text-text-muted">Keypad Input Active</span>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="bg-primary hover:bg-black text-white px-6 h-10 rounded-full font-bold text-[10px] tracking-widest uppercase active:scale-95 transition-transform shadow-md"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Virtual Try-On Lab Overlay */}
      {showTryOn && (
        <VirtualTryOn 
          clientName={viewingProfile.customer_name} 
          onClose={() => setShowTryOn(false)} 
          onApply={(calibrations) => {
            setEditMeasurements(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(k => {
                const lowerK = k.toLowerCase();
                if (lowerK.includes('shoulder') && calibrations.shoulder !== undefined) {
                  updated[k] = Number((updated[k] + calibrations.shoulder).toFixed(1));
                }
                if (lowerK.includes('waist') && calibrations.waist !== undefined) {
                  updated[k] = Number((updated[k] + calibrations.waist).toFixed(1));
                }
                if (lowerK.includes('sleeve') && calibrations.sleeve !== undefined) {
                  updated[k] = Number((updated[k] + calibrations.sleeve).toFixed(1));
                }
                if ((lowerK.includes('length') || lowerK.includes('height')) && calibrations.length !== undefined) {
                  updated[k] = Number((updated[k] + calibrations.length).toFixed(1));
                }
              });
              return updated;
            });
            setShowTryOn(false);
            if (!isEditing) setIsEditing(true);
            playSensorySound('success');
            setBorderStatus('success');
            setTimeout(() => setBorderStatus('idle'), 1000);
          }}
        />
      )}

      {/* HIDDEN EXPORT CARD (For Image Export) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="measurement-export-card" className="w-[800px] bg-bg-light p-12 border-[20px] border-primary">
          <div className="flex justify-between items-start border-b-2 border-border-subtle pb-8 mb-10">
            <div>
              <h1 className="font-serif text-5xl font-bold text-primary tracking-tighter">Atelier Card</h1>
              <p className="text-accent font-bold tracking-[0.4em] uppercase text-xs mt-2">{shopName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Date Issued</p>
              <p className="text-xl font-bold text-primary">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Client Name</p>
                <p className="text-3xl font-serif font-bold text-primary">{viewingProfile.customer_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Garment Type</p>
                <p className="text-xl font-bold text-primary capitalize">{viewingProfile.garment}</p>
              </div>
            </div>
            <div className="bg-bg-secondary/45 p-6 rounded-3xl border border-border-subtle">
              <p className="text-[10px] font-bold text-text-muted text-center uppercase tracking-widest mb-2">Delivery Deadline</p>
              <p className="text-3xl font-serif font-bold text-primary text-center">{dueDate}</p>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6 border-b border-border-subtle pb-2">Measurement Data ({viewingProfile.unit || 'in'})</h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              {measurements.map((m, i) => (
                <div key={i} className="flex justify-between border-b border-border-subtle pb-2">
                  <span className="text-text-muted font-medium capitalize">{m.label.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-primary">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t-2 border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span className="text-[9px] font-bold text-accent uppercase tracking-widest font-serif italic">Verified by Atelier AI</span>
            </div>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">© TailorVoice Pro</p>
          </div>
        </div>
      </div>
    </div>
  );
};