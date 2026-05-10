// ============================================================
// TailorVoice — Measurement Share Card Generator
// Uses browser Canvas API — no extra dependencies required.
// Generates a professional branded measurement receipt image
// and shares via Web Share API (mobile) or downloads (desktop).
// ============================================================

export interface ShareCardData {
  customerName: string;
  shopName: string;
  garments: string[];
  measurementsByGarment: Record<string, Record<string, number>>;
  getLabel: (part: string) => string;
  unit: string;
  deliveryDate: string;
  totalCost?: number;
  amountPaid?: number;
}

const CARD_WIDTH = 800;
const GOLD = '#D4AF37';
const NAVY = '#0F172A';
const WHITE = '#FFFFFF';
const LIGHT_GRAY = 'rgba(255,255,255,0.08)';
const MUTED = 'rgba(255,255,255,0.45)';


export const generateMeasurementCard = (data: ShareCardData): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // --- Calculate card height dynamically ---
    const PADDING = 56;
    const HEADER_H = 160;
    const CLIENT_H = 110;
    const FOOTER_H = 100;
    const GARMENT_HEADER_H = 56;
    const ROW_H = 48;
    const SECTION_GAP = 24;

    let totalRows = 0;
    for (const garment of data.garments) {
      const measurements = data.measurementsByGarment[garment] || {};
      totalRows += Object.keys(measurements).length;
    }

    const garmentSectionH =
      data.garments.length * GARMENT_HEADER_H +
      totalRows * ROW_H +
      data.garments.length * SECTION_GAP;

    const cardHeight = HEADER_H + CLIENT_H + garmentSectionH + FOOTER_H + PADDING * 2;

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = cardHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Canvas not supported')); return; }

    // --- Background ---
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);

    // --- Gold top bar ---
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, 0, CARD_WIDTH, 6);

    // --- Header ---
    let y = 50;
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('TAILORVOICE ATELIER', PADDING, y);

    y += 32;
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 36px Georgia, serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(data.shopName || 'Bespoke Atelier', PADDING, y);

    y += 18;
    ctx.fillStyle = MUTED;
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('OFFICIAL MEASUREMENT RECORD', PADDING, y);

    // --- Divider line ---
    y += 28;
    ctx.strokeStyle = `rgba(212,175,55,0.3)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(CARD_WIDTH - PADDING, y);
    ctx.stroke();

    // --- Client Info Block ---
    y += 36;
    ctx.fillStyle = LIGHT_GRAY;
    roundRect(ctx, PADDING, y - 20, CARD_WIDTH - PADDING * 2, 88, 16);
    ctx.fill();

    ctx.fillStyle = MUTED;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('CLIENT', PADDING + 20, y + 4);

    ctx.fillStyle = WHITE;
    ctx.font = 'bold 28px Georgia, serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(data.customerName, PADDING + 20, y + 32);

    ctx.fillStyle = GOLD;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.letterSpacing = '2px';
    const garmentLabel = data.garments.join(' · ').toUpperCase();
    ctx.fillText(garmentLabel, PADDING + 20, y + 52);

    y += 88 + SECTION_GAP;

    // --- Measurements per garment ---
    for (const garment of data.garments) {
      const measurements = data.measurementsByGarment[garment] || {};
      const entries = Object.entries(measurements);
      if (entries.length === 0) continue;

      // Garment section header
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(garment.toUpperCase(), PADDING, y);
      y += 8;

      ctx.strokeStyle = `rgba(212,175,55,0.4)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(CARD_WIDTH - PADDING, y);
      ctx.stroke();
      y += 16;

      // Measurement rows — 2 columns
      const colW = (CARD_WIDTH - PADDING * 2 - 24) / 2;
      for (let i = 0; i < entries.length; i += 2) {
        const [part1, val1] = entries[i];
        const label1 = data.getLabel(part1);

        // Zebra stripe
        if (Math.floor(i / 2) % 2 === 0) {
          ctx.fillStyle = LIGHT_GRAY;
          roundRect(ctx, PADDING, y - 14, CARD_WIDTH - PADDING * 2, ROW_H - 4, 10);
          ctx.fill();
        }

        // Col 1
        ctx.fillStyle = MUTED;
        ctx.font = '12px Arial, sans-serif';
        ctx.letterSpacing = '0px';
        ctx.fillText(label1.toUpperCase(), PADDING + 16, y + 2);

        ctx.fillStyle = WHITE;
        ctx.font = 'bold 20px Georgia, serif';
        ctx.fillText(`${val1}`, PADDING + 16, y + 24);

        ctx.fillStyle = MUTED;
        ctx.font = '11px Arial, sans-serif';
        ctx.fillText(data.unit, PADDING + 16 + ctx.measureText(`${val1}`).width + 4, y + 24);

        // Col 2
        if (i + 1 < entries.length) {
          const [part2, val2] = entries[i + 1];
          const label2 = data.getLabel(part2);
          const col2X = PADDING + colW + 24;

          ctx.fillStyle = MUTED;
          ctx.font = '12px Arial, sans-serif';
          ctx.letterSpacing = '0px';
          ctx.fillText(label2.toUpperCase(), col2X, y + 2);

          ctx.fillStyle = WHITE;
          ctx.font = 'bold 20px Georgia, serif';
          ctx.fillText(`${val2}`, col2X, y + 24);

          ctx.fillStyle = MUTED;
          ctx.font = '11px Arial, sans-serif';
          ctx.fillText(data.unit, col2X + ctx.measureText(`${val2}`).width + 4, y + 24);
        }

        y += ROW_H;
      }

      y += SECTION_GAP;
    }

    // --- Footer ---
    ctx.strokeStyle = `rgba(212,175,55,0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(CARD_WIDTH - PADDING, y);
    ctx.stroke();

    y += 28;
    if (data.deliveryDate) {
      ctx.fillStyle = MUTED;
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('DELIVERY DATE', PADDING, y);

      ctx.fillStyle = GOLD;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.letterSpacing = '0px';
      const formatted = new Date(data.deliveryDate).toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      ctx.fillText(formatted, PADDING, y + 22);
    }

    if (data.totalCost && data.totalCost > 0) {
      ctx.fillStyle = MUTED;
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('TOTAL', CARD_WIDTH - PADDING - 160, y);

      ctx.fillStyle = WHITE;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.letterSpacing = '0px';
      ctx.textAlign = 'right';
      ctx.fillText(`₦${data.totalCost.toLocaleString()}`, CARD_WIDTH - PADDING, y + 22);
      ctx.textAlign = 'left';
    }

    // Watermark
    y += 52;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '11px Arial, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by TailorVoice · Professional Measurement App', CARD_WIDTH / 2, y);
    ctx.textAlign = 'left';

    // Gold bottom bar
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, cardHeight - 5, CARD_WIDTH, 5);

    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image'));
    }, 'image/png');
  });
};

// Helper to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export const shareMeasurementCard = async (data: ShareCardData): Promise<void> => {
  const blob = await generateMeasurementCard(data);
  const fileName = `${data.customerName.replace(/\s+/g, '_')}_measurements.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  // Use Web Share API on mobile (opens native share sheet: WhatsApp, iMessage, etc.)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: `${data.customerName}'s Measurements`,
      text: `Measurement record from ${data.shopName || 'TailorVoice'}`,
      files: [file],
    });
  } else {
    // Desktop fallback — download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
