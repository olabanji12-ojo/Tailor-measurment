import React, { useState, useRef, useEffect } from 'react';

// Global AI instances from index.html
const SelfieSegmentation = (window as any).SelfieSegmentation;
const Pose = (window as any).Pose;

interface VirtualTryOnProps {
  onClose: () => void;
  clientName: string;
}

interface StyleTemplate {
  id: string;
  name: string;
  url: string;
  type: 'overlay' | 'native';
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onClose, clientName }) => {
  const [clientImage, setClientImage] = useState<string | null>(null);
  const [fabricImage, setFabricImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // Null means keep original fabric colors
  const [activeStyle, setActiveStyle] = useState<StyleTemplate>({ id: 'native', name: 'Original', url: '', type: 'native' });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fabricRef = useRef<HTMLImageElement | null>(null);
  const poseRef = useRef<any>(null);

  const styles: StyleTemplate[] = [
    { id: 'native', name: 'Original', url: '', type: 'native' },
    { id: 'suit', name: 'Slim Fit Suit', url: 'https://res.cloudinary.com/dcpvhegxr/image/upload/v1715242000/suit_template_new.png', type: 'overlay' },
    { id: 'agbada', name: 'Premium Agbada', url: 'https://res.cloudinary.com/dcpvhegxr/image/upload/v1715242100/agbada_template.png', type: 'overlay' },
  ];

  const colors = [
    { name: 'Navy', hex: '#0F172A' },
    { name: 'Maroon', hex: '#7F1D1D' },
    { name: 'Forest', hex: '#064E3B' },
    { name: 'Gold', hex: '#B45309' },
    { name: 'Slate', hex: '#475569' },
    { name: 'Plum', hex: '#581C87' },
  ];

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

  const processClientImage = async (imageSrc: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => (img.onload = resolve));
    imageRef.current = img;

    const pose = new Pose({ locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5 });
    pose.onResults((results: any) => { poseRef.current = results.poseLandmarks; });
    await pose.send({ image: img });

    const selfieSegmentation = new SelfieSegmentation({ locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
    selfieSegmentation.setOptions({ modelSelection: 0 });
    selfieSegmentation.onResults((results: any) => {
      if (maskRef.current) {
        const maskCtx = maskRef.current.getContext('2d');
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
  };

  const renderOutput = async () => {
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    const img = imageRef.current;
    if (!canvas || !mask || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Create Pattern/Color Layer
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = img.width;
    overlayCanvas.height = img.height;
    const oCtx = overlayCanvas.getContext('2d');
    if (!oCtx) return;

    if (fabricRef.current) {
      // Draw Tiled Fabric Pattern
      const pattern = oCtx.createPattern(fabricRef.current, 'repeat');
      if (pattern) {
        oCtx.fillStyle = pattern;
        oCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
    } else if (selectedColor) {
      // Draw Solid Color
      oCtx.fillStyle = selectedColor;
      oCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    if (selectedColor && fabricRef.current) {
      // Apply Tint on top of Fabric
      oCtx.globalCompositeOperation = 'multiply';
      oCtx.fillStyle = selectedColor;
      oCtx.globalAlpha = 0.5;
      oCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      oCtx.globalAlpha = 1.0;
      oCtx.globalCompositeOperation = 'source-over';
    }

    if (activeStyle.type === 'native') {
      oCtx.globalCompositeOperation = 'destination-in';
      oCtx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.8;
      ctx.drawImage(overlayCanvas, 0, 0);
    } else {
      // Erase original clothes
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-over';

      // Draw Template with Pattern
      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      templateImg.src = activeStyle.url;
      await new Promise((resolve) => (templateImg.onload = resolve));

      const landmarks = poseRef.current;
      if (landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * img.width;
        const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * img.width;
        const centerY = ((leftShoulder.y + rightShoulder.y) / 2) * img.height;

        const styleCanvas = document.createElement('canvas');
        styleCanvas.width = templateImg.width;
        styleCanvas.height = templateImg.height;
        const sCtx = styleCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(templateImg, 0, 0);
          sCtx.globalCompositeOperation = 'source-atop';
          // Draw the pattern/tint onto the style
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = styleCanvas.width;
          patternCanvas.height = styleCanvas.height;
          const pCtx = patternCanvas.getContext('2d');
          if (pCtx) {
            if (fabricRef.current) {
              const p = pCtx.createPattern(fabricRef.current, 'repeat');
              if (p) { pCtx.fillStyle = p; pCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height); }
            } else {
              pCtx.fillStyle = selectedColor || '#0F172A';
              pCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
            }
            sCtx.drawImage(patternCanvas, 0, 0);
          }
        }

        const targetWidth = shoulderWidth * 2.5;
        const targetHeight = (targetWidth / templateImg.width) * templateImg.height;
        ctx.drawImage(styleCanvas, centerX - targetWidth / 2, centerY - targetHeight * 0.15, targetWidth, targetHeight);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  };

  useEffect(() => { if (clientImage && !isProcessing) renderOutput(); }, [selectedColor, activeStyle, fabricImage]);

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-y-auto">
      <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={onClose} className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Close Lab</button>
        <div className="text-center">
          <h3 className="font-serif text-xl font-bold text-gray-900">Composition Lab</h3>
          <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{clientName}</p>
        </div>
        <div className="w-12"></div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-8 max-w-lg mx-auto w-full pb-32">
        {/* Step 1: Side-by-Side Uploads */}
        {!clientImage || !fabricImage ? (
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
            <label className={`relative h-52 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 transition-all cursor-pointer ${clientImage ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#0F172A]'}`}>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{clientImage ? '✓ Client Ready' : '1. Upload Client'}</p>
                {!clientImage && <svg className="mx-auto text-gray-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'client')} />
            </label>

            <label className={`relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all cursor-pointer ${fabricImage ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#0F172A]'}`}>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{fabricImage ? '✓ Fabric Ready' : '2. Upload Fabric'}</p>
                {!fabricImage && <svg className="mx-auto text-gray-300" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'fabric')} />
            </label>
          </div>
        ) : (
          /* Step 2: The Combined Preview */
          <div className="relative aspect-[3/4] rounded-[40px] overflow-hidden shadow-2xl bg-white border-8 border-white">
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            <canvas ref={maskRef} className="hidden" />
            {isProcessing && (
              <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[11px] font-bold uppercase tracking-widest">A.I. Stitching Composition...</p>
              </div>
            )}
            <button onClick={() => { setClientImage(null); setFabricImage(null); }} className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg">Reset</button>
          </div>
        )}

        {/* Step 3: Refinement Controls */}
        <div className={`space-y-8 transition-all duration-700 ${clientImage && fabricImage && !isProcessing ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-10'}`}>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Refine Style</span>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {styles.map(s => (
                <button key={s.id} onClick={() => setActiveStyle(s)} className={`flex-shrink-0 px-5 py-2.5 rounded-full border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeStyle.id === s.id ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>{s.name}</button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Apply Color Tint (Optional)</span>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              <button onClick={() => setSelectedColor(null)} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center text-[8px] font-bold uppercase tracking-tighter ${!selectedColor ? 'border-[#0F172A] bg-gray-100' : 'border-gray-200'}`}>Raw</button>
              {colors.map((c) => (
                <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`flex-shrink-0 w-12 h-12 rounded-full border-4 transition-all ${selectedColor === c.hex ? 'border-[#0F172A] scale-110 shadow-lg' : 'border-white shadow-sm'}`} style={{ backgroundColor: c.hex }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
