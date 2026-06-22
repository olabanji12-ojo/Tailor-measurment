import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

// Global MediaPipe AI instances from index.html (if loaded)
const SelfieSegmentation = (window as any).SelfieSegmentation;
const Pose = (window as any).Pose;

interface VirtualTryOnProps {
  onClose: () => void;
  clientName?: string;
  onApply?: (calibrations: { shoulder: number; waist: number; sleeve: number; length: number }) => void;
}



export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onClose, clientName, onApply }) => {
  const { viewingProfile } = useAppContext();
  
  // Try to use active profile client name, fall back to prop or placeholder
  const activeClientName = viewingProfile?.customer_name || clientName || 'Bespoke Fitting';

  // Client image / Fabric upload states
  const [clientImage, setClientImage] = useState<string | null>(null);
  const [fabricImage, setFabricImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Selected fabric swatch
  const [selectedFabric, setSelectedFabric] = useState<string>('navy_serge');

  // Morphing Sliders state
  const [shoulderFit, setShoulderFit] = useState<number>(0); // -15 to +15
  const [waistNip, setWaistNip] = useState<number>(0);       // -15 to +15
  const [sleeveLength, setSleeveLength] = useState<number>(0); // -20 to +20
  const [jacketLength, setJacketLength] = useState<number>(0); // -20 to +20

  // MediaPipe references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fabricRef = useRef<HTMLImageElement | null>(null);
  const poseRef = useRef<any>(null);

  const swatches = [
    { id: 'wool_crepe', name: 'Wool Crepe', color: '#272522', description: 'Classic Charcoal', texture: 'herringbone' },
    { id: 'silk_satin', name: 'Silk Satin', color: '#1B2C4E', description: 'Royal Navy Satin', texture: 'satin' },
    { id: 'navy_serge', name: 'Navy Serge', color: '#141D30', description: 'Midnight Serge', texture: 'solid' },
    { id: 'charcoal_grey', name: 'Charcoal Grey', color: '#32363D', description: 'Bespoke Herringbone', texture: 'solid' },
    { id: 'tan_tweed', name: 'Tan Tweed', color: '#664E3D', description: 'Warm Sandy Tweed', texture: 'tweed' }
  ];

  // Helper to handle image uploads
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'client' | 'fabric') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (type === 'client') {
          setClientImage(dataUrl);
          processClientImage(dataUrl);
        } else {
          setFabricImage(dataUrl);
          const fImg = new Image();
          fImg.src = dataUrl;
          fImg.onload = () => {
            fabricRef.current = fImg;
            if (clientImage) renderOutput();
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // MediaPipe pose / segmentation processor
  const processClientImage = async (imageSrc: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => (img.onload = resolve));
    imageRef.current = img;

    try {
      if (Pose) {
        const pose = new Pose({ locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
        pose.setOptions({ 
          modelComplexity: 0, 
          smoothLandmarks: true, 
          minDetectionConfidence: 0.5 
        });
        pose.onResults((results: any) => { poseRef.current = results.poseLandmarks; });
        await pose.send({ image: img });
      }

      if (SelfieSegmentation) {
        const selfieSegmentation = new SelfieSegmentation({ locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
        selfieSegmentation.setOptions({ modelSelection: 0 });
        selfieSegmentation.onResults((results: any) => {
          if (maskRef.current) {
            const maskCtx = maskRef.current.getContext('2d', { willReadFrequently: true });
            if (maskCtx) {
              maskRef.current.width = results.image.width;
              maskRef.current.height = results.image.height;
              maskCtx.drawImage(results.segmentationMask, 0, 0);
              renderOutput();
            }
          }
          setIsProcessing(false);
        });
        await selfieSegmentation.send({ image: img });
      } else {
        setIsProcessing(false);
        renderOutput();
      }
    } catch (e) {
      console.error("AI tools loading error, using standard canvas layout", e);
      setIsProcessing(false);
      renderOutput();
    }
  };

  // Canvas renderer for client image overlay
  const renderOutput = async () => {
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const activeColor = swatches.find(s => s.id === selectedFabric)?.color || '#141D30';

    // Create Tint Canvas
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = img.width;
    overlayCanvas.height = img.height;
    const oCtx = overlayCanvas.getContext('2d');
    if (!oCtx) return;

    if (fabricRef.current) {
      const pattern = oCtx.createPattern(fabricRef.current, 'repeat');
      if (pattern) {
        oCtx.fillStyle = pattern;
        oCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
    } else {
      oCtx.fillStyle = activeColor;
      oCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    if (mask) {
      // Mask the texture inside the silhouette
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.65;
      ctx.drawImage(overlayCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
  };

  useEffect(() => {
    if (clientImage && !isProcessing) {
      renderOutput();
    }
  }, [selectedFabric, fabricImage, clientImage]);

  // SVG Morphing Coordinate Calculations
  const centerX = 160;
  const neckY = 60;
  
  // Morph parameters
  const sWidth = 70 + shoulderFit;
  const wWidth = 52 + waistNip;
  const sLength = 250 + sleeveLength;
  const jLength = 300 + jacketLength;

  const leftShoulderX = centerX - sWidth;
  const rightShoulderX = centerX + sWidth;
  const shoulderY = 92;

  const leftArmpitX = centerX - 42;
  const rightArmpitX = centerX + 42;
  const armpitY = 135;

  const leftWaistX = centerX - wWidth;
  const rightWaistX = centerX + wWidth;
  const waistY = 210;

  const leftHemX = centerX - (wWidth + 4);
  const rightHemX = centerX + (wWidth + 4);
  const hemY = jLength;

  // Sleeve coordinates
  const leftSleeveEndX = leftShoulderX - 10;
  const rightSleeveEndX = rightShoulderX + 10;
  const sleeveEndColXOffset = 18;

  // Selected swatch data
  const currentSwatch = swatches.find(s => s.id === selectedFabric) || swatches[0];

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col md:flex-row animate-in slide-in-from-bottom duration-500 overflow-hidden font-sans">
      
      {/* 1. VIEWPORT PANEL (Left in desktop, Top on mobile) */}
      <div className="flex-1 bg-[#12100E] relative flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-[#26211C] select-none h-[50vh] md:h-auto min-h-[340px]">
        
        {/* Subtle Watermark/Labels */}
        <div className="absolute top-4 left-6 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-ping"></div>
          <span className="text-[9px] font-bold text-[#FAF7F2]/40 tracking-[0.2em] uppercase font-mono">DRAFT_MODE // LIVE</span>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-6 w-9 h-9 rounded-full bg-[#1e1a17] border border-[#362e27] flex items-center justify-center text-[#FAF7F2]/60 hover:text-white hover:border-[#D4AF37]/50 active:scale-95 transition-all shadow-md z-30"
          title="Exit Lab"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* The Mannequin Canvas or Client Image Box */}
        <div className="relative w-full max-w-[340px] md:max-w-[380px] lg:max-w-[420px] aspect-[3/4] bg-[#1C1815] rounded-[36px] overflow-hidden border-4 border-[#2D2620] shadow-[0_24px_50px_rgba(0,0,0,0.5)] flex items-center justify-center">
          
          {clientImage ? (
            /* Client Image Canvas Mode */
            <div className="relative w-full h-full">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
              <canvas ref={maskRef} className="hidden" />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-[#FAF7F2] p-6 text-center">
                  <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">Stitching Canvas Mask...</p>
                </div>
              )}
              
              {/* Reset Upload Button */}
              <button 
                onClick={() => { setClientImage(null); setFabricImage(null); }} 
                className="absolute bottom-4 right-4 bg-white/90 text-primary px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-md hover:bg-white active:scale-95 transition-transform"
              >
                Reset Photo
              </button>
            </div>
          ) : (
            /* Bespoke SVG Mannequin Mode */
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <svg 
                viewBox="0 0 320 440" 
                className="w-full h-full"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* SVG Definitions for Fabric Textures */}
                <defs>
                  {/* Tweed Texture Pattern */}
                  <pattern id="tex_tweed" width="10" height="10" patternUnits="userSpaceOnUse">
                    <rect width="10" height="10" fill={currentSwatch.color} />
                    <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="#FAF7F2" strokeWidth="0.5" strokeOpacity="0.08" />
                    <path d="M 5 0 L 5 10 M 0 5 L 10 5" stroke="#FAF7F2" strokeWidth="0.8" strokeOpacity="0.05" />
                  </pattern>

                  {/* Herringbone Texture Pattern */}
                  <pattern id="tex_herringbone" width="12" height="12" patternUnits="userSpaceOnUse">
                    <rect width="12" height="12" fill={currentSwatch.color} />
                    <path d="M 0 0 L 6 6 L 12 0" stroke="#FAF7F2" strokeWidth="0.6" strokeOpacity="0.09" fill="none" />
                    <path d="M 0 6 L 6 12 L 12 6" stroke="#FAF7F2" strokeWidth="0.6" strokeOpacity="0.09" fill="none" />
                  </pattern>

                  {/* Satin Gradient */}
                  <linearGradient id="tex_satin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={currentSwatch.color} />
                    <stop offset="35%" stopColor={currentSwatch.color} />
                    <stop offset="50%" stopColor="#4A6596" stopOpacity="0.3" />
                    <stop offset="65%" stopColor={currentSwatch.color} />
                    <stop offset="100%" stopColor={currentSwatch.color} />
                  </linearGradient>


                </defs>

                {/* Mannequin Stand (Wooden/Metal Rod) */}
                <path 
                  d={`M 160 ${hemY} L 160 380`} 
                  stroke="#3A3026" 
                  strokeWidth="6" 
                  strokeLinecap="round" 
                />
                {/* Stand Base */}
                <path 
                  d="M 120 380 L 200 380 M 140 380 L 140 375 L 180 375 L 180 380" 
                  stroke="#3A3026" 
                  strokeWidth="4" 
                  strokeLinejoin="round" 
                />
                
                {/* Wooden Neck Finial topper */}
                <circle cx="160" cy="42" r="7" fill="#544434" />
                <path d="M 155 49 L 165 49 L 163 60 L 157 60 Z" fill="#544434" />

                {/* --- Interactive Suit SVG Paths --- */}
                {/* Sleeve Left */}
                <path 
                  d={`M ${leftShoulderX} ${shoulderY} 
                     L ${leftSleeveEndX} ${sLength} 
                     L ${leftSleeveEndX + sleeveEndColXOffset} ${sLength} 
                     L ${leftArmpitX} ${armpitY} Z`} 
                  fill={
                    currentSwatch.texture === 'herringbone' ? 'url(#tex_herringbone)' :
                    currentSwatch.texture === 'tweed' ? 'url(#tex_tweed)' :
                    currentSwatch.texture === 'satin' ? 'url(#tex_satin)' :
                    currentSwatch.color
                  }
                  stroke="#12100E"
                  strokeWidth="1.5"
                />

                {/* Sleeve Right */}
                <path 
                  d={`M ${rightShoulderX} ${shoulderY} 
                     L ${rightSleeveEndX} ${sLength} 
                     L ${rightSleeveEndX - sleeveEndColXOffset} ${sLength} 
                     L ${rightArmpitX} ${armpitY} Z`} 
                  fill={
                    currentSwatch.texture === 'herringbone' ? 'url(#tex_herringbone)' :
                    currentSwatch.texture === 'tweed' ? 'url(#tex_tweed)' :
                    currentSwatch.texture === 'satin' ? 'url(#tex_satin)' :
                    currentSwatch.color
                  }
                  stroke="#12100E"
                  strokeWidth="1.5"
                />

                {/* Main Torso Jacket Body */}
                <path 
                  d={`M 160 ${neckY} 
                     L ${leftShoulderX} ${shoulderY} 
                     L ${leftArmpitX} ${armpitY} 
                     L ${leftWaistX} ${waistY} 
                     L ${leftHemX} ${hemY} 
                     L 160 ${hemY + 4} 
                     L ${rightHemX} ${hemY} 
                     L ${rightWaistX} ${waistY} 
                     L ${rightArmpitX} ${armpitY} 
                     L ${rightShoulderX} ${shoulderY} Z`} 
                  fill={
                    currentSwatch.texture === 'herringbone' ? 'url(#tex_herringbone)' :
                    currentSwatch.texture === 'tweed' ? 'url(#tex_tweed)' :
                    currentSwatch.texture === 'satin' ? 'url(#tex_satin)' :
                    currentSwatch.color
                  }
                  stroke="#12100E"
                  strokeWidth="1.5"
                />

                {/* Lapel details overlay (Dark shadow fills) */}
                {/* Left Lapel fold */}
                <path 
                  d={`M 160 ${neckY + 12} L ${leftShoulderX + 22} ${shoulderY + 6} L 140 145 L 160 175 Z`} 
                  fill="#000000" 
                  fillOpacity="0.22" 
                />
                {/* Right Lapel fold */}
                <path 
                  d={`M 160 ${neckY + 12} L ${rightShoulderX - 22} ${shoulderY + 6} L 180 145 L 160 175 Z`} 
                  fill="#000000" 
                  fillOpacity="0.22" 
                />

                {/* Center fold crease line */}
                <line x1="160" y1="175" x2="160" y2={hemY} stroke="#000000" strokeOpacity="0.3" strokeWidth="1.5" />

                {/* Button detail */}
                <circle cx="160" cy="195" r="4.5" fill="#C49B27" stroke="#3A2D10" strokeWidth="1" />
                <circle cx="160" cy="225" r="4.5" fill="#C49B27" stroke="#3A2D10" strokeWidth="1" />

                {/* Pocket Left */}
                <path 
                  d={`M ${leftWaistX + 6} ${waistY + 22} L ${leftWaistX + 34} ${waistY + 20} L ${leftWaistX + 34} ${waistY + 28} L ${leftWaistX + 6} ${waistY + 30} Z`} 
                  fill="#000000" 
                  fillOpacity="0.2" 
                />
                {/* Pocket Right */}
                <path 
                  d={`M ${rightWaistX - 6} ${waistY + 22} L ${rightWaistX - 34} ${waistY + 20} L ${rightWaistX - 34} ${waistY + 28} L ${rightWaistX - 6} ${waistY + 30} Z`} 
                  fill="#000000" 
                  fillOpacity="0.2" 
                />
              </svg>
            </div>
          )}

          {/* ================= GOLD DRAFT MATRIX OVERLAY ================= */}
          <div className="absolute inset-0 pointer-events-none">
            <svg 
              viewBox="0 0 320 440" 
              className="w-full h-full"
            >
              {/* 1. Shoulder grid drafting line */}
              <line 
                x1={leftShoulderX} 
                y1={shoulderY} 
                x2={rightShoulderX} 
                y2={shoulderY} 
                stroke="#D4AF37" 
                strokeWidth="1.2" 
                strokeDasharray="4,4" 
              />
              <circle cx={leftShoulderX} cy={shoulderY} r="3" fill="#D4AF37" />
              <circle cx={rightShoulderX} cy={shoulderY} r="3" fill="#D4AF37" />
              
              {/* Shoulder label pill */}
              <foreignObject x={centerX - 35} y={shoulderY - 10} width="70" height="18">
                <div className="bg-[#1C1815]/90 border border-[#D4AF37]/45 rounded-md px-1 py-0.5 text-center shadow-sm">
                  <span className="text-[7.5px] font-bold text-[#D4AF37] font-mono tracking-tighter block leading-none">
                    SHLD: {(17.5 + shoulderFit * 0.15).toFixed(1)}"
                  </span>
                </div>
              </foreignObject>

              {/* 2. Waist grid drafting line */}
              <line 
                x1={leftWaistX} 
                y1={waistY} 
                x2={rightWaistX} 
                y2={waistY} 
                stroke="#D4AF37" 
                strokeWidth="1.2" 
                strokeDasharray="4,4" 
              />
              <circle cx={leftWaistX} cy={waistY} r="3" fill="#D4AF37" />
              <circle cx={rightWaistX} cy={waistY} r="3" fill="#D4AF37" />

              {/* Waist label pill */}
              <foreignObject x={centerX - 35} y={waistY - 10} width="70" height="18">
                <div className="bg-[#1C1815]/90 border border-[#D4AF37]/45 rounded-md px-1 py-0.5 text-center shadow-sm">
                  <span className="text-[7.5px] font-bold text-[#D4AF37] font-mono tracking-tighter block leading-none">
                    WST: {(31.0 + waistNip * 0.15).toFixed(1)}"
                  </span>
                </div>
              </foreignObject>

              {/* 3. Sleeve length drafting line (Left arm) */}
              <line 
                x1={leftShoulderX} 
                y1={shoulderY} 
                x2={leftSleeveEndX + 8} 
                y2={sLength} 
                stroke="#D4AF37" 
                strokeWidth="1" 
                strokeDasharray="3,3" 
              />
              <circle cx={leftSleeveEndX + 8} cy={sLength} r="3" fill="#D4AF37" />

              {/* Sleeve label pill */}
              <foreignObject x={leftSleeveEndX - 42} y={(shoulderY + sLength) / 2 - 8} width="52" height="16">
                <div className="bg-[#1C1815]/90 border border-[#D4AF37]/45 rounded px-1 py-0.5 text-center">
                  <span className="text-[6.5px] font-bold text-[#D4AF37] font-mono block leading-none">
                    SLV: {(24.2 + sleeveLength * 0.15).toFixed(1)}"
                  </span>
                </div>
              </foreignObject>

              {/* 4. Jacket Length vertical center-draft line */}
              <line 
                x1={centerX} 
                y1={neckY} 
                x2={centerX} 
                y2={hemY + 4} 
                stroke="#D4AF37" 
                strokeWidth="1.2" 
                strokeDasharray="4,4" 
              />
              <circle cx={centerX} cy={hemY + 4} r="3" fill="#D4AF37" />

              {/* Length label pill */}
              <foreignObject x={centerX + 6} y={hemY - 26} width="54" height="16">
                <div className="bg-[#1C1815]/90 border border-[#D4AF37]/45 rounded px-1 py-0.5 text-center">
                  <span className="text-[6.5px] font-bold text-[#D4AF37] font-mono block leading-none">
                    LEN: {(28.5 + jacketLength * 0.15).toFixed(1)}"
                  </span>
                </div>
              </foreignObject>
            </svg>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS PANEL (Right on desktop, Bottom on mobile) */}
      <div className="w-full md:w-[420px] lg:w-[460px] bg-[#FAF7F2] flex flex-col h-[50vh] md:h-auto overflow-y-auto px-6 py-6 custom-scrollbar text-[#1C1815]">
        
        {/* Editorial Heading */}
        <div className="mb-6">
          <span className="font-serif text-[10px] italic tracking-widest text-[#C49B27] block mb-1">ATELIER STYLING SYSTEMS</span>
          <h2 className="font-serif text-3xl font-bold tracking-tight uppercase leading-none text-primary">
            Virtual Try-On
          </h2>
          <p className="text-[10px] text-text-muted mt-1 font-sans font-semibold uppercase tracking-wider">
            Client Dossier: <span className="text-accent">{activeClientName}</span>
          </p>
        </div>

        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <label className="flex items-center justify-center gap-2 h-11 bg-white border border-border-subtle hover:border-[#C49B27]/40 rounded-xl cursor-pointer text-[10px] font-bold uppercase tracking-wider text-text-muted transition-colors active:scale-[0.98] shadow-sm select-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            Client Photo
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'client')} />
          </label>

          <label className="flex items-center justify-center gap-2 h-11 bg-white border border-border-subtle hover:border-[#C49B27]/40 rounded-xl cursor-pointer text-[10px] font-bold uppercase tracking-wider text-text-muted transition-colors active:scale-[0.98] shadow-sm select-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Fabric Photo
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'fabric')} />
          </label>
        </div>

        {/* ---------------- SLIDERS SECTION ---------------- */}
        <div className="space-y-4.5 bg-white border border-border-subtle rounded-[24px] p-5.5 shadow-sm mb-6">
          <h4 className="text-[10px] font-bold text-[#C49B27] uppercase tracking-widest border-b border-border-subtle pb-2 mb-4">
            Mannequin Calibration
          </h4>

          {/* Slider 1: Shoulder Width */}
          <div className="space-y-2 select-none">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Shoulder Fit</span>
              <span className="text-[11px] font-mono font-bold text-accent">
                {shoulderFit >= 0 ? `+${(shoulderFit * 0.15).toFixed(1)}"` : `${(shoulderFit * 0.15).toFixed(1)}"`}
              </span>
            </div>
            <input 
              type="range" 
              min="-15" 
              max="15" 
              value={shoulderFit} 
              onChange={(e) => setShoulderFit(Number(e.target.value))}
              className="w-full h-1 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>

          {/* Slider 2: Waist Taper */}
          <div className="space-y-2 select-none">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Waist Nip</span>
              <span className="text-[11px] font-mono font-bold text-accent">
                {waistNip >= 0 ? `+${(waistNip * 0.15).toFixed(1)}"` : `${(waistNip * 0.15).toFixed(1)}"`}
              </span>
            </div>
            <input 
              type="range" 
              min="-15" 
              max="15" 
              value={waistNip} 
              onChange={(e) => setWaistNip(Number(e.target.value))}
              className="w-full h-1 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>

          {/* Slider 3: Sleeve Length */}
          <div className="space-y-2 select-none">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Sleeve Length</span>
              <span className="text-[11px] font-mono font-bold text-accent">
                {sleeveLength >= 0 ? `+${(sleeveLength * 0.15).toFixed(1)}"` : `${(sleeveLength * 0.15).toFixed(1)}"`}
              </span>
            </div>
            <input 
              type="range" 
              min="-20" 
              max="20" 
              value={sleeveLength} 
              onChange={(e) => setSleeveLength(Number(e.target.value))}
              className="w-full h-1 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>

          {/* Slider 4: Jacket Length */}
          <div className="space-y-2 select-none">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Jacket Length</span>
              <span className="text-[11px] font-mono font-bold text-accent">
                {jacketLength >= 0 ? `+${(jacketLength * 0.15).toFixed(1)}"` : `${(jacketLength * 0.15).toFixed(1)}"`}
              </span>
            </div>
            <input 
              type="range" 
              min="-20" 
              max="20" 
              value={jacketLength} 
              onChange={(e) => setJacketLength(Number(e.target.value))}
              className="w-full h-1 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
        </div>

        {/* ---------------- SWATCHES CAROUSEL ---------------- */}
        <div className="mb-8">
          <h4 className="text-[10px] font-bold text-[#C49B27] uppercase tracking-widest mb-3.5 block select-none">
            Boutique Fabric Selector
          </h4>
          <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth select-none custom-scrollbar">
            {swatches.map((sw) => {
              const isSelected = selectedFabric === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => {
                    setSelectedFabric(sw.id);
                    // Also clear raw image fabric so it utilizes swatch textures
                    setFabricImage(null);
                    if (fabricRef.current) fabricRef.current = null;
                  }}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 p-1.5 rounded-2xl border transition-all duration-300 ${
                    isSelected 
                      ? 'border-[#D4AF37] bg-white shadow-md scale-105' 
                      : 'border-transparent hover:scale-102'
                  }`}
                  style={{ width: '76px' }}
                >
                  {/* Circle swatch with HSL/HEX color base */}
                  <div 
                    className={`w-11 h-11 rounded-full relative overflow-hidden shadow-inner border border-black/10 flex items-center justify-center transition-transform ${
                      isSelected ? 'ring-2 ring-[#D4AF37]/30 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: sw.color }}
                  >
                    {/* Visual pattern hint inside circle */}
                    {sw.texture === 'herringbone' && (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none opacity-30"></div>
                    )}
                    {sw.texture === 'satin' && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/40 pointer-events-none"></div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <span className="text-[8px] font-bold text-primary block leading-none tracking-tight">
                      {sw.name}
                    </span>
                    <span className="text-[6.5px] text-text-muted mt-0.5 block leading-none truncate w-[68px]">
                      {sw.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            if (onApply) {
              onApply({
                shoulder: Number((shoulderFit * 0.15).toFixed(2)),
                waist: Number((waistNip * 0.15).toFixed(2)),
                sleeve: Number((sleeveLength * 0.15).toFixed(2)),
                length: Number((jacketLength * 0.15).toFixed(2))
              });
            } else {
              alert(`Virtual style calibration saved to draft for ${activeClientName}!`);
              onClose();
            }
          }}
          className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-[0.97] transition-all shadow-lg select-none mb-12 flex items-center justify-center gap-3 relative overflow-hidden group"
          style={{ background: 'linear-gradient(135deg, #C49B27 0%, #D4AF37 40%, #E8C84A 70%, #C49B27 100%)' }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
          {/* Checkmark icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span className="text-[#0F172A] font-black tracking-[0.2em]">Save Calibration to Draft</span>
        </button>

      </div>
    </div>
  );
};
