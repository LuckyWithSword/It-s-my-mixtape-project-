import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch, 
  serverTimestamp, 
  deleteDoc,
  setDoc,
  limit 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Mixtape, Song } from '../types';
import { extractYouTubeId } from './youtube';

const STORAGE_KEY = 'its_my_playlist_mixtapes';

export const SAMPLE_MIXTAPE: Mixtape = {
  id: 'summer-98',
  name: 'Summer Dreams 1998',
  title: 'Summer Dreams 1998',
  message: 'Made with love for sunny afternoon drives and nostalgic daydreaming. Hope this brings a smile to your day.',
  creatorName: 'Alex',
  shareId: 'summer-98',
  share_id: 'summer-98',
  ownerId: 'sample-user',
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

export function getLocalMixtapes(): Mixtape[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalMixtapes(tapes: Mixtape[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tapes));
  } catch {
    // Ignore storage quota
  }
}

// Helper to convert Firestore timestamp to ISO string
function toIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      // fallback
    }
  }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return new Date().toISOString();
}

/**
 * Ensures an initial mixtape document exists in Firestore before artwork is uploaded.
 * Establishes ownerId = currentUser.uid to satisfy security rules and ownership checks.
 */
export async function ensureDraftMixtape(
  mixtapeId: string,
  shareId: string,
  draftData?: {
    name?: string;
    creatorName?: string;
    message?: string;
    customization?: any;
    songs?: Song[];
  }
): Promise<{ mixtapeId: string; shareId: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in with Google to create or save a mixtape.');
  }

  const ownerId = currentUser.uid;
  const mixtapeRef = doc(db, 'mixtapes', mixtapeId);

  try {
    const existingSnap = await getDoc(mixtapeRef);
    if (!existingSnap.exists()) {
      const title = (draftData?.name ?? 'Untitled Mixtape').trim() || 'Untitled Mixtape';
      await setDoc(mixtapeRef, {
        ownerId,
        title,
        name: title,
        shareId,
        share_id: shareId,
        creatorName: draftData?.creatorName || '',
        message: draftData?.message || '',
        customization: draftData?.customization || SAMPLE_MIXTAPE.customization,
        songs: draftData?.songs || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return { mixtapeId, shareId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `mixtapes/${mixtapeId}`);
    throw error;
  }
}

/**
 * Updates the mixtape document's imageUrl field with the uploaded Firebase Storage URL.
 */
export async function updateMixtapeArtwork(mixtapeId: string, imageUrl: string | null): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in with Google to update mixtape artwork.');
  }

  const mixtapeRef = doc(db, 'mixtapes', mixtapeId);
  try {
    await setDoc(mixtapeRef, {
      imageUrl,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mixtapes/${mixtapeId}`);
    throw error;
  }
}

/**
 * Creates or updates a mixtape in Cloud Firestore.
 * Enforces ownership: ownerId is taken directly from auth.currentUser.uid.
 */
export async function saveMixtape(mixtape: Partial<Mixtape>): Promise<Mixtape> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in with Google to create or save a mixtape.');
  }

  const ownerId = currentUser.uid;
  const shareId = (mixtape.shareId || mixtape.share_id || Math.random().toString(36).substring(2, 10)).trim();
  const mixtapeId = (mixtape.id || shareId).trim();
  const title = (mixtape.name ?? mixtape.title ?? '').trim() || 'Untitled Mixtape';
  const creatorName = (mixtape.creatorName ?? '').trim();
  const message = (mixtape.message ?? '').trim();
  const imageUrl = mixtape.imageUrl || null;
  const customization = mixtape.customization || SAMPLE_MIXTAPE.customization;

  const cleanSongs: Song[] = (Array.isArray(mixtape.songs) ? mixtape.songs.slice(0, 5) : []).map((s, idx) => ({
    id: s.id || `track-${idx + 1}`,
    youtubeId: s.youtubeId || '',
    title: (s.title || `Track ${idx + 1}`).trim(),
    artist: (s.artist || '').trim(),
    thumbnailUrl: s.thumbnailUrl || (s.youtubeId ? `https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg` : ''),
    position: typeof s.position === 'number' ? s.position : idx + 1
  }));

  const savedMixtape: Mixtape = {
    id: mixtapeId,
    ownerId,
    name: title,
    title,
    creatorName: creatorName || currentUser.displayName || '',
    message,
    imageUrl,
    shareId,
    share_id: shareId,
    customization,
    songs: cleanSongs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Immediate local cache save so any internal navigation (/m/:shareId) finds it instantly
  try {
    const local = getLocalMixtapes();
    const existingIndex = local.findIndex((t) => t.id === mixtapeId || t.shareId === shareId);
    if (existingIndex >= 0) {
      local[existingIndex] = savedMixtape;
    } else {
      local.unshift(savedMixtape);
    }
    saveLocalMixtapes(local);
  } catch (localErr) {
    console.warn('Local cache save warning:', localErr);
  }

  const mixtapeRef = doc(db, 'mixtapes', mixtapeId);

  try {
    // 1. Commit the mixtape document with sanitized fields (no undefined properties allowed in Firestore)
    await setDoc(mixtapeRef, {
      ownerId,
      title,
      name: title,
      creatorName,
      message,
      imageUrl,
      shareId,
      share_id: shareId,
      customization: JSON.parse(JSON.stringify(customization)),
      songs: cleanSongs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 2. Sync associated tracks with ownerId
    if (cleanSongs.length > 0) {
      try {
        const trackBatch = writeBatch(db);

        // Delete any existing tracks for this mixtape in case of edit
        const existingTracksQuery = query(collection(db, 'tracks'), where('mixtapeId', '==', mixtapeId));
        const existingTracksSnap = await getDocs(existingTracksQuery);
        existingTracksSnap.forEach((tSnap) => {
          trackBatch.delete(tSnap.ref);
        });

        // Write tracks with ownerId
        cleanSongs.forEach((song, index) => {
          const trackId = `${mixtapeId}_tr_${index + 1}`;
          const trackRef = doc(db, 'tracks', trackId);
          const youtubeUrl = song.youtubeId 
            ? `https://www.youtube.com/watch?v=${song.youtubeId}`
            : 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

          trackBatch.set(trackRef, {
            ownerId,
            mixtapeId,
            title: song.title || `Track ${index + 1}`,
            youtubeUrl,
            position: index + 1,
            createdAt: serverTimestamp(),
          });
        });

        await trackBatch.commit();
      } catch (trackErr) {
        console.warn('Tracks collection sync warning (embedded tracks still saved):', trackErr);
      }
    }

    return savedMixtape;
  } catch (error: any) {
    console.warn('Firestore write warning in saveMixtape:', error);
    handleFirestoreError(error, OperationType.WRITE, `mixtapes/${mixtapeId}`);
    return savedMixtape;
  }
}

