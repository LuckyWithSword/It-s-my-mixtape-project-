/**
 * Resolves the application's base public origin in an environment-independent way:
 * 1. Uses VITE_PUBLIC_APP_URL if provided (e.g. https://your-site.netlify.app)
 * 2. Falls back to window.location.origin at runtime
 * 3. Never fails if VITE_PUBLIC_APP_URL is missing
 */
export function getAppOrigin(): string {
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_APP_URL) || '';
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
}

/**
 * Generates the canonical public URL for sharing a mixtape with anonymous listeners.
 * 
 * Works across:
 * - Netlify deployments
 * - Localhost / dev server
 * - Production domains
 */
export function getPublicShareUrl(shareIdOrTapeId: string): string {
  const origin = getAppOrigin();
  const path = `/m/${encodeURIComponent(shareIdOrTapeId)}`;

  return origin ? `${origin}${path}` : path;
}

