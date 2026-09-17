import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CassetteColor,
  CassetteCustomization,
  CassettePattern,
  LabelStyle,
  StickerItem,
  StickerType
} from '../types';
import { StickerRenderer } from './CassetteTape';
import {
  Palette,
  Layers,
  Tag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
  RotateCcw
} from 'lucide-react';

interface CassetteCustomizerProps {
  customization: CassetteCustomization;
  onChange: (customization: CassetteCustomization) => void;
}

const AVAILABLE_COLORS: { id: CassetteColor; label: string; swatch: string; accentBorder: string }[] = [
  { id: 'vintage-ivory', label: 'Vintage Ivory', swatch: 'bg-[#e8dec8]', accentBorder: 'border-[#c7b99c]' },
  { id: 'sunset-amber', label: 'Sunset Amber', swatch: 'bg-[#ea7035]', accentBorder: 'border-[#bd4e1a]' },
  { id: 'neon-magenta', label: 'Neon Magenta', swatch: 'bg-[#e03d7c]', accentBorder: 'border-[#b5265e]' },
  { id: 'synth-teal', label: 'Synth Teal', swatch: 'bg-[#188a8d]', accentBorder: 'border-[#0f6063]' },
  { id: 'matte-black', label: 'Matte Black', swatch: 'bg-[#292828]', accentBorder: 'border-[#181818]' },
  { id: 'lavender-mist', label: 'Lavender Mist', swatch: 'bg-[#9888b5]', accentBorder: 'border-[#756691]' },
  { id: 'cherry-red', label: 'Cherry Red', swatch: 'bg-[#c52b2b]', accentBorder: 'border-[#991b1b]' },
  { id: 'clear-smoke', label: 'Clear Smoke', swatch: 'bg-[#42484d]', accentBorder: 'border-[#2b2f33]' }
];

const AVAILABLE_SCREWS: { id: 'silver' | 'gold' | 'black'; label: string; bg: string }[] = [
  { id: 'silver', label: 'Silver', bg: 'bg-stone-300 border-stone-400' },
  { id: 'gold', label: 'Gold', bg: 'bg-amber-400 border-amber-600' },
  { id: 'black', label: 'Black', bg: 'bg-stone-800 border-stone-900' }
];

const AVAILABLE_PATTERNS: { id: CassettePattern; label: string; desc: string; previewClass: string }[] = [
  { id: 'none', label: 'Classic Plain', desc: 'Clean matte vintage plastic', previewClass: 'bg-stone-200' },
  {
    id: 'retro-stripes',
    label: 'Diagonal Stripes',
    desc: '80s sports cassette stripes',
    previewClass: 'bg-[repeating-linear-gradient(45deg,#d6d3d1_0,#d6d3d1_4px,#e7e5e4_4px,#e7e5e4_10px)]'
  },
  {
    id: 'synth-grid',
    label: 'Synth Grid',
    desc: 'Retro synthwave cyber grid',
    previewClass: 'bg-[linear-gradient(to_right,#d6d3d1_1px,transparent_1px),linear-gradient(to_bottom,#d6d3d1_1px,transparent_1px)] bg-[size:10px_10px] bg-stone-100'
  },
  {
    id: 'memphis',
    label: '80s Memphis',
    desc: 'Playful geometric patterns',
    previewClass: 'bg-[radial-gradient(#d6d3d1_2px,transparent_2px)] bg-[size:8px_8px] bg-stone-100'
  },
  {
    id: 'sound-waves',
    label: 'Sound Waves',
    desc: 'Vertical frequency wave lines',
    previewClass: 'bg-[repeating-linear-gradient(90deg,#d6d3d1_0,#d6d3d1_2px,#f5f5f4_2px,#f5f5f4_6px)]'
  },
  {
    id: 'polka-dots',
    label: 'Retro Dots',
    desc: 'Fun nostalgic dot matrix',
    previewClass: 'bg-[radial-gradient(#a8a29e_1.5px,transparent_1.5px)] bg-[size:6px_6px] bg-stone-100'
  }
];

