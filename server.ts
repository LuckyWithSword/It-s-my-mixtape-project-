import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for server-shared mixtapes
const mixtapesStore = new Map<string, any>();

// Seed sample tape 'summer-98'
const SAMPLE_MIXTAPE = {
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

mixtapesStore.set('summer-98', SAMPLE_MIXTAPE);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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

// Public: Get mixtape by ID or share_id
app.get('/api/mixtapes/:id', (req, res) => {
  const idOrShareId = req.params.id;

  if (idOrShareId === 'summer-98') {
    return res.json(SAMPLE_MIXTAPE);
  }

  if (mixtapesStore.has(idOrShareId)) {
    return res.json(mixtapesStore.get(idOrShareId));
  }

  // Look through store by shareId
  for (const tape of mixtapesStore.values()) {
    if (tape.shareId === idOrShareId || tape.share_id === idOrShareId) {
      return res.json(tape);
    }
  }

  res.status(404).json({ error: 'Mixtape not found' });
});

// Create Mixtape
app.post('/api/mixtapes', (req, res) => {
  const tape = req.body;
  if (!tape || (!tape.name && !tape.title) || !Array.isArray(tape.songs)) {
    return res.status(400).json({ error: 'Invalid mixtape payload: name and songs array are required.' });
  }

  const id = tape.id || Math.random().toString(36).substring(2, 9);
  const shareId = tape.shareId || tape.share_id || id;
  const newTape = {
    ...tape,
    id,
    shareId,
    share_id: shareId,
    songs: Array.isArray(tape.songs) ? tape.songs.slice(0, 5) : [],
    createdAt: tape.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mixtapesStore.set(id, newTape);
  res.status(201).json(newTape);
});

// Update Mixtape
app.put('/api/mixtapes/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;

  if (!updates) {
    return res.status(400).json({ error: 'Invalid mixtape updates' });
  }

  const existing = mixtapesStore.get(id) || {};
  const updatedTape = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString()
  };

  if (Array.isArray(updatedTape.songs) && updatedTape.songs.length > 5) {
    updatedTape.songs = updatedTape.songs.slice(0, 5);
  }

  mixtapesStore.set(id, updatedTape);
  res.json(updatedTape);
});

// Delete Mixtape
app.delete('/api/mixtapes/:id', (req, res) => {
  const id = req.params.id;
  mixtapesStore.delete(id);
  res.json({ success: true });
});

// --- VITE MIDDLEWARE & SPA FALLBACK ---
async function startServer() {
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

