export interface OptimizedImageResult {
  blob: Blob;
  mimeType: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  previewUrl: string;
}

/**
 * Format raw byte size into human readable string (e.g. 4.8 MB, 820 KB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Fast sampling of canvas pixel data to check if a PNG has transparent pixels.
 * Uses a stride to inspect the alpha channel without allocating huge overhead.
 */
function checkCanvasHasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;
    for (let i = 3; i < len; i += 64) {
      if (data[i] < 250) {
        return true;
      }
    }
  } catch {
    return true;
  }
  return false;
}

// ============================================================================
// IMAGE PROCESSING (100% Client-Side In-Browser Resize & Compression)
// ============================================================================

/**
 * CLIENT-SIDE RESIZE & COMPRESSION
 *
 * Order of operations:
 * 1. Inspect image dimensions in browser using lightweight ObjectURL.
 * 2. Calculate proportional dimensions capped at 1600px max (never stretch or distort).
 * 3. Never upscale if already smaller than 1600px.
 * 4. Draw to HTML5 Canvas using high-quality image smoothing.
 * 5. Check transparency if PNG: if transparent, compress as PNG; otherwise compress as JPEG (quality 0.80).
 * 6. Free raw memory immediately with URL.revokeObjectURL.
 *
 * NOTE: DOES NOT PERFORM ANY NETWORK CALLS OR UPLOADS.
 */
export async function processImage(
  file: File,
  signal?: { isCancelled?: boolean }
): Promise<OptimizedImageResult> {
  const originalSizeBytes = file.size;
  const rawObjectUrl = URL.createObjectURL(file);

  try {
    if (signal?.isCancelled) {
      throw new Error('Image processing cancelled');
    }

    // Load image into an HTMLImageElement
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Unable to read selected image file.'));
      el.src = rawObjectUrl;
    });

    if (signal?.isCancelled) {
      throw new Error('Image processing cancelled');
    }

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight) {
      throw new Error('Invalid image dimensions.');
    }

    // Calculate proportional dimensions capped at max 1600px
    const MAX_DIMENSION = 1600;
    let targetWidth = naturalWidth;
    let targetHeight = naturalHeight;

    if (naturalWidth > MAX_DIMENSION || naturalHeight > MAX_DIMENSION) {
      if (naturalWidth >= naturalHeight) {
        // Landscape or Square: cap width to 1600px
        targetWidth = MAX_DIMENSION;
        targetHeight = Math.max(1, Math.round((naturalHeight * MAX_DIMENSION) / naturalWidth));
      } else {
        // Portrait: cap height to 1600px
        targetHeight = MAX_DIMENSION;
        targetWidth = Math.max(1, Math.round((naturalWidth * MAX_DIMENSION) / naturalHeight));
      }
    }

    // Create Off-screen Canvas for resizing
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: true });

    if (!ctx) {
      throw new Error('Could not initialize canvas context for image processing.');
    }

    // Sharp rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    if (signal?.isCancelled) {
      throw new Error('Image processing cancelled');
    }

    // Determine target format:
    // If the original was PNG and has transparent pixels, keep PNG.
    // Otherwise, compress as JPEG at 0.8 quality.
    let outputMimeType: 'image/jpeg' | 'image/png' = 'image/jpeg';
    const outputQuality = 0.8;

    const isOriginalPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    if (isOriginalPng && checkCanvasHasTransparency(ctx, targetWidth, targetHeight)) {
      outputMimeType = 'image/png';
    }

    // Convert canvas to Blob
    const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image into blob.'));
          }
        },
        outputMimeType,
        outputMimeType === 'image/jpeg' ? outputQuality : undefined
      );
    });

    if (signal?.isCancelled) {
      throw new Error('Image processing cancelled');
    }

    // Clean up canvas memory
    canvas.width = 0;
    canvas.height = 0;

    const previewUrl = URL.createObjectURL(optimizedBlob);

    console.log('[IMAGE] Original size:', formatBytes(originalSizeBytes));
    console.log('[IMAGE] Optimized size:', formatBytes(optimizedBlob.size));
    console.log('[IMAGE] Optimized MIME type:', outputMimeType);

    return {
      blob: optimizedBlob,
      mimeType: outputMimeType,
      width: targetWidth,
      height: targetHeight,
      originalSizeBytes,
      optimizedSizeBytes: optimizedBlob.size,
      previewUrl
    };
  } finally {
    // Release the original raw photo from memory immediately
    URL.revokeObjectURL(rawObjectUrl);
  }
}

/**
 * Backwards compatibility alias for processImage.
 */
export const optimizeImageInBrowser = processImage;
