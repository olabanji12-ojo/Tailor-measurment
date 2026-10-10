import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useWhisper, playSensorySound } from '../hooks/useWhisper';
import { VirtualTryOn } from './VirtualTryOn';
import { exportToImage } from '../utils/imageExport';
import { shareMeasurementCard } from '../utils/shareCard';
import { parseMeasurements } from '../utils/parser';
import { getAvatarThumbnailUrl, getFabricThumbnailUrl } from '../services/imageUpload';

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
  const { viewingProfile, setViewingProfile, globalSessionsLoading, refreshSessions, shopName, updateMeasurementStatus, recordMeasurementPayment, globalSessions } = useAppContext();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { isListening, transcript, toggleListening } = useWhisper();

  const [isEditing, setIsEditing] = React.useState(false);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
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

  // 🧵 TASK-03: Production Status Lifecycle State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [showStageSelector, setShowStageSelector] = useState(false);

  // 💳 TASK-07: Payment Ledger & Customer Dossier State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('bank_transfer');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState<string>('');
  const [payIdempotencyKey, setPayIdempotencyKey] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Customer Dossier (All orders for this customer)
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isLoadingCustomerOrders, setIsLoadingCustomerOrders] = useState(false);
  const [isDossierExpanded, setIsDossierExpanded] = useState(true);

  const PRODUCTION_STAGES = [
    { id: 'received', label: 'Received', icon: '📥', desc: 'Order logged' },
    { id: 'cutting', label: 'Cutting', icon: '✂️', desc: 'Fabric in cutting' },
    { id: 'sewing', label: 'Sewing', icon: '🧵', desc: 'Assembly in progress' },
    { id: 'fitting', label: 'Fitting', icon: '👔', desc: 'Fitting session (optional)' },
    { id: 'ready', label: 'Ready', icon: '✨', desc: 'Ready for collection' },
    { id: 'delivered', label: 'Delivered', icon: '📦', desc: 'Completed & delivered' },
  ] as const;

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
      setEditCustomerPhone(viewingProfile.customer_phone || localStorage.getItem(`phone_${viewingProfile.id}`) || '');
      setEditGarment(viewingProfile.garment || '');
      setEditTotalCost(viewingProfile.total_cost || 0);
      setEditAmountPaid(viewingProfile.amount_paid || 0);
      setEditMeasurements(flattenData(viewingProfile.data));
      setEditDeliveryDate(viewingProfile.delivery_date || '');
      setEditReminderDate(viewingProfile.reminder_date || '');
    }
  }, [viewingProfile, isEditing]);

  // 📚 TASK-07: Fetch Complete Customer Order Dossier
  useEffect(() => {
    if (!viewingProfile) return;

    let isMounted = true;
    const fetchDossier = async () => {
      setIsLoadingCustomerOrders(true);
      try {
        let orders: any[] = [];
        if (viewingProfile.customer_id) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/customers/${viewingProfile.customer_id}/measurements`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              orders = data.map((d: any) => ({
                id: d.id || d._id,
                customer_id: d.customer_id,
                customer_name: d.customer_name,
                customer_phone: d.customer_phone,
                date: d.date,
                gender: d.gender,
                garment: d.garment,
                data: d.data,
                delivery_date: d.delivery_date,
                reminder_date: d.reminder_date,
                total_cost: d.total_cost || 0,
                amount_paid: d.amount_paid || 0,
                style_photos: d.style_photos || [],
                cloth_photos: d.cloth_photos || [],
                client_photo: d.client_photo,
                unit: d.unit || 'in',
                status: d.status,
                status_history: d.status_history,
                payments: d.payments || []
              }));
            }
          }
        }

        // Fallback / supplement with matching records from globalSessions
        if (orders.length === 0 && viewingProfile.customer_name) {
          const lowerName = viewingProfile.customer_name.trim().toLowerCase();
          orders = globalSessions.filter(s => s.customer_name?.trim().toLowerCase() === lowerName);
        }

        if (isMounted) {
          // Sort orders chronologically descending
          orders.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setCustomerOrders(orders);
        }
      } catch (err) {
        console.error("Failed to load customer dossier:", err);
      } finally {
        if (isMounted) setIsLoadingCustomerOrders(false);
      }
    };

    fetchDossier();
    return () => { isMounted = false; };
  }, [viewingProfile?.id, viewingProfile?.customer_id, viewingProfile?.customer_name, token, globalSessions]);

  const handleOpenPaymentModal = () => {
    setPayAmount('');
    setPayMethod('bank_transfer');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNote('');
    setPaymentError(null);
    setPaymentSuccessMsg(null);
    // Unique idempotency key to prevent double charging on retry
    setPayIdempotencyKey(`pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    setShowPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProfile) return;

    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      setPaymentError("Please enter a valid amount greater than ₦0.");
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);

    const res = await recordMeasurementPayment(viewingProfile.id, {
      amount: numAmount,
      method: payMethod,
      date: payDate,
      note: payNote.trim() || undefined,
      idempotency_key: payIdempotencyKey,
    });

    setIsSubmittingPayment(false);

    if (res.success) {
      playSensorySound('success');
      setPaymentSuccessMsg(`₦${numAmount.toLocaleString()} recorded successfully!`);
      setTimeout(() => {
        setPaymentSuccessMsg(null);
        setShowPaymentModal(false);
      }, 1200);
    } else {
      playSensorySound('error');
      setPaymentError(res.error || "Could not record payment. Please try again.");
    }
  };



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
          customer_phone: editCustomerPhone,
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
        if (editCustomerPhone) {
          localStorage.setItem(`phone_${viewingProfile.id}`, editCustomerPhone);
        }
        refreshSessions(); // Refresh the global list
        // Update local state too
        setViewingProfile({
          ...viewingProfile,
          customer_name: editCustomerName,
          customer_phone: editCustomerPhone,
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

  // Format style references & fabric samples
  const fabrics = [
    ...(viewingProfile.style_photos || []).map((url, i) => ({
      name: `Style ${i + 1}`,
      url
    })),
    ...(viewingProfile.cloth_photos || []).map((url, i) => ({
      name: `Fabric ${i + 1}`,
      url
    }))
  ];

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
                  <img src={getAvatarThumbnailUrl(viewingProfile.client_photo, 192)} alt={viewingProfile.customer_name} className="w-full h-full object-cover" loading="lazy" />
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
              <div className="space-y-3 text-left w-full">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-accent uppercase tracking-widest block">Customer Name</label>
                  <input 
                    type="text" 
                    value={editCustomerName}
                    onChange={e => setEditCustomerName(e.target.value)}
                    className="w-full bg-white border border-border-subtle rounded-2xl px-4 py-3 text-lg font-bold font-serif text-primary focus:border-accent outline-none shadow-sm"
                    placeholder="Client Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-accent uppercase tracking-widest block">Phone Number (WhatsApp)</label>
                  <input 
                    type="tel" 
                    value={editCustomerPhone}
                    onChange={e => setEditCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-border-subtle rounded-2xl px-4 py-3 text-sm font-sans font-medium text-primary focus:border-accent outline-none shadow-sm"
                    placeholder="e.g. 0801 234 5678"
                  />
                </div>
              </div>
            ) : (
              <>
                <span className="font-serif text-[11px] italic tracking-wide text-text-muted">Cormorant Garamond</span>
                <h2 className="font-serif text-3.5xl font-semibold text-primary tracking-wide leading-tight mt-1 uppercase">
                  {viewingProfile.customer_name}
                </h2>
                {(viewingProfile.customer_phone || localStorage.getItem(`phone_${viewingProfile.id}`)) && (
                  <p className="text-xs text-text-muted font-sans font-medium mt-1.5 flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>{viewingProfile.customer_phone || localStorage.getItem(`phone_${viewingProfile.id}`)}</span>
                  </p>
                )}
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
                  const phoneVal = viewingProfile.customer_phone || localStorage.getItem(`phone_${viewingProfile.id}`) || '';
                  const garment = viewingProfile.garment || 'outfit';
                  const shop = shopName || 'our atelier';
                  const currentSt = viewingProfile.status?.toLowerCase();
                  
                  let message = '';
                  if (currentSt === 'ready') {
                    message = `Hello ${viewingProfile.customer_name}! 🧵 Your ${garment} is now ready for collection at ${shop}. Please let us know when you would like to pick it up. Thank you! ✨`;
                  } else if (balanceOwed > 0) {
                    message = `Hello ${viewingProfile.customer_name}! 🧵 This is a friendly reminder from ${shop} regarding your ${garment}. Work is underway in our atelier. Outstanding balance: ₦${balanceOwed.toLocaleString()}. Thank you! ✨`;
                  } else {
                    message = `Hello ${viewingProfile.customer_name}! 🧵 This is a friendly update from ${shop} regarding your ${garment}. Production is progressing smoothly in our atelier. Thank you for your patronage! ✨`;
                  }

                  const cleanPhone = phoneVal.replace(/\D/g, '');
                  if (cleanPhone) {
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                  } else {
                    const enteredPhone = prompt("Enter client phone number:", "");
                    if (enteredPhone) {
                      localStorage.setItem(`phone_${viewingProfile.id}`, enteredPhone);
                      setViewingProfile({ ...viewingProfile, customer_phone: enteredPhone });
                      fetch(`${import.meta.env.VITE_API_URL}/measurements/${viewingProfile.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ customer_phone: enteredPhone })
                      }).catch(() => {});
                      window.open(`https://wa.me/${enteredPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
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
              /* 🧵 Interactive Production Lifecycle Hub */
              (() => {
                const currentStatus = viewingProfile.status?.toLowerCase() || '';
                const currentStageIdx = PRODUCTION_STAGES.findIndex(s => s.id === currentStatus);
                const isLegacyUnknown = currentStageIdx === -1;
                const isOverdue = !!(
                  viewingProfile.delivery_date &&
                  new Date(viewingProfile.delivery_date) < new Date() &&
                  currentStatus !== 'delivered'
                );

                const handleStageTransition = async (newStage: any) => {
                  if (!viewingProfile) return;
                  if (currentStatus === 'delivered' && newStage !== 'delivered') {
                    if (!window.confirm("This order was marked as Delivered. Do you want to reopen it and move it back?")) {
                      return;
                    }
                  }
                  setIsUpdatingStatus(true);
                  const success = await updateMeasurementStatus(viewingProfile.id, newStage);
                  setIsUpdatingStatus(false);
                  if (success) {
                    playSensorySound('success');
                    setStatusFeedback(`Status updated to ${newStage.toUpperCase()}!`);
                    setTimeout(() => setStatusFeedback(null), 3000);
                    setShowStageSelector(false);
                  } else {
                    playSensorySound('error');
                    alert("Could not update production stage. Check connection.");
                  }
                };

                const notifyWhatsAppReady = () => {
                  const phoneVal = viewingProfile.customer_phone || localStorage.getItem(`phone_${viewingProfile.id}`) || '';
                  const garment = viewingProfile.garment || 'outfit';
                  const shop = shopName || 'our atelier';
                  let msg = `Hello ${viewingProfile.customer_name}! 🧵 Your ${garment} is now ready for collection at ${shop}.`;
                  if (balanceOwed > 0) {
                    msg += ` Outstanding balance: ₦${balanceOwed.toLocaleString()}.`;
                  }
                  msg += ` Please let us know when you would like to pick it up. Thank you for choosing us! ✨`;

                  const cleanPhone = phoneVal.replace(/\D/g, '');
                  if (cleanPhone) {
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  } else {
                    const enteredPhone = prompt("Enter customer phone number for WhatsApp notification:", "");
                    if (enteredPhone) {
                      const cleanEntered = enteredPhone.replace(/\D/g, '');
                      localStorage.setItem(`phone_${viewingProfile.id}`, cleanEntered);
                      setViewingProfile({ ...viewingProfile, customer_phone: cleanEntered });
                      fetch(`${import.meta.env.VITE_API_URL}/measurements/${viewingProfile.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ customer_phone: cleanEntered })
                      }).catch(() => {});
                      window.open(`https://wa.me/${cleanEntered}?text=${encodeURIComponent(msg)}`, '_blank');
                    }
                  }
                };

                return (
                  <div className="bg-primary text-white rounded-[32px] p-6 shadow-xl border border-accent/20 space-y-5 transition-all">
                    {/* Header: Stage info + Deadline */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Production Stage</span>
                          {statusFeedback && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                              {statusFeedback}
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-2xl font-semibold text-[#FAF7F2] mt-0.5 capitalize flex items-center gap-2">
                          {isLegacyUnknown ? 'Needs Review' : currentStatus}
                          {currentStatus === 'ready' && <span className="text-emerald-400 text-sm">✨</span>}
                          {currentStatus === 'delivered' && <span className="text-slate-400 text-sm">✓</span>}
                        </h4>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">
                          {viewingProfile.garment || 'Custom Outfit'}
                        </p>
                      </div>

                      {/* Right: Dates & Overdue */}
                      <div className="text-right space-y-1">
                        <div>
                          <span className="block text-[8px] font-bold text-white/40 uppercase tracking-widest">DEADLINE</span>
                          <span className="font-bold text-xs tracking-wide text-[#FAF7F2]">{dueDate}</span>
                        </div>
                        {isOverdue && (
                          <span className="inline-block bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            ⚠️ Overdue
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 6-Stage Progress Stepper */}
                    <div className="pt-2 pb-1">
                      <div className="grid grid-cols-6 gap-1 relative">
                        {PRODUCTION_STAGES.map((stage, idx) => {
                          const isCompleted = !isLegacyUnknown && idx < currentStageIdx;
                          const isCurrent = !isLegacyUnknown && idx === currentStageIdx;

                          return (
                            <div key={stage.id} className="flex flex-col items-center text-center group">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                                isCompleted 
                                  ? 'bg-accent text-primary font-bold shadow-sm'
                                  : isCurrent 
                                  ? 'bg-white text-primary font-black ring-4 ring-accent/30 shadow-md scale-105'
                                  : 'bg-white/10 text-white/40 border border-white/10'
                              }`}>
                                {isCompleted ? '✓' : stage.icon}
                              </div>
                              <span className={`text-[8px] mt-1.5 font-bold uppercase tracking-tight truncate w-full ${
                                isCurrent ? 'text-accent' : isCompleted ? 'text-white/80' : 'text-white/30'
                              }`}>
                                {stage.label}
                              </span>
                              {stage.id === 'fitting' && (
                                <span className="text-[7px] text-accent/60 -mt-0.5 tracking-tighter">Optional</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Stage Action Buttons */}
                    <div className="pt-2 border-t border-white/10 space-y-3">
                      {isUpdatingStatus ? (
                        <div className="w-full py-3 bg-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs text-white">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Updating production stage...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Received -> Start Cutting */}
                          {currentStatus === 'received' && (
                            <button
                              onClick={() => handleStageTransition('cutting')}
                              className="w-full py-3 bg-accent hover:bg-accent/90 text-primary font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                              <span>Start Cutting Fabric</span>
                              <span>✂️</span>
                            </button>
                          )}

                          {/* Cutting -> Start Sewing */}
                          {currentStatus === 'cutting' && (
                            <button
                              onClick={() => handleStageTransition('sewing')}
                              className="w-full py-3 bg-accent hover:bg-accent/90 text-primary font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                              <span>Move to Sewing</span>
                              <span>🧵</span>
                            </button>
                          )}

                          {/* Sewing -> Fitting OR Skip Fitting -> Ready */}
                          {currentStatus === 'sewing' && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleStageTransition('fitting')}
                                className="py-3 bg-white/15 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/20 transition-all active:scale-98 flex items-center justify-center gap-1.5"
                                title="Schedule fitting session"
                              >
                                <span>Fitting Session</span>
                                <span>👔</span>
                              </button>
                              <button
                                onClick={() => handleStageTransition('ready')}
                                className="py-3 bg-accent hover:bg-accent/90 text-primary font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
                                title="Skip fitting and mark garment ready"
                              >
                                <span>Skip ➔ Ready</span>
                                <span>✨</span>
                              </button>
                            </div>
                          )}

                          {/* Fitting -> Ready */}
                          {currentStatus === 'fitting' && (
                            <button
                              onClick={() => handleStageTransition('ready')}
                              className="w-full py-3 bg-accent hover:bg-accent/90 text-primary font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                            >
                              <span>Fitting Done ➔ Mark as Ready</span>
                              <span>✨</span>
                            </button>
                          )}

                          {/* Ready: WhatsApp notification & Mark Delivered */}
                          {currentStatus === 'ready' && (
                            <div className="space-y-2">
                              <button
                                onClick={notifyWhatsAppReady}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                              >
                                <span>💬 Notify Client: Ready for Pickup</span>
                              </button>
                              <button
                                onClick={() => handleStageTransition('delivered')}
                                className="w-full py-2.5 bg-white/15 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider rounded-2xl border border-white/20 transition-all active:scale-98 flex items-center justify-center gap-1.5"
                              >
                                <span>Mark as Delivered & Collected</span>
                                <span>📦</span>
                              </button>
                            </div>
                          )}

                          {/* Delivered: Completed */}
                          {currentStatus === 'delivered' && (
                            <div className="py-2.5 px-4 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-center">
                              <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                <span>✓ Order Completed & Delivered</span>
                              </span>
                            </div>
                          )}

                          {/* Needs Review (Legacy Records) */}
                          {isLegacyUnknown && (
                            <div className="py-2.5 px-4 bg-rose-500/20 border border-rose-400/30 rounded-2xl text-center space-y-1">
                              <span className="text-xs text-rose-300 font-bold uppercase tracking-wider block">
                                ⚠️ Needs Review (Unassigned Stage)
                              </span>
                              <span className="text-[10px] text-white/70 block">
                                Select current production stage below
                              </span>
                            </div>
                          )}

                          {/* Stage Selector Toggle (Correction & Direct Navigation) */}
                          <div className="flex justify-between items-center pt-1">
                            <button
                              onClick={() => setShowStageSelector(!showStageSelector)}
                              className="text-[10px] font-bold text-accent hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <span>{showStageSelector ? '▲ Hide Stage Picker' : '▼ Change Stage / Correct Mistake'}</span>
                            </button>
                          </div>

                          {/* Direct Stage Picker Grid */}
                          {showStageSelector && (
                            <div className="grid grid-cols-3 gap-1.5 pt-2 animate-in fade-in duration-200">
                              {PRODUCTION_STAGES.map(stage => (
                                <button
                                  key={stage.id}
                                  onClick={() => handleStageTransition(stage.id)}
                                  disabled={currentStatus === stage.id}
                                  className={`py-2 px-2 rounded-xl text-[9px] font-bold uppercase tracking-wider flex flex-col items-center gap-0.5 border transition-all ${
                                    currentStatus === stage.id
                                      ? 'bg-accent text-primary border-accent'
                                      : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20 active:scale-95'
                                  }`}
                                >
                                  <span>{stage.icon}</span>
                                  <span>{stage.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* 💳 TASK-07: Payment Installment Ledger */}
          <div className="px-1">
            <div className="bg-white border border-border-subtle rounded-[32px] p-6 shadow-sm space-y-5">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest block">Financial Ledger</span>
                  <h4 className="font-serif text-xl font-semibold text-primary mt-0.5">Payment History</h4>
                </div>
                <button
                  onClick={handleOpenPaymentModal}
                  className="px-4 py-2 bg-primary hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>+ Record Payment</span>
                </button>
              </div>

              {/* Financial Snapshot */}
              <div className="bg-bg-secondary/40 rounded-2xl p-4 border border-border-subtle/80 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest block">Total Cost</span>
                    <span className="font-bold text-sm text-primary">₦{(viewingProfile.total_cost || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest block">Paid So Far</span>
                    <span className="font-bold text-sm text-emerald-600">₦{(viewingProfile.amount_paid || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest block">Balance</span>
                    <span className={`font-bold text-sm ${balanceOwed > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                      ₦{Math.max(0, balanceOwed).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Completion Progress Bar */}
                {viewingProfile.total_cost > 0 && (
                  <div>
                    <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${balanceOwed <= 0 ? 'bg-emerald-500' : 'bg-accent'}`}
                        style={{ width: `${Math.min(100, Math.round(((viewingProfile.amount_paid || 0) / viewingProfile.total_cost) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[8px] text-text-muted uppercase font-bold tracking-wider mt-1">
                      <span>{Math.min(100, Math.round(((viewingProfile.amount_paid || 0) / viewingProfile.total_cost) * 100))}% Settled</span>
                      {balanceOwed <= 0 ? (
                        <span className="text-emerald-600 font-black">✓ Fully Paid</span>
                      ) : (
                        <span className="text-rose-600">₦{balanceOwed.toLocaleString()} Remaining</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Legacy Opening Deposit Note */}
              {(() => {
                const installmentsTotal = (viewingProfile.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                const legacyOpening = (viewingProfile.amount_paid || 0) - installmentsTotal;
                if (legacyOpening > 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5">
                      <span className="text-base text-amber-600 mt-0.5">🏛️</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-amber-900 uppercase tracking-wider">Legacy Opening Balance</span>
                          <span className="text-xs font-bold text-amber-900 font-sans">+₦{legacyOpening.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-amber-800/80 mt-0.5 leading-tight">
                          Historical deposit recorded prior to installment ledger activation.
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Installment History Items */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">
                  Installments ({(viewingProfile.payments || []).length})
                </span>

                {(!viewingProfile.payments || viewingProfile.payments.length === 0) && (
                  <div className="py-4 text-center border border-dashed border-border-subtle rounded-2xl">
                    <p className="text-[11px] text-text-muted">No individual payment installments recorded yet.</p>
                    <button
                      onClick={handleOpenPaymentModal}
                      className="text-[10px] font-bold text-accent uppercase tracking-wider mt-1 hover:underline"
                    >
                      + Record First Installment
                    </button>
                  </div>
                )}

                {(viewingProfile.payments || []).map((pay: any, idx: number) => {
                  const methodLabels: Record<string, string> = {
                    bank_transfer: '🏦 Transfer',
                    cash: '💵 Cash',
                    pos: '💳 POS/Card',
                    other: '📝 Other',
                  };
                  const dateStr = pay.date ? new Date(pay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date';

                  return (
                    <div key={pay.id || idx} className="p-3 bg-bg-secondary/30 border border-border-subtle rounded-2xl flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white rounded-md border border-border-subtle text-primary">
                            {methodLabels[pay.method] || pay.method || 'Payment'}
                          </span>
                          <span className="text-[10px] text-text-muted">{dateStr}</span>
                        </div>
                        {pay.note && (
                          <p className="text-[10px] text-text-muted italic leading-snug pl-0.5">{pay.note}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm font-sans text-emerald-600 block">
                          +₦{(pay.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 📁 TASK-07: Customer Order Dossier (All Jobs) */}
          <div className="px-1">
            <div className="bg-white border border-border-subtle rounded-[32px] p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest block">Client Dossier</span>
                  <h4 className="font-serif text-xl font-semibold text-primary mt-0.5 flex items-center gap-2">
                    <span>Order History</span>
                    <span className="text-xs bg-bg-secondary text-primary px-2 py-0.5 rounded-full font-bold">
                      {customerOrders.length || 1}
                    </span>
                  </h4>
                </div>
                <button
                  onClick={() => setIsDossierExpanded(!isDossierExpanded)}
                  className="text-[10px] font-bold text-text-muted hover:text-primary uppercase tracking-wider"
                >
                  {isDossierExpanded ? '▲ Hide' : '▼ Expand'}
                </button>
              </div>

              {isDossierExpanded && (
                <div className="space-y-3">
                  {isLoadingCustomerOrders ? (
                    <div className="py-4 text-center">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Loading Client Jobs...</p>
                    </div>
                  ) : customerOrders.length <= 1 ? (
                    <div className="py-3 px-4 bg-bg-secondary/30 rounded-2xl border border-border-subtle text-center">
                      <p className="text-xs text-text-muted font-medium">Currently viewing this client's first registered order ({viewingProfile.garment || 'Outfit'}).</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customerOrders.map((ord: any) => {
                        const isSelected = ord.id === viewingProfile.id;
                        const ordStatus = ord.status?.toLowerCase() || 'received';
                        const ordBalance = Math.max(0, (ord.total_cost || 0) - (ord.amount_paid || 0));
                        const ordDate = ord.date ? new Date(ord.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown date';

                        return (
                          <div
                            key={ord.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isSelected
                                ? 'bg-accent/10 border-accent shadow-sm ring-1 ring-accent/30'
                                : 'bg-bg-secondary/20 hover:bg-bg-secondary/40 border-border-subtle cursor-pointer'
                            }`}
                            onClick={() => {
                              if (!isSelected) {
                                setViewingProfile(ord);
                                playSensorySound('success');
                              }
                            }}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-serif font-bold text-sm text-primary capitalize">{ord.garment || 'Custom Outfit'}</span>
                                  {isSelected && (
                                    <span className="text-[8px] bg-accent text-primary font-black uppercase px-2 py-0.5 rounded-full">
                                      Active
                                    </span>
                                  )}
                                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                    ordStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    ordStatus === 'delivered' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {ordStatus}
                                  </span>
                                </div>
                                <span className="text-[9px] text-text-muted block mt-0.5">{ordDate}</span>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-bold font-sans text-primary block">
                                  ₦{(ord.total_cost || 0).toLocaleString()}
                                </span>
                                {ordBalance > 0 ? (
                                  <span className="text-[9px] font-bold text-rose-600 block">
                                    Owes ₦{ordBalance.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 block">
                                    Paid
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isSelected && (
                              <div className="mt-2 pt-2 border-t border-border-subtle/50 flex justify-end">
                                <span className="text-[9px] font-bold text-accent uppercase tracking-wider hover:underline flex items-center gap-1">
                                  <span>Switch to this job</span>
                                  <span>→</span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                  <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden shadow-sm border border-border-subtle group bg-bg-secondary/20">
                    <img src={getFabricThumbnailUrl(fabric.url, 400, 400)} alt={fabric.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
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

      {/* 💰 TASK-07: Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-border-subtle space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-border-subtle pb-3">
              <div>
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest block">Installment Ledger</span>
                <h3 className="font-serif text-2xl font-bold text-primary">Record Payment</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {viewingProfile.customer_name} — <span className="capitalize">{viewingProfile.garment || 'Outfit'}</span>
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted hover:text-primary transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Outstanding Balance Banner */}
            <div className="p-3 bg-bg-secondary/50 rounded-2xl border border-border-subtle flex justify-between items-center">
              <div>
                <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest block">Current Balance Owed</span>
                <span className="text-lg font-bold text-rose-600 font-sans">
                  ₦{Math.max(0, balanceOwed).toLocaleString()}
                </span>
              </div>
              {balanceOwed > 0 && (
                <button
                  type="button"
                  onClick={() => setPayAmount(String(balanceOwed))}
                  className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all"
                >
                  Pay Full Balance
                </button>
              )}
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                ⚠️ {paymentError}
              </div>
            )}

            {paymentSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold">
                ✓ {paymentSuccessMsg}
              </div>
            )}

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">
                  Amount Received (₦) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  autoFocus
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  className="w-full bg-bg-secondary/45 rounded-xl px-4 py-3 text-lg font-bold font-sans border border-border-subtle focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bank_transfer', label: '🏦 Bank Transfer' },
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'pos', label: '💳 POS / Card' },
                    { id: 'other', label: '📝 Other' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left ${
                        payMethod === m.id
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-bg-secondary/30 text-primary border-border-subtle hover:bg-bg-secondary'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full bg-bg-secondary/45 rounded-xl px-3 py-2.5 text-xs font-bold border border-border-subtle focus:border-accent outline-none text-text-muted"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-accent uppercase tracking-widest block mb-1">
                    Note / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Material deposit"
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    className="w-full bg-bg-secondary/45 rounded-xl px-3 py-2.5 text-xs font-bold border border-border-subtle focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 h-12 bg-primary hover:bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm & Save Installment</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isSubmittingPayment}
                  className="px-5 h-12 bg-white text-text-muted rounded-full text-xs font-bold uppercase tracking-widest border border-border-subtle active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};