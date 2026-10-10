/**
 * Tailor's Voice Image Compression & Optimization Utility
 * Client-side HTML5 canvas compression optimized for mobile browsers and African bespoke tailoring workflows.
 * Preserves fabric texture, weave patterns, embroidery lines, and client portraits while dramatically reducing 3G/4G bandwidth.
 */

export type ImageCategory = 'avatar' | 'fabric' | 'style' | 'general';

export interface CompressionOptions {
  category?: ImageCategory;
  maxDimension?: number;
  quality?: number;
  maxTargetBytes?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  compressionRatio: number; // e.g. 0.3 means compressed is 30% of original
  savingsPercent: number;    // e.g. 70 means 70% reduction
  format: string;
}

export const CATEGORY_PROFILES: Record<ImageCategory, { maxDimension: number; quality: number; maxTargetBytes: number }> = {
  // Client portraits & boutique avatar: fast loading, balanced resolution
  avatar: {
    maxDimension: 600,
    quality: 0.82,
    maxTargetBytes: 250 * 1024 // ~250 KB
  },
  // Fabric swatches: high resolution & texture preservation for weave/print inspection
  fabric: {
    maxDimension: 1600,
    quality: 0.86,
    maxTargetBytes: 850 * 1024 // ~850 KB
  },
  // Design references & style inspiration: sharp lines, embroidery, button details
  style: {
    maxDimension: 1600,
    quality: 0.85,
    maxTargetBytes: 800 * 1024 // ~800 KB
  },
  // General photos fallback
  general: {
    maxDimension: 1200,
    quality: 0.82,
    maxTargetBytes: 500 * 1024 // ~500 KB
  }
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

/**
 * Validates if a file is an acceptable image type and within reasonable limits
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const isAllowedType = ALLOWED_MIME_TYPES.some(type => file.type.toLowerCase() === type) ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);

  if (!isAllowedType) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please select a JPEG, PNG, or WebP photo.`
    };
  }

  // 30MB safety limit for mobile browser stability
  const MAX_FILE_SIZE = 30 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 30 MB.`
    };
  }

  return { valid: true };
};

/**
 * Checks whether an image has transparency (alpha channel < 255)
 */
const hasTransparency = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
  try {
    // Sample a 50x50 grid to avoid processing all millions of pixels
    const sampleW = Math.min(width, 50);
    const sampleH = Math.min(height, 50);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Calculates new dimensions while strictly maintaining original aspect ratio
 */
export const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } => {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  let width = originalWidth;
  let height = originalHeight;

  if (originalWidth > originalHeight) {
    width = maxDimension;
    height = Math.round((originalHeight * maxDimension) / originalWidth);
  } else {
    height = maxDimension;
    width = Math.round((originalWidth * maxDimension) / originalHeight);
  }

  return { width, height };
};

export const calculateTargetDimensions = calculateDimensions;

/**
 * Loads an image file into an HTMLImageElement
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image. File may be corrupted or unreadable.'));
    };

    img.src = objectUrl;
  });
};

/**
 * Compresses and optimizes an image file using client-side canvas
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const category = options.category || 'general';
  const profile = CATEGORY_PROFILES[category];
  const maxDimension = options.maxDimension || profile.maxDimension;
  const targetQuality = options.quality || profile.quality;
  const maxTargetBytes = options.maxTargetBytes || profile.maxTargetBytes;

  const originalSize = file.size;

  // Load image
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  // If already small and within dimension limits, preserve original file (avoid re-encoding artifacts or enlargement)
  if (originalSize <= maxTargetBytes && originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      originalWidth,
      originalHeight,
      width: originalWidth,
      height: originalHeight,
      compressionRatio: 1,
      savingsPercent: 0,
      format: file.type || 'image/jpeg'
    };
  }

  // Calculate target dimensions
  const { width, height } = calculateDimensions(originalWidth, originalHeight, maxDimension);

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw scaled image
  ctx.drawImage(img, 0, 0, width, height);

  // Determine output format
  let outputMimeType = 'image/jpeg';
  const isOriginalPng = file.type === 'image/png' || /\.png$/i.test(file.name);

  if (isOriginalPng && hasTransparency(ctx, width, height)) {
    // Preserve PNG for transparent artwork / logos
    outputMimeType = 'image/png';
  } else if (file.type === 'image/webp') {
    outputMimeType = 'image/webp';
  }

  // Convert canvas to Blob
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      b => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate compressed image blob.'));
      },
      outputMimeType,
      outputMimeType === 'image/png' ? undefined : targetQuality
    );
  });

  // Free canvas resources to avoid memory leaks on mobile
  canvas.width = 0;
  canvas.height = 0;

  // Generate clean filename
  let outputExtension = '.jpg';
  if (outputMimeType === 'image/png') outputExtension = '.png';
  else if (outputMimeType === 'image/webp') outputExtension = '.webp';

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const newFileName = `${baseName}_opt${outputExtension}`;

  // If compressed blob is unexpectedly larger than original (e.g. tiny PNG or heavily pre-compressed image), retain original
  if (blob.size >= originalSize && originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      originalWidth,
      originalHeight,
      width: originalWidth,
      height: originalHeight,
      compressionRatio: 1,
      savingsPercent: 0,
      format: file.type
    };
  }

  const compressedFile = new File([blob], newFileName, {
    type: outputMimeType,
    lastModified: Date.now()
  });

  const compressedSize = compressedFile.size;
  const compressionRatio = compressedSize / originalSize;
  const savingsPercent = Math.max(0, Math.round((1 - compressionRatio) * 100));

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    originalWidth,
    originalHeight,
    width,
    height,
    compressionRatio: Number(compressionRatio.toFixed(3)),
    savingsPercent,
    format: outputMimeType
  };
};

/**
 * Formats bytes into a human-friendly string (e.g. "245 KB", "3.2 MB")
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
};
