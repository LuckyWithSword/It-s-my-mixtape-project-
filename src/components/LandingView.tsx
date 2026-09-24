import React, { useState } from 'react';
import { CassetteTape } from './CassetteTape';
import { CassetteCustomization } from '../types';
import { Disc, ArrowRight, Play, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingViewProps {
  onStartCreate: () => void;
  onExploreSample: (sampleId: string) => void;
  onOpenDashboard?: () => void;
  onGoToAccount?: () => void;
  savedTapesCount?: number;
  isAuthenticated?: boolean;
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
  onExploreSample,
  onOpenDashboard,
  onGoToAccount,
  savedTapesCount
}) => {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="w-full max-w-[420px] sm:max-w-md mx-auto px-4 py-3 sm:py-5 flex flex-col justify-between min-h-[calc(100vh-3.5rem)] sm:min-h-0 text-center animate-fadeIn">
      {/* TOP: Brand name and small profile/account button */}
      <header className="w-full flex items-center justify-between pb-3 border-b border-stone-200/80 mb-3 sm:mb-4">
        <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-stone-900">
          IT'S MY PLAYLIST
        </span>

        {user ? (
          <button
            type="button"
            id="hero-profile-avatar-btn"
            onClick={onOpenDashboard}
            title={user.displayName ? `${user.displayName}'s Mixtapes` : 'My Mixtapes Dashboard'}
            aria-label="Open My Mixtapes Dashboard"
            className="w-9 h-9 rounded-full border border-stone-300 hover:border-orange-500 bg-white p-0.5 shadow-2xs hover:shadow-xs transition cursor-pointer overflow-hidden flex items-center justify-center shrink-0"
          >
            {user.photoURL && !imageError ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Profile'}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-orange-100 text-orange-900 font-bold text-xs flex items-center justify-center">
                {(user.displayName?.[0] || user.email?.[0] || 'M').toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <button
            type="button"
            id="hero-signin-icon-btn"
            onClick={onGoToAccount}
            title="Sign in with Google"
            aria-label="Sign in with Google"
            className="w-9 h-9 rounded-full border border-stone-300 hover:border-orange-500 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 shadow-2xs transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <User className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* CENTER: Label, Brand Heading, Subtitle, Compact Cassette */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-1">
        {/* Small nostalgic label / pill */}
        <div id="hero-brand-badge" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200/90 text-stone-700 text-[10px] font-semibold uppercase tracking-widest mb-2 sm:mb-3 shadow-2xs">
          <Disc className="w-3 h-3 text-orange-600 animate-spool-slow" />
          <span id="hero-badge-label">IT'S MY PLAYLIST</span>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 uppercase mb-1.5">
          IT'S MY PLAYLIST
        </h1>

        {/* Nostalgic Description */}
        <p id="hero-subtitle" className="text-xs sm:text-sm text-stone-600 max-w-xs mx-auto mb-4 sm:mb-5 leading-relaxed">
          Turn your favorite songs into something personal.
        </p>

        {/* Compact Cassette Preview */}
        <div
          className="w-full max-w-[340px] mb-4 sm:mb-6 transform hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => onExploreSample('summer-98')}
        >
          <div className="rounded-2xl overflow-hidden bg-[#FAF7F0] p-1 shadow-none border-0">
            <CassetteTape
              name={DEMO_CASSETTE.name}
              creatorName="Alex"
              customization={DEMO_CASSETTE.customization}
              isPlaying={isHovered}
              progressPercent={38}
              side="A"
              noShadow={true}
              className="shadow-none"
            />
          </div>
          <div className="mt-2 text-[10px] sm:text-[11px] text-stone-500 font-medium flex items-center justify-center gap-1.5">
            <Play className="w-2.5 h-2.5 text-orange-600 fill-current" />
            <span>Tap cassette to listen to sample tape</span>
          </div>
        </div>

        {/* Core Actions */}
        <div className="w-full max-w-xs flex flex-col gap-2.5">
          <button
            type="button"
            id="hero-create-mixtape-btn"
            onClick={onStartCreate}
            className="w-full py-3.5 px-6 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>CREATE A MIXTAPE</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {onOpenDashboard && (
            <button
              type="button"
              id="hero-my-tapes-btn"
              onClick={onOpenDashboard}
              className="w-full py-3 px-4 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 hover:border-stone-300 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>MY TAPES</span>
              {savedTapesCount !== undefined && savedTapesCount > 0 && (
                <span className="text-[10px] bg-stone-100 text-stone-800 px-2 py-0.5 rounded-full font-bold">
                  {savedTapesCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Comfortable bottom breathing space */}
      <div className="py-1" />
    </div>
  );
};
