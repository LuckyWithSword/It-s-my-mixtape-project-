import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mixtape, AppView } from './types';
import { LandingView } from './components/LandingView';
import { CreateWizard } from './components/CreateWizard';
import { ShareSuccessView } from './components/ShareSuccessView';
import { ListenerView } from './components/ListenerView';
import { UserDashboard } from './components/UserDashboard';
import { AccountView } from './components/AccountView';
import { useAuth } from './context/AuthContext';
import {
  getMixtapeById,
  saveMixtape,
  updateMixtape,
  deleteMixtape,
  fetchUserMixtapes,
  getLocalMixtapes
} from './utils/storage';
import { Loader2, AlertCircle, ShieldAlert, ArrowLeft, Disc, Plus, RotateCcw } from 'lucide-react';
import { MixtapeLoader } from './components/MixtapeLoader';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeMixtape, setActiveMixtape] = useState<Mixtape | null>(null);
  const [editingMixtape, setEditingMixtape] = useState<Mixtape | null>(null);
  const [isLoadingTape, setIsLoadingTape] = useState<boolean>(false);
  const [tapeLoadError, setTapeLoadError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  // Dedicated states for public mixtape player (/m/:shareId)
  const [publicTapeStatus, setPublicTapeStatus] = useState<'loading' | 'success' | 'not_found' | 'error'>('loading');
  const [publicTapeError, setPublicTapeError] = useState<string | null>(null);
  const [currentRouteTapeId, setCurrentRouteTapeId] = useState<string | null>(null);

  // Stable refs to prevent re-fetch loops and stale closure issues
  const activeMixtapeRef = useRef<Mixtape | null>(null);
  activeMixtapeRef.current = activeMixtape;
  const publicTapeStatusRef = useRef(publicTapeStatus);
  publicTapeStatusRef.current = publicTapeStatus;
  const currentLoadedTapeIdRef = useRef<string | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Authenticated user's mixtapes
  const [userMixtapes, setUserMixtapes] = useState<Mixtape[]>([]);
  const [isLoadingUserMixtapes, setIsLoadingUserMixtapes] = useState<boolean>(false);

  // Load authenticated user's mixtapes from Cloud Firestore
  const loadUserMixtapes = useCallback(async () => {
    if (!user) return;
    setIsLoadingUserMixtapes(true);
    try {
      const tapes = await fetchUserMixtapes(user.uid);
      setUserMixtapes(tapes);
    } catch (e) {
      console.warn('Could not load user mixtapes:', e);
    } finally {
      setIsLoadingUserMixtapes(false);
    }
  }, [user]);

  // Load specific tape for public playback (/m/:shareId or /tape/:id)
  const loadTape = useCallback(async (idOrShareId: string, forceReload = false) => {
    if (!idOrShareId) return;
    const cleanId = idOrShareId.trim().replace(/^(\/?m\/|\/?tape\/|#m\/|#tape\/)/i, '').replace(/\/+$/, '');
    if (!cleanId) return;

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    setCurrentRouteTapeId(cleanId);
    setTapeLoadError(null);
    setPublicTapeError(null);

    const currentTape = activeMixtapeRef.current;
    // Fast path: If activeMixtape is already in memory and matches this shareId/id, immediately activate without blocking loader
    if (
      !forceReload &&
      currentTape &&
      (currentTape.shareId === cleanId ||
       currentTape.share_id === cleanId ||
       currentTape.id === cleanId)
    ) {
      currentLoadedTapeIdRef.current = cleanId;
      setPublicTapeStatus('success');
      setIsLoadingTape(false);
      setCurrentView('listen');
      return;
    }

    currentLoadedTapeIdRef.current = cleanId;
    setIsLoadingTape(true);
    setPublicTapeStatus('loading');
    setCurrentView('listen');

    // 7-second safety fallback: ensure public loader NEVER hangs indefinitely
    loadTimeoutRef.current = setTimeout(() => {
      if (publicTapeStatusRef.current === 'loading') {
        const local = getLocalMixtapes();
        const fallback = local.find(t => t.id === cleanId || t.shareId === cleanId || t.share_id === cleanId);
        if (fallback) {
          setActiveMixtape(fallback);
          setPublicTapeStatus('success');
        } else {
          setPublicTapeError("Couldn't retrieve mixtape from the archive. Please check your connection.");
          setPublicTapeStatus('error');
        }
        setIsLoadingTape(false);
      }
    }, 7000);

    try {
      const tape = await getMixtapeById(cleanId);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (tape) {
        setActiveMixtape(tape);
        setPublicTapeStatus('success');
      } else {
        setPublicTapeStatus('not_found');
      }
    } catch (err: any) {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      console.error(`Failed to load mixtape "${cleanId}":`, err);
      const code = err?.code || '';
      const message = err?.message || '';
      let errMsg = 'Could not load mixtape. Please check your connection and try again.';
      if (code === 'permission-denied' || message.includes('permission') || message.includes('Missing or insufficient permissions')) {
        errMsg = 'Firestore permission denied while accessing this shared mixtape.';
      } else if (code === 'failed-precondition' || message.includes('index')) {
        errMsg = 'Firestore query requires an index to retrieve this mixtape.';
      } else if (message) {
        errMsg = message;
      }
      setPublicTapeError(errMsg);
      setPublicTapeStatus('error');
    } finally {
      setIsLoadingTape(false);
    }
  }, []);

  // Load tape for editing with strict ownership verification
  const loadTapeForEdit = useCallback(async (id: string, currentUserUid?: string) => {
    setIsLoadingTape(true);
    setTapeLoadError(null);
    setPermissionError(null);

    try {
      const tape = await getMixtapeById(id);
      if (!tape) {
        setTapeLoadError('This mixtape could not be found.');
        setCurrentView('dashboard');
        return;
      }

      // Check ownership
      if (tape.ownerId && currentUserUid && tape.ownerId !== currentUserUid) {
        setPermissionError("You don't have permission to edit this mixtape.");
        setEditingMixtape(null);
        setCurrentView('edit');
        return;
      }

      setEditingMixtape(tape);
      setCurrentView('edit');
    } catch (err: any) {
      setTapeLoadError(err.message || 'Failed to load mixtape for editing.');
      setCurrentView('dashboard');
    } finally {
      setIsLoadingTape(false);
    }
  }, []);

  // Load tape for published success screen (/published/:shareId)
  const loadTapeForPublishedSuccess = useCallback(async (shareId: string) => {
    if (!shareId) return;
    const cleanId = shareId.trim().replace(/\/+$/, '');
    const currentTape = activeMixtapeRef.current;
    if (currentTape && (currentTape.shareId === cleanId || currentTape.share_id === cleanId || currentTape.id === cleanId)) {
      setCurrentView('share-success');
      setIsLoadingTape(false);
      return;
    }

    setIsLoadingTape(true);
    setTapeLoadError(null);
    try {
      const tape = await getMixtapeById(cleanId);
      if (tape) {
        setActiveMixtape(tape);
        setCurrentView('share-success');
      } else {
        setTapeLoadError(`Mixtape "${cleanId}" was not found.`);
        setCurrentView('landing');
      }
    } catch (err: any) {
      console.warn('Failed to load published mixtape:', err);
      setTapeLoadError('Could not load the published mixtape.');
      setCurrentView('landing');
    } finally {
      setIsLoadingTape(false);
    }
  }, []);

  // Route Resolver based on current URL
  const resolveRouteFromUrl = useCallback(() => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // 1. PUBLIC: Shared mixtape playback (/m/:shareId or /tape/:id)
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
    } else if (searchParams.get('m')) {
      tapeId = searchParams.get('m');
    }

    if (tapeId) {
      const cleanTapeId = tapeId.trim().replace(/\/+$/, '');
      if (currentLoadedTapeIdRef.current !== cleanTapeId || !activeMixtapeRef.current) {
        loadTape(cleanTapeId);
      }
      return;
    }

    // 1b. PUBLISHED SUCCESS: /published/:shareId
    let publishedShareId: string | null = null;
    const publishedPathMatch = pathname.match(/^\/published\/([a-zA-Z0-9_-]+)/);
    if (publishedPathMatch && publishedPathMatch[1]) {
      publishedShareId = publishedPathMatch[1];
    } else if (hash.startsWith('#published/')) {
      publishedShareId = hash.replace('#published/', '').trim();
    }
    if (publishedShareId) {
      loadTapeForPublishedSuccess(publishedShareId);
      return;
    }

    // 2. ACCOUNT: /account
    if (pathname === '/account' || hash === '#account') {
      setCurrentView('account');
      return;
    }

    // 3. EDIT: /edit/:id
    const editPathMatch = pathname.match(/^\/edit\/([a-zA-Z0-9_-]+)/);
    const editHashMatch = hash.match(/^#edit\/([a-zA-Z0-9_-]+)/);
    const editId = (editPathMatch && editPathMatch[1]) || (editHashMatch && editHashMatch[1]);
    if (editId) {
      if (!authLoading && !user) {
        setPendingRoute(`/edit/${editId}`);
        setCurrentView('account');
        return;
      }
      if (user) {
        loadTapeForEdit(editId, user.uid);
      }
      return;
    }

    // 4. CREATE: /create
    if (pathname === '/create' || hash === '#create') {
      if (!authLoading && !user) {
        setPendingRoute('/create');
        setCurrentView('account');
        return;
      }
      setEditingMixtape(null);
      setCurrentView('create');
      return;
    }

    // 5. DASHBOARD: /dashboard
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard') || hash === '#dashboard') {
      if (!authLoading && !user) {
        setPendingRoute('/dashboard');
        setCurrentView('account');
        return;
      }
      setCurrentView('dashboard');
      if (user) {
        loadUserMixtapes();
      }
      return;
    }

    // Default Landing View (PUBLIC)
    setCurrentView('landing');
  }, [loadTape, loadTapeForEdit, loadTapeForPublishedSuccess, loadUserMixtapes, user, authLoading]);

  // Initial and reactive routing when URL changes
  useEffect(() => {
    resolveRouteFromUrl();

    const onPopState = () => {
      resolveRouteFromUrl();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resolveRouteFromUrl]);

  // Sync user mixtapes when user logs in
  useEffect(() => {
    if (user && currentView === 'dashboard') {
      loadUserMixtapes();
    }
  }, [user, currentView, loadUserMixtapes]);

  // Navigation Helpers
  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('landing');
    setActiveMixtape(null);
    setEditingMixtape(null);
    setPermissionError(null);
  };

  const navigateToAccount = () => {
    window.history.pushState({}, '', '/account');
    setCurrentView('account');
  };

  const navigateToCreate = () => {
    if (!user) {
      setPendingRoute('/create');
      window.history.pushState({}, '', '/account');
      setCurrentView('account');
      return;
    }
    window.history.pushState({}, '', '/create');
    setEditingMixtape(null);
    setPermissionError(null);
    setCurrentView('create');
  };

  const navigateToDashboard = () => {
    if (!user) {
      setPendingRoute('/dashboard');
      window.history.pushState({}, '', '/account');
      setCurrentView('account');
      return;
    }
    window.history.pushState({}, '', '/dashboard');
    setCurrentView('dashboard');
    setPermissionError(null);
    loadUserMixtapes();
  };

  const navigateToListener = (idOrShareId: string) => {
    const cleanId = idOrShareId.trim().replace(/\/+$/, '');
    window.history.pushState({}, '', `/m/${cleanId}`);
    loadTape(cleanId);
  };

  const handleEditTape = (tape: Mixtape) => {
    if (!user) {
      setPendingRoute(`/edit/${tape.id}`);
      window.history.pushState({}, '', '/account');
      setCurrentView('account');
      return;
    }

    if (tape.ownerId && tape.ownerId !== user.uid) {
      setPermissionError("You don't have permission to edit this mixtape.");
      setCurrentView('edit');
      return;
    }

    setEditingMixtape(tape);
    setPermissionError(null);
    window.history.pushState({}, '', `/edit/${tape.id}`);
    setCurrentView('edit');
  };

  // After successful Google sign-in
  const handleAuthSuccess = () => {
    const dest = pendingRoute || '/dashboard';
    setPendingRoute(null);
    window.history.pushState({}, '', dest);
    if (dest === '/create') {
      setEditingMixtape(null);
      setCurrentView('create');
    } else if (dest.startsWith('/edit/')) {
      const id = dest.replace('/edit/', '');
      loadTapeForEdit(id, user?.uid);
    } else {
      setCurrentView('dashboard');
      loadUserMixtapes();
    }
  };

  // Called when wizard finishes saving/updating a mixtape
  const handleFinishCreate = async (tapeData: Mixtape): Promise<Mixtape | void> => {
    if (!user) {
      setPendingRoute('/create');
      setCurrentView('account');
      return;
    }

    if (editingMixtape) {
      const updated = await updateMixtape(tapeData.id, tapeData);
      setActiveMixtape(updated);
      setEditingMixtape(null);
      // Update local state placing edited tape at top
      setUserMixtapes((prev) => [updated, ...prev.filter((t) => t.id !== updated.id)]);
      window.history.pushState({}, '', '/dashboard');
      setCurrentView('dashboard');
      loadUserMixtapes();
      return updated;
    } else {
      const saved = await saveMixtape({
        ...tapeData,
        ownerId: user.uid,
      });
      setActiveMixtape(saved);
      // Place newly created tape at top of user library
      setUserMixtapes((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
      // Do NOT automatically redirect to /dashboard for new mixtapes!
      // Return saved mixtape to CreateWizard to complete the publish sequence
      // and display the published success screen.
      return saved;
    }
  };

  // Called when publishing sequence finishes successfully
  const handlePublishSuccess = (savedTape: Mixtape) => {
    setActiveMixtape(savedTape);
    const targetShareId = savedTape.shareId || savedTape.share_id || savedTape.id;
    window.history.pushState({}, '', `/published/${targetShareId}`);
    setCurrentView('share-success');
  };

  // Delete mixtape handler
  const handleDeleteTape = async (id: string) => {
    try {
      await deleteMixtape(id);
      setUserMixtapes((prev) => prev.filter((t) => t.id !== id));
      if (activeMixtape && activeMixtape.id === id) {
        setActiveMixtape(null);
      }
    } catch (e: any) {
      console.warn('Failed to delete mixtape:', e);
    }
  };

  // Check if protected route is loading auth state
  const isProtectedCurrentView = 
    currentView === 'dashboard' || 
    currentView === 'create' || 
    (currentView === 'edit' && !permissionError);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 font-sans flex flex-col justify-between selection:bg-orange-200">
      {/* Loading indicator for edit route tape preparation */}
      {isLoadingTape && currentView !== 'listen' && (
        <MixtapeLoader
          customization={activeMixtape?.customization}
          message="REWINDING CASSETTE..."
          subMessage="Loading mixtape audio tracks from YouTube..."
          size="fullscreen"
        />
      )}

      {/* Loading state for protected routes while checking Firebase auth */}
      {!isLoadingTape && authLoading && isProtectedCurrentView && (
        <MixtapeLoader
          message="VERIFYING SESSION..."
          subMessage="Connecting to Firebase authentication..."
          size="fullscreen"
        />
      )}

      {/* Main View Render */}
      {(currentView === 'listen' || (!isLoadingTape && (!authLoading || !isProtectedCurrentView))) && (
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
                className="underline ml-2 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. Landing View (PUBLIC) */}
          {currentView === 'landing' && (
            <LandingView
              onStartCreate={navigateToCreate}
              onExploreSample={(sampleId) => navigateToListener(sampleId)}
              onOpenDashboard={navigateToDashboard}
              onGoToAccount={navigateToAccount}
              savedTapesCount={userMixtapes.length}
              isAuthenticated={!!user}
            />
          )}

          {/* 2. Account & Google Authentication View */}
          {currentView === 'account' && (
            <AccountView
              onSuccessRedirect={handleAuthSuccess}
              onGoHome={navigateToLanding}
            />
          )}

          {/* 3. Create Mixtape Wizard (PROTECTED) */}
          {currentView === 'create' && user && (
            <CreateWizard
              onCancel={navigateToLanding}
              onFinish={handleFinishCreate}
              onPublishSuccess={handlePublishSuccess}
            />
          )}

          {/* 4. Edit Mixtape Wizard (PROTECTED - Strict Ownership Checked) */}
          {currentView === 'edit' && user && (
            permissionError ? (
              <div className="w-full max-w-md mx-auto py-12 px-4 text-center">
                <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-stone-900 font-mono-retro mb-2 uppercase">
                    Access Denied
                  </h2>
                  <p className="text-xs text-stone-600 mb-6 font-sans">
                    {permissionError}
                  </p>
                  <button
                    type="button"
                    onClick={navigateToDashboard}
                    className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
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
              onOpenMixtape={(shareId) => navigateToListener(shareId)}
              onGoToDashboard={navigateToDashboard}
            />
          )}

          {/* 6. Listener View (PUBLIC - zero login barrier with explicit states: LOADING, SUCCESS, NOT_FOUND, ERROR) */}
          {currentView === 'listen' && (
            <>
              {/* State 0: LOADING */}
              {publicTapeStatus === 'loading' && (
                <MixtapeLoader
                  customization={activeMixtape?.customization}
                  message="REWINDING CASSETTE..."
                  subMessage="Loading mixtape audio tracks from YouTube..."
                  size="fullscreen"
                />
              )}

              {/* State 1: SUCCESS */}
              {publicTapeStatus === 'success' && activeMixtape && (
                <ListenerView
                  mixtape={activeMixtape}
                  onMakeYourOwn={navigateToCreate}
                  onGoHome={navigateToLanding}
                  onEditTape={handleEditTape}
                  isOwner={!!user && activeMixtape.ownerId === user.uid}
                />
              )}

              {/* State 2: NOT FOUND */}
              {publicTapeStatus === 'not_found' && (
                <div className="w-full max-w-md mx-auto py-12 px-4 text-center animate-fadeIn">
                  <div className="bg-white border border-[#D9D0C1] rounded-2xl p-6 sm:p-8 shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-4 text-stone-500">
                      <Disc className="w-6 h-6 text-stone-400" />
                    </div>
                    <span className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-stone-500 mb-1 block">
                      CASSETTE MISSING
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-sans mb-2 uppercase">
                      MIXTAPE NOT FOUND
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 mb-6 font-sans max-w-xs mx-auto leading-relaxed">
                      This mixtape may have been deleted or the link is invalid.
                    </p>
                    <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                      <button
                        type="button"
                        id="not-found-create-btn"
                        onClick={navigateToCreate}
                        className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>RECORD YOUR OWN MIXTAPE</span>
                      </button>
                      <button
                        type="button"
                        id="not-found-home-btn"
                        onClick={navigateToLanding}
                        className="w-full py-2.5 px-4 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>GO TO HOMEPAGE</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* State 3: ERROR */}
              {publicTapeStatus === 'error' && (
                <div className="w-full max-w-md mx-auto py-12 px-4 text-center animate-fadeIn">
                  <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-rose-700 mb-1 block">
                      PLAYBACK ERROR
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-sans mb-2 uppercase">
                      COULDN'T LOAD MIXTAPE
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 mb-6 font-sans max-w-xs mx-auto leading-relaxed">
                      {publicTapeError || "We couldn't retrieve this mixtape from the tape archive."}
                    </p>
                    <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                      <button
                        type="button"
                        id="error-retry-btn"
                        onClick={() => currentRouteTapeId && loadTape(currentRouteTapeId, true)}
                        className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>TRY AGAIN</span>
                      </button>
                      <button
                        type="button"
                        id="error-home-btn"
                        onClick={navigateToLanding}
                        className="w-full py-2.5 px-4 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>GO TO HOMEPAGE</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 7. Creator Dashboard (PROTECTED) */}
          {currentView === 'dashboard' && user && (
            <UserDashboard
              mixtapes={userMixtapes}
              isLoadingTapes={isLoadingUserMixtapes}
              onCreateNew={navigateToCreate}
              onPlayTape={navigateToListener}
              onEditTape={handleEditTape}
              onDeleteTape={handleDeleteTape}
              onGoHome={navigateToLanding}
              onGoToAccount={navigateToAccount}
            />
          )}
        </main>
      )}

      {/* Clean comfortable bottom spacing - no large footer */}
      <div className="pb-6 sm:pb-10" />
    </div>
  );
}
