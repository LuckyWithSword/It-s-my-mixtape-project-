import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClerkClient, verifyToken } from '@clerk/backend';
import {
  initDatabase,
  isTursoConfigured,
  getMixtapeByIdOrShareId,
  getUserMixtapesFromTurso,
  createMixtapeInTurso,
  updateMixtapeInTurso,
  deleteMixtapeInTurso,
  getUserByClerkId,
  syncClerkUserAndProfile
} from './server/turso';

interface AuthenticatedRequest extends Request {
  clerkUserId?: string;
  tursoUser?: any;
}

const app = express();
const PORT = 3000;

app.use(express.json());

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

// Guard middleware requiring configured Turso database
const requireTurso = (req: Request, res: Response, next: NextFunction) => {
  if (!isTursoConfigured()) {
    return res.status(503).json({
      error: 'Turso database is not configured. Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment variables.'
    });
  }
  next();
};

// Token verification helper
async function verifyClerkSessionToken(token: string): Promise<string> {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is not configured on server.');
  }
  const verified = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  if (!verified || !verified.sub) {
    throw new Error('Invalid Clerk token payload');
  }
  return verified.sub as string;
}

// Authentication middleware for protected creator endpoints
const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token missing.' });
  }

  try {
    const clerkUserId = await verifyClerkSessionToken(token);
    req.clerkUserId = clerkUserId;

    // Sync or retrieve Turso application user
    if (isTursoConfigured()) {
      let tursoUser = await getUserByClerkId(clerkUserId);
      if (!tursoUser && clerkClient) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          const email = clerkUser.emailAddresses[0]?.emailAddress;
          const displayName = clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
            : (clerkUser.username || 'Mixtape Creator');
          const avatarUrl = clerkUser.imageUrl || undefined;
          const synced = await syncClerkUserAndProfile(clerkUserId, email, displayName, avatarUrl);
          tursoUser = synced.user;
        } catch (e) {
          console.warn('Could not auto-fetch user from Clerk API:', e);
          const synced = await syncClerkUserAndProfile(clerkUserId);
          tursoUser = synced.user;
        }
      }
      req.tursoUser = tursoUser;
    }

    next();
  } catch (err: any) {
    console.error('Auth verification error:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  }
};

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'turso',
    tursoConfigured: isTursoConfigured(),
    clerkConfigured: Boolean(process.env.CLERK_SECRET_KEY)
  });
});

// Automatic sync endpoint: Syncs Clerk user into Turso users & profiles table idempotently
app.post('/api/auth/sync', requireTurso, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clerkUserId = req.clerkUserId!;
    const { email, displayName, avatarUrl } = req.body || {};

    let userEmail = email;
    let userName = displayName;
    let userAvatar = avatarUrl;

    // Fetch official details from Clerk backend client if available
    if (clerkClient) {
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        userEmail = clerkUser.emailAddresses[0]?.emailAddress || userEmail;
        userName = clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
          : (clerkUser.username || userName);
        userAvatar = clerkUser.imageUrl || userAvatar;
      } catch (err) {
        console.warn('Error fetching Clerk user info in sync:', err);
      }
    }

    const result = await syncClerkUserAndProfile(clerkUserId, userEmail, userName, userAvatar);
    res.json({
      success: true,
      user: result.user,
      profile: result.profile
    });
  } catch (err: any) {
    console.error('Error syncing user:', err);
    res.status(500).json({ error: err.message || 'Failed to sync user profile' });
  }
});

// Current user profile
app.get('/api/me', requireTurso, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({
      clerkUserId: req.clerkUserId,
      user: req.tursoUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user' });
  }
});

// YouTube video metadata via YouTube oEmbed
app.get('/api/youtube-meta', async (req, res) => {
  const videoId = req.query.id as string;
  if (!videoId || typeof videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Valid YouTube 11-character video ID is required' });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      return res.json({
        youtubeId: videoId,
        title: `YouTube Track (${videoId})`,
        artist: 'Unknown Artist',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      });
    }
    const data = (await response.json()) as any;
    res.json({
      youtubeId: videoId,
      title: data.title || `YouTube Track (${videoId})`,
      artist: data.author_name || 'YouTube Creator',
      thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    });
  } catch (err) {
    console.warn('Could not fetch oEmbed:', err);
    res.json({
      youtubeId: videoId,
      title: `YouTube Track (${videoId})`,
      artist: 'YouTube Creator',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    });
  }
});

