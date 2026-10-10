import React, { useRef, useEffect } from 'react';
import { type PatternPiece } from './NestingSolver';

interface FabricCanvasProps {
  pieces: PatternPiece[];
  rollWidth: number;          // e.g., 60 inches
  totalLengthNeeded: number;  // Solved total length (inches)
  seamAllowance: number;      // Cutting border margin
}

/**
 * 🎨 FabricCanvas.tsx
 * 
 * Renders an HTML5 Canvas drawing a visual map of the fabric roll and cut layouts.
 * 
 * STEP-BY-STEP LEARNING:
 * 1. Read the list of solved pattern pieces with their (X,Y) coordinates.
 * 2. Calculate a scaling factor so the 60-inch roll fits perfectly inside the screen width.
 * 3. Draw the soft grey background representing the fabric roll.
 * 4. Loop through pieces and draw beautiful color-coded cards (Indigo, Emerald, Amber).
 * 5. Draw dotted borders around pieces to show the Seam Allowance (safety margins).
 * 6. Draw clean typography showing pattern names and dimensions inside the cards.
 */
export const FabricCanvas: React.FC<FabricCanvasProps> = ({
  pieces,
  rollWidth,
  totalLengthNeeded,
  seamAllowance,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Setup color mapping helper based on pattern piece names
  const getPieceColor = (name: string): { fill: string; border: string; text: string } => {
    const n = name.toLowerCase();
    if (n.includes('back')) {
      return { fill: '#1E293B', border: '#0F172A', text: '#F8FAFC' }; // Slate Deep Navy
    }
    if (n.includes('sleeve')) {
      return { fill: '#D1FAE5', border: '#10B981', text: '#065F46' }; // Emerald Green
    }
    if (n.includes('front')) {
      return { fill: '#FEF3C7', border: '#F59E0B', text: '#78350F' }; // Amber Gold
    }
    return { fill: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' };   // Default Blue
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. DYNAMIC DUAL-SCALE RESIZING
    // Fabric rolls are long. We scale the height of the canvas based on the solved fabric length!
    const containerWidth = canvas.parentElement?.clientWidth || 350;
    const scale = containerWidth / rollWidth; // How many screen pixels = 1 real inch
    
    // Set canvas dimensions
    canvas.width = containerWidth;
    canvas.height = (totalLengthNeeded * scale) + 40; // Add padding at the bottom

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. DRAW FABRIC ROLL BACKGROUND
    ctx.fillStyle = '#F1F5F9'; // Soft grey fabric texture
    ctx.fillRect(0, 0, canvas.width, canvas.height - 40);

    // Draw fabric roll edges (subtle borders)
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, canvas.width, canvas.height - 40);

    // Draw fabric grid measurement lines every 12 inches (1 Foot marker)
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
    ctx.lineWidth = 1;
    for (let y = 12; y < totalLengthNeeded; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(canvas.width, y * scale);
      ctx.stroke();

      // Draw yard labels (e.g. "1 Yard", "2 Yards")
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${(y / 36).toFixed(1)} YD`, 8, (y * scale) - 4);
    }

    // 3. DRAW PLACED PATTERN PIECES
    pieces.forEach((piece) => {
      // Check if coordinates were calculated successfully
      if (piece.x === undefined || piece.y === undefined) return;

      const colors = getPieceColor(piece.name);

      // Determine dimensions (swapping width/height if rotated 90 degrees by the solver)
      const w = piece.rotated ? piece.height : piece.width;
      const h = piece.rotated ? piece.width : piece.height;

      // Draw coordinates scaled to canvas size
      const drawX = (piece.x - seamAllowance) * scale;
      const drawY = (piece.y - seamAllowance) * scale;
      const drawW = (w + seamAllowance * 2) * scale;
      const drawH = (h + seamAllowance * 2) * scale;

      // Draw the "Seam Allowance" cutting padding (Dotted safety boundary)
      ctx.strokeStyle = colors.border;
      ctx.setLineDash([4, 4]); // Dotted line style
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, drawW, drawH);
      ctx.setLineDash([]); // Reset to solid line style

      // Draw the actual garment piece inside the padding
      const innerX = piece.x * scale;
      const innerY = piece.y * scale;
      const innerW = w * scale;
      const innerH = h * scale;

      // Draw rounded rectangle for the pattern piece card
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.5;
      
      // Draw standard solid block
      ctx.fillRect(innerX, innerY, innerW, innerH);
      ctx.strokeRect(innerX, innerY, innerW, innerH);

      // 4. DRAW TEXT LABELS (Pattern Name & Real-World Dimensions)
      ctx.fillStyle = colors.text;
      
      // Responsive dynamic font sizing
      const fontSize = Math.max(9, Math.min(13, innerW / 9));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labelY = innerY + (innerH / 2);
      const labelX = innerX + (innerW / 2);

      // Draw piece name (e.g. "Back Panel")
      ctx.fillText(piece.name, labelX, labelY - 5);

      // Draw dimension coordinates (e.g. "22\" x 31\"")
      ctx.font = `${fontSize - 2}px sans-serif`;
      ctx.fillText(`${piece.width}" x ${piece.height}"`, labelX, labelY + 8);
    });
  }, [pieces, rollWidth, totalLengthNeeded, seamAllowance]);

  return (
    <div className="w-full flex flex-col items-center select-none bg-white rounded-[24px] p-4 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      {/* Scrollable container for long canvas layouts */}
      <div className="w-full overflow-x-hidden overflow-y-auto max-h-[480px] custom-scrollbar rounded-xl border border-slate-100">
        <canvas ref={canvasRef} className="block w-full" />
      </div>
      
      {/* Quick Visual Legend Guide */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-[9px] font-bold tracking-widest uppercase text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#1E293B] border border-[#0F172A]" />
          <span>Back Panel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#FEF3C7] border border-[#F59E0B]" />
          <span>Front Panel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#D1FAE5] border border-[#10B981]" />
          <span>Sleeve Panel</span>
        </div>
      </div>
    </div>
  );
};
