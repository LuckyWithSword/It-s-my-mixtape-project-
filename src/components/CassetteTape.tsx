import React from 'react';
import { CassetteCustomization, StickerItem, StickerType } from '../types';
import { Sparkles, Heart, Disc3, Smile, Music, Flame, Star, Volume2 } from 'lucide-react';

interface CassetteTapeProps {
  customization: CassetteCustomization;
  name: string;
  creatorName?: string;
  isPlaying?: boolean;
  progressPercent?: number; // 0 to 100 for reel tape size calculation
  side?: 'A' | 'B';
  onFlip?: () => void;
  className?: string;
  compact?: boolean;
  noShadow?: boolean;
}

// Color schemes for cassette shell
export const SHELL_COLORS: Record<string, { bg: string; border: string; accent: string; shadow: string; labelBg: string }> = {
  'vintage-ivory': {
    bg: 'bg-[#e8dec8]',
    border: 'border-[#c7b99c]',
    accent: 'bg-[#5a4838]',
    shadow: 'shadow-amber-950/20',
    labelBg: 'bg-[#faf4e6]'
  },
  'neon-magenta': {
    bg: 'bg-[#e03d7c]',
    border: 'border-[#b5265e]',
    accent: 'bg-[#2b102b]',
    shadow: 'shadow-pink-950/30',
    labelBg: 'bg-[#fff0f5]'
  },
  'synth-teal': {
    bg: 'bg-[#188a8d]',
    border: 'border-[#0f6063]',
    accent: 'bg-[#0a2f30]',
    shadow: 'shadow-teal-950/30',
    labelBg: 'bg-[#e6faf8]'
  },
  'sunset-amber': {
    bg: 'bg-[#ea7035]',
    border: 'border-[#bd4e1a]',
    accent: 'bg-[#471a07]',
    shadow: 'shadow-orange-950/30',
    labelBg: 'bg-[#fff7ed]'
  },
  'matte-black': {
    bg: 'bg-[#292828]',
    border: 'border-[#181818]',
    accent: 'bg-[#121212]',
    shadow: 'shadow-black/40',
    labelBg: 'bg-[#f4f4f4]'
  },
  'pastel-pink': {
    bg: 'bg-[#f4dcd6]',
    border: 'border-[#dfbdb4]',
    accent: 'bg-[#6b4742]',
    shadow: 'shadow-rose-950/20',
    labelBg: 'bg-[#fdf6f5]'
  },
  'matcha-green': {
    bg: 'bg-[#d2d9c4]',
    border: 'border-[#b5bea5]',
    accent: 'bg-[#434b35]',
    shadow: 'shadow-stone-950/20',
    labelBg: 'bg-[#f8faf4]'
  },
  'lavender-mist': {
    bg: 'bg-[#9888b5]',
    border: 'border-[#756691]',
    accent: 'bg-[#3b2d52]',
    shadow: 'shadow-purple-950/25',
    labelBg: 'bg-[#f8f5fc]'
  },
  'sky-blue': {
    bg: 'bg-[#cbe1ea]',
    border: 'border-[#aec7d2]',
    accent: 'bg-[#344d57]',
    shadow: 'shadow-sky-950/20',
    labelBg: 'bg-[#f4fafc]'
  },
  'cherry-red': {
    bg: 'bg-[#c52b2b]',
    border: 'border-[#991919]',
    accent: 'bg-[#400808]',
    shadow: 'shadow-red-950/35',
    labelBg: 'bg-[#fff5f5]'
  },
  'clear-smoke': {
    bg: 'bg-[#42484d]/90 backdrop-blur-xs',
    border: 'border-[#2d3236]',
    accent: 'bg-[#1b1e21]',
    shadow: 'shadow-stone-950/30',
    labelBg: 'bg-[#f0f3f5]'
  }
};