/**
 * Helper to race a promise with a timeout in milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Publicly fetches a mixtape and its tracks by document id or shareId.
 * Does NOT require authentication.
 */
export async function getMixtapeById(idOrShareId: string): Promise<Mixtape | null> {
  if (!idOrShareId) return null;
  // Clean any leading route fragments (/m/, m/, /tape/, #m/) and trailing slashes
  const cleanId = idOrShareId.trim().replace(/^(\/?m\/|\/?tape\/|#m\/|#tape\/)/i, '').replace(/\/+$/, '');
  if (!cleanId) return null;

  if (cleanId === 'summer-98') {
    return SAMPLE_MIXTAPE;
  }

  // 0. Fast local check (e.g. freshly published on this device)
  const localTapes = getLocalMixtapes();
  const fastLocalMatch = localTapes.find(t => t.id === cleanId || t.shareId === cleanId || t.share_id === cleanId);

  try {
    let mixtapeDocData: any = null;
    let actualMixtapeId = cleanId;

    // 1. Primary Public Lookup: query by shareId field with 6s timeout
    try {
      const shareQuery = query(
        collection(db, 'mixtapes'), 
        where('shareId', '==', cleanId),
        limit(1)
      );
      const querySnap = await withTimeout(getDocs(shareQuery), 6000, 'Firestore shareId query timed out');
      if (!querySnap.empty) {
        const found = querySnap.docs[0];
        mixtapeDocData = found.data();
        actualMixtapeId = found.id;
      }
    } catch (shareErr) {
      console.warn('ShareId query attempt warning:', shareErr);
    }

    // 1b. Check share_id fallback field if primary query missed
    if (!mixtapeDocData) {
      try {
        const shareQuery2 = query(
          collection(db, 'mixtapes'),
          where('share_id', '==', cleanId),
          limit(1)
        );
        const querySnap2 = await withTimeout(getDocs(shareQuery2), 4000, 'Firestore share_id query timed out');
        if (!querySnap2.empty) {
          const found = querySnap2.docs[0];
          mixtapeDocData = found.data();
          actualMixtapeId = found.id;
        }
      } catch (shareErr2) {
        console.warn('share_id fallback query warning:', shareErr2);
      }
    }

    // 2. Direct ID Fallback: check by document ID in case doc ID was supplied
    if (!mixtapeDocData) {
      try {
        const directDocRef = doc(db, 'mixtapes', cleanId);
        const directSnap = await withTimeout(getDoc(directDocRef), 4000, 'Firestore direct getDoc timed out');
        if (directSnap.exists()) {
          mixtapeDocData = directSnap.data();
          actualMixtapeId = directSnap.id;
        }
      } catch (directErr) {
        console.warn('Direct doc lookup warning:', directErr);
      }
    }

    // If Firestore could not find document, check local storage match
    if (!mixtapeDocData) {
      if (fastLocalMatch) return fastLocalMatch;
      return null;
    }

    // 3. Load associated tracks from embedded array or tracks collection
    let songs: Song[] = [];
    if (Array.isArray(mixtapeDocData.songs) && mixtapeDocData.songs.length > 0) {
      songs = mixtapeDocData.songs.map((s: any, idx: number) => {
        const rawYt = s.youtubeId || s.youtubeUrl || '';
        const youtubeId = extractYouTubeId(rawYt) || rawYt || '';
        return {
          id: s.id || `track-${idx + 1}`,
          youtubeId,
          title: s.title || `Track ${idx + 1}`,
          artist: s.artist || '',
          thumbnailUrl: s.thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : ''),
          position: typeof s.position === 'number' ? s.position : idx + 1,
        };
      });
    } else {
      try {
        const tracksQuery = query(
          collection(db, 'tracks'), 
          where('mixtapeId', '==', actualMixtapeId)
        );
        const tracksSnap = await withTimeout(getDocs(tracksQuery), 4000, 'Tracks query timed out');

        songs = tracksSnap.docs.map((tDoc) => {
          const tData = tDoc.data();
          const rawYt = tData.youtubeUrl || tData.youtubeId || '';
          const youtubeId = extractYouTubeId(rawYt) || rawYt || '';
          return {
            id: tDoc.id,
            youtubeId,
            title: tData.title || 'Untitled Track',
            artist: tData.artist || '',
            thumbnailUrl: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
            position: tData.position || 1,
          };
        }).sort((a, b) => a.position - b.position);
      } catch (tracksError) {
        console.warn('Could not fetch tracks collection:', tracksError);
      }
    }

    const loadedMixtape: Mixtape = {
      id: actualMixtapeId,
      ownerId: mixtapeDocData.ownerId,
      name: mixtapeDocData.title ?? mixtapeDocData.name ?? 'Untitled Mixtape',
      title: mixtapeDocData.title ?? mixtapeDocData.name ?? 'Untitled Mixtape',
      message: mixtapeDocData.message || '',
      creatorName: mixtapeDocData.creatorName || '',
      imageUrl: mixtapeDocData.imageUrl || null,
      shareId: mixtapeDocData.shareId || mixtapeDocData.share_id || actualMixtapeId,
      share_id: mixtapeDocData.shareId || mixtapeDocData.share_id || actualMixtapeId,
      customization: mixtapeDocData.customization || SAMPLE_MIXTAPE.customization,
      songs,
      createdAt: toIsoString(mixtapeDocData.createdAt),
      updatedAt: toIsoString(mixtapeDocData.updatedAt),
    };

    // Cache to localStorage
    try {
      const local = getLocalMixtapes();
      const idx = local.findIndex(t => t.id === actualMixtapeId || t.shareId === loadedMixtape.shareId);
      if (idx >= 0) {
        local[idx] = loadedMixtape;
      } else {
        local.unshift(loadedMixtape);
      }
      saveLocalMixtapes(local);
    } catch {}

    return loadedMixtape;
  } catch (error: any) {
    console.error(`Error fetching mixtape for "${cleanId}":`, error);
    if (fastLocalMatch) return fastLocalMatch;
    throw error;
  }
}

/**
 * Fetches all mixtapes belonging to the authenticated user.
 */
export async function fetchUserMixtapes(uid: string): Promise<Mixtape[]> {
  if (!uid) return [];

  try {
    const q = query(
      collection(db, 'mixtapes'), 
      where('ownerId', '==', uid)
    );
    const snap = await getDocs(q);

    const mixtapes: Mixtape[] = [];

    for (const mDoc of snap.docs) {
      const data = mDoc.data();
      const tapeId = mDoc.id;

      // Fetch tracks for this tape
      let songs: Song[] = [];
      if (Array.isArray(data.songs) && data.songs.length > 0) {
        songs = data.songs;
      } else {
        try {
          const tracksQuery = query(collection(db, 'tracks'), where('mixtapeId', '==', tapeId));
          const tracksSnap = await getDocs(tracksQuery);
          songs = tracksSnap.docs.map((tDoc) => {
            const tData = tDoc.data();
            const youtubeId = extractYouTubeId(tData.youtubeUrl) || '';
            return {
              id: tDoc.id,
              youtubeId,
              title: tData.title,
              thumbnailUrl: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
              position: tData.position || 1,
            };
          }).sort((a, b) => a.position - b.position);
        } catch {
          // Continue if tracks query fails
        }
      }

      mixtapes.push({
        id: tapeId,
        ownerId: data.ownerId,
        name: data.title ?? data.name ?? '',
        title: data.title ?? data.name ?? '',
        message: data.message || '',
        creatorName: data.creatorName || '',
        imageUrl: data.imageUrl || null,
        shareId: data.shareId || tapeId,
        share_id: data.shareId || tapeId,
        customization: data.customization || SAMPLE_MIXTAPE.customization,
        songs,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
      });
    }

    // Sort by createdAt descending
    mixtapes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    saveLocalMixtapes(mixtapes);
    return mixtapes;
  } catch (error: any) {
    console.error('Error fetching user mixtapes:', error);
    // Return cached local tapes as fallback
    const local = getLocalMixtapes().filter(t => !t.ownerId || t.ownerId === uid);
    if (local.length > 0) return local;
    handleFirestoreError(error, OperationType.LIST, 'mixtapes');
  }
}

/**
 * Updates a mixtape in Firestore, verifying ownership.
 */
export async function updateMixtape(id: string, updates: Partial<Mixtape>): Promise<Mixtape> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to edit this mixtape.');
  }

  // Load existing tape to verify ownership
  const existingTape = await getMixtapeById(id);
  if (!existingTape) {
    throw new Error('This mixtape could not be found.');
  }

  if (existingTape.ownerId && existingTape.ownerId !== currentUser.uid) {
    throw new Error("You don't have permission to edit this mixtape.");
  }

  return saveMixtape({
    ...existingTape,
    ...updates,
    id,
  });
}

/**
 * Deletes a mixtape and its tracks from Firestore.
 */
export async function deleteMixtape(id: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to delete this mixtape.');
  }

  try {
    const existing = await getMixtapeById(id);
    if (existing && existing.ownerId && existing.ownerId !== currentUser.uid) {
      throw new Error("You don't have permission to delete this mixtape.");
    }

    const batch = writeBatch(db);

    // Delete mixtape doc
    batch.delete(doc(db, 'mixtapes', id));

    // Delete associated tracks
    const tracksQuery = query(collection(db, 'tracks'), where('mixtapeId', '==', id));
    const tracksSnap = await getDocs(tracksQuery);
    tracksSnap.forEach(tDoc => {
      batch.delete(tDoc.ref);
    });

    await batch.commit();

    // Clean local storage cache
    const local = getLocalMixtapes().filter(t => t.id !== id);
    saveLocalMixtapes(local);

    return true;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.DELETE, `mixtapes/${id}`);
  }
}
