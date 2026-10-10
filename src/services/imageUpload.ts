/**
 * Tailor's Voice Centralized Image Upload Service
 * Handles file validation, mobile canvas compression, upload authorization,
 * progress tracking, bounded network retries, cancellation, and Cloudinary URL transformations.
 */

import { compressImage, type ImageCategory, type CompressionResult } from '../utils/imageCompressor';

export type UploadStatus = 'idle' | 'validating' | 'compressing' | 'uploading' | 'retrying' | 'success' | 'error';

export interface UploadProgressInfo {
  status: UploadStatus;
  stage?: UploadStatus | string;
  progressPercent: number; // 0 to 100
  percentage?: number;
  loadedBytes: number;
  totalBytes: number;
  originalSize?: number;
  originalBytes?: number;
  compressedSize?: number;
  compressedBytes?: number;
  savingsPercent?: number;
  errorMessage?: string;
}

export interface UploadOptions {
  category?: ImageCategory;
  token?: string; // Tailor's JWT for tenant-authorized upload
  onProgress?: (info: UploadProgressInfo) => void;
  maxRetries?: number;
  signal?: AbortSignal;
}

export interface UploadResult {
  secureUrl: string;
  url: string; // convenient alias for secureUrl
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  compressionResult?: CompressionResult;
}

/**
 * Fetches tenant-scoped upload configuration from backend.
 * Enforces authenticated tenant authorization and eliminates hardcoded credentials.
 */
const getUploadConfig = async (token?: string) => {
  if (!token) {
    throw new Error('Authentication required: please log in before uploading photos.');
  }

  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/upload-auth`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Upload authorization failed with HTTP ${res.status}.`);
  }

  const data = await res.json();
  if (!data.cloud_name || !data.upload_preset) {
    throw new Error('Server returned incomplete Cloudinary configuration.');
  }

  return {
    cloudName: data.cloud_name,
    uploadPreset: data.upload_preset,
    folder: data.folder
  };
};

/**
 * Uploads a single file to Cloudinary with progress tracking and abort support
 */