const AVAILABLE_LABEL_STYLES: { id: LabelStyle; label: string; previewText: string; previewClass: string; desc: string }[] = [
  {
    id: 'marker',
    label: 'Sharpie Marker',
    previewText: 'Mixtape Side A',
    previewClass: 'font-marker text-lg text-stone-900',
    desc: 'Bold ink marker on paper label'
  },
  {
    id: 'handwritten',
    label: 'Handwritten Script',
    previewText: 'Mixtape Side A',
    previewClass: 'font-handwriting text-xl text-stone-800',
    desc: 'Cursive love letter handwriting'
  },
  {
    id: 'typewriter',
    label: 'Vintage Typewriter',
    previewText: 'MIXTAPE [SIDE A]',
    previewClass: 'font-mono-retro text-sm font-semibold tracking-wider text-stone-800',
    desc: 'Mechanical ink typewriter impression'
  },
  {
    id: 'bold-mono',
    label: 'Industrial Mono',
    previewText: 'TAPE-01 // SIDE A',
    previewClass: 'font-mono-retro font-black tracking-widest text-sm text-stone-900 uppercase',
    desc: 'Heavy hi-fi studio lab stamping'
  }
];

const AVAILABLE_STICKERS: { type: StickerType; label: string }[] = [
  { type: 'mix-vol-1', label: 'Mix Vol. 1' },
  { type: 'heart', label: 'Heart' },
  { type: 'side-a', label: 'Side A' },
  { type: 'do-not-erase', label: "Don't Erase" },
  { type: 'lo-fi', label: 'Lo-Fi' },
  { type: 'sparkles', label: 'Sparkles' },
  { type: 'retro-smile', label: 'Smiley' },
  { type: 'for-you', label: 'For You' },
  { type: 'audio-cassette', label: 'Hi-Fi Audio' },
  { type: 'rainbow', label: 'Special' }
];

const CATEGORIES = [
  {
    id: 'color',
    num: '01',
    label: 'COLOR',
    icon: Palette,
    title: 'Cassette Shell Color',
    desc: 'Select casing plastic tone & hardware screws'
  },
  {
    id: 'texture',
    num: '02',
    label: 'TEXTURE',
    icon: Layers,
    title: 'Shell Texture Pattern',
    desc: 'Select imprinted casing texture finish'
  },
  {
    id: 'font',
    num: '03',
    label: 'FONT',
    icon: Tag,
    title: 'Label Handwriting / Font',
    desc: 'Handwritten title script on cassette spine'
  },
  {
    id: 'stickers',
    num: '04',
    label: 'STICKERS',
    icon: Sparkles,
    title: 'Cassette Stickers',
    desc: 'Attach up to 4 retro badges on the tape'
  }
];

