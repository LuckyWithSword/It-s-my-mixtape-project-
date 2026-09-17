import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CassetteCustomization } from '../types';
import { CassetteTape, SHELL_COLORS } from './CassetteTape';
import { formatTime } from '../utils/youtube';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface MixtapeFlipCardProps {
  // Mixtape metadata & cassette customization
  customization: CassetteCustomization;
  name: string;
  creatorName?: string;
  side?: 'A' | 'B';
  // Audio playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentTrackIndex: number;
  totalTracks: number;
  currentTrackTitle?: string;
  // Audio player action callbacks
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
  onSeek?: (time: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  className?: string;
  // Physical Cassette Inlay / J-Card message insert
  jCard?: React.ReactNode;
}

type AnimationPhase = 'front' | 'flipping-to-back' | 'back' | 'tucking-to-front';

export const MixtapeFlipCard: React.FC<MixtapeFlipCardProps> = ({
  customization,
  name,
  creatorName,
  side = 'A',
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
  className = '',
  jCard
}) => {
  // Flip & physical paper animation phase:
  // 'front' = cassette cover visible, J-card tucked and zero layout space
  // 'flipping-to-back' = cassette flips to back, J-card drops down from behind
  // 'back' = player visible, J-card settled underneath
  // 'tucking-to-front' = J-card pulls up into cassette, then cassette flips back to front
  const [phase, setPhase] = useState<AnimationPhase>('front');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const phaseTimerRef = useRef<number | null>(null);
  const tuckTimerRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean>(false);
  const isMouseDown = useRef<boolean>(false);
  const mouseStartX = useRef<number>(0);
  const mouseStartTime = useRef<number>(0);

  const shell = SHELL_COLORS[customization.color] || SHELL_COLORS['vintage-ivory'];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const clearTimers = useCallback(() => {
    if (phaseTimerRef.current !== null) {
      window.clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (tuckTimerRef.current !== null) {
      window.clearTimeout(tuckTimerRef.current);
      tuckTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Render cassette screw for physical realism on the back shell
  const renderScrew = (pos: string) => {
    const screwColor = customization.screwsColor || 'silver';
    const screwBg =
      screwColor === 'gold'
        ? 'bg-amber-400 border-amber-600'
        : screwColor === 'black'
        ? 'bg-stone-800 border-stone-900'
        : 'bg-stone-300 border-stone-400';

    return (
      <div
        className={`absolute ${pos} w-3 h-3 rounded-full border shadow-inner ${screwBg} flex items-center justify-center pointer-events-none z-20`}
      >
        <div className="w-2 h-0.5 bg-stone-600/70 rotate-45" />
      </div>
    );
  };

  // Flip trigger with physical choreography:
  // FRONT -> PLAYER: cassette flips, J-card drops down from behind
  // PLAYER -> FRONT: J-card pulls up into cassette first, disappears, then cassette flips back
  const triggerFlip = useCallback(
    (direction: 'left' | 'right' | 'toggle' = 'toggle') => {
      setHasInteracted(true);
      clearTimers();

      const currentlyOnBack = isFlipped || phase === 'back';

      if (!currentlyOnBack) {
        // ========================================================
        // FRONT -> PLAYER:
        // 1. Cassette begins flipping
        // 2. J-card drops down from behind cassette & unfolds into place
        // ========================================================
        setPhase('flipping-to-back');
        setIsFlipped(true);
        const targetAngle = direction === 'right' ? -180 : 180;
        setRotationAngle(targetAngle);

        phaseTimerRef.current = window.setTimeout(() => {
          setPhase('back');
          phaseTimerRef.current = null;
        }, 980);
      } else {
        // ========================================================
        // PLAYER -> FRONT:
        // 1. J-card pulls upward toward the back of the cassette & disappears smoothly
        // 2. Only after it is tucked away does cassette finish returning to front
        // ========================================================
        setPhase('tucking-to-front');

        // Phase 1: J-card slides up gracefully (0 - 420ms)
        // Phase 2: Cassette flips back once card is tucked behind (~380ms)
        tuckTimerRef.current = window.setTimeout(() => {
          setRotationAngle(0);
          tuckTimerRef.current = null;
        }, 380);

        // Phase 3: Settle at front once cassette finishes rotation (380ms + 820ms = ~1200ms)
        phaseTimerRef.current = window.setTimeout(() => {
          setIsFlipped(false);
          setPhase('front');
          phaseTimerRef.current = null;
        }, 1200);
      }
    },
    [isFlipped, phase, clearTimers]
  );

  const rafId = useRef<number | null>(null);
  const pendingOffset = useRef<number>(0);

  const scheduleOffsetUpdate = useCallback((newOffset: number) => {
    pendingOffset.current = newOffset;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        setDragOffset(pendingOffset.current);
        rafId.current = null;
      });
    }
  }, []);

  const clearRaf = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-flip="true"]')) {
      return;
    }

    clearTimers();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = false;
    setIsDragging(true);
    clearRaf();
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - touchStartX.current;
    const dy = currentY - touchStartY.current;

    if (!isHorizontalSwipe.current) {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        isHorizontalSwipe.current = true;
      } else if (Math.abs(dy) > 10) {
        clearRaf();
        setIsDragging(false);
        setDragOffset(0);
        return;
      }
    }

    if (isHorizontalSwipe.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      scheduleOffsetUpdate(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    clearRaf();

    const currentX = e.changedTouches[0]?.clientX || touchStartX.current;
    const dx = currentX - touchStartX.current;
    const dt = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = Math.abs(dx) / dt;

    setIsDragging(false);
    setDragOffset(0);

    if (Math.abs(dx) > 36 || velocity > 0.28) {
      triggerFlip(dx < 0 ? 'left' : 'right');
    } else if (Math.abs(dx) < 6 && dt < 280) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-no-flip="true"]')) {
        triggerFlip('toggle');
      }
    } else {
      // Spring back to starting state
      clearTimers();
      if (isFlipped) {
        setRotationAngle(180);
        setPhase('back');
      } else {
        setRotationAngle(0);
        setPhase('front');
      }
    }
  };

  // Handle Desktop Mouse Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-flip="true"]')) {
      return;
    }

    clearTimers();
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    mouseStartTime.current = Date.now();
    setIsDragging(true);
    clearRaf();
    setDragOffset(0);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const dx = e.clientX - mouseStartX.current;
      scheduleOffsetUpdate(dx);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      isMouseDown.current = false;
      setIsDragging(false);
      clearRaf();

      const dx = e.clientX - mouseStartX.current;
      const dt = Math.max(1, Date.now() - mouseStartTime.current);
      const velocity = Math.abs(dx) / dt;
      setDragOffset(0);

      if (Math.abs(dx) > 38 || velocity > 0.28) {
        triggerFlip(dx < 0 ? 'left' : 'right');
      } else if (Math.abs(dx) < 6 && dt < 260) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-no-flip="true"]')) {
          triggerFlip('toggle');
        }
      } else {
        // Spring back to starting state
        clearTimers();
        if (isFlipped) {
          setRotationAngle(180);
          setPhase('back');
        } else {
          setRotationAngle(0);
          setPhase('front');
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      clearRaf();
    };
  }, [clearRaf, clearTimers, scheduleOffsetUpdate, triggerFlip, isFlipped]);

  // ==============================================================
  // DYNAMIC PHYSICAL POSITIONING & SPRING-LIKE EASING CALCULATIONS
  // ==============================================================
  const dragFraction = Math.min(1, Math.max(0, Math.abs(dragOffset) / 220));

  let liveCassetteAngle = rotationAngle;
  let jCardDragTransform = '';
  let jCardDragOpacity = 1;
  let jCardDragGridRows = '1fr';
  let jCardDragMargin = '1.25rem';
  let isDragCardVisible = true;

  if (isDragging) {
    if (!isFlipped) {
      // Dragging from FRONT toward PLAYER:
      // Cassette rotates in 3D:
      liveCassetteAngle = (dragOffset < 0 ? 180 : -180) * dragFraction;
      // J-card emergence starts after cassette begins opening (~20% drag):
      const emergence = Math.max(0, (dragFraction - 0.2) / 0.8);
      const y = -130 * (1 - emergence);
      const rotX = -10 * (1 - emergence);
      const scale = 0.95 + 0.05 * emergence;
      jCardDragTransform = `translateY(${y}px) rotateX(${rotX}deg) scale(${scale})`;
      jCardDragOpacity = emergence;
      isDragCardVisible = dragFraction > 0.12;
      jCardDragGridRows = emergence > 0.05 ? '1fr' : '0fr';
      jCardDragMargin = `${emergence * 1.25}rem`;
    } else {
      // Dragging from PLAYER toward FRONT:
      // First 45% of drag: J-card tucks upward into the back of cassette
      if (dragFraction <= 0.45) {
        const tuck = dragFraction / 0.45;
        const y = -130 * tuck;
        const rotX = -8 * tuck;
        const scale = 1 - 0.05 * tuck;
        jCardDragTransform = `translateY(${y}px) rotateX(${rotX}deg) scale(${scale})`;
        jCardDragOpacity = Math.max(0, 1 - tuck * 1.2);
        isDragCardVisible = true;
        jCardDragGridRows = '1fr';
        jCardDragMargin = `${(1 - tuck) * 1.25}rem`;
        // Subtle preparatory tilt on cassette:
        const dirSign = dragOffset < 0 ? 1 : -1;
        liveCassetteAngle = rotationAngle - dirSign * (dragFraction * 18);
      } else {
        // Card is fully tucked behind cassette:
        jCardDragTransform = 'translateY(-130px) rotateX(-8deg) scale(0.95)';
        jCardDragOpacity = 0;
        isDragCardVisible = false;
        jCardDragGridRows = '0fr';
        jCardDragMargin = '0rem';
        // Cassette rotates the rest of the way back to front (0°):
        const rotProgress = (dragFraction - 0.45) / 0.55;
        const dirSign = dragOffset < 0 ? 1 : -1;
        liveCassetteAngle = rotationAngle - dirSign * (18 + rotProgress * 162);
      }
    }
  }

  // Non-dragging computed properties
  const gridRows = isDragging
    ? jCardDragGridRows
    : phase === 'back' || phase === 'flipping-to-back'
    ? '1fr'
    : '0fr';

  const marginTop = isDragging
    ? jCardDragMargin
    : phase === 'back' || phase === 'flipping-to-back'
    ? '0.75rem'
    : '0rem';

  const gridTransition = isDragging
    ? 'none'
    : phase === 'flipping-to-back'
    ? 'grid-template-rows 780ms cubic-bezier(0.22, 1, 0.36, 1) 200ms, margin-top 780ms cubic-bezier(0.22, 1, 0.36, 1) 200ms'
    : phase === 'tucking-to-front'
    ? 'grid-template-rows 420ms cubic-bezier(0.35, 0, 0.25, 1) 0ms, margin-top 420ms cubic-bezier(0.35, 0, 0.25, 1) 0ms'
    : 'none';

  const paperTransform = isDragging
    ? jCardDragTransform
    : phase === 'back'
    ? 'translateY(0px) rotateX(0deg) scale(1)'
    : phase === 'flipping-to-back'
    ? 'translateY(0px) rotateX(0deg) scale(1)'
    : 'translateY(-130px) rotateX(-10deg) scale(0.95)';

  const paperOpacity = isDragging
    ? jCardDragOpacity
    : phase === 'back' || phase === 'flipping-to-back'
    ? 1
    : 0;

  const isJCardVisible = isDragging ? isDragCardVisible : phase !== 'front';

  const paperTransition = isDragging
    ? 'none'
    : phase === 'flipping-to-back'
    ? 'transform 750ms cubic-bezier(0.22, 1, 0.36, 1) 200ms, opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms, box-shadow 750ms ease 200ms'
    : phase === 'tucking-to-front'
    ? 'transform 400ms cubic-bezier(0.35, 0, 0.25, 1) 0ms, opacity 300ms cubic-bezier(0.35, 0, 0.25, 1) 20ms, box-shadow 400ms ease 0ms'
    : 'none';

  const paperShadow = isDragging
    ? '0 8px 20px -4px rgba(0, 0, 0, 0.12)'
    : phase === 'back' || phase === 'flipping-to-back'
    ? '0 14px 28px -6px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)'
    : '0 2px 6px -2px rgba(0, 0, 0, 0.05)';

  const cassetteAngle = isDragging ? liveCassetteAngle : rotationAngle;

  const cassetteTransition = isDragging
    ? 'none'
    : phase === 'flipping-to-back'
    ? 'transform 850ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 750ms ease'
    : phase === 'tucking-to-front'
    ? 'transform 820ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 750ms ease'
    : 'transform 820ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 750ms ease';

  // Handle Seek click on progress bar
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className={`w-full max-w-[268px] sm:max-w-[420px] mx-auto select-none ${className}`}>
      {/* 3D Perspective Stage for Cassette Tape */}
      <div
        className="w-full relative z-30"
        style={{
          perspective: '1200px',
          WebkitPerspective: '1200px'
        }}
      >
        <div
          ref={containerRef}
          id="mixtape-3d-flip-card"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className={`relative w-full aspect-[1.6/1] cursor-grab active:cursor-grabbing rounded-xl sm:rounded-2xl touch-pan-y ${
            isDragging ? 'shadow-2xl' : 'shadow-xl'
          }`}
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            transform: `rotateY(${cassetteAngle}deg) translate3d(0, 0, 0) ${isDragging ? 'scale(1.02)' : 'scale(1)'}`,
            willChange: isDragging ? 'transform' : 'auto',
            transition: cassetteTransition
          }}
        >
          {/* ========================================================= */}
          {/* FRONT FACE: Cassette Tape Cover Artwork                     */}
          {/* ========================================================= */}
          <div
            className="absolute inset-0 w-full h-full rounded-xl sm:rounded-2xl overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)'
            }}
          >
            <CassetteTape
              name={name}
              creatorName={creatorName}
              customization={customization}
              isPlaying={isPlaying}
              progressPercent={progressPercent}
              side={side}
              className="w-full h-full pointer-events-none"
            />

            {/* Subtle Flip Hint Ribbon on Front Cover */}
            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-30 pointer-events-auto">
              <button
                type="button"
                data-no-flip="true"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFlip('left');
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-stone-900/80 hover:bg-stone-950 text-stone-200 hover:text-amber-400 rounded-full border border-stone-700/80 backdrop-blur-xs text-[9px] sm:text-[10px] font-mono-retro font-semibold tracking-wider shadow-sm transition active:scale-95"
                title="Flip to Music Player"
              >
                <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                <span>Player</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BACK FACE: Music Player Deck                                */}
          {/* ========================================================= */}
          <div
            className={`absolute inset-0 w-full h-full rounded-xl sm:rounded-2xl border-3 sm:border-4 p-1.5 sm:p-4 shadow-lg sm:shadow-xl flex flex-col justify-between overflow-hidden ${shell.bg} ${shell.border} ${shell.shadow}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Structural screws on cassette back */}
            {renderScrew('top-1.5 left-1.5 sm:top-2 sm:left-2')}
            {renderScrew('top-1.5 right-1.5 sm:top-2 sm:right-2')}
            {renderScrew('bottom-1.5 left-1.5 sm:bottom-2 sm:left-2')}
            {renderScrew('bottom-1.5 right-1.5 sm:bottom-2 sm:right-2')}

            {/* Subtle retro patterns on back shell */}
            {customization.pattern === 'retro-stripes' && (
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(45deg,#000_0,#000_6px,transparent_6px,transparent_16px)]" />
            )}
            {customization.pattern === 'synth-grid' && (
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:16px_16px]" />
            )}
            {customization.pattern === 'sound-waves' && (
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,transparent_2px,transparent_8px)]" />
            )}

            {/* Inner Modern Player Plate */}
            <div
              id="deck-back-plate"
              className="relative z-10 w-full h-full bg-stone-900/95 border border-stone-800 rounded-lg sm:rounded-xl p-1.5 sm:p-3.5 flex flex-col justify-between shadow-inner text-stone-100 backdrop-blur-xs"
            >
              {/* Top Header: Track index badge, equalizer, and flip button */}
              <div className="flex items-center justify-between gap-1 sm:gap-2 border-b border-stone-800 pb-0.5 sm:pb-2">
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-[8px] sm:text-[11px] font-mono-retro font-bold uppercase tracking-wider text-amber-400 bg-stone-950 px-1 sm:px-2 py-0.5 rounded-md border border-stone-800 shrink-0">
                    Track {totalTracks > 0 ? currentTrackIndex + 1 : 0} / {totalTracks}
                  </span>
                  {isPlaying ? (
                    <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-mono-retro text-emerald-400 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Playing</span>
                    </div>
                  ) : (
                    <span className="text-[8px] sm:text-[10px] font-mono-retro text-stone-400 uppercase tracking-wider">
                      Paused
                    </span>
                  )}
                </div>

                {/* Flip back to front button */}
                <button
                  type="button"
                  data-no-flip="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFlip('right');
                  }}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white rounded-md text-[8px] sm:text-[10px] font-mono-retro transition active:scale-95 shrink-0"
                  title="Flip back to Cassette Tape"
                >
                  <RefreshCw className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-400" />
                  <span>Tape</span>
                </button>
              </div>

              {/* Middle Section: Track Title & Audio Visualizer */}
              <div className="my-auto py-0.5 sm:py-1">
                <div className="flex items-center justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-2">
                  <h4
                    className="font-sans font-semibold text-stone-100 text-[11px] sm:text-sm truncate"
                    title={currentTrackTitle}
                  >
                    {currentTrackTitle || 'No track selected'}
                  </h4>

                  {/* Dynamic Audio Equalizer Bars */}
                  <div className="flex items-end gap-0.5 h-2 sm:h-3 shrink-0">
                    <span
                      className={`w-0.5 bg-amber-400 rounded-full transition-all duration-300 ${
                        isPlaying ? 'h-2 sm:h-3 animate-pulse' : 'h-1 opacity-40'
                      }`}
                    />
                    <span
                      className={`w-0.5 bg-amber-400 rounded-full transition-all duration-300 ${
                        isPlaying ? 'h-1.5 sm:h-2 animate-ping' : 'h-0.5 sm:h-1.5 opacity-40'
                      }`}
                    />
                    <span
                      className={`w-0.5 bg-amber-400 rounded-full transition-all duration-300 ${
                        isPlaying ? 'h-2 sm:h-3 animate-pulse' : 'h-1 opacity-40'
                      }`}
                    />
                  </div>
                </div>

                {/* Scrubbable Progress Bar */}
                <div data-no-flip="true" className="w-full">
                  <div
                    id="tape-progress-bar"
                    onClick={handleProgressBarClick}
                    className="relative w-full h-1 sm:h-2 bg-stone-800 hover:bg-stone-750 rounded-full cursor-pointer group py-1 -my-1 transition"
                  >
                    <div className="h-1 sm:h-2 bg-stone-800 rounded-full overflow-hidden w-full relative">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-150"
                      />
                    </div>
                    {/* Hover Thumb */}
                    <div
                      style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform pointer-events-none"
                    />
                  </div>

                  <div className="flex justify-between items-center mt-0.5 text-[8px] sm:text-[10px] font-mono-retro text-stone-400 tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Transport Controls */}
              <div
                data-no-flip="true"
                className="flex items-center justify-between pt-0.5 border-t border-stone-800/80"
              >
                {/* Secondary: Stop Button */}
                <button
                  type="button"
                  id="deck-stop-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                  }}
                  disabled={!isPlaying && currentTime === 0}
                  className="w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Stop Track"
                >
                  <Square className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current" />
                </button>

                {/* Primary Controls Cluster: Prev / Play / Next */}
                <div className="flex items-center gap-1.5 sm:gap-4">
                  <button
                    type="button"
                    id="deck-prev-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrevious();
                    }}
                    disabled={totalTracks <= 1}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Previous Track"
                  >
                    <SkipBack className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                  </button>

                  <button
                    type="button"
                    id="deck-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPlaying) {
                        onPause();
                      } else {
                        onPlay();
                      }
                    }}
                    disabled={totalTracks === 0}
                    className="w-7 h-7 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-lg active:scale-95 transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-40 disabled:pointer-events-none"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-3 h-3 sm:w-5 sm:h-5 fill-stone-900 text-stone-900" />
                    ) : (
                      <Play className="w-3 h-3 sm:w-5 sm:h-5 fill-stone-900 text-stone-900 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    id="deck-next-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }}
                    disabled={totalTracks <= 1}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Next Track"
                  >
                    <SkipForward className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                  </button>
                </div>

                {/* Optional Volume / Mute or Spacer */}
                {onToggleMute ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute();
                    }}
                    className="w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800/80 active:scale-95 transition"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" /> : <Volume2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />}
                  </button>
                ) : (
                  <div className="w-5 sm:w-8" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PHYSICAL J-CARD INLAY DRAWER STAGE                       */}
      {/* Drops down from behind cassette on flip to player        */}
      {/* Tucks up into cassette before flip back to cover         */}
      {/* Completely hidden and zero layout space on cover         */}
      {/* ========================================================= */}
      {jCard && (
        <div
          id="jcard-inlay-stage"
          className="w-full relative z-10 select-auto pointer-events-auto"
          style={{
            display: 'grid',
            gridTemplateRows: gridRows,
            marginTop: marginTop,
            transition: gridTransition
          }}
        >
          <div
            className="min-h-0"
            style={{
              visibility: isJCardVisible ? 'visible' : 'hidden'
            }}
          >
            <div
              id="jcard-paper-sheet"
              className="w-full rounded-2xl"
              style={{
                transform: paperTransform,
                opacity: paperOpacity,
                boxShadow: paperShadow,
                transformOrigin: 'top center',
                perspective: '1000px',
                WebkitPerspective: '1000px',
                willChange:
                  isDragging || (phase !== 'front' && phase !== 'back')
                    ? 'transform, opacity'
                    : 'auto',
                transition: paperTransition
              }}
            >
              {jCard}
            </div>
          </div>
        </div>
      )}

      {/* Unobtrusive Swipe/Click Hint */}
      <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-mono-retro text-stone-500">
        <button
          type="button"
          onClick={() => triggerFlip('toggle')}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200/60 hover:bg-stone-200/90 text-stone-600 rounded-full border border-stone-300/70 transition shadow-2xs cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3 h-3 text-amber-700 animate-spin-slow" />
          <span>
            {isFlipped || phase === 'back' || phase === 'flipping-to-back'
              ? 'Swipe or click to view cassette'
              : 'Swipe or click to flip to player'}
          </span>
        </button>
      </div>
    </div>
  );
};
