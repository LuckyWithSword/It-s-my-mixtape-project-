/**
 * Direct Browser Image Upload to Cloudinary using Unsigned Upload Preset,
 * with resilient fallback to local server upload when Cloudinary environment
 * variables are not yet configured.
 *
 * Security Notice:
 * NEVER include Cloudinary API Secret in client-side code.
 * Only public VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are used.
 */

export interface CloudinaryUploadProgress {
  percent: number; // 0 - 100
  loaded: number;
  total: number;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface ActiveCloudinaryUpload {
  promise: Promise<CloudinaryUploadResult>;
  cancel: () => void;
}

/**
 * Read Cloudinary environment variables directly via static member access
 * so Vite statically analyzes and substitutes them during production build.
 */
function getEnvConfig(): { cloudName: string; uploadPreset: string } {
  const envCloudName =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
    '';
  const envUploadPreset =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    '';

  return {
    cloudName: (envCloudName || '').trim(),
    uploadPreset: (envUploadPreset || '').trim(),
  };
}

// Development-only diagnostic logging
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  const env = getEnvConfig();
  if (!env.cloudName || !env.uploadPreset) {
    console.info(
      `[Cloudinary Diagnostic] Cloudinary environment variables are missing in development: ${
        [!env.cloudName && 'VITE_CLOUDINARY_CLOUD_NAME', !env.uploadPreset && 'VITE_CLOUDINARY_UPLOAD_PRESET']
          .filter(Boolean)
          .join(', ')
      }. Cloud artwork uploads require these build variables.`
    );
  }
}

/**
 * Checks if Cloudinary is configured via environment variables or in-app custom settings.
 */
export function isCloudinaryConfigured(): boolean {
  return getOptionalCloudinaryConfig() !== null;
}

/**
 * Safely retrieve Cloudinary configuration without throwing an exception.
 */
export function getOptionalCloudinaryConfig(): { cloudName: string; uploadPreset: string } | null {
  const env = getEnvConfig();
  let cloudName = env.cloudName;
  let uploadPreset = env.uploadPreset;

  // If not found in environment, check custom localStorage config
  if (!cloudName || !uploadPreset) {
    const custom = getCloudinaryCustomConfig();
    if (!cloudName) cloudName = custom.cloudName;
    if (!uploadPreset) uploadPreset = custom.uploadPreset;
  }

  if (cloudName && uploadPreset) {
    return { cloudName, uploadPreset };
  }

  return null;
}

/**
 * Retrieve user-entered custom Cloudinary credentials from localStorage.
 */
export function getCloudinaryCustomConfig(): { cloudName: string; uploadPreset: string } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        cloudName: (localStorage.getItem('VITE_CLOUDINARY_CLOUD_NAME') || localStorage.getItem('CLOUDINARY_CLOUD_NAME') || '').trim(),
        uploadPreset: (localStorage.getItem('VITE_CLOUDINARY_UPLOAD_PRESET') || localStorage.getItem('CLOUDINARY_UPLOAD_PRESET') || '').trim()
      };
    }
  } catch {
    // Ignore localStorage access issues
  }
  return { cloudName: '', uploadPreset: '' };
}

/**
 * Persist user-entered custom Cloudinary credentials in localStorage.
 */
export function setCloudinaryCustomConfig(cloudName: string, uploadPreset: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('VITE_CLOUDINARY_CLOUD_NAME', cloudName.trim());
      localStorage.setItem('VITE_CLOUDINARY_UPLOAD_PRESET', uploadPreset.trim());
    }
  } catch (err) {
    console.warn('Failed to save Cloudinary configuration in localStorage:', err);
  }
}

/**
 * Clears custom Cloudinary credentials from localStorage.
 */
export function clearCloudinaryCustomConfig(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('VITE_CLOUDINARY_CLOUD_NAME');
      localStorage.removeItem('CLOUDINARY_CLOUD_NAME');
      localStorage.removeItem('VITE_CLOUDINARY_UPLOAD_PRESET');
      localStorage.removeItem('CLOUDINARY_UPLOAD_PRESET');
    }
  } catch {
    // Ignore
  }
}

