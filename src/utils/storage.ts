import { Mixtape } from '../types';

const STORAGE_KEY = 'its_my_playlist_mixtapes';

export const SAMPLE_MIXTAPE: Mixtape = {
  id: 'summer-98',
  name: 'Summer Dreams 1998',
  title: 'Summer Dreams 1998',
  message: 'Made with love for sunny afternoon drives and nostalgic daydreaming. Hope this brings a smile to your day.',
  creatorName: 'Alex',
  shareId: 'summer-98',
  share_id: 'summer-98',
  customization: {
    color: 'sunset-amber',
    pattern: 'retro-stripes',
    labelStyle: 'marker',
    labelColor: '#fef3c7',
    stickers: [
      { id: 'st-1', type: 'mix-vol-1', xPercent: 12, yPercent: 20, rotationDeg: -6 },
      { id: 'st-2', type: 'heart', xPercent: 82, yPercent: 18, rotationDeg: 12 },
      { id: 'st-3', type: 'side-a', xPercent: 16, yPercent: 72, rotationDeg: -4 }
    ],
    screwsColor: 'gold'
  },
  songs: [
    {
      id: 's1',
      youtubeId: 'jfKfPfyJRdk',
      title: 'lofi hip hop radio - beats to relax/study to',
      artist: 'Lofi Girl',
      thumbnailUrl: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
      position: 1
    },
    {
      id: 's2',
      youtubeId: '5qap5aO4i9A',
      title: 'beats to sleep/chill to',
      artist: 'Lofi Girl',
      thumbnailUrl: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg',
      position: 2
    },
    {
      id: 's3',
      youtubeId: 'gT5j_b5kZ_w',
      title: 'Awake',
      artist: 'Tycho',
      thumbnailUrl: 'https://img.youtube.com/vi/gT5j_b5kZ_w/hqdefault.jpg',
      position: 3
    }
  ],
  createdAt: '1998-07-15T12:00:00.000Z'
};

function getLocalMixtapes(): Mixtape[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to read mixtapes from localStorage:', e);
    return [];
  }
}

function setLocalMixtapes(tapes: Mixtape[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tapes));
  } catch (e) {
    console.warn('Failed to save mixtapes to localStorage:', e);
  }
}

export async function saveMixtape(mixtape: Mixtape): Promise<Mixtape> {
  const id = mixtape.id || Math.random().toString(36).substring(2, 9);
  const shareId = mixtape.shareId || mixtape.share_id || id;
  const now = new Date().toISOString();

  const record: Mixtape = {
    ...mixtape,
    id,
    shareId,
    share_id: shareId,
    createdAt: mixtape.createdAt || now,
    updatedAt: now
  };

  // 1. Save to local storage
  const current = getLocalMixtapes();
  const index = current.findIndex((t) => t.id === id);
  if (index >= 0) {
    current[index] = record;
  } else {
    current.unshift(record);
  }
  setLocalMixtapes(current);

  // 2. Optionally sync with in-memory server route
  try {
    await fetch('/api/mixtapes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch {
    // Non-blocking in case server is unavailable
  }

  return record;
}

export async function getMixtapeById(id: string): Promise<Mixtape | null> {
  if (id === 'summer-98') {
    return SAMPLE_MIXTAPE;
  }

  // 1. Check local storage
  const local = getLocalMixtapes();
  const found = local.find(
    (t) => t.id === id || t.shareId === id || t.share_id === id
  );
  if (found) {
    return found;
  }

  // 2. Check server
  try {
    const res = await fetch(`/api/mixtapes/${encodeURIComponent(id)}`);
    if (res.ok) {
      const tape = await res.json();
      return tape as Mixtape;
    }
  } catch {
    // Fallback
  }

  return null;
}

export async function fetchUserMixtapes(): Promise<Mixtape[]> {
  return getLocalMixtapes();
}

export async function updateMixtape(id: string, updates: Partial<Mixtape>): Promise<Mixtape> {
  const current = getLocalMixtapes();
  const index = current.findIndex((t) => t.id === id);
  const now = new Date().toISOString();

  let updatedTape: Mixtape;
  if (index >= 0) {
    updatedTape = {
      ...current[index],
      ...updates,
      id,
      updatedAt: now
    };
    current[index] = updatedTape;
    setLocalMixtapes(current);
  } else {
    updatedTape = {
      ...updates,
      id,
      updatedAt: now
    } as Mixtape;
  }

  try {
    await fetch(`/api/mixtapes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTape)
    });
  } catch {
    // Non-blocking
  }

  return updatedTape;
}

export async function deleteMixtape(id: string): Promise<boolean> {
  const current = getLocalMixtapes();
  const filtered = current.filter((t) => t.id !== id);
  setLocalMixtapes(filtered);

  try {
    await fetch(`/api/mixtapes/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch {
    // Non-blocking
  }

  return true;
}


