import React, { useState } from 'react';
import { extractYouTubeId, fetchYouTubeMetadata } from '../utils/youtube';
import { Song } from '../types';
import { Plus, Search, Check, AlertCircle } from 'lucide-react';
import { CassetteSpool } from './MixtapeLoader';

interface SongInputFormProps {
  onAddSong: (song: Omit<Song, 'id' | 'position'>) => void;
  currentSongCount: number;
  maxSongs?: number;
}

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

  const handleAdd = async (targetUrl?: string) => {
    const target = targetUrl || urlInput;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isFull) {
      setErrorMessage(`Mixtape capacity reached (${maxSongs} songs max).`);
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
      setSuccessMessage(`Added "${meta.title.substring(0, 28)}..."`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage('Could not retrieve metadata, added with video ID.');
      onAddSong({
        youtubeId: videoId,
        title: `Track (${videoId})`,
        artist: 'YouTube Audio',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      });
      setUrlInput('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl p-3.5 sm:p-4 border-0 shadow-none">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-100">
        <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-800">
          ADD YOUTUBE SONG
        </span>
        <span className="text-[10px] font-sans font-semibold text-stone-400 uppercase tracking-wider">
          {isFull ? 'Tape Full' : `${maxSongs - currentSongCount} Slots Left`}
        </span>
      </div>

      {/* Input & Action: Compact Mobile Layout */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
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
            placeholder="Paste YouTube link..."
            className="w-full h-10 pl-9 pr-3 bg-[#FAF7F2] border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 transition"
          />
        </div>

        <button
          type="button"
          id="add-song-btn"
          onClick={() => handleAdd()}
          disabled={isFull || isLoading || !urlInput.trim()}
          className="h-10 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <>
              <CassetteSpool size={14} hubColor="#faf4e6" spinning={true} />
              <span>FETCHING...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ ADD TRACK</span>
            </>
          )}
        </button>
      </div>

      {/* Inline Feedback Messages */}
      {errorMessage && (
        <p className="mt-2.5 text-xs text-rose-600 flex items-center gap-1.5 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
      {successMessage && (
        <p className="mt-2.5 text-xs text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
          <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
          <span>{successMessage}</span>
        </p>
      )}
    </div>
  );
};
