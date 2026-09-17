import React, { useState } from 'react';
import { extractYouTubeId, fetchYouTubeMetadata } from '../utils/youtube';
import { Song } from '../types';
import { Plus, Link as LinkIcon, Loader2, Music, Check, Sparkles } from 'lucide-react';

interface SongInputFormProps {
  onAddSong: (song: Omit<Song, 'id' | 'position'>) => void;
  currentSongCount: number;
  maxSongs?: number;
}

// Curated nostalgic sample tracks that users can click to quickly try
const SAMPLE_PRESETS = [
  {
    title: 'Tycho - Awake',
    artist: 'Tycho',
    url: 'https://www.youtube.com/watch?v=gT5j_b5kZ_w',
    id: 'gT5j_b5kZ_w'
  },
  {
    title: 'Lofi Hip Hop - Chill Beats',
    artist: 'Lofi Girl',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    id: 'jfKfPfyJRdk'
  },
  {
    title: 'Clams Casino - I\'m God',
    artist: 'Clams Casino',
    url: 'https://www.youtube.com/watch?v=YbvrM6Nj2Ok',
    id: 'YbvrM6Nj2Ok'
  }
];

export const SongInputForm: React.FC<SongInputFormProps> = ({
  onAddSong,
  currentSongCount,
  maxSongs = 5
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFull = currentSongCount >= maxSongs;

  const handleAdd = async (overrideIdOrUrl?: string) => {
    const target = overrideIdOrUrl || urlInput;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isFull) {
      setErrorMessage(`Mixtape capacity reached (${maxSongs} songs max for this tape).`);
      return;
    }

    if (!target.trim()) {
      setErrorMessage('Please paste a YouTube link or video ID.');
      return;
    }

    const videoId = extractYouTubeId(target);
    if (!videoId) {
      setErrorMessage('Invalid YouTube URL. Please enter a valid youtube.com or youtu.be link.');
      return;
    }

    setIsLoading(true);

    try {
      const meta = await fetchYouTubeMetadata(videoId);
      onAddSong({
        youtubeId: videoId,
        title: meta.title,
        artist: meta.artist,
        thumbnailUrl: meta.thumbnailUrl
      });

      setUrlInput('');
      setSuccessMessage(`Added "${meta.title.substring(0, 32)}..."`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage('Could not load song info. Adding with default title.');
      onAddSong({
        youtubeId: videoId,
        title: `YouTube Track (${videoId})`,
        artist: 'YouTube Creator',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      });
      setUrlInput('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <label
          htmlFor="youtube-url-input"
          className="text-[11px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5"
        >
          <Music className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
          Add YouTube Song ({currentSongCount}/{maxSongs})
        </label>
        <span
          className={`text-[9px] sm:text-[11px] font-mono-retro px-1.5 sm:px-2 py-0.5 rounded-full ${
            isFull
              ? 'bg-rose-100 text-rose-700 font-bold'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {maxSongs - currentSongCount} slots left
        </span>
      </div>

      {/* Input Group */}
      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-stone-400">
            <LinkIcon className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            id="youtube-url-input"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              setErrorMessage(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            disabled={isFull || isLoading}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 transition"
          />
        </div>

        <button
          type="button"
          id="add-song-btn"
          onClick={() => handleAdd()}
          disabled={isFull || isLoading || !urlInput.trim()}
          className="px-3 sm:px-4 py-1.5 sm:py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-mono-retro font-bold uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Song</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <p className="mt-1.5 sm:mt-2 text-xs text-rose-600 font-mono-retro">
          ⚠ {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="mt-1.5 sm:mt-2 text-xs text-emerald-600 font-mono-retro flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          {successMessage}
        </p>
      )}

      {/* Quick Inspiration Presets */}
      {!isFull && (
        <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-stone-100">
          <span className="text-[10px] font-mono-retro text-stone-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick Suggestion Samples:
          </span>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {SAMPLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAdd(p.url)}
                disabled={isLoading}
                className="text-[10px] sm:text-[11px] bg-stone-100 hover:bg-amber-100 border border-stone-200 hover:border-amber-300 text-stone-700 hover:text-stone-900 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition text-left"
              >
                + {p.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