/**
 * Checks if the required Cloudinary environment variables or localStorage values are present.
 * Throws a descriptive error if missing.
 */
export function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const config = getOptionalCloudinaryConfig();
  if (config) {
    return config;
  }

  const env = getEnvConfig();
  const missing: string[] = [];
  if (!env.cloudName) missing.push('VITE_CLOUDINARY_CLOUD_NAME');
  if (!env.uploadPreset) missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');

  throw new Error(
    `Cloudinary configuration missing: ${missing.join(', ')}. Please set them in your Netlify site environment variables to enable cloud artwork uploads.`
  );
}

/**
 * Direct unsigned upload of an image blob to Cloudinary.
 * Uses XMLHttpRequest to report genuine byte-level upload progress.
 */
export function uploadImageToCloudinaryDirect(
  blob: Blob,
  onProgress?: (progress: CloudinaryUploadProgress) => void
): ActiveCloudinaryUpload {
  let xhr: XMLHttpRequest | null = null;
  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    if (xhr && xhr.readyState !== XMLHttpRequest.DONE) {
      try {
        console.log('[CLOUDINARY] Upload aborted by user');
        xhr.abort();
      } catch (err) {
        console.warn('Error aborting Cloudinary upload:', err);
      }
    }
  };

  const promise = new Promise<CloudinaryUploadResult>((resolve, reject) => {
    try {
      const { cloudName, uploadPreset } = getCloudinaryConfig();

      if (!blob || blob.size === 0) {
        throw new Error('No image data provided for upload.');
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;

      const formData = new FormData();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const fileName = `artwork_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      formData.append('file', blob, fileName);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'its-my-playlist/artwork');

      xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl, true);
      xhr.timeout = 60000; // 60s timeout

      // Real upload progress calculation from loaded / total bytes
      if (xhr.upload) {
        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (isCancelled) return;
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
            onProgress?.({
              percent,
              loaded: e.loaded,
              total: e.total
            });
          }
        };
      }

      xhr.onload = () => {
        if (isCancelled) {
          const cancelErr = new Error('Upload was cancelled.');
          (cancelErr as any).isCancelled = true;
          return reject(cancelErr);
        }

        let responseData: any = null;
        try {
          responseData = JSON.parse(xhr?.responseText || '{}');
        } catch {
          // Non-JSON response
        }

        if (xhr && xhr.status >= 200 && xhr.status < 300) {
          if (responseData && responseData.secure_url) {
            console.log('[CLOUDINARY] Upload successful. Secure URL:', responseData.secure_url);
            return resolve({
              secure_url: responseData.secure_url,
              public_id: responseData.public_id,
              width: responseData.width,
              height: responseData.height,
              format: responseData.format,
              bytes: responseData.bytes
            });
          } else {
            return reject(new Error('Cloudinary response did not contain a secure_url.'));
          }
        } else {
          // Cloudinary error formatting
          const cloudError = responseData?.error?.message;
          const statusText = xhr?.statusText || 'Upload failed';
          const errorMsg = cloudError || `Cloudinary upload failed (HTTP ${xhr?.status || 'unknown'}: ${statusText})`;
          console.warn('[CLOUDINARY] Upload error response:', xhr?.status, responseData);
          return reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        if (isCancelled) {
          const cancelErr = new Error('Upload was cancelled.');
          (cancelErr as any).isCancelled = true;
          return reject(cancelErr);
        }
        console.warn('[CLOUDINARY] Network error during upload');
        reject(new Error('Network error during artwork upload. Please check your internet connection and try again.'));
      };

      xhr.ontimeout = () => {
        if (isCancelled) return;
        console.warn('[CLOUDINARY] Upload timed out');
        reject(new Error('Artwork upload timed out. Please try again.'));
      };

      xhr.onabort = () => {
        const cancelErr = new Error('Upload was cancelled.');
        (cancelErr as any).isCancelled = true;
        reject(cancelErr);
      };

      xhr.send(formData);
    } catch (err: any) {
      reject(err);
    }
  });

  return { promise, cancel };
}

/**
 * Server-side artwork storage fallback using the applet's /api/upload-artwork endpoint.
 * This guarantees mixtape saves never fail when Cloudinary credentials are not configured.
 */
export function uploadArtworkToServer(
  blob: Blob,
  onProgress?: (progress: CloudinaryUploadProgress) => void
): ActiveCloudinaryUpload {
  let xhr: XMLHttpRequest | null = null;
  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    if (xhr && xhr.readyState !== XMLHttpRequest.DONE) {
      try {
        xhr.abort();
      } catch (err) {
        console.warn('Error aborting fallback upload:', err);
      }
    }
  };

  const promise = new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Unable to read artwork file for fallback upload.'));
    };

    reader.onload = () => {
      if (isCancelled) {
        const cancelErr = new Error('Upload was cancelled.');
        (cancelErr as any).isCancelled = true;
        return reject(cancelErr);
      }

      const base64Data = reader.result as string;
      const payload = JSON.stringify({ imageBase64: base64Data });

      xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-artwork', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 45000;

      if (xhr.upload) {
        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (isCancelled) return;
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
            onProgress?.({
              percent,
              loaded: e.loaded,
              total: e.total
            });
          }
        };
      }

      xhr.onload = () => {
        if (isCancelled) {
          const cancelErr = new Error('Upload was cancelled.');
          (cancelErr as any).isCancelled = true;
          return reject(cancelErr);
        }

        try {
          const res = JSON.parse(xhr?.responseText || '{}');
          if (xhr && xhr.status >= 200 && xhr.status < 300 && res.url) {
            console.log('[ARTWORK] Fallback server upload succeeded:', res.url);
            resolve({
              secure_url: res.url,
              public_id: res.url
            });
          } else {
            reject(new Error(res.error || `Server upload failed (${xhr?.status})`));
          }
        } catch {
          reject(new Error(`Server upload failed with status ${xhr?.status}`));
        }
      };

      xhr.onerror = () => {
        if (isCancelled) {
          const cancelErr = new Error('Upload was cancelled.');
          (cancelErr as any).isCancelled = true;
          return reject(cancelErr);
        }
        reject(new Error('Network error uploading artwork to server.'));
      };

      xhr.ontimeout = () => {
        if (isCancelled) return;
        reject(new Error('Server artwork upload timed out.'));
      };

      xhr.onabort = () => {
        const cancelErr = new Error('Upload was cancelled.');
        (cancelErr as any).isCancelled = true;
        reject(cancelErr);
      };

      xhr.send(payload);
    };

    reader.readAsDataURL(blob);
  });

  return { promise, cancel };
}

/**
 * Upload artwork: Prioritizes direct Cloudinary browser upload when configured;
 * seamlessly uses server fallback when running on a local development server with Express backend.
 * On static production hosting (such as Netlify), rejects with a clear actionable message
 * without causing unhandled exceptions.
 */
export function uploadArtwork(
  blob: Blob,
  onProgress?: (progress: CloudinaryUploadProgress) => void
): ActiveCloudinaryUpload {
  if (isCloudinaryConfigured()) {
    return uploadImageToCloudinaryDirect(blob, onProgress);
  }

  // If running locally in development with Node/Express backend, server upload can be attempted
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    console.info('[ARTWORK] Cloudinary credentials not configured; attempting local server upload.');
    return uploadArtworkToServer(blob, onProgress);
  }

  // On static production hosts (such as Netlify), server storage is not available
  const missingMsg =
    'Cloudinary is not configured. Please define VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your Netlify site settings to upload custom artwork.';
  return {
    promise: Promise.reject(new Error(missingMsg)),
    cancel: () => {},
  };
}

/**
 * Standard alias for uploadArtwork
 */
export const uploadImageToCloudinary = uploadArtwork;
