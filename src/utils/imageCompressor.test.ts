/**
 * Unit Test Suite for Tailor's Voice Image Optimization and Upload Utilities
 * Tests compression calculations, aspect ratio preservation, category profiles,
 * non-enlargement rules, error handling, and Cloudinary dynamic URL transformations.
 */

import {
  validateImageFile,
  calculateTargetDimensions,
  CATEGORY_PROFILES,
  formatBytes
} from './imageCompressor';

import {
  getOptimizedImageUrl,
  getAvatarThumbnailUrl,
  getFabricThumbnailUrl
} from '../services/imageUpload';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

console.log('\n--- 1. FILE VALIDATION TESTS ---');

// TEST 01: Valid image files
const validJpeg = new File(['fake-jpg'], 'portrait.jpg', { type: 'image/jpeg' });
const validPng = new File(['fake-png'], 'artwork.png', { type: 'image/png' });
const validWebp = new File(['fake-webp'], 'fabric.webp', { type: 'image/webp' });

const resJpeg = validateImageFile(validJpeg);
assert(resJpeg.valid, 'Accepts valid JPEG file');

const resPng = validateImageFile(validPng);
assert(resPng.valid, 'Accepts valid PNG file');

const resWebp = validateImageFile(validWebp);
assert(resWebp.valid, 'Accepts valid WebP file');

// TEST 02: Unsupported format rejection
const invalidPdf = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' });
const resPdf = validateImageFile(invalidPdf);
assert(!resPdf.valid && resPdf.error!.toLowerCase().includes('unsupported'), 'Rejects PDF files with informative error');

const invalidTxt = new File(['fake-text'], 'notes.txt', { type: 'text/plain' });
const resTxt = validateImageFile(invalidTxt);
assert(!resTxt.valid, 'Rejects text files');

// TEST 03: Oversized file check (> 30MB)
const oversizedFile = new File([new Uint8Array(35 * 1024 * 1024)], 'giant.jpg', { type: 'image/jpeg' });
const resOversized = validateImageFile(oversizedFile);
assert(!resOversized.valid && resOversized.error!.toLowerCase().includes('too large'), 'Rejects files exceeding 30MB limit');


console.log('\n--- 2. DIMENSION & ASPECT RATIO PRESERVATION TESTS ---');

// TEST 04: Portrait photo scaled down preserving aspect ratio
// 3000 x 4000 (aspect ratio 3:4) with maxDimension 1600 -> should scale to 1200 x 1600
const portraitScaled = calculateTargetDimensions(3000, 4000, 1600);
assert(
  portraitScaled.height === 1600 && portraitScaled.width === 1200,
  'Portrait photo scales proportionally to max dimension',
  `got ${portraitScaled.width}x${portraitScaled.height}, expected 1200x1600`
);
const origRatioPortrait = 3000 / 4000;
const newRatioPortrait = portraitScaled.width / portraitScaled.height;
assert(
  Math.abs(origRatioPortrait - newRatioPortrait) < 0.001,
  'Portrait aspect ratio perfectly preserved'
);

// TEST 05: Landscape photo scaled down preserving aspect ratio
// 4000 x 2000 (aspect ratio 2:1) with maxDimension 1200 -> should scale to 1200 x 600
const landscapeScaled = calculateTargetDimensions(4000, 2000, 1200);
assert(
  landscapeScaled.width === 1200 && landscapeScaled.height === 600,
  'Landscape photo scales proportionally to max dimension',
  `got ${landscapeScaled.width}x${landscapeScaled.height}, expected 1200x600`
);
const origRatioLandscape = 4000 / 2000;
const newRatioLandscape = landscapeScaled.width / landscapeScaled.height;
assert(
  Math.abs(origRatioLandscape - newRatioLandscape) < 0.001,
  'Landscape aspect ratio perfectly preserved'
);

// TEST 06: Small image non-enlargement invariant
// 400 x 300 with maxDimension 1600 -> should remain EXACTLY 400 x 300
const smallImage = calculateTargetDimensions(400, 300, 1600);
assert(
  smallImage.width === 400 && smallImage.height === 300,
  'Already-small image is never enlarged',
  `got ${smallImage.width}x${smallImage.height}`
);