// Render sticker graphics
export const StickerRenderer: React.FC<{ type: StickerType }> = ({ type }) => {
  switch (type) {
    case 'stamp-editorial':
      return (
        <span className="inline-block px-1.5 py-0.5 border border-stone-800 text-stone-900 bg-white/95 font-mono-retro text-[9px] tracking-widest uppercase select-none shadow-2xs">
          REC. Nº 04
        </span>
      );
    case 'tape-lines':
      return (
        <span className="inline-block w-10 h-3 bg-amber-200/50 border border-amber-300/60 backdrop-blur-2xs select-none rotate-2 shadow-2xs" />
      );
    case 'star':
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 bg-stone-900 text-white rounded-full select-none shadow-2xs">
          <Star className="w-3 h-3 fill-white" />
        </span>
      );
    case 'barcode':
      return (
        <div className="inline-flex flex-col items-center bg-white px-1 py-0.5 border border-stone-300 select-none shadow-2xs">
          <div className="flex items-stretch h-3 gap-[1px]">
            <span className="w-0.5 bg-stone-900" />
            <span className="w-1 bg-stone-900" />
            <span className="w-0.5 bg-stone-900" />
            <span className="w-1.5 bg-stone-900" />
            <span className="w-0.5 bg-stone-900" />
            <span className="w-1 bg-stone-900" />
          </div>
          <span className="text-[6px] font-mono-retro text-stone-600 tracking-tighter">704-89</span>
        </div>
      );
    case 'mix-vol-1':
      return (
        <span className="inline-block px-2 py-0.5 bg-yellow-300 text-stone-900 border border-stone-900 font-marker text-xs shadow-xs uppercase tracking-wider select-none">
          MIX VOL. 1
        </span>
      );
    case 'heart':
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 bg-red-500 text-white rounded-full border border-white shadow-xs select-none">
          <Heart className="w-4 h-4 fill-white" />
        </span>
      );
    case 'side-a':
      return (
        <span className="inline-block px-1.5 py-0.5 bg-sky-400 text-stone-900 border border-stone-900 font-mono-retro font-bold text-[10px] tracking-tight select-none">
          SIDE A
        </span>
      );
    case 'do-not-erase':
      return (
        <span className="inline-block px-2 py-0.5 bg-red-600 text-white border border-stone-900 font-mono-retro text-[10px] font-bold tracking-tight select-none">
          DON'T ERASE ⚠
        </span>
      );
    case 'lo-fi':
      return (
        <span className="inline-block px-2 py-0.5 bg-purple-300 text-purple-950 border border-purple-950 font-marker text-[11px] select-none">
          LO-FI VIBES
        </span>
      );
    case 'sparkles':
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-200 text-amber-900 rounded-full border border-stone-800 select-none">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
        </span>
      );
    case 'retro-smile':
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 bg-yellow-400 text-stone-900 rounded-full border-2 border-stone-900 select-none">
          <Smile className="w-5 h-5 stroke-[2.5]" />
        </span>
      );
    case 'for-you':
      return (
        <span className="inline-block px-2 py-0.5 bg-pink-200 text-pink-900 border border-pink-700 font-handwriting text-sm font-bold select-none">
          Made for you &hearts;
        </span>
      );
    case 'audio-cassette':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-800 text-white text-[10px] font-mono-retro rounded-xs select-none">
          <Disc3 className="w-3 h-3 text-amber-400" /> Hi-Fi
        </span>
      );
    case 'rainbow':
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-pink-400 via-amber-300 to-teal-300 text-stone-900 font-mono-retro text-[10px] font-bold border border-stone-800 select-none">
          ★ SPECIAL ★
        </span>
      );
    default:
      return null;
  }
};

