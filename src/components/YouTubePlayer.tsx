import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onSongEnded: () => void;
  onProgressUpdate: (currentTime: number, duration: number) => void;
  seekTime?: number | null;
  onSeekHandled?: () => void;
  onErrorNotice?: (msg: string) => void;
  isDeckExpanded?: boolean;
  onToggleDeckExpand?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  currentSong,
  isPlaying,
  onPlayStateChange,
  onSongEnded,
  onProgressUpdate,
  seekTime,
  onSeekHandled,
  onErrorNotice,
}) => {
  const playerRef = useRef<any>(null);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const progressIntervalRef = useRef<any>(null);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.getElementById('youtube-iframe-api-script');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      setIsApiReady(true);
    };
  }, []);

  // Initialize YT Player once API is ready
  useEffect(() => {
    if (!isApiReady || !currentSong) return;

    const playerId = 'mixtape-yt-player-target';

    // If player already exists, load the new video
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        setPlaybackError(null);
        playerRef.current.loadVideoById({
          videoId: currentSong.youtubeId,
          startSeconds: 0
        });
        if (isPlaying) {
          playerRef.current.playVideo();
        }
      } catch (err) {
        console.warn('Error reloading video in existing player:', err);
      }
      return;
    }

    // Otherwise instantiate new player
    try {
      playerRef.current = new window.YT.Player(playerId, {
        videoId: currentSong.youtubeId,
        width: '240',
        height: '135',
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 0,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            setPlaybackError(null);
            if (isPlaying) {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            const state = event.data;
            if (state === 1) {
              onPlayStateChange(true);
              setPlaybackError(null);
            } else if (state === 2) {
              onPlayStateChange(false);
            } else if (state === 0) {
              // Video finished! Automatically advance to next song
              onSongEnded();
            }
          },
          onError: (event: any) => {
            console.warn('YouTube Player error code:', event.data);
            let msg = 'Playback error occurred.';
            if (event.data === 101 || event.data === 150) {
              msg = 'This video does not allow embedded playback on external sites. Skipping to next...';
            } else if (event.data === 2) {
              msg = 'Invalid YouTube video ID parameter.';
            } else if (event.data === 100) {
              msg = 'Video not found or removed.';
            }
            setPlaybackError(msg);
            if (onErrorNotice) onErrorNotice(msg);
          }
        }
      });
    } catch (err) {
      console.error('Failed to create YouTube player:', err);
    }
  }, [isApiReady, currentSong?.youtubeId]);

  // Sync play/pause state from prop to player
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    try {
      if (isPlaying) {
        const state = playerRef.current.getPlayerState?.();
        if (state !== 1 && state !== 3) {
          playerRef.current.playVideo();
        }
      } else {
        const state = playerRef.current.getPlayerState?.();
        if (state === 1) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {
      // Ignore if state transition is in progress
    }
  }, [isPlaying, isPlayerReady]);

  // Handle seek request
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && playerRef.current && isPlayerReady) {
      try {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seekTime, true);
        }
      } catch (err) {
        console.warn('Error seeking in YouTube player:', err);
      }
      onSeekHandled?.();
    }
  }, [seekTime, isPlayerReady, onSeekHandled]);

  // Progress polling
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isPlaying && isPlayerReady && playerRef.current) {
      progressIntervalRef.current = setInterval(() => {
        try {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            const current = playerRef.current.getCurrentTime() || 0;
            const total = playerRef.current.getDuration() || 0;
            onProgressUpdate(current, total);
          }
        } catch (e) {
          // Player might be switching
        }
      }, 500);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isPlayerReady, onProgressUpdate]);

  if (!currentSong) {
    return null;
  }

  return (
    <>
      {/* YouTube audio playback engine container with valid layout dimensions to prevent Chrome treating it as a hidden/invisible pixel */}
      <div
        className="fixed bottom-0 right-0 w-[240px] h-[135px] opacity-[0.01] pointer-events-none overflow-hidden -z-50"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div id="mixtape-yt-player-target" className="w-full h-full" />
      </div>

      {/* Playback error notification if video embedding is restricted */}
      {playbackError && (
        <div className="w-full max-w-md mx-auto my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-mono-retro flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{playbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => onSongEnded()}
            className="ml-2 underline font-bold hover:text-rose-950 shrink-0"
          >
            Next Song
          </button>
        </div>
      )}
    </>
  );
};