// TEST 07: Square avatar scaling
const squareAvatar = calculateTargetDimensions(2400, 2400, 600);
assert(
  squareAvatar.width === 600 && squareAvatar.height === 600,
  'Square image scaled down to exact maximum dimension'
);


console.log('\n--- 3. CATEGORY OPTIMIZATION PROFILES ---');

// TEST 08: Avatar category settings
assert(
  CATEGORY_PROFILES.avatar.maxDimension === 600 && CATEGORY_PROFILES.avatar.quality <= 0.85,
  'Avatar profile targets compact dimensions for fast loading'
);

// TEST 09: Fabric category settings (preserves weave & print texture)
assert(
  CATEGORY_PROFILES.fabric.maxDimension >= 1600 && CATEGORY_PROFILES.fabric.quality >= 0.85,
  'Fabric profile preserves high resolution for fabric print & weave inspection'
);

// TEST 10: Style category settings (preserves embroidery & lines)
assert(
  CATEGORY_PROFILES.style.maxDimension >= 1600 && CATEGORY_PROFILES.style.quality >= 0.84,
  'Style profile preserves high resolution for outfit embroidery & lines'
);


console.log('\n--- 4. FORMATTING UTILITY TESTS ---');

// TEST 11: formatBytes conversions
assert(formatBytes(0) === '0 B', 'Formats 0 bytes');
assert(formatBytes(850) === '850 B', 'Formats bytes');
assert(formatBytes(153600) === '150 KB', 'Formats kilobytes');
assert(formatBytes(3.5 * 1024 * 1024) === '3.5 MB', 'Formats megabytes');


console.log('\n--- 5. CLOUDINARY DELIVERY TRANSFORMATION TESTS ---');

const sampleCloudinaryUrl = 'https://res.cloudinary.com/dcpvhegxr/image/upload/v1743912345/tailors/user123/sample.jpg';
const nonCloudinaryUrl = 'https://ui-avatars.com/api/?name=Tailor&background=0F172A';

// TEST 12: Generic Cloudinary optimization injection
const optimized = getOptimizedImageUrl(sampleCloudinaryUrl, { width: 400, crop: 'fit' });
assert(
  optimized.includes('f_auto') && optimized.includes('q_auto') && optimized.includes('w_400') && optimized.includes('c_fit'),
  'Injects auto-format, auto-quality, and dimensional constraints into Cloudinary URL',
  `got: ${optimized}`
);

// TEST 13: Avatar thumbnail optimization (face focus + thumb crop)
const avatarThumb = getAvatarThumbnailUrl(sampleCloudinaryUrl, 128);
assert(
  avatarThumb.includes('c_thumb') && avatarThumb.includes('g_face') && avatarThumb.includes('w_128') && avatarThumb.includes('h_128'),
  'Avatar thumbnail uses face focus (g_face) and thumbnail crop',
  `got: ${avatarThumb}`
);

// TEST 14: Fabric sample thumbnail optimization (fill crop for weave display)
const fabricThumb = getFabricThumbnailUrl(sampleCloudinaryUrl, 300, 300);
assert(
  fabricThumb.includes('c_fill') && fabricThumb.includes('w_300') && fabricThumb.includes('h_300'),
  'Fabric sample thumbnail uses fill crop (c_fill) with specified width and height',
  `got: ${fabricThumb}`
);

// TEST 15: Fallback safety for non-Cloudinary and empty URLs
assert(
  getAvatarThumbnailUrl(nonCloudinaryUrl, 64) === nonCloudinaryUrl,
  'Returns non-Cloudinary URL unchanged without corrupting it'
);

assert(
  getAvatarThumbnailUrl('', 64) === '',
  'Returns empty string safely for empty input'
);

assert(
  getAvatarThumbnailUrl(undefined, 64) === '',
  'Returns empty string safely for undefined input'
);

// TEST 16: No duplicate transformation injection
const alreadyTransformed = 'https://res.cloudinary.com/dcpvhegxr/image/upload/f_auto,q_auto/v1743912345/tailors/user123/sample.jpg';
const reTransformed = getOptimizedImageUrl(alreadyTransformed, { width: 400 });
assert(
  reTransformed === alreadyTransformed,
  'Does not doubly-inject transformations into already-transformed URLs'
);


console.log('\n=======================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('=======================================\n');

if (failed > 0) {
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
}
