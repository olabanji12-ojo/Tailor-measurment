import { toPng } from 'html-to-image';

export const exportToImage = async (elementId: string, fileName: string) => {
  const node = document.getElementById(elementId);
  if (!node) return;

  try {
    const dataUrl = await toPng(node, { 
      quality: 0.95,
      backgroundColor: '#FDFDFD',
      pixelRatio: 2, // Good balance of quality/speed
      cacheBust: true,
    });
    
    const link = document.createElement('a');
    link.download = `${fileName.replace(/\s+/g, '_')}_measurements.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('oops, something went wrong!', error);
  }
};