export const CassetteTape: React.FC<CassetteTapeProps> = ({
  customization,
  name,
  creatorName,
  isPlaying = false,
  progressPercent = 15,
  side = 'A',
  onFlip,
  className = '',
  compact = false,
  noShadow = false
}) => {
  const shell = SHELL_COLORS[customization.color] || SHELL_COLORS['vintage-ivory'];

  // Font style for the label
  const getFontClass = (style: string) => {
    switch (style) {
      case 'editorial-serif':
        return 'font-serif-display font-medium tracking-normal text-stone-900';
      case 'marker':
        return 'font-marker tracking-wide text-stone-900';
      case 'handwritten':
        return 'font-handwriting text-2xl font-bold tracking-normal text-stone-900 leading-tight';
      case 'typewriter':
        return 'font-mono-retro text-stone-900 font-semibold tracking-wider';
      case 'bold-mono':
        return 'font-mono-retro font-bold uppercase tracking-tight text-stone-900';
      default:
        return 'font-marker text-stone-900';
    }
  };

  // Cassette screw element
  const renderScrew = (positionClasses: string) => {
    const screwColor = customization.screwsColor || 'silver';
    const screwBg =
      screwColor === 'gold'
        ? 'bg-amber-400 border-amber-600'
        : screwColor === 'black'
        ? 'bg-stone-800 border-stone-900'
        : 'bg-stone-300 border-stone-400';

    return (
      <div
        className={`absolute ${positionClasses} w-3 h-3 rounded-full border shadow-inner ${screwBg} flex items-center justify-center pointer-events-none z-20`}
      >
        <div className="w-2 h-0.5 bg-stone-600/70 rotate-45" />
      </div>
    );
  };

  // Tape spool bulk calculation
  // As progress goes from 0 to 100, left spool shrinks, right spool grows
  const leftTapeRadius = Math.max(16, 32 - (progressPercent / 100) * 16);
  const rightTapeRadius = Math.max(16, 16 + (progressPercent / 100) * 16);

  return (
    <div className={`relative select-none transition-all duration-300 ${className}`}>
      {/* Main Outer Cassette Shell */}
      <div
        id="cassette-body"
        className={`relative w-full aspect-[1.6/1] max-w-[268px] sm:max-w-[420px] mx-auto rounded-xl sm:rounded-2xl border-3 sm:border-4 p-1.5 sm:p-3.5 ${
          noShadow ? 'shadow-none' : `shadow-lg sm:shadow-xl ${shell.shadow}`
        } flex flex-col justify-between overflow-hidden ${shell.bg} ${shell.border}`}
      >
        {/* Subtle retro patterns on the shell */}
        {customization.pattern === 'retro-stripes' && (
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(45deg,#000_0,#000_6px,transparent_6px,transparent_16px)]" />
        )}
        {customization.pattern === 'synth-grid' && (
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:16px_16px]" />
        )}
        {customization.pattern === 'memphis' && (
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#000_2px,transparent_2px)] bg-[size:14px_14px]" />
        )}
        {customization.pattern === 'sound-waves' && (
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,transparent_2px,transparent_8px)]" />
        )}
        {customization.pattern === 'polka-dots' && (
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#000_2.5px,transparent_2.5px)] bg-[size:20px_20px]" />
        )}

        {/* 5 Structural Screws */}
        {renderScrew('top-1.5 left-1.5 sm:top-2 sm:left-2')}
        {renderScrew('top-1.5 right-1.5 sm:top-2 sm:right-2')}
        {renderScrew('bottom-1.5 left-1.5 sm:bottom-2 sm:left-2')}
        {renderScrew('bottom-1.5 right-1.5 sm:bottom-2 sm:right-2')}
        {renderScrew('bottom-1.5 left-1/2 -translate-x-1/2 sm:bottom-2')}

        {/* Top edge grip indentations */}
        <div className="flex justify-between items-center px-3 sm:px-6 -mt-0.5 sm:-mt-1 opacity-40">
          <div className="h-0.5 sm:h-1.5 w-5 sm:w-8 rounded-full bg-black/30" />
          <div className="h-0.5 sm:h-1.5 w-8 sm:w-12 rounded-full bg-black/30" />
          <div className="h-0.5 sm:h-1.5 w-5 sm:w-8 rounded-full bg-black/30" />
        </div>

        {/* Recessed Tape Label */}
        <div
          id="cassette-label"
          style={{ backgroundColor: customization.labelColor || '#faf4e6' }}
          className="relative z-10 mx-auto w-[96%] sm:w-[94%] rounded-lg border-2 border-stone-700/60 p-1 sm:p-2.5 shadow-inner flex flex-col justify-between overflow-hidden"
        >
          {/* Lined paper texture stripes */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0,transparent_22px,#e5e0d8_22px,#e5e0d8_23px)] opacity-50 pointer-events-none" />

          {/* Label Header */}
          <div className="relative z-10 flex items-center justify-between border-b border-stone-800/60 pb-0.5 sm:pb-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 sm:w-6 sm:h-6 rounded-xs bg-stone-900 text-white font-mono-retro font-bold text-[9px] sm:text-xs">
                {side}
              </span>
              <span className="text-[8px] sm:text-[10px] font-mono-retro uppercase tracking-widest text-stone-600 font-bold">
                TYPE I C-60
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[7.5px] sm:text-[9px] font-mono-retro bg-stone-200 px-1 py-0.2 rounded-xs border border-stone-400 font-bold text-stone-700">
                NR [B]
              </span>
              <span className="text-[7.5px] sm:text-[9px] font-mono-retro text-stone-500 font-semibold">
                STEREO
              </span>
            </div>
          </div>

          {/* Mixtape Name & Creator Handwriting */}
          <div className="relative z-10 my-0.5 px-0.5 sm:px-1 flex flex-col justify-center min-h-[26px] sm:min-h-[40px]">
            <h2
              className={`text-sm sm:text-xl md:text-2xl truncate drop-shadow-xs ${getFontClass(
                customization.labelStyle
              )}`}
              title={name}
            >
              {name || 'Mixtape'}
            </h2>
            {creatorName && (
              <p className="text-[10px] sm:text-xs font-handwriting text-stone-600 truncate -mt-0.5">
                by {creatorName}
              </p>
            )}
          </div>

          {/* Placed Stickers on the Cassette */}
          {customization.stickers &&
            customization.stickers.map((st: StickerItem) => (
              <div
                key={st.id}
                style={{
                  left: `${st.xPercent}%`,
                  top: `${st.yPercent}%`,
                  transform: `translate(-50%, -50%) rotate(${st.rotationDeg}deg)`
                }}
                className="absolute z-30 pointer-events-none transition-transform"
              >
                <StickerRenderer type={st.type} />
              </div>
            ))}

          {/* Center Acrylic Window & Spools */}
          <div className="relative z-10 mx-auto w-full max-w-[218px] sm:max-w-[280px] h-9 sm:h-16 bg-stone-900/90 rounded-md border border-stone-800 sm:border-2 p-0.5 flex items-center justify-between px-2 sm:px-5 shadow-inner overflow-hidden">
            {/* Clear acrylic highlight line */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

            {/* Left Spool Reel with magnetic tape ribbon */}
            <div className="relative flex items-center justify-center">
              {/* Magnetic tape roll on reel */}
              <div
                style={{
                  width: `${leftTapeRadius * 2}px`,
                  height: `${leftTapeRadius * 2}px`
                }}
                className="rounded-full bg-[#3a2318] border border-[#27160e] flex items-center justify-center shadow-inner transition-all duration-500"
              >
                {/* White gear hub */}
                <div
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-stone-100 border border-stone-300 sm:border-2 flex items-center justify-center shadow-md ${
                    isPlaying ? 'animate-spool-slow' : ''
                  }`}
                >
                  {/* Spool teeth / cogs */}
                  <div className="relative w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                    <div className="absolute w-4 sm:w-6 h-0.5 sm:h-1.5 bg-stone-400/80 rounded-xs" />
                    <div className="absolute w-4 sm:w-6 h-0.5 sm:h-1.5 bg-stone-400/80 rounded-xs rotate-60" />
                    <div className="absolute w-4 sm:w-6 h-0.5 sm:h-1.5 bg-stone-400/80 rounded-xs -rotate-60" />
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-stone-900 z-10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Center Gauge with Ruler Scale & Running Tape Ribbon */}
            <div className="flex-1 mx-1 sm:mx-2 flex flex-col items-center justify-center relative">
              {/* Tape ribbon running between reels */}
              <div className="w-full h-1 sm:h-1.5 bg-[#42281c] rounded-xs shadow-xs" />

              {/* Minute measurement tick marks */}
              <div className="flex justify-between w-full px-1 sm:px-2 mt-0.5 text-[6.5px] sm:text-[8px] font-mono-retro text-stone-400 select-none">
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              <div className="w-full flex justify-between px-1.5 sm:px-2.5">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-0.5 bg-stone-500 ${i % 2 === 0 ? 'h-1 sm:h-2' : 'h-0.5 sm:h-1.5'}`}
                  />
                ))}
              </div>
            </div>

            {/* Right Spool Reel */}
            <div className="relative flex items-center justify-center">
              <div
                style={{
                  width: `${rightTapeRadius * 2}px`,
                  height: `${rightTapeRadius * 2}px`
                }}
                className="rounded-full bg-[#3a2318] border border-[#27160e] flex items-center justify-center shadow-inner transition-all duration-500"
              >
                <div
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-stone-100 border border-stone-300 sm:border-2 flex items-center justify-center shadow-md ${
                    isPlaying ? 'animate-spool-slow' : ''
                  }`}
                >
                  <div className="relative w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                    <div className="absolute w-4 sm:w-6 h-0.5 sm:h-1.5 bg-stone-400/80 rounded-xs" />
                    <div className="absolute w-4 sm:w-6 h-0.5 sm:h-1.5 bg-stone-400/80 rounded-xs rotate-60" />
                    <div className="absolute w-4 sm:w-6 h-0.5 sm:h-1.5 bg-stone-400/80 rounded-xs -rotate-60" />
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-stone-900 z-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Label Line */}
          <div className="relative z-10 mt-0.5 flex items-center justify-between text-[7.5px] sm:text-[9px] font-mono-retro text-stone-500 font-medium">
            <span>INDEX / NOTES</span>
            <span>HIGH OUTPUT / LOW NOISE</span>
          </div>
        </div>

        {/* Bottom Trapezoid Tape Guide Area */}
        <div className="relative mx-auto w-4/5 h-3.5 sm:h-5 bg-black/20 rounded-b-md border-t-2 border-black/30 flex items-center justify-around px-3 sm:px-4">
          <div className="w-2.5 h-1.5 sm:w-3 sm:h-2 bg-stone-900 rounded-xs border border-stone-700" />
          <div className="w-3.5 h-2 sm:w-4 sm:h-2.5 bg-stone-900 rounded-xs border border-stone-700 flex items-center justify-center">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-amber-700/80 rounded-full" />
          </div>
          <div className="w-2.5 h-1.5 sm:w-3 sm:h-2 bg-stone-900 rounded-xs border border-stone-700" />
        </div>
      </div>

      {/* Flip Tape side control if requested */}
      {onFlip && (
        <button
          type="button"
          id="flip-tape-btn"
          onClick={onFlip}
          className="mt-2 mx-auto flex items-center justify-center gap-1 text-xs font-mono-retro text-stone-500 hover:text-stone-800 bg-white/60 hover:bg-white px-3 py-1 rounded-full border border-stone-300 shadow-xs transition"
        >
          <span>Side {side}</span> &bull; <span>Flip to Side {side === 'A' ? 'B' : 'A'}</span>
        </button>
      )}
    </div>
  );
};
