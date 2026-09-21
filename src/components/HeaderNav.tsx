import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Disc, LogIn, Music } from 'lucide-react';

interface HeaderNavProps {
  onNavigateHome: () => void;
  onNavigateToAccount: () => void;
  onNavigateToDashboard: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onNavigateHome,
  onNavigateToAccount,
  onNavigateToDashboard
}) => {
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <header className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between border-b border-stone-200/70 mb-2">
      {/* Brand logo & name */}
      <button
        type="button"
        id="nav-brand-btn"
        onClick={onNavigateHome}
        className="flex items-center gap-2 hover:opacity-85 transition group text-left"
      >
        <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-white shadow-2xs group-hover:rotate-12 transition-transform">
          <Disc className="w-4 h-4" />
        </div>
        <span className="font-marker text-sm sm:text-base text-stone-900 tracking-wider uppercase">
          IT’S MY PLAYLIST
        </span>
      </button>

      {/* Auth navigation state */}
      <div className="flex items-center gap-2">
        {isLoaded && isSignedIn && user ? (
          <div className="flex items-center gap-2">
            {/* MY MIXTAPES button */}
            <button
              type="button"
              id="nav-my-mixtapes-btn"
              onClick={onNavigateToDashboard}
              className="py-1.5 px-3 bg-amber-100/80 hover:bg-amber-200 text-amber-900 rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
            >
              <Music className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden xs:inline">MY MIXTAPES</span>
              <span className="xs:hidden">TAPES</span>
            </button>

            {/* Profile Avatar */}
            <button
              type="button"
              id="nav-profile-avatar-btn"
              onClick={onNavigateToDashboard}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-500/80 hover:border-amber-600 hover:ring-2 hover:ring-amber-200 transition shadow-2xs"
              title="My Account / Dashboard"
            >
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'User Avatar'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                  {(user.firstName || 'U')[0].toUpperCase()}
                </div>
              )}
            </button>
          </div>
        ) : (
          /* Logged out state */
          <button
            type="button"
            id="nav-login-btn"
            onClick={onNavigateToAccount}
            className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider shadow-2xs transition flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>LOG IN</span>
          </button>
        )}
      </div>
    </header>
  );
};
