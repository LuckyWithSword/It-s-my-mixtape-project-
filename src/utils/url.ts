/**
 * Resolves the application's base public origin in the AI Studio Preview environment.
 * Uses window.location.origin at runtime.
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Generates the canonical public URL for sharing a mixtape with listeners.
 */
export function getPublicShareUrl(shareIdOrTapeId: string): string {
  const origin = getAppOrigin();
  const path = `/m/${encodeURIComponent(shareIdOrTapeId)}`;

  return origin ? `${origin}${path}` : path;
}
