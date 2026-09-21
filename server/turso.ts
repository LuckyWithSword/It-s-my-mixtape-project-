import { createClient, type Client } from '@libsql/client';
import crypto from 'crypto';

let _client: Client | null = null;

export function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function getTurso(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error('Real Turso database is not configured: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables must be provided.');
    }
    _client = createClient({ url, authToken });
  }
  return _client;
}

// Client proxy that resolves to the real Turso connection
export const turso: Client = new Proxy({} as Client, {
  get(target, prop, receiver) {
    const client = getTurso();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export interface UserRow {
  id: string;
  clerk_user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  clerk_user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MixtapeRow {
  id: string;
  owner_id: string | null;
  clerk_user_id: string | null;
  title: string;
  message: string | null;
  creator_name: string | null;
  share_id: string;
  customization: string;
  created_at: string;
  updated_at: string;
}

export interface TrackRow {
  id: string;
  mixtape_id: string;
  youtube_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
}

/**
 * Initialize Turso relational schema
 */
export async function initDatabase(): Promise<void> {
  if (!isTursoConfigured()) {
    console.warn('[Turso] Database credentials not set. Awaiting TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in environment variables.');
    return;
  }
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT UNIQUE NOT NULL,
      email TEXT,
      display_name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clerk_user_id TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      username TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS mixtapes (
      id TEXT PRIMARY KEY,
      owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      clerk_user_id TEXT,
      title TEXT NOT NULL,
      message TEXT,
      creator_name TEXT,
      share_id TEXT UNIQUE NOT NULL,
      customization TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      mixtape_id TEXT NOT NULL REFERENCES mixtapes(id) ON DELETE CASCADE,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT,
      thumbnail_url TEXT,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_mixtapes_share_id ON mixtapes(share_id);`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_mixtapes_clerk_user_id ON mixtapes(clerk_user_id);`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_tracks_mixtape_id ON tracks(mixtape_id);`);

  // Seed sample nostalgic mixtape 'summer-98' if not exists
  const existingSample = await turso.execute({
    sql: 'SELECT id FROM mixtapes WHERE id = ? OR share_id = ? LIMIT 1',
    args: ['summer-98', 'summer-98']
  });

  if (existingSample.rows.length === 0) {
    const now = new Date().toISOString();
    const sampleCustomization = JSON.stringify({
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
    });

    await turso.execute({
      sql: `INSERT OR IGNORE INTO mixtapes (id, owner_id, clerk_user_id, title, message, creator_name, share_id, customization, created_at, updated_at)
            VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'summer-98',
        'Summer Dreams 1998',
        'Made with love for sunny afternoon drives and nostalgic daydreaming. Hope this brings a smile to your day.',
        'Alex',
        'summer-98',
        sampleCustomization,
        now,
        now
      ]
    });

    const sampleTracks = [
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
    ];

    for (const t of sampleTracks) {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO tracks (id, mixtape_id, youtube_id, title, artist, thumbnail_url, position, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [t.id, 'summer-98', t.youtubeId, t.title, t.artist, t.thumbnailUrl, t.position, now]
      });
    }
  }
}

/**
 * Format Turso row and tracks into application Mixtape format
 */
