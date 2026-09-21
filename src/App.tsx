import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Mixtape, AppView } from './types';
import { LandingView } from './components/LandingView';
import { CreateWizard } from './components/CreateWizard';
import { ShareSuccessView } from './components/ShareSuccessView';
import { ListenerView } from './components/ListenerView';
import { UserDashboard } from './components/UserDashboard';
import { AccountView } from './components/AccountView';
import { HeaderNav } from './components/HeaderNav';
import {
  getMixtapeById,
  saveMixtapeToServer,
  updateMixtapeOnServer,
  deleteMixtapeFromServer,
  fetchUserMixtapes,
  syncUserWithTurso
} from './utils/storage';
import { Loader2, AlertCircle, ShieldAlert, LayoutDashboard } from 'lucide-react';

export default function App() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeMixtape, setActiveMixtape] = useState<Mixtape | null>(null);
  const [editingMixtape, setEditingMixtape] = useState<Mixtape | null>(null);
  const [isLoadingTape, setIsLoadingTape] = useState<boolean>(false);
  const [tapeLoadError, setTapeLoadError] = useState<string | null>(null);
  const [editForbidden, setEditForbidden] = useState<boolean>(false);

  // Mixtapes list
  const [userMixtapes, setUserMixtapes] = useState<Mixtape[]>([]);
  const [isLoadingUserMixtapes, setIsLoadingUserMixtapes] = useState<boolean>(false);

  // Keep track of syncing to prevent redundant calls
  const syncedClerkIdRef = useRef<string | null>(null);

  // Background Turso user profile synchronization upon Clerk sign-in
  useEffect(() => {
    if (!isUserLoaded || !isSignedIn || !user) return;
    if (syncedClerkIdRef.current === user.id) return;

    const performSync = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await syncUserWithTurso(token, {
          email: user.primaryEmailAddress?.emailAddress,
          displayName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          avatarUrl: user.imageUrl
        });
        syncedClerkIdRef.current = user.id;
      } catch (err) {
        console.warn('Turso sync warning:', err);
      }
    };

    performSync();
  }, [isUserLoaded, isSignedIn, user, getToken]);

  // Load user mixtapes from Turso
  const loadUserMixtapes = useCallback(async () => {
    setIsLoadingUserMixtapes(true);
    try {
      const token = await getToken();
      const tapes = await fetchUserMixtapes(token);
      setUserMixtapes(tapes);
    } catch (e) {
      console.warn('Could not load mixtapes:', e);
    } finally {
      setIsLoadingUserMixtapes(false);
    }
  }, [getToken]);

  // Load specific tape for public playback (/m/:shareId or /tape/:id)
  const loadTape = useCallback(async (idOrShareId: string) => {
    setIsLoadingTape(true);
    setTapeLoadError(null);

    try {
      // Optional token for ownership check if viewer is logged in
      const token = await getToken().catch(() => null);
      const tape = await getMixtapeById(idOrShareId, token);
      if (tape) {
        setActiveMixtape(tape);
        setCurrentView('listen');
      } else {
        setTapeLoadError(`We couldn't find a cassette mixtape with ID "${idOrShareId}".`);
        setCurrentView('landing');
      }
    } catch (err: any) {
      setTapeLoadError('Failed to load this mixtape.');
      setCurrentView('landing');
    } finally {
      setIsLoadingTape(false);
    }
  }, [getToken]);

  // Load tape for editing with strict ownership verification
  const loadTapeForEdit = useCallback(async (id: string) => {
    setIsLoadingTape(true);
    setTapeLoadError(null);
    setEditForbidden(false);

    try {
      const token = await getToken();
      const tape = await getMixtapeById(id, token);
      if (!tape) {
        setTapeLoadError('Mixtape not found.');
        setCurrentView('dashboard');
        return;
      }

      // Check server-computed ownership
      if (tape.isOwner === false) {
        setEditForbidden(true);
        setCurrentView('edit');
        return;
      }

      setEditingMixtape(tape);
      setCurrentView('edit');
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('permission')) {
        setEditForbidden(true);
        setCurrentView('edit');
      } else {
        setTapeLoadError(err.message || 'Failed to load mixtape for editing.');
        setCurrentView('dashboard');
      }
    } finally {
      setIsLoadingTape(false);
    }
  }, [getToken]);

  // Route Resolver based on current URL
  const resolveRouteFromUrl = useCallback(() => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // 1. Shared mixtape playback (/m/:shareId or /tape/:id) - Public access (Zero login requirement)
    let tapeId: string | null = null;
    const pathMatch = pathname.match(/^\/(?:tape|m)\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      tapeId = pathMatch[1];
    } else if (hash.startsWith('#tape/')) {
      tapeId = hash.replace('#tape/', '').trim();
    } else if (hash.startsWith('#m/')) {
      tapeId = hash.replace('#m/', '').trim();
    } else if (searchParams.get('tape')) {
      tapeId = searchParams.get('tape');
    }

    if (tapeId) {
      loadTape(tapeId);
      return;
    }

    // 2. Account route /account
    if (pathname === '/account' || hash === '#account') {
      setCurrentView('account');
      return;
    }

    // 3. Edit route /edit/:id or #edit/:id (Protected)
    const editPathMatch = pathname.match(/^\/edit\/([a-zA-Z0-9_-]+)/);
    const editHashMatch = hash.match(/^#edit\/([a-zA-Z0-9_-]+)/);
    const editId = (editPathMatch && editPathMatch[1]) || (editHashMatch && editHashMatch[1]);
    if (editId) {
      if (!isUserLoaded) return; // Wait for Clerk to resolve session
      if (!isSignedIn) {
        sessionStorage.setItem('auth_redirect_destination', pathname);
        window.history.replaceState({}, '', '/account');
        setCurrentView('account');
        return;
      }
      loadTapeForEdit(editId);
      return;
    }

    // 4. Create route /create or #create (Protected)
    if (pathname === '/create' || hash === '#create') {
      if (!isUserLoaded) return; // Wait for Clerk to resolve session
      if (!isSignedIn) {
        sessionStorage.setItem('auth_redirect_destination', '/create');
        window.history.replaceState({}, '', '/account');
        setCurrentView('account');
        return;
      }
      setEditingMixtape(null);
      setCurrentView('create');
      return;
    }

    // 5. Dashboard route /dashboard or #dashboard (Protected)
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard') || hash === '#dashboard') {
      if (!isUserLoaded) return; // Wait for Clerk to resolve session
      if (!isSignedIn) {
        sessionStorage.setItem('auth_redirect_destination', '/dashboard');
        window.history.replaceState({}, '', '/account');
        setCurrentView('account');
        return;
      }
      setCurrentView('dashboard');
      loadUserMixtapes();
      return;
    }

    // Default Landing View
    setCurrentView('landing');
  }, [isUserLoaded, isSignedIn, loadTape, loadTapeForEdit, loadUserMixtapes]);

  // Initial and reactive routing when URL changes or user auth state settles
  useEffect(() => {
    resolveRouteFromUrl();

    const onPopState = () => {
      resolveRouteFromUrl();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resolveRouteFromUrl]);

  // When user completes sign-in, redirect to pending destination if stored
  useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      const pendingDestination = sessionStorage.getItem('auth_redirect_destination');
      if (pendingDestination) {
        sessionStorage.removeItem('auth_redirect_destination');
        window.history.replaceState({}, '', pendingDestination);
        resolveRouteFromUrl();
      }
    }
  }, [isUserLoaded, isSignedIn, resolveRouteFromUrl]);

  // Navigation Helpers
  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('landing');
    setActiveMixtape(null);
    setEditingMixtape(null);
    setEditForbidden(false);
  };

  const navigateToAccount = () => {
    window.history.pushState({}, '', '/account');
    setCurrentView('account');
  };

  const navigateToCreate = () => {
    if (!isSignedIn) {
      sessionStorage.setItem('auth_redirect_destination', '/create');
      navigateToAccount();
      return;
    }
    window.history.pushState({}, '', '/create');
    setEditingMixtape(null);
    setEditForbidden(false);
    setCurrentView('create');
  };

  const navigateToDashboard = () => {
    if (!isSignedIn) {
      sessionStorage.setItem('auth_redirect_destination', '/dashboard');
      navigateToAccount();
      return;
    }
    window.history.pushState({}, '', '/dashboard');
    setEditForbidden(false);
    setCurrentView('dashboard');
    loadUserMixtapes();
  };

  const navigateToListener = (idOrShareId: string) => {
    window.history.pushState({}, '', `/m/${idOrShareId}`);
    loadTape(idOrShareId);
  };

  const handleEditTape = (tape: Mixtape) => {
    if (!isSignedIn) {
      sessionStorage.setItem('auth_redirect_destination', `/edit/${tape.id}`);
      navigateToAccount();
      return;
    }
    setEditingMixtape(tape);
    setEditForbidden(false);
    window.history.pushState({}, '', `/edit/${tape.id}`);
    setCurrentView('edit');
  };

  // Called when wizard finishes saving/updating a mixtape
  const handleFinishCreate = async (tapeData: Mixtape) => {
    const token = await getToken();
    if (editingMixtape) {
      const updated = await updateMixtapeOnServer(tapeData.id, tapeData, token);
      setActiveMixtape(updated);
      setEditingMixtape(null);
      const shareKey = updated.shareId || updated.share_id || updated.id;
      window.history.pushState({}, '', `/m/${shareKey}`);
      setCurrentView('listen');
      loadUserMixtapes();
    } else {
      const saved = await saveMixtapeToServer(tapeData, token);
      setActiveMixtape(saved);
      const shareKey = saved.shareId || saved.share_id || saved.id;
      window.history.pushState({}, '', `/m/${shareKey}`);
      setCurrentView('share-success');
      loadUserMixtapes();
    }
  };

  // Delete mixtape handler with ownership protection
  const handleDeleteTape = async (id: string) => {
    try {
      const token = await getToken();
      await deleteMixtapeFromServer(id, token);
      setUserMixtapes((prev) => prev.filter((t) => t.id !== id));
      if (activeMixtape && activeMixtape.id === id) {
        setActiveMixtape(null);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete mixtape');
    }
  };

  // Check if current view is public listener view
  const isPublicListenerView = currentView === 'listen';

  return (
    <div className="min-h-screen bg-[#f5efe1] text-stone-800 font-sans flex flex-col justify-between selection:bg-amber-200">
      {/* Top Persistent Header Navigation (Shown on non-listener views) */}
      {!isPublicListenerView && (
        <HeaderNav
          onNavigateHome={navigateToLanding}
          onNavigateToAccount={navigateToAccount}
          onNavigateToDashboard={navigateToDashboard}
        />
      )}

      {/* Loading overlay for tape rewinding / fetching */}
      {isLoadingTape && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
          <div className="p-5 bg-white/90 border border-stone-300 rounded-2xl shadow-md text-center max-w-xs">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
            <p className="font-marker text-stone-800 text-sm">
              Rewinding Cassette...
            </p>
            <p className="text-xs font-mono-retro text-stone-500 mt-1">
              Loading mixtape audio tracks from YouTube
            </p>
          </div>
        </div>
      )}

      {/* Main View Render */}
      {!isLoadingTape && (
        <main className="flex-1 flex flex-col items-center justify-center w-full">
          {tapeLoadError && (
            <div className="w-full max-w-md mx-auto my-3 p-3 bg-rose-100 border border-rose-300 rounded-2xl text-rose-900 text-xs font-mono-retro flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{tapeLoadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setTapeLoadError(null)}
                className="underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. Landing View */}
          {currentView === 'landing' && (
            <LandingView
              onStartCreate={navigateToCreate}
              onExploreSample={(sampleId) => navigateToListener(sampleId)}
            />
          )}

          {/* 2. Account View (/account) */}
          {currentView === 'account' && (
            <AccountView
              onNavigateToDashboard={navigateToDashboard}
              onNavigateHome={navigateToLanding}
            />
          )}

          {/* 3. Create Mixtape Wizard (Protected) */}
          {currentView === 'create' && (
            <CreateWizard
              onCancel={navigateToLanding}
              onFinish={handleFinishCreate}
            />
          )}

          {/* 4. Edit Mixtape Wizard (Protected & Ownership enforced) */}
          {currentView === 'edit' && (
            editForbidden ? (
              <div className="w-full max-w-md mx-auto px-4 py-12 text-center">
                <div className="p-6 bg-white border border-rose-300 rounded-2xl shadow-sm">
                  <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
                  <h2 className="font-marker text-stone-900 text-lg mb-2">Access Denied</h2>
                  <p className="font-sans text-stone-600 text-sm mb-6">
                    You do not have permission to edit this mixtape.
                  </p>
                  <button
                    type="button"
                    id="forbidden-go-to-dashboard-btn"
                    onClick={navigateToDashboard}
                    className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider shadow-xs transition inline-flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>GO TO DASHBOARD</span>
                  </button>
                </div>
              </div>
            ) : (
              <CreateWizard
                initialMixtape={editingMixtape}
                onCancel={navigateToDashboard}
                onFinish={handleFinishCreate}
              />
            )
          )}

          {/* 5. Share Success View */}
          {currentView === 'share-success' && activeMixtape && (
            <ShareSuccessView
              mixtape={activeMixtape}
              onOpenListener={(id) => navigateToListener(id)}
              onCreateAnother={navigateToCreate}
            />
          )}

          {/* 6. Listener View (Fully Public - Zero login barrier) */}
          {currentView === 'listen' && activeMixtape && (
            <ListenerView
              mixtape={activeMixtape}
              onMakeYourOwn={navigateToCreate}
              onGoHome={navigateToLanding}
              onEditTape={handleEditTape}
            />
          )}

          {/* 7. Creator Mixtape Library / Dashboard (Protected) */}
          {currentView === 'dashboard' && (
            <UserDashboard
              mixtapes={userMixtapes}
              isLoadingTapes={isLoadingUserMixtapes}
              onCreateNew={navigateToCreate}
              onPlayTape={navigateToListener}
              onEditTape={handleEditTape}
              onDeleteTape={handleDeleteTape}
            />
          )}
        </main>
      )}

      {/* Footer */}
      <footer id="app-footer" className="w-full border-t border-stone-300/70 py-4 sm:py-6 px-4 text-center bg-[#fcf9f2]">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <h3 id="footer-brand-title" className="font-marker text-sm sm:text-base tracking-wider text-stone-900 uppercase drop-shadow-2xs">
              IT’S MY PLAYLIST
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          </div>
          <p id="footer-tagline" className="font-mono-retro text-[10px] sm:text-xs text-stone-600 tracking-wide font-medium">
            Make it. Personalize it. Share it.
          </p>
        </div>
      </footer>
    </div>
  );
}