// --- MIXTAPE ENDPOINTS ---

// Public: Get mixtape by ID or share_id (/m/:shareId or /tape/:id) (No authentication required)
// If optional Authorization header is provided, checks isOwner for the requesting user
app.get('/api/mixtapes/:id', async (req, res) => {
  try {
    const idOrShareId = req.params.id;

    // Optional viewer check
    let viewerClerkId: string | undefined;
    let viewerTursoId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        viewerClerkId = await verifyClerkSessionToken(token);
        if (viewerClerkId && isTursoConfigured()) {
          const user = await getUserByClerkId(viewerClerkId);
          viewerTursoId = user?.id;
        }
      } catch {
        // Unauthenticated or invalid token is completely fine for public mixtape view
      }
    }

    if (isTursoConfigured()) {
      const tape = await getMixtapeByIdOrShareId(idOrShareId, viewerClerkId, viewerTursoId);
      if (tape) {
        return res.json(tape);
      }
    }

    if (idOrShareId === 'summer-98') {
      return res.json({
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
        createdAt: new Date().toISOString(),
        isOwner: false
      });
    }

    res.status(404).json({ error: 'Mixtape not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load mixtape' });
  }
});

// Protected: Get user created mixtapes (requires Clerk session)
app.get('/api/my-mixtapes', requireTurso, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tapes = await getUserMixtapesFromTurso(req.clerkUserId!, req.tursoUser?.id);
    res.json(tapes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch mixtapes' });
  }
});

// Protected: Create Mixtape (requires Clerk session and Turso user profile)
app.post('/api/mixtapes', requireTurso, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tape = req.body;
    if (!tape || (!tape.name && !tape.title) || !Array.isArray(tape.songs)) {
      return res.status(400).json({ error: 'Invalid mixtape payload: name and songs array are required.' });
    }

    // 5 songs limit enforced on server
    if (tape.songs.length > 5) {
      tape.songs = tape.songs.slice(0, 5);
    }

    const newTape = await createMixtapeInTurso(tape, req.clerkUserId!, req.tursoUser?.id);
    res.status(201).json(newTape);
  } catch (err: any) {
    console.error('Error creating mixtape:', err);
    res.status(500).json({ error: err.message || 'Failed to create mixtape' });
  }
});

// Protected: Update Mixtape (requires Clerk session and ownership check)
app.put('/api/mixtapes/:id', requireTurso, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    if (!updates || (!updates.name && !updates.title) || !Array.isArray(updates.songs)) {
      return res.status(400).json({ error: 'Invalid mixtape updates' });
    }

    if (updates.songs.length > 5) {
      updates.songs = updates.songs.slice(0, 5);
    }

    const result = await updateMixtapeInTurso(id, updates, req.clerkUserId!, req.tursoUser?.id);

    if (result.notFound) {
      return res.status(404).json({ error: 'Mixtape not found' });
    }

    if (result.unauthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to edit this mixtape.' });
    }

    res.json(result.tape);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update mixtape' });
  }
});

// Protected: Delete Mixtape (requires Clerk session and ownership check)
app.delete('/api/mixtapes/:id', requireTurso, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const result = await deleteMixtapeInTurso(id, req.clerkUserId!, req.tursoUser?.id);

    if (result.notFound) {
      return res.status(404).json({ error: 'Mixtape not found' });
    }

    if (result.unauthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this mixtape.' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete mixtape' });
  }
});

// --- VITE MIDDLEWARE & SPA FALLBACK ---
async function startServer() {
  // Initialize Turso database tables & schema safely without dropping tables
  try {
    await initDatabase();
    console.log('Turso database initialized successfully.');
  } catch (err) {
    console.error('Turso database initialization error:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