const executeXHRUpload = (
  url: string,
  formData: FormData,
  onProgress?: (info: UploadProgressInfo) => void,
  signal?: AbortSignal,
  compressionResult?: CompressionResult
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload cancelled by user.', 'AbortError'));
      });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress({
          status: 'uploading',
          stage: 'uploading',
          progressPercent: percent,
          percentage: percent,
          loadedBytes: event.loaded,
          totalBytes: event.total,
          originalSize: compressionResult?.originalSize,
          originalBytes: compressionResult?.originalSize,
          compressedSize: compressionResult?.compressedSize,
          compressedBytes: compressionResult?.compressedSize,
          savingsPercent: compressionResult?.savingsPercent
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json);
        } catch {
          reject(new Error('Invalid response from image server.'));
        }
      } else {
        try {
          const errJson = JSON.parse(xhr.responseText);
          reject(new Error(errJson.error?.message || `Image server error (HTTP ${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during image upload. Check internet connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Image upload timed out. Cellular connection may be too slow.'));
    };

    // 45 seconds upload timeout
    xhr.timeout = 45000;
    xhr.open('POST', url, true);
    xhr.send(formData);
  });
};

/**
 * Main Upload Function: Compresses image, authorizes upload, and executes with retries
 */
export const uploadImage = async (
  rawFile: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { category = 'general', token, onProgress, maxRetries = 2, signal } = options;

  // 1. Validating
  onProgress?.({
    status: 'validating',
    stage: 'validating',
    progressPercent: 5,
    percentage: 5,
    loadedBytes: 0,
    totalBytes: rawFile.size,
    originalSize: rawFile.size,
    originalBytes: rawFile.size
  });

  // 2. Compressing via Client Canvas
  onProgress?.({
    status: 'compressing',
    stage: 'compressing',
    progressPercent: 15,
    percentage: 15,
    loadedBytes: 0,
    totalBytes: rawFile.size,
    originalSize: rawFile.size,
    originalBytes: rawFile.size,
    compressedBytes: Math.round(rawFile.size * 0.35)
  });

  let compressionResult: CompressionResult;
  try {
    compressionResult = await compressImage(rawFile, { category });
  } catch (err: any) {
    onProgress?.({
      status: 'error',
      stage: 'error',
      progressPercent: 0,
      percentage: 0,
      loadedBytes: 0,
      totalBytes: rawFile.size,
      errorMessage: err.message || 'Compression failed.'
    });
    throw err;
  }

  onProgress?.({
    status: 'uploading',
    stage: 'uploading',
    progressPercent: 25,
    percentage: 25,
    loadedBytes: 0,
    totalBytes: compressionResult.compressedSize,
    originalSize: compressionResult.originalSize,
    originalBytes: compressionResult.originalSize,
    compressedSize: compressionResult.compressedSize,
    compressedBytes: compressionResult.compressedSize,
    savingsPercent: compressionResult.savingsPercent
  });

  // 3. Obtain Authorization / Config
  const config = await getUploadConfig(token);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', compressionResult.file);
  formData.append('upload_preset', config.uploadPreset);
  if (config.folder) {
    formData.append('folder', config.folder);
  }

  // 4. Execute with bounded retries
  let lastError: any = null;
  const totalAttempts = Math.max(1, maxRetries + 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled.', 'AbortError');
    }

    try {
      const responseData = await executeXHRUpload(
        uploadUrl,
        formData,
        onProgress,
        signal,
        compressionResult
      );

      onProgress?.({
        status: 'success',
        stage: 'success',
        progressPercent: 100,
        percentage: 100,
        loadedBytes: compressionResult.compressedSize,
        totalBytes: compressionResult.compressedSize,
        originalSize: compressionResult.originalSize,
        originalBytes: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressedBytes: compressionResult.compressedSize,
        savingsPercent: compressionResult.savingsPercent
      });

      return {
        secureUrl: responseData.secure_url,
        url: responseData.secure_url,
        publicId: responseData.public_id,
        width: responseData.width,
        height: responseData.height,
        format: responseData.format,
        bytes: responseData.bytes,
        compressionResult
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      lastError = err;

      if (attempt < totalAttempts) {
        onProgress?.({
          status: 'retrying',
          stage: 'retrying',
          progressPercent: 25,
          percentage: 25,
          loadedBytes: 0,
          totalBytes: compressionResult.compressedSize,
          originalSize: compressionResult.originalSize,
          originalBytes: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          compressedBytes: compressionResult.compressedSize
        });
        // Exponential backoff: 1.5s, 3s
        const backoffMs = attempt * 1500;
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }

  onProgress?.({
    status: 'error',
    progressPercent: 0,
    loadedBytes: 0,
    totalBytes: compressionResult.compressedSize,
    originalSize: compressionResult.originalSize,
    compressedSize: compressionResult.compressedSize,
    errorMessage: lastError?.message || 'Upload failed after retries.'
  });

  throw lastError || new Error('Upload failed.');
};

/**
 * Optimizes Cloudinary image delivery URL with dynamic responsive transformations
 * Injects f_auto (format=webp/avif), q_auto (intelligent quality), and width/crop params.
 */
export const getOptimizedImageUrl = (
  url?: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'thumb' | 'fit' | 'limit';
    gravity?: 'face' | 'center' | 'auto';
    quality?: 'auto' | 'auto:good' | 'auto:eco';
  } = {}
): string => {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'face',
    quality = 'auto'
  } = options;

  const transformations: string[] = ['f_auto', `q_${quality}`];

  if (crop) transformations.push(`c_${crop}`);
  if (gravity && crop !== 'fit') transformations.push(`g_${gravity}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);

  const transformString = transformations.join(',');

  // Check if URL already has /upload/
  if (url.includes('/image/upload/')) {
    // Avoid double transforming
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/c_')) {
      return url;
    }
    return url.replace('/image/upload/', `/image/upload/${transformString}/`);
  }

  return url;
};

/**
 * Convenience helper for small circular avatars and user profile icons (64-128px)
 */
export const getAvatarThumbnailUrl = (url?: string, size = 128): string => {
  return getOptimizedImageUrl(url, {
    width: size,
    height: size,
    crop: 'thumb',
    gravity: 'face',
    quality: 'auto'
  });
};

/**
 * Convenience helper for gallery / fabric cards (300-600px)
 */
export const getFabricThumbnailUrl = (url?: string, width = 400, height = 400): string => {
  return getOptimizedImageUrl(url, {
    width,
    height,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good'
  });
};
