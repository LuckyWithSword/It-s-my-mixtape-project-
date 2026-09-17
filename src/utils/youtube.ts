/**
 * YouTube utility functions for URL parsing, ID extraction, and metadata fetching
 */

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regular expressions for standard YouTube URLs
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export interface VideoMeta {
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
}

export async function fetchYouTubeMetadata(youtubeId: string): Promise<VideoMeta> {
  // Try backend proxy first
  try {
    const res = await fetch(`/api/youtube-meta?id=${encodeURIComponent(youtubeId)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        youtubeId,
        title: data.title || `Track ${youtubeId}`,
        artist: data.artist || 'YouTube Creator',
        thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      };
    }
  } catch (err) {
    console.warn('Backend metadata fetch failed, using fallback:', err);
  }

  // Client-side oEmbed fallback
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      return {
        youtubeId,
        title: data.title || `Track ${youtubeId}`,
        artist: data.author_name || 'YouTube Creator',
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      };
    }
  } catch (err) {
    // Ignore and return standard fallback
  }

  return {
    youtubeId,
    title: `YouTube Track (${youtubeId})`,
    artist: 'YouTube Creator',
    thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
  };
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
