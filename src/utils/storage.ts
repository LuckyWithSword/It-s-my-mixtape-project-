import { Mixtape } from '../types';

const LOCAL_STORAGE_KEY = 'digital_mixtapes_library_v1';

export async function saveMixtapeToServer(mixtape: Mixtape): Promise<Mixtape> {
  try {
    const res = await fetch('/api/mixtapes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mixtape)
    });
    if (res.ok) {
      const saved = await res.json();
      saveMixtapeLocally(saved);
      return saved;
    }
  } catch (err) {
    console.warn('Could not save to server, saving locally:', err);
  }

  // Fallback to local save
  saveMixtapeLocally(mixtape);
  return mixtape;
}

export async function getMixtapeById(id: string): Promise<Mixtape | null> {
  // Try server first
  try {
    const res = await fetch(`/api/mixtapes/${encodeURIComponent(id)}`);
    if (res.ok) {
      const tape = await res.json();
      return tape as Mixtape;
    }
  } catch (err) {
    console.warn('Server fetch error:', err);
  }

  // Check local storage fallback
  const localTapes = getLocalMixtapes();
  if (localTapes[id]) {
    return localTapes[id];
  }

  return null;
}

export function saveMixtapeLocally(mixtape: Mixtape) {
  try {
    const existing = getLocalMixtapes();
    existing[mixtape.id] = mixtape;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('localStorage error:', e);
  }
}

export function getLocalMixtapes(): Record<string, Mixtape> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
