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
  type: 'overlay' | 'native'; // overlay = external garment, native = tint current clothes
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onClose, clientName }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#0F172A');
  const [activeStyle, setActiveStyle] = useState<StyleTemplate>({ id: 'native', name: 'Original', url: '', type: 'native' });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const poseRef = useRef<any>(null); // Store pose landmarks

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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        processImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageSrc: string) => {
    setIsProcessing(true);
    
    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => (img.onload = resolve));
    imageRef.current = img;

    // 1. Setup Pose Detection (Finding Anchors)
    const pose = new Pose({
      locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5 });
    pose.onResults((results: any) => {
      poseRef.current = results.poseLandmarks;
    });
    await pose.send({ image: img });

    // 2. Setup Selfie Segmentation (The Eraser)
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
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

    // 1. Draw Original Image
    ctx.drawImage(img, 0, 0);

    if (activeStyle.type === 'native') {
      // MODE: Color Swap Original Clothes
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.fillStyle = selectedColor;
        tCtx.fillRect(0, 0, img.width, img.height);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tempCanvas, 0, 0);
      }
    } else {
      // MODE: Style Overlay (The "Pro" Way)
      // 1. "Erase" the customer's current clothes using the mask
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(img, 0, 0); // Put background back
      ctx.globalCompositeOperation = 'source-over';

      // 2. Load and Draw the Style Template
      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      templateImg.src = activeStyle.url;
      await new Promise((resolve) => (templateImg.onload = resolve));

      // 3. Anchor logic using Pose Landmarks
      const landmarks = poseRef.current;
      if (landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        
        // Calculate Scale and Position
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * img.width;
        const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * img.width;
        const centerY = ((leftShoulder.y + rightShoulder.y) / 2) * img.height;

        // Draw Template (Tinted)
        const styleCanvas = document.createElement('canvas');
        styleCanvas.width = templateImg.width;
        styleCanvas.height = templateImg.height;
        const sCtx = styleCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(templateImg, 0, 0);
          sCtx.globalCompositeOperation = 'multiply';
          sCtx.fillStyle = selectedColor;
          sCtx.fillRect(0, 0, styleCanvas.width, styleCanvas.height);
          sCtx.globalCompositeOperation = 'destination-in';
          sCtx.drawImage(templateImg, 0, 0);
        }

        // Draw on main canvas
        const targetWidth = shoulderWidth * 2.5; // Scale the suit template
        const targetHeight = (targetWidth / templateImg.width) * templateImg.height;
        ctx.drawImage(
          styleCanvas, 
          centerX - targetWidth / 2, 
          centerY - targetHeight * 0.15, // Offset to neck
          targetWidth, 
          targetHeight
        );
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    if (image && !isProcessing) renderOutput();
  }, [selectedColor, activeStyle]);

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500">
      <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <button onClick={onClose} className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Close Lab</button>
        <div className="text-center">
          <h3 className="font-serif text-xl font-bold text-gray-900">Virtual Try-On</h3>
          <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{clientName}</p>
        </div>
        <div className="w-12"></div>
      </div>

      <div className="flex-1 relative bg-gray-50 flex flex-col items-center justify-center p-6 overflow-hidden">
        {!image ? (
          <label className="w-full max-w-sm aspect-[3/4] bg-white rounded-[40px] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-[#0F172A] hover:bg-white transition-all shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Upload Client Photo</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          </label>
        ) : (
          <div className="relative w-full max-w-sm aspect-[3/4] rounded-[40px] overflow-hidden shadow-2xl bg-white">
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            <canvas ref={maskRef} className="hidden" />
            {isProcessing && (
              <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[11px] font-bold uppercase tracking-widest">A.I. Aligning Garment...</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`p-6 bg-white border-t border-gray-100 transition-all duration-500 ${image && !isProcessing ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        {/* Style Selector */}
        <div className="mb-6">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Choose Style Template</span>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {styles.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStyle(s)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeStyle.id === s.id ? 'bg-[#0F172A] border-[#0F172A] text-white' : 'bg-white border-gray-100 text-gray-400'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selector */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Select Fabric Color</span>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex)}
                className={`flex-shrink-0 w-12 h-12 rounded-full border-4 transition-all ${
                  selectedColor === c.hex ? 'border-[#0F172A] scale-110 shadow-lg' : 'border-white shadow-sm'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
