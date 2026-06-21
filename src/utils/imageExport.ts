import { toPng } from 'html-to-image';

export const exportToImage = async (elementId: string, fileName: string) => {
  const node = document.getElementById(elementId);
  if (!node) {
    console.error('Element not found');
    return;
  }

  try {
    // Create a temporary container to ensure the element is visible for capture
    const dataUrl = await toPng(node, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      style: {
        borderRadius: '0px',
      }
    });

    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting image:', error);
    alert('Failed to generate image. Please try again.');
  }
};
