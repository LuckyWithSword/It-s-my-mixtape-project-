import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory + file persistence for mixtapes
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mixtapes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial sample mixtape
const sampleMixtapes: Record<string, any> = {
  'summer-98': {
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
        youtubeId: 'jfKfPfyJRdk', // Lofi hip hop girl classic
        title: 'lofi hip hop radio - beats to relax/study to',
        artist: 'Lofi Girl',
        thumbnailUrl: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        position: 1
      },
      {
        id: 's2',
        youtubeId: '5qap5aO4i9A', // lofi hip hop radio - beats to sleep/chill to
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
  }
};

function loadMixtapes(): Record<string, any> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return { ...sampleMixtapes, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading mixtapes data file:', err);
  }
  return { ...sampleMixtapes };
}

function saveMixtapes(data: Record<string, any>) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing mixtapes data file:', err);
  }
}

let mixtapes = loadMixtapes();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tapesCount: Object.keys(mixtapes).length });
});

// Fetch YouTube video metadata via YouTube oEmbed
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
    const data = await response.json() as any;
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

// Get mixtape by slug/id
app.get('/api/mixtapes/:id', (req, res) => {
  const id = req.params.id;
  const mixtape = mixtapes[id];
  if (!mixtape) {
    return res.status(404).json({ error: 'Mixtape not found' });
  }
  res.json(mixtape);
});

// Save mixtape
app.post('/api/mixtapes', (req, res) => {
  const tape = req.body;
  if (!tape || !tape.name || !Array.isArray(tape.songs)) {
    return res.status(400).json({ error: 'Invalid mixtape payload' });
  }

  const id = tape.id || Math.random().toString(36).substring(2, 8);
  const newTape = {
    ...tape,
    id,
    createdAt: tape.createdAt || new Date().toISOString()
  };

  mixtapes[id] = newTape;
  saveMixtapes(mixtapes);

  res.status(201).json(newTape);
});

// Vite middleware and SPA Fallback
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
