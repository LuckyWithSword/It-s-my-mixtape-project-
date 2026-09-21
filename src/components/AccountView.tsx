import React, { useState } from 'react';
import { useUser, useClerk, useSignIn, useSignUp, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Loader2, LogOut, LayoutDashboard, Disc, AlertCircle } from 'lucide-react';

interface AccountViewProps {
  onNavigateToDashboard: () => void;
  onNavigateHome: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  onNavigateToDashboard,
  onNavigateHome
}) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if current URL is a Clerk redirect callback
  const isCallbackUrl = typeof window !== 'undefined' && (
    window.location.search.includes('__clerk') ||
    window.location.search.includes('code=') ||
    window.location.search.includes('state=') ||
    window.location.search.includes('rotating_token_nonce=')
  );

  if (isCallbackUrl) {
    return (
      <div className="w-full max-w-sm mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
        />
        <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <h2 className="font-marker text-stone-900 text-base mb-1">Completing Sign In...</h2>
          <p className="font-mono-retro text-stone-500 text-xs">
            Connecting your Google account
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full max-w-sm mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
        <p className="font-mono-retro text-stone-600 text-xs">Loading account...</p>
      </div>
    );
  }

  const handleContinueWithGoogle = async () => {
    setIsLoadingAuth(true);
    setErrorMessage(null);

    const redirectUrl = '/account';
    const redirectUrlComplete = '/dashboard';

    try {
      if (signIn) {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
          continueSignUp: true
        });
        return;
      }
    } catch (err: any) {
      console.warn('Initial signIn attempt redirected to fallback:', err);
    }

    try {
      if (signUp) {
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
          continueSignIn: true
        });
        return;
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start Google sign-in. Please check your connection.');
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoadingAuth(true);
    try {
      await signOut();
      window.history.replaceState({}, '', '/account');
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={onNavigateHome}>
        <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-white shadow-2xs">
          <Disc className="w-4 h-4 animate-spin-slow" />
        </div>
        <span className="font-marker text-sm sm:text-base text-stone-900 tracking-wider uppercase">
          IT’S MY PLAYLIST
        </span>
      </div>

      {errorMessage && (
        <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-mono-retro flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Authenticated View */}
      {isSignedIn && user ? (
        <div className="w-full bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          {/* Profile Image */}
          <div className="relative mb-4">
            {user.imageUrl ? (
              <img
                id="account-profile-image"
                src={user.imageUrl}
                alt={user.fullName || 'User Profile'}
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-500 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                id="account-profile-image-placeholder"
                className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-800 font-marker text-2xl"
              >
                {(user.firstName || user.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          {/* User Name */}
          <h2 id="account-user-name" className="font-marker text-lg sm:text-xl text-stone-900 mb-0.5">
            {user.fullName || user.firstName || 'Mixtape Creator'}
          </h2>

          {/* User Email */}
          <p id="account-user-email" className="font-mono-retro text-xs sm:text-sm text-stone-500 mb-6">
            {user.primaryEmailAddress?.emailAddress || 'Connected via Google'}
          </p>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              type="button"
              id="account-go-to-dashboard-btn"
              onClick={onNavigateToDashboard}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs transition flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>GO TO DASHBOARD</span>
            </button>

            <button
              type="button"
              id="account-logout-btn"
              onClick={handleSignOut}
              disabled={isLoadingAuth}
              className="w-full py-2.5 px-4 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              {isLoadingAuth ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
              ) : (
                <LogOut className="w-4 h-4 text-stone-500 hover:text-rose-600" />
              )}
              <span>LOG OUT</span>
            </button>
          </div>
        </div>
      ) : (
        /* Unauthenticated View */
        <div className="w-full bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
          <h1 id="account-page-title" className="font-marker text-xl sm:text-2xl text-stone-900 tracking-wide uppercase mb-2">
            YOUR ACCOUNT
          </h1>

          <p id="account-page-instruction" className="font-sans text-xs sm:text-sm text-stone-600 mb-6 max-w-xs leading-relaxed">
            Sign in or create your account with Google.
          </p>

          <button
            type="button"
            id="account-continue-with-google-btn"
            onClick={handleContinueWithGoogle}
            disabled={isLoadingAuth}
            className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 border-2 border-stone-300 hover:border-amber-500 rounded-xl font-mono-retro text-xs sm:text-sm font-bold tracking-wider shadow-xs hover:shadow transition flex items-center justify-center gap-3 group"
          >
            {isLoadingAuth ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            ) : (
              /* Official Google SVG Icon */
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            )}
            <span className="uppercase font-bold tracking-wider">CONTINUE WITH GOOGLE</span>
          </button>
        </div>
      )}
    </div>
  );
};