export const CassetteCustomizer: React.FC<CassetteCustomizerProps> = ({
  customization,
  onChange
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [stageWidth, setStageWidth] = useState<number>(440);

  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isHorizontalDrag = useRef<boolean>(false);
  const isMouseDown = useRef<boolean>(false);
  const mouseStartX = useRef<number>(0);
  const mouseStartTime = useRef<number>(0);
  const hasMovedSignificant = useRef<boolean>(false);
  const rafId = useRef<number | null>(null);
  const pendingOffset = useRef<number>(0);

  // RAF-throttled drag offset updater for stutter-free 60/120fps motion
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

  // Measure stage container width to compute responsive card peeking
  useEffect(() => {
    const updateWidth = () => {
      if (stageRef.current) {
        setStageWidth(stageRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Card spacing: cards peek out from left and right
  const cardWidth = Math.min(Math.max(240, stageWidth * 0.85), 360);
  const cardSpacing = Math.min(cardWidth * 0.82, 280);

  // Color change
  const handleColorChange = (color: CassetteColor) => {
    onChange({ ...customization, color });
  };

  // Screw color change
  const handleScrewChange = (screwsColor: 'silver' | 'gold' | 'black') => {
    onChange({ ...customization, screwsColor });
  };

  // Pattern change
  const handlePatternChange = (pattern: CassettePattern) => {
    onChange({ ...customization, pattern });
  };

  // Label style change
  const handleLabelStyleChange = (labelStyle: LabelStyle) => {
    onChange({ ...customization, labelStyle });
  };

  // Sticker toggle
  const toggleSticker = (type: StickerType) => {
    const currentStickers = customization.stickers || [];
    const existsIndex = currentStickers.findIndex((s) => s.type === type);

    if (existsIndex >= 0) {
      const next = currentStickers.filter((_, i) => i !== existsIndex);
      onChange({ ...customization, stickers: next });
    } else {
      if (currentStickers.length >= 4) return;

      const presets = [
        { xPercent: 16, yPercent: 22, rotationDeg: -7 },
        { xPercent: 82, yPercent: 20, rotationDeg: 9 },
        { xPercent: 18, yPercent: 78, rotationDeg: -4 },
        { xPercent: 80, yPercent: 78, rotationDeg: 6 }
      ];

      const spot = presets[currentStickers.length % presets.length];
      const newSticker: StickerItem = {
        id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type,
        xPercent: spot.xPercent,
        yPercent: spot.yPercent,
        rotationDeg: spot.rotationDeg
      };

      onChange({
        ...customization,
        stickers: [...currentStickers, newSticker]
      });
    }
  };

  const clearAllStickers = () => {
    onChange({ ...customization, stickers: [] });
  };

  // Navigation handlers
  const goToNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, CATEGORIES.length - 1));
  }, []);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalDrag.current = false;
    hasMovedSignificant.current = false;
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

    if (!isHorizontalDrag.current) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        isHorizontalDrag.current = true;
      } else if (Math.abs(dy) > 10) {
        clearRaf();
        setIsDragging(false);
        setDragOffset(0);
        return;
      }
    }

    if (isHorizontalDrag.current) {
      if (e.cancelable) e.preventDefault();
      // Smooth resistance at boundaries
      let targetDx = dx;
      if (
        (activeIndex === 0 && dx > 0) ||
        (activeIndex === CATEGORIES.length - 1 && dx < 0)
      ) {
        targetDx = dx * 0.28;
      }
      scheduleOffsetUpdate(targetDx);
      if (Math.abs(dx) > 8) {
        hasMovedSignificant.current = true;
      }
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

    if (Math.abs(dx) > 38 || velocity > 0.28) {
      if (dx < 0 && activeIndex < CATEGORIES.length - 1) {
        goToNext();
      } else if (dx > 0 && activeIndex > 0) {
        goToPrev();
      }
    }
  };

  // Mouse drag handling (desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    mouseStartTime.current = Date.now();
    hasMovedSignificant.current = false;
    setIsDragging(true);
    clearRaf();
    setDragOffset(0);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const dx = e.clientX - mouseStartX.current;
      let targetDx = dx;
      if (
        (activeIndex === 0 && dx > 0) ||
        (activeIndex === CATEGORIES.length - 1 && dx < 0)
      ) {
        targetDx = dx * 0.28;
      }
      scheduleOffsetUpdate(targetDx);
      if (Math.abs(dx) > 6) {
        hasMovedSignificant.current = true;
      }
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

      if (Math.abs(dx) > 40 || velocity > 0.3) {
        if (dx < 0 && activeIndex < CATEGORIES.length - 1) {
          goToNext();
        } else if (dx > 0 && activeIndex > 0) {
          goToPrev();
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
  }, [activeIndex, clearRaf, goToNext, goToPrev, scheduleOffsetUpdate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  return (
    <div className="w-full select-none" ref={stageRef}>
      {/* ========================================================================= */}
      {/* 1. Header with Progress Counter and Category Labels                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5 pb-1.5 sm:pb-2 border-b border-stone-200 mb-2 sm:mb-3 px-1">
        {/* Left: Progress Badge */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300/80 font-mono-retro font-bold text-[11px] sm:text-xs text-amber-900 tracking-wider shadow-2xs">
            0{activeIndex + 1} / 0{CATEGORIES.length}
          </span>
          <span className="text-xs font-mono-retro font-semibold text-stone-600 uppercase tracking-wider hidden sm:inline">
            Customization Deck
          </span>

          {/* Quick Arrow Controls for Mobile in the same row */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              type="button"
              onClick={goToPrev}
              disabled={activeIndex === 0}
              className="w-6 h-6 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-stone-600 shadow-2xs transition"
              title="Previous Card (←)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={activeIndex === CATEGORIES.length - 1}
              className="w-6 h-6 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-stone-600 shadow-2xs transition"
              title="Next Card (→)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Category Breadcrumbs (Clickable) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={cat.id}
                type="button"
                id={`cat-nav-${cat.id}`}
                onClick={() => setActiveIndex(idx)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-mono-retro tracking-wider uppercase transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 font-medium'
                }`}
              >
                <span>{cat.label}</span>
                {idx < CATEGORIES.length - 1 && (
                  <span className="text-stone-300 ml-1 select-none pointer-events-none">•</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Quick Arrow Controls on Desktop */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPrev}
            disabled={activeIndex === 0}
            className="w-7 h-7 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-stone-600 shadow-2xs transition"
            title="Previous Card (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={activeIndex === CATEGORIES.length - 1}
            className="w-7 h-7 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-stone-600 shadow-2xs transition"
            title="Next Card (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Interactive 3D Horizontal Card Slider Deck                            */}
      {/* ========================================================================= */}
      <div
        id="mixtape-customization-deck"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="relative w-full overflow-hidden py-1 sm:py-3 px-1 min-h-[340px] sm:min-h-[440px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ perspective: '1200px' }}
      >
        {CATEGORIES.map((cat, i) => {
          const diff = i - activeIndex;
          const effectiveDiff = diff - dragOffset / cardSpacing;
          const xOffset = effectiveDiff * cardSpacing;

          // Physical 3D transforms with smooth optical scaling
          const absDiff = Math.abs(effectiveDiff);
          const scale = Math.max(0.74, 1 - Math.min(absDiff * 0.1, 0.24));
          const rotateZ = effectiveDiff * 2.0; // subtle pleasant card fanning
          const rotateY = Math.max(-22, Math.min(22, effectiveDiff * -8.5)); // 3D card tilt
          const opacity = Math.max(0, 1 - Math.min(absDiff * 0.42, 1));
          const zIndex = 30 - Math.round(Math.abs(diff) * 6);
          const isCurrentActive = activeIndex === i;
          const isVisible = absDiff < 2.8;

          return (
            <div
              key={cat.id}
              id={`deck-card-${cat.id}`}
              onClick={() => {
                if (!isCurrentActive && !hasMovedSignificant.current) {
                  setActiveIndex(i);
                }
              }}
              style={{
                width: `${cardWidth}px`,
                transform: `translate3d(calc(-50% + ${xOffset}px), 0, 0) scale(${scale}) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg)`,
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                willChange: isDragging ? 'transform' : 'transform, opacity',
                zIndex,
                opacity: isVisible ? opacity : 0,
                visibility: isVisible ? 'visible' : 'hidden',
                left: '50%',
                transition: isDragging
                  ? 'none'
                  : 'transform 480ms cubic-bezier(0.16, 1, 0.3, 1), opacity 440ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 480ms cubic-bezier(0.16, 1, 0.3, 1), border-color 300ms ease'
              }}
              className={`absolute top-1 bottom-1 rounded-xl sm:rounded-2xl border-2 flex flex-col justify-between overflow-hidden ${
                isCurrentActive
                  ? 'bg-stone-50 border-amber-600/70 shadow-2xl shadow-stone-900/20 ring-1 ring-amber-500/20 cursor-default'
                  : 'bg-stone-100/95 border-stone-300 shadow-md hover:border-amber-400/80 cursor-pointer hover:shadow-lg'
              }`}
            >
              {/* Card Top Stamp: Category Number, Icon & Title */}
              <div className="p-2 sm:p-4 border-b border-stone-200/90 bg-gradient-to-b from-stone-100 to-stone-50/70 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-amber-600 text-white flex items-center justify-center font-mono-retro font-bold text-[9px] sm:text-[10px]">
                      {cat.num}
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-mono-retro font-bold uppercase tracking-widest text-amber-800">
                      CARD {cat.num} • {cat.label}
                    </span>
                  </div>

                  {isCurrentActive ? (
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[8px] sm:text-[10px] font-mono-retro font-semibold">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[10px] font-mono-retro text-stone-400">
                      Tap to view
                    </span>
                  )}
                </div>

                <h3 className="text-xs sm:text-base font-bold font-sans text-stone-900 leading-tight">
                  {cat.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-stone-500 font-sans mt-0.5 truncate">
                  {cat.desc}
                </p>
              </div>

              {/* ========================================================= */}
              {/* Card Content: Specific to each category                  */}
              {/* ========================================================= */}
              <div
                className={`p-2 sm:p-3.5 flex-1 overflow-y-auto ${
                  !isCurrentActive ? 'pointer-events-none' : ''
                }`}
              >
                {/* ------------------------------------------------------- */}
                {/* CARD 1: SHELL COLOR & HARDWARE SCREWS                   */}
                {/* ------------------------------------------------------- */}
                {cat.id === 'color' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700">
                          Shell Color ({AVAILABLE_COLORS.length})
                        </span>
                        <span className="text-[11px] font-mono-retro text-amber-700 capitalize font-medium">
                          {AVAILABLE_COLORS.find((c) => c.id === customization.color)?.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {AVAILABLE_COLORS.map((c) => {
                          const isSelected = customization.color === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              id={`deck-color-opt-${c.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleColorChange(c.id);
                              }}
                              className={`flex flex-col items-center p-2 rounded-xl border-2 transition ${
                                isSelected
                                  ? 'border-amber-600 bg-amber-50 shadow-xs ring-1 ring-amber-500 scale-[1.02]'
                                  : 'border-stone-200 hover:border-stone-400 bg-white'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-full border border-stone-400/60 shadow-inner ${c.swatch} flex items-center justify-center`}
                              >
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />
                                )}
                              </div>
                              <span className="text-[9px] font-mono-retro font-medium text-stone-700 mt-1 truncate max-w-full">
                                {c.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hardware Screws Selection */}
                    <div className="pt-2 border-t border-stone-200">
                      <span className="block text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700 mb-2">
                        Hardware Screws
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {AVAILABLE_SCREWS.map((sc) => {
                          const isSelected = (customization.screwsColor || 'silver') === sc.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              id={`screw-opt-${sc.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScrewChange(sc.id);
                              }}
                              className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl border-2 transition ${
                                isSelected
                                  ? 'border-amber-600 bg-amber-50 text-stone-900 font-bold ring-1 ring-amber-500'
                                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                              }`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded-full border shadow-inner flex items-center justify-center ${sc.bg}`}
                              >
                                <span className="w-2 h-0.5 bg-stone-700/60 rotate-45" />
                              </span>
                              <span className="text-xs font-mono-retro">{sc.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* CARD 2: SHELL TEXTURE                                  */}
                {/* ------------------------------------------------------- */}
                {cat.id === 'texture' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700">
                        Texture Options
                      </span>
                      <span className="text-[11px] font-mono-retro text-amber-700 capitalize font-medium">
                        {AVAILABLE_PATTERNS.find((p) => p.id === customization.pattern)?.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_PATTERNS.map((p) => {
                        const isSelected = customization.pattern === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            id={`deck-pattern-opt-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePatternChange(p.id);
                            }}
                            className={`p-2.5 rounded-xl border-2 transition text-left flex flex-col justify-between min-h-[72px] ${
                              isSelected
                                ? 'border-amber-600 bg-amber-50 shadow-xs ring-1 ring-amber-500'
                                : 'border-stone-200 hover:border-stone-400 bg-white text-stone-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full mb-1">
                              <span className="text-xs font-mono-retro font-bold text-stone-900 truncate">
                                {p.label}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              )}
                            </div>

                            <div
                              className={`w-full h-5 rounded-md border border-stone-300 shadow-2xs ${p.previewClass}`}
                            />
                            <span className="text-[9px] font-sans text-stone-500 mt-1 truncate">
                              {p.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* CARD 3: LABEL FONT                                     */}
                {/* ------------------------------------------------------- */}
                {cat.id === 'font' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700">
                        Typography Style
                      </span>
                      <span className="text-[11px] font-mono-retro text-amber-700 font-medium">
                        {AVAILABLE_LABEL_STYLES.find((f) => f.id === customization.labelStyle)?.label}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {AVAILABLE_LABEL_STYLES.map((st) => {
                        const isSelected = customization.labelStyle === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            id={`deck-font-opt-${st.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLabelStyleChange(st.id);
                            }}
                            className={`w-full p-3 rounded-xl border-2 transition text-left flex items-center justify-between ${
                              isSelected
                                ? 'border-amber-600 bg-amber-50/90 shadow-xs ring-1 ring-amber-500'
                                : 'border-stone-200 hover:border-stone-400 bg-white text-stone-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono-retro font-bold uppercase tracking-wider text-stone-500">
                                  {st.label}
                                </span>
                              </div>
                              <p className={`mt-0.5 truncate ${st.previewClass}`}>
                                {st.previewText}
                              </p>
                              <span className="text-[10px] text-stone-400 block font-sans">
                                {st.desc}
                              </span>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-amber-600 border-amber-700 text-white'
                                  : 'border-stone-300 bg-stone-50'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* CARD 4: STICKERS                                       */}
                {/* ------------------------------------------------------- */}
                {cat.id === 'stickers' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700">
                          Badges Attached:
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono-retro text-[10px] font-bold">
                          {customization.stickers?.length || 0} / 4
                        </span>
                      </div>

                      {customization.stickers && customization.stickers.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAllStickers();
                          }}
                          className="text-[10px] font-mono-retro text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_STICKERS.map((st) => {
                        const isAttached = customization.stickers?.some((s) => s.type === st.type);
                        const isMaxReached =
                          !isAttached && (customization.stickers?.length || 0) >= 4;

                        return (
                          <button
                            key={st.type}
                            type="button"
                            id={`deck-sticker-${st.type}`}
                            disabled={isMaxReached}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSticker(st.type);
                            }}
                            className={`p-2 rounded-xl border-2 transition flex items-center justify-between gap-1.5 ${
                              isAttached
                                ? 'border-amber-600 bg-amber-100 text-stone-900 font-semibold shadow-xs'
                                : isMaxReached
                                ? 'border-stone-200 bg-stone-100 text-stone-400 opacity-50 cursor-not-allowed'
                                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <StickerRenderer type={st.type} />
                              <span className="text-[10px] font-mono-retro truncate">
                                {st.label}
                              </span>
                            </div>

                            {isAttached ? (
                              <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom Ribbon: Navigation Footprint */}
              <div className="px-3 py-1.5 sm:px-4 sm:py-2 border-t border-stone-200 bg-stone-100/80 flex items-center justify-between text-[9px] sm:text-[10px] font-mono-retro text-stone-500 shrink-0">
                <span>Mixtape Studio Design Spec</span>
                <span className="text-amber-800 font-bold uppercase">
                  {cat.label} • 0{i + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. Bottom Carousel Navigation Dots & Tactile Swipe Hint                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 pt-1 sm:pt-2">
        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              id={`deck-dot-${cat.id}`}
              onClick={() => setActiveIndex(idx)}
              className={`transition-all duration-300 rounded-full ${
                activeIndex === idx
                  ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-amber-600 shadow-xs'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-stone-300 hover:bg-stone-400'
              }`}
              title={`Jump to ${cat.label}`}
            />
          ))}
        </div>

        {/* Small Interaction Hint */}
        <p className="text-[10px] font-mono-retro text-stone-400 flex items-center gap-1 sm:gap-1.5">
          <span>Swipe or drag deck to browse</span>
          <span className="text-stone-300">•</span>
          <span>Tap side card to center</span>
        </p>
      </div>
    </div>
  );
};
