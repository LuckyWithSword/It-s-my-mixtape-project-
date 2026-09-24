import React from 'react';
import { CassetteCustomization } from '../types';
import { getThemeDetails } from '../utils/theme';

interface CassetteSpoolProps {
  size?: number;
  hubColor?: string;
  spinning?: boolean;
  reverse?: boolean;
  className?: string;
}

/**
 * Authentic mechanical cassette spool with 6 drive teeth and center hub.
 * Uses CSS animation for butter-smooth 60fps rotation that respects prefers-reduced-motion.
 */
export const CassetteSpool: React.FC<CassetteSpoolProps> = ({
  size = 28,
  hubColor = '#f8fafc',
  spinning = true,
  reverse = false,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`shrink-0 ${spinning ? (reverse ? 'animate-spool-slow' : 'animate-spool-fast') : ''} ${className}`}
      style={{
        transformOrigin: 'center center',
        willChange: 'transform'
      }}
      aria-hidden="true"
    >
      {/* Magnetic tape roll bulk outer circle */}
      <circle cx="20" cy="20" r="19" fill="#1c1917" stroke="#3b2b24" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14.5" fill="#2d221c" />

      {/* Spool gear teeth ring background */}
      <circle cx="20" cy="20" r="11" fill="#44342c" />

      {/* Inner White Hub */}
      <circle cx="20" cy="20" r="9.5" fill={hubColor} stroke="#2c221d" strokeWidth="0.8" />

      {/* 6 Drive Teeth */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect
          key={deg}
          x="18.5"
          y="8.5"
          width="3"
          height="3.5"
          rx="0.5"
          fill="#1c1917"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}

      {/* Spindle hole */}
      <circle cx="20" cy="20" r="4.2" fill="#1c1917" />
    </svg>
  );
};

export interface MixtapeLoaderProps {
  customization?: CassetteCustomization | null;
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
}

export const MixtapeLoader: React.FC<MixtapeLoaderProps> = ({
  customization,
  message = 'LOADING MIXTAPE...',
  subMessage,
  size = 'md',
  className = ''
}) => {
  const theme = getThemeDetails(customization);

  // Small size for inline or compact cards
  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white/90 backdrop-blur-xs shadow-2xs select-none ${theme.shellBorder} ${className}`}
        role="status"
        aria-label={message}
      >
        <CassetteSpool size={18} hubColor={theme.reelHubColor} spinning={true} />
        <span className={`text-[11px] font-mono-retro font-bold uppercase tracking-wider ${theme.textColor}`}>
          {message}
        </span>
      </div>
    );
  }

  // Visual card mechanism for medium / large / fullscreen
  const content = (
    <div
      className={`relative select-none text-center transition-all ${
        size === 'lg' || size === 'fullscreen' ? 'max-w-sm sm:max-w-md w-full' : 'max-w-xs sm:max-w-sm w-full'
      } ${className}`}
      role="status"
      aria-label={message}
    >
      {/* Physical Cassette Shell Box */}
      <div
        className={`relative mx-auto rounded-2xl border-2 sm:border-3 p-3.5 sm:p-5 shadow-lg overflow-hidden transition-all duration-300 ${theme.shellBg} ${theme.shellBorder} ${theme.shellShadow}`}
      >
        {/* Subtle retro pattern lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(45deg,#000_0,#000_3px,transparent_3px,transparent_10px)]" />

        {/* Structural Screws in 4 corners */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-stone-300/80 border border-stone-400 flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-stone-500 rotate-45" />
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-stone-300/80 border border-stone-400 flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-stone-500 -rotate-45" />
        </div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-stone-300/80 border border-stone-400 flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-stone-500 -rotate-45" />
        </div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-stone-300/80 border border-stone-400 flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-stone-500 rotate-45" />
        </div>

        {/* Cassette Label Inset */}
        <div
          style={{ backgroundColor: theme.labelBgColor }}
          className="relative z-10 rounded-xl border border-stone-600/50 p-2.5 sm:p-3 shadow-inner overflow-hidden"
        >
          {/* Lined notebook texture */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0,transparent_18px,#e8e3db_18px,#e8e3db_19px)] opacity-60 pointer-events-none" />

          {/* Top Label Bar: Side / Type */}
          <div className="relative z-10 flex items-center justify-between border-b border-stone-400/60 pb-1 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-xs bg-stone-900 text-white font-mono-retro font-bold text-[9px]">
                A
              </span>
              <span className="text-[9px] font-mono-retro font-bold text-stone-600 uppercase tracking-widest">
                ANALOG C-60
              </span>
            </div>

            {/* Glowing transport active LED indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: theme.primaryHex }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: theme.primaryHex }}
                />
              </span>
              <span className="text-[8px] font-mono-retro text-stone-500 uppercase tracking-wider font-semibold">
                PLAY
              </span>
            </div>
          </div>

          {/* Central Acrylic Window with 2 Mechanical Spools */}
          <div className="relative z-10 mx-auto w-full h-14 sm:h-16 bg-[#141211]/95 rounded-lg border border-stone-800 shadow-inner flex items-center justify-between px-3 sm:px-5 overflow-hidden">
            {/* Acrylic reflection glare line */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none" />

            {/* Left Spool */}
            <CassetteSpool
              size={size === 'lg' || size === 'fullscreen' ? 36 : 30}
              hubColor={theme.reelHubColor}
              spinning={true}
              reverse={false}
            />

            {/* Center Tape Level window & counter markings */}
            <div className="flex flex-col items-center justify-center opacity-70">
              <div className="flex items-center gap-1">
                <div className="w-1 h-3 bg-stone-600/80 rounded-xs" />
                <div className="w-1.5 h-4 bg-stone-500/80 rounded-xs" />
                <div className="w-1 h-3 bg-stone-600/80 rounded-xs" />
              </div>
              <span className="text-[7.5px] font-mono-retro text-stone-400 mt-1 tracking-widest select-none">
                100 · 50 · 0
              </span>
            </div>

            {/* Right Spool */}
            <CassetteSpool
              size={size === 'lg' || size === 'fullscreen' ? 36 : 30}
              hubColor={theme.reelHubColor}
              spinning={true}
              reverse={false}
            />

            {/* Taut Magnetic Ribbon at the bottom */}
            <div className="absolute inset-x-3 bottom-1.5 h-0.5 bg-[#4a2618] border-t border-black/50" />
          </div>

          {/* Bottom Label Text: Tape Title & Status */}
          <div className="relative z-10 mt-2.5 text-center">
            <h3
              className={`text-xs sm:text-sm uppercase tracking-wider font-bold truncate drop-shadow-2xs ${theme.textColor} ${theme.fontClass}`}
            >
              {message}
            </h3>
            {subMessage && (
              <p className={`text-[10px] sm:text-[11px] font-sans text-stone-500 mt-0.5 truncate`}>
                {subMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-4 sm:p-6 w-full animate-fadeIn">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-4 sm:py-6">
      {content}
    </div>
  );
};
