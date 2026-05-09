import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import * as SelfieSegmentationModule from '@mediapipe/selfie_segmentation';

const SelfieSegmentation = (SelfieSegmentationModule as any).SelfieSegmentation || (window as any).SelfieSegmentation;

interface VirtualTryOnProps {
  onClose: () => void;
  clientName: string;
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onClose, clientName }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#0F172A'); // Default Navy
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

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
    
    // 1. Create a hidden image element
    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => (img.onload = resolve));
    imageRef.current = img;

    // 2. Setup Selfie Segmentation
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
      modelSelection: 1, // 0 for general, 1 for landscape/better detail
    });

    selfieSegmentation.onResults((results: any) => {
      // 3. Draw the mask to a hidden canvas
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

  const renderOutput = () => {
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

    // 2. Use Mask to Tint the Garment
    // We create a temporary canvas to hold the color
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      // Fill with selected color
      tCtx.fillStyle = selectedColor;
      tCtx.fillRect(0, 0, img.width, img.height);
      
      // Mask the color using the AI results
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(mask, 0, 0);
      
      // Blend the color onto the main canvas
      // 'multiply' or 'overlay' work best for realistic fabrics
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.7; // Keep some original detail
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Reset composite for UI
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
  };

  useEffect(() => {
    if (image && !isProcessing) renderOutput();
  }, [selectedColor]);

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500">
      {/* Header */}
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
                <p className="text-[11px] font-bold uppercase tracking-widest">AI Scanning Garment...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={`p-8 bg-white border-t border-gray-100 transition-all duration-500 ${image && !isProcessing ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-center mb-6">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Fabric Color</span>
          <span className="text-[10px] font-bold text-[#0F172A] uppercase tracking-widest">Live Preview</span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {colors.map((c) => (
            <button
              key={c.hex}
              onClick={() => setSelectedColor(c.hex)}
              className={`flex-shrink-0 w-14 h-14 rounded-full border-4 transition-all ${
                selectedColor === c.hex ? 'border-[#0F172A] scale-110 shadow-lg' : 'border-white shadow-sm'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          {/* Custom Fabric Button Placeholder */}
          <button className="flex-shrink-0 w-14 h-14 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#0F172A] hover:text-[#0F172A]">
            <span className="text-xl">+</span>
          </button>
        </div>
      </div>
    </div>
  );
};