function formatMixtape(row: any, tracks: any[], currentClerkUserId?: string, currentInternalUserId?: string) {
  let parsedCustomization = {};
  try {
    parsedCustomization = typeof row.customization === 'string' ? JSON.parse(row.customization) : row.customization;
  } catch {
    parsedCustomization = {};
  }

  const isOwner = Boolean(
    (currentClerkUserId && row.clerk_user_id === currentClerkUserId) ||
    (currentInternalUserId && row.owner_id === currentInternalUserId)
  );

  return {
    id: row.id,
    owner_id: row.owner_id || undefined,
    ownerId: row.owner_id || undefined,
    clerkUserId: row.clerk_user_id || undefined,
    name: row.title,
    title: row.title,
    message: row.message || '',
    creatorName: row.creator_name || '',
    share_id: row.share_id,
    shareId: row.share_id,
    customization: parsedCustomization,
    songs: tracks.map((t) => ({
      id: t.id,
      youtubeId: t.youtube_id,
      title: t.title,
      artist: t.artist || 'Unknown Artist',
      thumbnailUrl: t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_id}/hqdefault.jpg`,
      position: Number(t.position)
    })).sort((a, b) => a.position - b.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOwner
  };
}

/**
 * Get user by Clerk user ID from Turso
 */
export async function getUserByClerkId(clerkUserId: string): Promise<UserRow | null> {
  const res = await turso.execute({
    sql: 'SELECT * FROM users WHERE clerk_user_id = ? LIMIT 1',
    args: [clerkUserId]
  });
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as UserRow;
}

/**
 * Sync Clerk user and profile in Turso
 */
export async function syncClerkUserAndProfile(
  clerkUserId: string,
  email?: string,
  displayName?: string,
  avatarUrl?: string
): Promise<{ user: UserRow; profile: ProfileRow }> {
  const now = new Date().toISOString();
  const cleanEmail = email ? email.toLowerCase().trim() : null;
  const cleanDisplayName = displayName?.trim() || cleanEmail?.split('@')[0] || 'Mixtape Creator';

  // Find or create user
  const userQuery = await turso.execute({
    sql: 'SELECT * FROM users WHERE clerk_user_id = ? LIMIT 1',
    args: [clerkUserId]
  });

  let userId: string;
  let userRow: UserRow;

  if (userQuery.rows.length > 0) {
    userRow = userQuery.rows[0] as unknown as UserRow;
    userId = userRow.id;
    // Update updated_at and email/avatar if provided
    await turso.execute({
      sql: `UPDATE users SET updated_at = ?, email = COALESCE(?, email), display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?`,
      args: [now, cleanEmail, cleanDisplayName, avatarUrl || null, userId]
    });
  } else {
    userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    await turso.execute({
      sql: `INSERT INTO users (id, clerk_user_id, email, display_name, avatar_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, clerkUserId, cleanEmail, cleanDisplayName, avatarUrl || null, now, now]
    });
    userRow = {
      id: userId,
      clerk_user_id: clerkUserId,
      email: cleanEmail,
      display_name: cleanDisplayName,
      avatar_url: avatarUrl || null,
      created_at: now,
      updated_at: now
    };
  }

  // Find or create profile
  const profileQuery = await turso.execute({
    sql: 'SELECT * FROM profiles WHERE clerk_user_id = ? LIMIT 1',
    args: [clerkUserId]
  });

  let profileRow: ProfileRow;
  if (profileQuery.rows.length > 0) {
    profileRow = profileQuery.rows[0] as unknown as ProfileRow;
    if (avatarUrl && !profileRow.avatar_url) {
      await turso.execute({
        sql: `UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?`,
        args: [avatarUrl, now, profileRow.id]
      });
      profileRow.avatar_url = avatarUrl;
    }
  } else {
    const profileId = `prof_${crypto.randomBytes(8).toString('hex')}`;
    await turso.execute({
      sql: `INSERT INTO profiles (id, user_id, clerk_user_id, display_name, username, avatar_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [profileId, userId, clerkUserId, cleanDisplayName, null, avatarUrl || null, now, now]
    });
    profileRow = {
      id: profileId,
      user_id: userId,
      clerk_user_id: clerkUserId,
      display_name: cleanDisplayName,
      username: null,
      avatar_url: avatarUrl || null,
      created_at: now,
      updated_at: now
    };
  }

  return { user: userRow, profile: profileRow };
}

/**
 * Get profile by Clerk user ID
 */
export async function getProfileByClerkId(clerkUserId: string): Promise<ProfileRow | null> {
  const res = await turso.execute({
    sql: 'SELECT * FROM profiles WHERE clerk_user_id = ? LIMIT 1',
    args: [clerkUserId]
  });
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as ProfileRow;
}

/**
 * Update profile in Turso
 */
export async function updateProfileInTurso(
  clerkUserId: string,
  updates: { displayName?: string; username?: string; avatarUrl?: string }
): Promise<ProfileRow | null> {
  const now = new Date().toISOString();
  const current = await getProfileByClerkId(clerkUserId);
  if (!current) return null;

  const newDisplayName = updates.displayName?.trim() || current.display_name;
  const newUsername = updates.username !== undefined ? updates.username?.trim() || null : current.username;
  const newAvatar = updates.avatarUrl || current.avatar_url;

  await turso.execute({
    sql: `UPDATE profiles SET display_name = ?, username = ?, avatar_url = ?, updated_at = ? WHERE clerk_user_id = ?`,
    args: [newDisplayName, newUsername, newAvatar, now, clerkUserId]
  });

  await turso.execute({
    sql: `UPDATE users SET display_name = ?, avatar_url = ?, updated_at = ? WHERE clerk_user_id = ?`,
    args: [newDisplayName, newAvatar, now, clerkUserId]
  });

  return await getProfileByClerkId(clerkUserId);
}

/**
 * Get public mixtape by ID or share_id (Public access, no authentication needed)
 */
export async function getMixtapeByIdOrShareId(
  idOrShareId: string,
  currentClerkUserId?: string,
  currentInternalUserId?: string
) {
  const tapeRes = await turso.execute({
    sql: 'SELECT * FROM mixtapes WHERE id = ? OR share_id = ? LIMIT 1',
    args: [idOrShareId, idOrShareId]
  });

  if (tapeRes.rows.length === 0) return null;
  const row = tapeRes.rows[0];

  const tracksRes = await turso.execute({
    sql: 'SELECT * FROM tracks WHERE mixtape_id = ? ORDER BY position ASC',
    args: [row.id]
  });

  return formatMixtape(row, tracksRes.rows, currentClerkUserId, currentInternalUserId);
}

/**
 * Get mixtapes owned by a Clerk user
 */
export async function getUserMixtapesFromTurso(clerkUserId: string, userInternalId?: string) {
  const tapesRes = await turso.execute({
    sql: 'SELECT * FROM mixtapes WHERE clerk_user_id = ? OR (owner_id IS NOT NULL AND owner_id = ?) ORDER BY created_at DESC',
    args: [clerkUserId, userInternalId || '']
  });

  const mixtapes = [];
  for (const row of tapesRes.rows) {
    const tracksRes = await turso.execute({
      sql: 'SELECT * FROM tracks WHERE mixtape_id = ? ORDER BY position ASC',
      args: [row.id]
    });
    mixtapes.push(formatMixtape(row, tracksRes.rows, clerkUserId, userInternalId));
  }
  return mixtapes;
}

/**
 * Create a new mixtape in Turso under authenticated user
 */
export async function createMixtapeInTurso(
  data: any,
  clerkUserId: string,
  userInternalId: string
) {
  const now = new Date().toISOString();
  const id = `tape_${crypto.randomBytes(6).toString('hex')}`;
  // Secure collision-resistant share ID (e.g. 10 chars hex)
  const shareId = crypto.randomBytes(5).toString('hex');

  const title = (data.name || data.title || 'Untitled Mixtape').trim();
  const message = data.message?.trim() || '';
  const creatorName = data.creatorName?.trim() || '';
  const customization = JSON.stringify(data.customization || {});

  await turso.execute({
    sql: `INSERT INTO mixtapes (id, owner_id, clerk_user_id, title, message, creator_name, share_id, customization, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userInternalId, clerkUserId, title, message, creatorName, shareId, customization, now, now]
  });

  // Insert tracks (capped at 5 songs max)
  const songs = Array.isArray(data.songs) ? data.songs.slice(0, 5) : [];
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const trackId = `trk_${crypto.randomBytes(6).toString('hex')}`;
    await turso.execute({
      sql: `INSERT INTO tracks (id, mixtape_id, youtube_id, title, artist, thumbnail_url, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        trackId,
        id,
        song.youtubeId || song.youtube_id || '',
        song.title || 'Unknown Track',
        song.artist || 'Unknown Artist',
        song.thumbnailUrl || song.thumbnail_url || `https://img.youtube.com/vi/${song.youtubeId}/hqdefault.jpg`,
        i + 1,
        now
      ]
    });
  }

  return await getMixtapeByIdOrShareId(id, clerkUserId, userInternalId);
}

