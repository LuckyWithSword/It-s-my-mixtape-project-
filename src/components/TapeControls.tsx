import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '../utils/youtube';

interface TapeControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentTrackIndex: number;
  totalTracks: number;
  currentTrackTitle?: string;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
  onSeek?: (time: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  className?: string;
}

export const TapeControls: React.FC<TapeControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  currentTrackIndex,
  totalTracks,
  currentTrackTitle,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onStop,
  onSeek,
  isMuted = false,
  onToggleMute,
  className = ''
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div
      id="tape-deck-controls"
      className={`w-full max-w-[460px] mx-auto bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-2xl p-3 sm:p-5 shadow-xl text-stone-100 transition-all ${className}`}
    >
      {/* Track Info & Equalizer */}
      <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono-retro font-semibold tracking-wider text-amber-400 uppercase">
              Track {totalTracks > 0 ? currentTrackIndex + 1 : 0} / {totalTracks}
            </span>
            {isPlaying && (
              <span className="text-[9px] sm:text-[10px] font-mono-retro text-emerald-400 uppercase tracking-widest font-bold">
                Playing
              </span>
            )}
          </div>
          <h3
            className="font-sans font-semibold text-stone-100 text-xs sm:text-base truncate leading-tight"
            title={currentTrackTitle}
          >
            {currentTrackTitle || 'Select or add a track'}
          </h3>
        </div>

        {/* Modern Live Audio Visualizer Bars */}
        <div className="bg-stone-950/90 border border-stone-800/90 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg shrink-0 flex items-center gap-1">
          {isPlaying ? (
            <div className="flex items-end gap-1 h-3 sm:h-3.5">
              <span className="w-1 bg-amber-400 rounded-full animate-pulse h-3 sm:h-3.5" />
              <span className="w-1 bg-amber-400 rounded-full animate-ping h-1.5 sm:h-2" />
              <span className="w-1 bg-amber-400 rounded-full animate-pulse h-2.5 sm:h-3" />
            </div>
          ) : (
            <div className="flex items-end gap-1 h-3 sm:h-3.5 opacity-30">
              <span className="w-1 bg-stone-500 rounded-full h-1 sm:h-1.5" />
              <span className="w-1 bg-stone-500 rounded-full h-1" />
              <span className="w-1 bg-stone-500 rounded-full h-1 sm:h-1.5" />
            </div>
          )}
        </div>
      </div>

      {/* Scrubbable Progress Bar */}
      <div className="mb-3 sm:mb-4">
        <div
          id="tape-progress-bar"
          onClick={handleProgressBarClick}
          className="relative w-full h-1.5 sm:h-2 bg-stone-800 hover:bg-stone-750 rounded-full cursor-pointer group py-1 -my-1 transition"
        >
          <div className="h-1.5 sm:h-2 bg-stone-800 rounded-full overflow-hidden w-full relative">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-[#F54900] to-orange-500 rounded-full transition-all duration-150"
            />
          </div>
          {/* Draggable/Hover Thumb */}
          <div
            style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform pointer-events-none"
          />
        </div>

        <div className="flex justify-between items-center mt-1 text-[11px] sm:text-xs font-mono-retro text-stone-400 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Modern Music Transport Controls */}
      <div className="flex items-center justify-between pt-0.5 sm:pt-1">
        {/* Secondary: Stop Button */}
        <button
          type="button"
          id="deck-stop-btn"
          onClick={onStop}
          disabled={!isPlaying && currentTime === 0}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition"
          title="Stop Track"
        >
          <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
        </button>

        {/* Primary Controls Cluster: Prev / Play / Next */}
        <div className="flex items-center gap-2.5 sm:gap-5">
          <button
            type="button"
            id="deck-prev-btn"
            onClick={onPrevious}
            disabled={totalTracks <= 1}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          <button
            type="button"
            id="deck-play-btn"
            onClick={isPlaying ? onPause : onPlay}
            disabled={totalTracks === 0}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-lg active:scale-95 transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#F54900] focus:ring-offset-2 focus:ring-offset-stone-900 disabled:opacity-40 disabled:pointer-events-none"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-stone-900 text-stone-900" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-stone-900 text-stone-900 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            id="deck-next-btn"
            onClick={onNext}
            disabled={totalTracks <= 1}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>
        </div>

        {/* Optional Volume / Mute or Spacer */}
        {onToggleMute ? (
          <button
            type="button"
            onClick={onToggleMute}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800/80 active:scale-95 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9" />
        )}
      </div>
    </div>
  );
};
