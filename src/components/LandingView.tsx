import React, { useState } from 'react';
import { CassetteTape } from './CassetteTape';
import { CassetteCustomization } from '../types';
import { Disc, ArrowRight, Play } from 'lucide-react';

interface LandingViewProps {
  onStartCreate: () => void;
  onExploreSample: (sampleId: string) => void;
}

const DEMO_CASSETTE: { name: string; customization: CassetteCustomization } = {
  name: 'Retro Summer \'98',
  customization: {
    color: 'sunset-amber',
    pattern: 'retro-stripes',
    labelStyle: 'marker',
    labelColor: '#fef3c7',
    stickers: [
      { id: '1', type: 'mix-vol-1', xPercent: 18, yPercent: 22, rotationDeg: -6 },
      { id: '2', type: 'heart', xPercent: 82, yPercent: 20, rotationDeg: 10 },
      { id: '3', type: 'side-a', xPercent: 16, yPercent: 78, rotationDeg: -4 }
    ],
    screwsColor: 'gold'
  }
};

export const LandingView: React.FC<LandingViewProps> = ({
  onStartCreate,
  onExploreSample
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="w-full max-w-[460px] sm:max-w-xl mx-auto px-4 sm:px-6 py-3 sm:py-8 flex flex-col items-center text-center">
      {/* Brand Badge */}
      <div id="hero-brand-badge" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-[10px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider mb-1.5 sm:mb-3 shadow-xs">
        <Disc className="w-3 h-3 text-amber-700 animate-spin-slow" />
        <span id="hero-badge-label">Nostalgic Musics</span>
      </div>

      {/* Main Title */}
      <h1 className="text-xl sm:text-3xl md:text-4xl font-marker tracking-wide text-stone-900 mb-1 sm:mb-2 drop-shadow-xs">
        Digital Mixtape
      </h1>

      {/* Nostalgic Description */}
      <p id="hero-subtitle" className="text-xs sm:text-base text-stone-600 font-sans max-w-sm mx-auto mb-3 sm:mb-6 leading-relaxed">
        Turn your favorite songs into something personal.
      </p>

      {/* Interactive Cassette Display */}
      <div
        className="w-full mb-3 sm:mb-6 transform hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onExploreSample('summer-98')}
      >
        <CassetteTape
          name={DEMO_CASSETTE.name}
          creatorName="Alex"
          customization={DEMO_CASSETTE.customization}
          isPlaying={isHovered}
          progressPercent={38}
          side="A"
        />
        <div className="mt-1 text-[10px] sm:text-xs font-mono-retro text-stone-500 flex items-center justify-center gap-1.5">
          <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600" />
          <span>Tap cassette to listen to sample tape</span>
        </div>
      </div>

      {/* Core Action Call To Action */}
      <div className="flex items-center justify-center w-full max-w-xs mb-4 sm:mb-8">
        <button
          type="button"
          id="hero-create-mixtape-btn"
          onClick={onStartCreate}
          className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm sm:shadow-md shadow-amber-900/20 hover:shadow-lg transition flex items-center justify-center gap-2 group"
        >
          <span>Create a Mixtape</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Steps Highlight */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-5 border-t border-stone-200/80 text-left">
        <div className="bg-white/80 p-2 sm:p-3 rounded-xl border border-stone-200 shadow-xs">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-amber-100 text-amber-800 font-mono-retro font-bold text-[10px] sm:text-[11px] flex items-center justify-center mb-1">
            1
          </div>
          <h3 className="font-marker text-xs sm:text-sm text-stone-900 mb-0.5">Pick 5 Songs</h3>
          <p className="text-[10px] sm:text-xs font-sans text-stone-600 leading-snug">
            Paste YouTube links to hand-pick your favorite tracks in sequential order.
          </p>
        </div>

        <div className="bg-white/80 p-2 sm:p-3 rounded-xl border border-stone-200 shadow-xs">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-amber-100 text-amber-800 font-mono-retro font-bold text-[10px] sm:text-[11px] flex items-center justify-center mb-1">
            2
          </div>
          <h3 className="font-marker text-xs sm:text-sm text-stone-900 mb-0.5">Design the Tape</h3>
          <p className="text-[10px] sm:text-xs font-sans text-stone-600 leading-snug">
            Choose shell colors, retro patterns, Sharpie handwriting, and playful stickers.
          </p>
        </div>
      </div>
    </div>
  );
};