/**
 * Update an existing mixtape (enforces ownership check)
 */
export async function updateMixtapeInTurso(
  id: string,
  updates: any,
  clerkUserId: string,
  userInternalId?: string
): Promise<{ notFound?: boolean; unauthorized?: boolean; tape?: any }> {
  const existingRes = await turso.execute({
    sql: 'SELECT * FROM mixtapes WHERE id = ? OR share_id = ? LIMIT 1',
    args: [id, id]
  });

  if (existingRes.rows.length === 0) {
    return { notFound: true };
  }

  const existing = existingRes.rows[0];
  const realTapeId = existing.id as string;

  // Strict server-side ownership check
  const isOwner = (existing.clerk_user_id && existing.clerk_user_id === clerkUserId) ||
                  (userInternalId && existing.owner_id === userInternalId);

  if (!isOwner) {
    return { unauthorized: true };
  }

  const now = new Date().toISOString();
  const title = (updates.name || updates.title || existing.title).trim();
  const message = updates.message !== undefined ? updates.message : existing.message;
  const creatorName = updates.creatorName !== undefined ? updates.creatorName : existing.creator_name;
  const customization = updates.customization ? JSON.stringify(updates.customization) : existing.customization;

  await turso.execute({
    sql: `UPDATE mixtapes SET title = ?, message = ?, creator_name = ?, customization = ?, updated_at = ? WHERE id = ?`,
    args: [title, message, creatorName, customization, now, realTapeId]
  });

  // If songs array is provided, replace tracks
  if (Array.isArray(updates.songs)) {
    await turso.execute({
      sql: 'DELETE FROM tracks WHERE mixtape_id = ?',
      args: [realTapeId]
    });

    const songs = updates.songs.slice(0, 5);
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const trackId = `trk_${crypto.randomBytes(6).toString('hex')}`;
      await turso.execute({
        sql: `INSERT INTO tracks (id, mixtape_id, youtube_id, title, artist, thumbnail_url, position, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          trackId,
          realTapeId,
          song.youtubeId || song.youtube_id || '',
          song.title || 'Unknown Track',
          song.artist || 'Unknown Artist',
          song.thumbnailUrl || song.thumbnail_url || `https://img.youtube.com/vi/${song.youtubeId}/hqdefault.jpg`,
          i + 1,
          now
        ]
      });
    }
  }

  const updatedTape = await getMixtapeByIdOrShareId(realTapeId, clerkUserId, userInternalId);
  return { tape: updatedTape };
}

/**
 * Delete a mixtape (enforces ownership check)
 */
export async function deleteMixtapeInTurso(
  id: string,
  clerkUserId: string,
  userInternalId?: string
): Promise<{ notFound?: boolean; unauthorized?: boolean; success?: boolean }> {
  const existingRes = await turso.execute({
    sql: 'SELECT * FROM mixtapes WHERE id = ? OR share_id = ? LIMIT 1',
    args: [id, id]
  });

  if (existingRes.rows.length === 0) {
    return { notFound: true };
  }

  const existing = existingRes.rows[0];
  const realTapeId = existing.id as string;

  const isOwner = (existing.clerk_user_id && existing.clerk_user_id === clerkUserId) ||
                  (userInternalId && existing.owner_id === userInternalId);

  if (!isOwner) {
    return { unauthorized: true };
  }

  await turso.execute({
    sql: 'DELETE FROM tracks WHERE mixtape_id = ?',
    args: [realTapeId]
  });

  await turso.execute({
    sql: 'DELETE FROM mixtapes WHERE id = ?',
    args: [realTapeId]
  });

  return { success: true };
}
