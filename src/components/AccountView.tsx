import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Disc, LogOut, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { MixtapeLoader, CassetteSpool } from './MixtapeLoader';
import { PWAInstallButton } from './PWAInstallButton';

interface AccountViewProps {
  onSuccessRedirect: () => void;
  onGoHome: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onSuccessRedirect, onGoHome }) => {
  const { user, loading, signInWithGoogle, signOut, authError, clearAuthError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setLocalError(null);
    clearAuthError();

    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        onSuccessRedirect();
      }
    } catch (err: any) {
      setLocalError(err.message || 'Something went wrong while signing you in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <MixtapeLoader
        message="CHECKING SESSION..."
        subMessage="Connecting to Firebase authentication..."
        size="fullscreen"
      />
    );
  }

  // If user is already authenticated, show account details with actions
  if (user) {
    return (
      <div className="w-full max-w-[420px] sm:max-w-md mx-auto py-6 sm:py-10 px-4 animate-fadeIn">
        <button
          onClick={onGoHome}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Homepage</span>
        </button>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-soft-card">
          <div className="flex items-center gap-3.5 mb-5 pb-5 border-b border-stone-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-14 h-14 rounded-full border border-stone-200 object-cover shadow-2xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-900 text-lg font-bold">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-stone-900 truncate">
                {user.displayName || 'Tape Curator'}
              </h2>
              <p className="text-xs text-stone-500 truncate">
                {user.email}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SIGNED IN WITH GOOGLE
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={onSuccessRedirect}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 group text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
            >
              <span>Go to Your Mixtapes</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <PWAInstallButton variant="card" />

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 bg-[#FAF7F2] hover:bg-stone-100 text-stone-700 hover:text-rose-600 text-xs font-semibold rounded-xl transition-colors border border-stone-200 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated screen
  const displayError = localError || authError;

  return (
    <div className="w-full max-w-[420px] sm:max-w-md mx-auto py-6 sm:py-10 px-4 animate-fadeIn">
      <button
        onClick={onGoHome}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors uppercase tracking-wider cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Homepage</span>
      </button>

      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-7 shadow-soft-card text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-2xs">
          <Disc className="w-6 h-6 animate-spool-slow" />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight uppercase mb-1.5">
          IT'S MY PLAYLIST
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
          Sign in or create your account with Google to save your cassettes.
        </p>

        {displayError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <span>{displayError}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full py-3.5 px-5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 text-xs sm:text-sm tracking-wider uppercase cursor-pointer"
        >
          {isSigningIn ? (
            <>
              <CassetteSpool size={16} hubColor="#fef3c7" spinning={true} />
              <span>CONNECTING...</span>
            </>
          ) : (
            <>
              {/* Google SVG Icon */}
              <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <span>CONTINUE WITH GOOGLE</span>
            </>
          )}
        </button>

        <p className="mt-4 text-[11px] text-stone-500">
          One-click Google authentication via Firebase.
        </p>
      </div>
    </div>
  );
};
