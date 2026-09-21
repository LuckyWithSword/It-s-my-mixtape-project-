import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  google_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileRecord {
  id: string;
  user_id: string;
  display_name: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MixtapeRecord {
  id: string;
  owner_id?: string;
  name: string;
  message?: string;
  creatorName?: string;
  customization: any;
  songs: any[];
  createdAt: string;
  updatedAt?: string;
}

export interface SessionRecord {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadJson<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
  }
  return fallback;
}

function saveJson(filename: string, data: any) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving ${filename}:`, err);
  }
}

// In-memory stores synchronized with data files
class Database {
  private users: Record<string, UserRecord>;
  private profiles: Record<string, ProfileRecord>;
  private mixtapes: Record<string, MixtapeRecord>;
  private sessions: Record<string, SessionRecord>;

  constructor() {
    this.users = loadJson<Record<string, UserRecord>>('users.json', {});
    this.profiles = loadJson<Record<string, ProfileRecord>>('profiles.json', {});
    this.mixtapes = loadJson<Record<string, MixtapeRecord>>('mixtapes.json', {});
    this.sessions = loadJson<Record<string, SessionRecord>>('sessions.json', {});

    // Ensure sample tape exists if empty
    if (!this.mixtapes['summer-98']) {
      this.mixtapes['summer-98'] = {
        id: 'summer-98',
        name: 'Summer Dreams 1998',
        message: 'Made with love for sunny afternoon drives and nostalgic daydreaming. Hope this brings a smile to your day.',
        creatorName: 'Alex',
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
        createdAt: new Date().toISOString()
      };
      saveJson('mixtapes.json', this.mixtapes);
    }
  }

  // --- USERS & PROFILES ---
  public findUserByEmail(email: string): UserRecord | null {
    const normalized = email.toLowerCase().trim();
    for (const u of Object.values(this.users)) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  }

  public findUserByGoogleId(googleId: string): UserRecord | null {
    for (const u of Object.values(this.users)) {
      if (u.google_id === googleId) {
        return u;
      }
    }
    return null;
  }

  public getUserById(userId: string): UserRecord | null {
    return this.users[userId] || null;
  }

  public getProfileByUserId(userId: string): ProfileRecord | null {
    for (const p of Object.values(this.profiles)) {
      if (p.user_id === userId) {
        return p;
      }
    }
    return null;
  }

  public createUser(email: string, options: { google_id?: string; displayName?: string; avatarUrl?: string }): { user: UserRecord; profile: ProfileRecord } {
    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const profileId = `prof_${crypto.randomBytes(8).toString('hex')}`;

    const normalizedEmail = email.toLowerCase().trim();
    const fallbackName = options.displayName || normalizedEmail.split('@')[0] || 'Mixtape Maker';

    const user: UserRecord = {
      id: userId,
      email: normalizedEmail,
      google_id: options.google_id,
      created_at: now,
      updated_at: now
    };

    const profile: ProfileRecord = {
      id: profileId,
      user_id: userId,
      display_name: fallbackName,
      username: normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20),
      avatar_url: options.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fallbackName)}`,
      created_at: now,
      updated_at: now
    };

    this.users[userId] = user;
    this.profiles[profileId] = profile;

    saveJson('users.json', this.users);
    saveJson('profiles.json', this.profiles);

    return { user, profile };
  }

  public updateProfile(userId: string, data: Partial<Pick<ProfileRecord, 'display_name' | 'username' | 'avatar_url'>>): ProfileRecord | null {
    const profile = this.getProfileByUserId(userId);
    if (!profile) return null;

    if (data.display_name !== undefined) profile.display_name = data.display_name.trim();
    if (data.username !== undefined) profile.username = data.username.trim();
    if (data.avatar_url !== undefined) profile.avatar_url = data.avatar_url.trim();
    profile.updated_at = new Date().toISOString();

    this.profiles[profile.id] = profile;
    saveJson('profiles.json', this.profiles);
    return profile;
  }

  // --- SESSIONS ---
  public createSession(userId: string): SessionRecord {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    // 30 days expiry
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const session: SessionRecord = {
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expires.toISOString()
    };

    this.sessions[token] = session;
    saveJson('sessions.json', this.sessions);
    return session;
  }

  public getSession(token: string): SessionRecord | null {
    const session = this.sessions[token];
    if (!session) return null;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      delete this.sessions[token];
      saveJson('sessions.json', this.sessions);
      return null;
    }

    return session;
  }

  public deleteSession(token: string): boolean {
    if (this.sessions[token]) {
      delete this.sessions[token];
      saveJson('sessions.json', this.sessions);
      return true;
    }
    return false;
  }

  // --- MIXTAPES (RLS & CRUD) ---
  public getMixtapeById(id: string): MixtapeRecord | null {
    return this.mixtapes[id] || null;
  }

  public getAllMixtapes(): Record<string, MixtapeRecord> {
    return this.mixtapes;
  }

  public getUserMixtapes(userId: string): MixtapeRecord[] {
    const list = Object.values(this.mixtapes).filter((tape) => tape.owner_id === userId);
    // Sort newest first
    return list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  public createMixtape(tape: any, ownerId?: string): MixtapeRecord {
    const id = tape.id || Math.random().toString(36).substring(2, 8);
    const now = new Date().toISOString();

    const record: MixtapeRecord = {
      ...tape,
      id,
      owner_id: ownerId,
      createdAt: tape.createdAt || now,
      updatedAt: now
    };

    this.mixtapes[id] = record;
    saveJson('mixtapes.json', this.mixtapes);
    return record;
  }

  public updateMixtape(id: string, updates: any, userId: string): { tape: MixtapeRecord | null; unauthorized: boolean; notFound: boolean } {
    const existing = this.mixtapes[id];
    if (!existing) {
      return { tape: null, unauthorized: false, notFound: true };
    }

    // Authorization / RLS check:
    // If mixtape has an owner_id, only the owner can edit it!
    if (existing.owner_id && existing.owner_id !== userId) {
      return { tape: null, unauthorized: true, notFound: false };
    }

    // If tape didn't have an owner_id (e.g. created previously), claim ownership or retain
    const owner_id = existing.owner_id || userId;

    const updated: MixtapeRecord = {
      ...existing,
      ...updates,
      id, // protect id
      owner_id,
      updatedAt: new Date().toISOString()
    };

    this.mixtapes[id] = updated;
    saveJson('mixtapes.json', this.mixtapes);
    return { tape: updated, unauthorized: false, notFound: false };
  }

  public deleteMixtape(id: string, userId: string): { success: boolean; unauthorized: boolean; notFound: boolean } {
    const existing = this.mixtapes[id];
    if (!existing) {
      return { success: false, unauthorized: false, notFound: true };
    }

    // Authorization / RLS check:
    if (existing.owner_id && existing.owner_id !== userId) {
      return { success: false, unauthorized: true, notFound: false };
    }

    delete this.mixtapes[id];
    saveJson('mixtapes.json', this.mixtapes);
    return { success: true, unauthorized: false, notFound: false };
  }
}

export const db = new Database();
