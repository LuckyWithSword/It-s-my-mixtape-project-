import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Ensure public/uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve /uploads directly with cache headers
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d'
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Explicit Digital Asset Links handler with correct application/json MIME type
app.get('/.well-known/assetlinks.json', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const distAssetLinks = path.join(process.cwd(), 'dist', '.well-known', 'assetlinks.json');
  const publicAssetLinks = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
  if (fs.existsSync(distAssetLinks)) {
    return res.sendFile(distAssetLinks);
  } else if (fs.existsSync(publicAssetLinks)) {
    return res.sendFile(publicAssetLinks);
  }
  next();
});

// Explicit manifest handlers for both webmanifest and json formats with correct MIME type
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res, next) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  const distManifest = path.join(process.cwd(), 'dist', 'manifest.webmanifest');
  const publicWebmanifest = path.join(process.cwd(), 'public', 'manifest.webmanifest');
  const publicJson = path.join(process.cwd(), 'public', 'manifest.json');
  if (fs.existsSync(distManifest)) {
    return res.sendFile(distManifest);
  } else if (fs.existsSync(publicWebmanifest)) {
    return res.sendFile(publicWebmanifest);
  } else if (fs.existsSync(publicJson)) {
    return res.sendFile(publicJson);
  }
  next();
});

// Explicit service worker handler with correct JavaScript MIME type
app.get('/sw.js', (req, res, next) => {
  const distSw = path.join(process.cwd(), 'dist', 'sw.js');
  if (fs.existsSync(distSw)) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(distSw);
  }
  next();
});

// Artwork upload endpoint (fast server-side fallback/storage)
app.post('/api/upload-artwork', (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 string is required' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const safeFilename = `artwork_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFilename}`;
    return res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Error saving artwork:', err);
    return res.status(500).json({ error: 'Failed to save artwork' });
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

// --- VITE MIDDLEWARE & SPA FALLBACK ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
