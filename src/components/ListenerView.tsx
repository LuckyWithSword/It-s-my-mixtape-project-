import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mixtape, Song } from '../types';
import { MixtapeFlipCard } from './MixtapeFlipCard';
import { YouTubePlayer } from './YouTubePlayer';
import { JCardNote } from './JCardNote';
import { Share2, Plus, ArrowLeft, Disc, Check, Play, Pause } from 'lucide-react';

interface ListenerViewProps {
  mixtape: Mixtape;
  onMakeYourOwn: () => void;
  onGoHome?: () => void;
  onEditTape?: (tape: Mixtape) => void;
  isOwner?: boolean;
}

export const ListenerView: React.FC<ListenerViewProps> = ({
  mixtape,
  onMakeYourOwn,
  onGoHome,
  onEditTape,
  isOwner = false
}) => {
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [tapeSide, setTapeSide] = useState<'A' | 'B'>('A');
  const [copiedShare, setCopiedShare] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const songs = mixtape.songs || [];
  const currentSong: Song | null = songs[currentSongIndex] || null;

  // Preload mixtape artwork to eliminate image popping on flip
  useEffect(() => {
    if (mixtape?.imageUrl) {
      const img = new Image();
      img.src = mixtape.imageUrl;
    }
  }, [mixtape?.imageUrl]);

  // Handle auto-advance to next song when current track ends
  const handleSongEnded = useCallback(() => {
    setCurrentSongIndex((prev) => {
      if (prev + 1 < songs.length) {
        setCurrentTime(0);
        setIsPlaying(true);
        return prev + 1;
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
        return prev;
      }
    });
  }, [songs.length]);

  const handleNext = useCallback(() => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1 < songs.length ? prev + 1 : 0));
    setCurrentTime(0);
    setIsPlaying(true);
  }, [songs.length]);

  const handlePrevious = useCallback(() => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev - 1 >= 0 ? prev - 1 : songs.length - 1));
    setCurrentTime(0);
    setIsPlaying(true);
  }, [songs.length]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    setSeekTarget(time);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (songs.length === 0) return;
    setIsPlaying((prev) => !prev);
  }, [songs.length]);

  // Keep fresh references for Media Session event callbacks without stale closures
  const handlersRef = useRef({
    handleNext,
    handlePrevious,
    handleStop,
    handleSeek,
    setIsPlaying,
    currentTime,
    duration,
  });
  handlersRef.current = {
    handleNext,
    handlePrevious,
    handleStop,
    handleSeek,
    setIsPlaying,
    currentTime,
    duration,
  };

  // 1. Update Media Session Metadata whenever current track changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentSong) {
      const artwork: MediaImage[] = [];
      const ytId = currentSong.youtubeId;

      if (ytId) {
        artwork.push(
          {
            src: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
            sizes: '1280x720',
            type: 'image/jpeg',
          },
          {
            src: `https://img.youtube.com/vi/${ytId}/sddefault.jpg`,
            sizes: '640x480',
            type: 'image/jpeg',
          },
          {
            src: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
            sizes: '480x360',
            type: 'image/jpeg',
          },
          {
            src: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
            sizes: '320x180',
            type: 'image/jpeg',
          },
          {
            src: currentSong.thumbnailUrl || `https://img.youtube.com/vi/${ytId}/default.jpg`,
            sizes: '120x90',
            type: 'image/jpeg',
          }
        );
      } else if (currentSong.thumbnailUrl) {
        artwork.push({
          src: currentSong.thumbnailUrl,
          sizes: '512x512',
          type: 'image/jpeg',
        });
      }

      // Include mixtape cover artwork if available
      if (mixtape?.imageUrl) {
        artwork.push({
          src: mixtape.imageUrl,
          sizes: '512x512',
          type: 'image/jpeg',
        });
      }

      const mixtapeTitle = mixtape.title || mixtape.name || "It's My Playlist";
      const songTitle = currentSong.title || 'Untitled Track';
      const artistName = currentSong.artist || mixtape.creatorName || mixtapeTitle;

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: songTitle,
          artist: artistName,
          album: mixtapeTitle,
          artwork,
        });
      } catch (err) {
        console.warn('Could not set MediaSession metadata:', err);
      }
    } else {
      try {
        navigator.mediaSession.metadata = null;
      } catch {
        // ignore
      }
    }
  }, [currentSong, mixtape.creatorName, mixtape.name, mixtape.title, mixtape.imageUrl]);

  // 2. Update Media Session Playback State ("playing" | "paused" | "none")
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      if (!currentSong) {
        navigator.mediaSession.playbackState = 'none';
      } else {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    } catch (err) {
      console.warn('Could not set MediaSession playbackState:', err);
    }
  }, [isPlaying, currentSong]);

  // 3. Update Media Session Position State for lock-screen scrubber
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (
      'setPositionState' in navigator.mediaSession &&
      typeof navigator.mediaSession.setPositionState === 'function' &&
      Number.isFinite(duration) &&
      duration > 0 &&
      Number.isFinite(currentTime) &&
      currentTime >= 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: isPlaying ? 1 : 0,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch {
        // Ignore errors during fast seeks or track switches
      }
    }
  }, [currentTime, duration, isPlaying]);

  // 4. Register Media Session Action Handlers
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', () => {
        handlersRef.current.setIsPlaying(true);
      }],
      ['pause', () => {
        handlersRef.current.setIsPlaying(false);
      }],
      ['previoustrack', () => {
        handlersRef.current.handlePrevious();
      }],
      ['nexttrack', () => {
        handlersRef.current.handleNext();
      }],
      ['stop', () => {
        handlersRef.current.handleStop();
      }],
      ['seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          handlersRef.current.handleSeek(details.seekTime);
        }
      }],
      ['seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        const cur = handlersRef.current.currentTime;
        handlersRef.current.handleSeek(Math.max(0, cur - offset));
      }],
      ['seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const cur = handlersRef.current.currentTime;
        const dur = handlersRef.current.duration;
        handlersRef.current.handleSeek(Math.min(dur || 0, cur + offset));
      }],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Browser may not support optional actions like seekto
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleCopyLink = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="w-full max-w-[460px] sm:max-w-xl mx-auto px-4 sm:px-6 py-2.5 sm:py-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {onGoHome ? (
          <button
            type="button"
            id="listener-home-btn"
            onClick={onGoHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition py-1 px-2.5 rounded-lg hover:bg-stone-200/50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>IT'S MY PLAYLIST</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-stone-900">
            <Disc className="w-3.5 h-3.5 text-orange-600" />
            <span>IT'S MY PLAYLIST</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {isOwner && onEditTape && (
            <button
              type="button"
              id="listener-edit-tape-btn"
              onClick={() => onEditTape(mixtape)}
              className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <span>Edit Tape</span>
            </button>
          )}

          <button
            type="button"
            id="listener-share-btn"
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 hover:text-stone-900 bg-white border border-stone-200 px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer"
          >
            {copiedShare ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-stone-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3D Flip Card: Front (Cassette) & Back (Interactive Player + J-Card Liner Notes) */}
      <MixtapeFlipCard
        customization={mixtape.customization}
        name={mixtape.name || mixtape.title || 'Mixtape'}
        creatorName={mixtape.creatorName}
        side={tapeSide}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        currentTrackIndex={currentSongIndex}
        totalTracks={songs.length}
        currentTrackTitle={currentSong?.title}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onStop={handleStop}
        onSeek={handleSeek}
        jCard={
          <JCardNote
            name={mixtape.name || mixtape.title || 'Mixtape'}
            creatorName={mixtape.creatorName}
            message={mixtape.message}
            imageUrl={mixtape.imageUrl}
            songs={songs}
            currentSongIndex={currentSongIndex}
            onSelectSong={(idx) => {
              setCurrentSongIndex(idx);
              setCurrentTime(0);
              setIsPlaying(true);
            }}
          />
        }
      />

      {/* Embedded YouTube Audio Player */}
      {currentSong && (
        <YouTubePlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayStateChange={(playing) => setIsPlaying(playing)}
          onSongEnded={handleSongEnded}
          onProgressUpdate={(cur, tot) => {
            setCurrentTime(cur);
            setDuration(tot);
          }}
          seekTime={seekTarget}
          onSeekHandled={() => setSeekTarget(null)}
        />
      )}

      {/* Action Buttons: Primary Play/Pause and Secondary Create Mixtape */}
      <div className="mt-4 pt-3 border-t border-stone-200/80 flex flex-col items-center gap-2">
        {/* Primary Action Button: Play/Pause currently loaded mixtape */}
        <button
          type="button"
          id="listener-play-pause-btn"
          onClick={handleTogglePlay}
          className="w-full sm:w-auto min-w-[220px] py-3.5 px-8 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm transition inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE MIXTAPE</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY MIXTAPE</span>
            </>
          )}
        </button>

        {/* Secondary Action Button: Create Mixtape */}
        <button
          type="button"
          id="listener-make-own-btn"
          onClick={onMakeYourOwn}
          className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 hover:text-stone-900 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-2xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-stone-500" />
          <span>RECORD YOUR OWN MIXTAPE</span>
        </button>
      </div>
    </div>
  );
};
