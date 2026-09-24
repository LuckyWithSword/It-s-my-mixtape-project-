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
 * Checks if Cloudinary is configured via environment variables or in-app custom settings.
 */
export function isCloudinaryConfigured(): boolean {
  try {
    const config = getCloudinaryConfig();
    return Boolean(config.cloudName && config.uploadPreset);
  } catch {
    return false;
  }
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
 */
export function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  let cloudName = (env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  let uploadPreset = (env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

  // If not in env, check custom storage config
  if (!cloudName || !uploadPreset) {
    const custom = getCloudinaryCustomConfig();
    if (!cloudName) cloudName = custom.cloudName;
    if (!uploadPreset) uploadPreset = custom.uploadPreset;
  }

  if (!cloudName || !uploadPreset) {
    const missing: string[] = [];
    if (!cloudName) missing.push('VITE_CLOUDINARY_CLOUD_NAME');
    if (!uploadPreset) missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');

    throw new Error(
      `Cloudinary configuration missing: ${missing.join(', ')}. Please set them in your environment or in the Cloudinary settings modal to enable cloud artwork uploads.`
    );
  }

  return { cloudName, uploadPreset };
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
 * seamlessly uses server fallback when Cloudinary environment variables have not been configured,
 * guaranteeing the mixtape save operation is NEVER broken.
 */
export function uploadArtwork(
  blob: Blob,
  onProgress?: (progress: CloudinaryUploadProgress) => void
): ActiveCloudinaryUpload {
  if (isCloudinaryConfigured()) {
    return uploadImageToCloudinaryDirect(blob, onProgress);
  } else {
    console.info('[ARTWORK] Cloudinary credentials not configured; saving via server artwork storage.');
    return uploadArtworkToServer(blob, onProgress);
  }
}

/**
 * Standard alias for uploadArtwork
 */
export const uploadImageToCloudinary = uploadArtwork;
