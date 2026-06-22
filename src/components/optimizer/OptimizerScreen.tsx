import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { solveNesting } from './NestingSolver';
import type { PatternPiece, SolverConfig } from './NestingSolver';
import { FabricCanvas } from './FabricCanvas';
import { playSensorySound } from '../../hooks/useWhisper';

/**
 * 🎨 OptimizerScreen.tsx
 * 
 * The main dashboard page for our Smart Fabric Nesting Solver.
 * 
 * STEP-BY-STEP LEARNING:
 * 1. Read query parameters to check if an active Client was clicked.
 * 2. Fetch the client's measurements (Chest, Waist, Height, Sleeve) automatically.
 * 3. Choose a Garment Template (Blazer or Trousers).
 * 4. Run the 3D-to-2D projection formulas to generate flat pattern panels.
 * 5. Run the solver and draw the Canvas guide map.
 * 6. Provide large, touch-friendly slider controls for adjusting dimensions dynamically.
 */
export const OptimizerScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { globalSessions } = useAppContext();

  // 1. STATE CONFIGURATIONS
  const [selectedGarment, setSelectedGarment] = useState<'blazer' | 'trousers'>('blazer');
  const [rollWidth, setRollWidth] = useState<number>(60); // Default 60-inch width
  const [seamAllowance] = useState<number>(0.5); // Default 0.5 inches
  const [safetyBuffer, setSafetyBuffer] = useState<number>(5); // Default +5% Safe Fit

  // Client measurement states (fallbacks if no client is loaded)
  const [chest, setChest] = useState<number>(40);
  const [waist, setWaist] = useState<number>(32);
  const [sleeve, setSleeve] = useState<number>(24);
  const [length, setLength] = useState<number>(30); // Outseam or Jacket height
  const [clientName, setClientName] = useState<string>('Guest Client');

  // 2. FETCH CLIENT MEASUREMENTS DYNAMICALLY
  const clientId = searchParams.get('client');

  useEffect(() => {
    if (clientId && globalSessions && globalSessions.length > 0) {
      const activeClient = globalSessions.find(s => s.id === clientId);
      if (activeClient) {
        setClientName(activeClient.customer_name || 'Client');

        // Parse measurements if they exist in the DB
        const data = activeClient.data || {};

        // Match dynamic measurement keys
        const parsedChest = parseFloat(data.chest || data.Chest || '40');
        const parsedWaist = parseFloat(data.waist || data.Waist || '32');
        const parsedSleeve = parseFloat(data.sleeve || data.Sleeve || '24');
        const parsedLength = parseFloat(data.length || data.Length || data.outseam || data.Outseam || '30');

        if (!isNaN(parsedChest)) setChest(parsedChest);
        if (!isNaN(parsedWaist)) setWaist(parsedWaist);
        if (!isNaN(parsedSleeve)) setSleeve(parsedSleeve);
        if (!isNaN(parsedLength)) setLength(parsedLength);

        // Success chime! Data loaded!
        playSensorySound('success');
      }
    }
  }, [clientId, globalSessions]);

  // 3. THE 3D-TO-2D PROJECTION ENGINE
  const getPatternPieces = (): PatternPiece[] => {
    if (selectedGarment === 'blazer') {
      return [
        {
          id: 'back_panel',
          name: 'Back Panel',
          width: Math.round((chest / 2) + 2), // 20 inches on a 40" chest (+2 ease)
          height: length + 1,                 // Length + 1 inch hem
        },
        {
          id: 'front_left',
          name: 'Front Left',
          width: Math.round((chest / 4) + 1.5), // 11.5 inches
          height: length + 1,
        },
        {
          id: 'front_right',
          name: 'Front Right',
          width: Math.round((chest / 4) + 1.5), // 11.5 inches
          height: length + 1,
        },
        {
          id: 'sleeve_left',
          name: 'Left Sleeve',
          width: 9, // Standard armhole width
          height: sleeve + 1.5, // Sleeve + cuff seam
        },
        {
          id: 'sleeve_right',
          name: 'Right Sleeve',
          width: 9,
          height: sleeve + 1.5,
        }
      ];
    } else {
      // Trousers
      return [
        {
          id: 'front_leg_left',
          name: 'Left Front Leg',
          width: Math.round((waist / 4) + 2), // Waist/4 + ease
          height: length + 2, // Length (outseam) + hem
        },
        {
          id: 'front_leg_right',
          name: 'Right Front Leg',
          width: Math.round((waist / 4) + 2),
          height: length + 2,
        },
        {
          id: 'back_leg_left',
          name: 'Left Back Leg',
          width: Math.round((waist / 4) + 3.5), // Back leg is wider for seated room
          height: length + 2,
        },
        {
          id: 'back_leg_right',
          name: 'Right Back Leg',
          width: Math.round((waist / 4) + 3.5),
          height: length + 2,
        }
      ];
    }
  };

  // 4. RUN THE SOLVER ENGINE
  const config: SolverConfig = {
    rollWidth,
    seamAllowance,
    safetyBufferPercent: safetyBuffer,
  };

  const pieces = getPatternPieces();
  const { placedPieces, totalLengthNeeded, efficiency } = solveNesting(pieces, config);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-36 px-6 pt-6">

      {/* Top Header bar */}
      <header className="py-5 flex justify-between items-center bg-transparent mb-6 select-none">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center text-primary active:scale-95 transition-transform shadow-sm"
          title="Go Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-primary uppercase">Fabric Optimizer</h1>
        <div className="w-10 h-10" /> {/* Spacer */}
      </header>

      <div className="flex flex-col gap-6 max-w-lg mx-auto">

        {/* Tailor-Friendly Explainer Card */}
        {!clientId && (
          <div className="bg-white rounded-[28px] p-5 border border-accent/20 shadow-sm flex gap-4 items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-lg">
              🧵
            </div>
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">How many yards do you need?</p>
              <p className="text-xs text-text-muted leading-relaxed font-sans">
                Enter your client's measurements and this tool will calculate exactly how many yards of fabric to buy — so you get the right cut with zero waste.
              </p>
              <p className="text-[9px] text-accent font-bold uppercase tracking-widest mt-2">
                💡 Open from a client's profile to auto-load their measurements
              </p>
            </div>
          </div>
        )}
        {clientId && (
          <div className="bg-amber-50 rounded-[28px] p-4 border border-amber-200 flex gap-3 items-center">
            <span className="text-lg">📐</span>
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Loaded from Client Profile</p>
              <p className="text-[9px] text-amber-700 mt-0.5">Measurements auto-filled from <span className="font-bold">{clientName}</span>. Adjust sliders below if needed.</p>
            </div>
          </div>
        )}

        {/* Target Metrics Card */}
        <div className="bg-white rounded-[32px] p-6 border border-border-subtle shadow-sm flex flex-col gap-5 select-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Target Client</span>
            <span className="text-[9px] font-bold text-primary bg-[#FAF7F2] border border-border-subtle px-3.5 py-1.5 rounded-full uppercase tracking-wider">
              {clientName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 divide-x divide-border-subtle">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-1">Fabric Needed</span>
              <span className="text-3xl font-serif font-semibold text-primary leading-tight">
                {((totalLengthNeeded) / 36).toFixed(2)} <span className="text-sm font-sans font-normal text-text-muted">Yds</span>
              </span>
              <span className="text-[9px] text-text-muted/70 font-medium mt-1">({totalLengthNeeded} inches total)</span>
            </div>
            <div className="flex flex-col pl-6">
              <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-1">Layout Yield</span>
              <span className="text-3xl font-serif font-semibold text-[#D4AF37] leading-tight">
                {efficiency}%
              </span>
              <span className="text-[9px] text-[#C49B27] font-bold uppercase tracking-wider mt-1">✓ Ultra Low Waste</span>
            </div>
          </div>
        </div>

        {/* Pattern Layout Canvas Header */}
        <div className="-mb-3 select-none px-1">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
            Pattern Layout Canvas
          </span>
        </div>

        {/* Interactive Canvas Map */}
        <div className="bg-[#FAF7F2] p-2 rounded-[32px] border border-border-subtle shadow-inner">
          <FabricCanvas
            pieces={placedPieces}
            rollWidth={rollWidth}
            totalLengthNeeded={totalLengthNeeded}
            seamAllowance={seamAllowance}
          />
        </div>

        {/* Parameters & Adjustments Section */}
        <div className="bg-white border border-border-subtle rounded-[32px] p-6 flex flex-col gap-6 shadow-sm">
          <h2 className="text-[10px] font-bold tracking-widest uppercase text-accent border-b border-border-subtle pb-2">
            Layout Settings
          </h2>

          {/* Garment Selection Chips */}
          <div className="flex flex-col gap-2 select-none">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Garment Style</span>
            <div className="grid grid-cols-2 gap-2 bg-[#FAF7F2] p-1.5 rounded-2xl border border-border-subtle">
              <button
                onClick={() => setSelectedGarment('blazer')}
                className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  selectedGarment === 'blazer' ? 'bg-[#0F172A] text-white shadow-md' : 'text-text-muted'
                }`}
              >
                Blazer / Top
              </button>
              <button
                onClick={() => setSelectedGarment('trousers')}
                className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  selectedGarment === 'trousers' ? 'bg-[#0F172A] text-white shadow-md' : 'text-text-muted'
                }`}
              >
                Trousers / Bottom
              </button>
            </div>
          </div>

          {/* Fabric Width Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline text-[10px] font-bold text-primary uppercase tracking-wider select-none">
              <span>Fabric Roll Width</span>
              <span className="text-accent font-mono">
                {rollWidth}" Width
              </span>
            </div>
            <input
              type="range"
              min="36"
              max="72"
              step="2"
              value={rollWidth}
              onChange={(e) => setRollWidth(parseInt(e.target.value))}
              className="w-full h-1 bg-[#FAF7F2] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
            <div className="flex justify-between text-[8px] font-bold text-text-muted uppercase tracking-widest select-none">
              <span>Narrow (36")</span>
              <span>Wide (72")</span>
            </div>
          </div>

          {/* Safety Buffer Chips */}
          <div className="flex flex-col gap-2 select-none">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Safety Buffer</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSafetyBuffer(0)}
                className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                  safetyBuffer === 0 
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md' 
                    : 'bg-[#FAF7F2] text-text-muted border-border-subtle hover:border-[#D4AF37]/30'
                }`}
              >
                Tight (0%)
              </button>
              <button
                onClick={() => setSafetyBuffer(5)}
                className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                  safetyBuffer === 5 
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md' 
                    : 'bg-[#FAF7F2] text-text-muted border-border-subtle hover:border-[#D4AF37]/30'
                }`}
              >
                Safe (+5%)
              </button>
              <button
                onClick={() => setSafetyBuffer(10)}
                className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                  safetyBuffer === 10 
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md' 
                    : 'bg-[#FAF7F2] text-text-muted border-border-subtle hover:border-[#D4AF37]/30'
                }`}
              >
                Comfort (+10%)
              </button>
            </div>
          </div>

          {/* Active 3D Measurements Inspector */}
          <div className="border-t border-border-subtle pt-4.5 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider select-none">
              Client Measurements
            </span>
            <div className="grid grid-cols-4 gap-2 text-center select-none">
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-border-subtle flex flex-col justify-center">
                <span className="text-[8px] font-bold text-accent uppercase tracking-widest leading-none">Chest</span>
                <span className="text-xs font-mono font-bold text-primary mt-1.5">{chest}"</span>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-border-subtle flex flex-col justify-center">
                <span className="text-[8px] font-bold text-accent uppercase tracking-widest leading-none">Waist</span>
                <span className="text-xs font-mono font-bold text-primary mt-1.5">{waist}"</span>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-border-subtle flex flex-col justify-center">
                <span className="text-[8px] font-bold text-accent uppercase tracking-widest leading-none">Sleeve</span>
                <span className="text-xs font-mono font-bold text-primary mt-1.5">{sleeve}"</span>
              </div>
              <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-border-subtle flex flex-col justify-center">
                <span className="text-[8px] font-bold text-accent uppercase tracking-widest leading-none">Length</span>
                <span className="text-xs font-mono font-bold text-primary mt-1.5">{length}"</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
