import React, { useState, useEffect, useCallback } from 'react';
import { Mixtape, AppView } from './types';
import { LandingView } from './components/LandingView';
import { CreateWizard } from './components/CreateWizard';
import { ShareSuccessView } from './components/ShareSuccessView';
import { ListenerView } from './components/ListenerView';
import { UserDashboard } from './components/UserDashboard';
import {
  getMixtapeById,
  saveMixtape,
  updateMixtape,
  deleteMixtape,
  fetchUserMixtapes
} from './utils/storage';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeMixtape, setActiveMixtape] = useState<Mixtape | null>(null);
  const [editingMixtape, setEditingMixtape] = useState<Mixtape | null>(null);
  const [isLoadingTape, setIsLoadingTape] = useState<boolean>(false);
  const [tapeLoadError, setTapeLoadError] = useState<string | null>(null);

  // Mixtapes list
  const [userMixtapes, setUserMixtapes] = useState<Mixtape[]>([]);
  const [isLoadingUserMixtapes, setIsLoadingUserMixtapes] = useState<boolean>(false);

  // Load user mixtapes from local storage
  const loadUserMixtapes = useCallback(async () => {
    setIsLoadingUserMixtapes(true);
    try {
      const tapes = await fetchUserMixtapes();
      setUserMixtapes(tapes);
    } catch (e) {
      console.warn('Could not load mixtapes:', e);
    } finally {
      setIsLoadingUserMixtapes(false);
    }
  }, []);

  // Load specific tape for public playback (/m/:shareId or /tape/:id)
  const loadTape = useCallback(async (idOrShareId: string) => {
    setIsLoadingTape(true);
    setTapeLoadError(null);

    try {
      const tape = await getMixtapeById(idOrShareId);
      if (tape) {
        setActiveMixtape(tape);
        setCurrentView('listen');
      } else {
        setTapeLoadError(`We couldn't find a cassette mixtape with ID "${idOrShareId}".`);
        setCurrentView('landing');
      }
    } catch {
      setTapeLoadError('Failed to load this mixtape.');
      setCurrentView('landing');
    } finally {
      setIsLoadingTape(false);
    }
  }, []);

  // Load tape for editing
  const loadTapeForEdit = useCallback(async (id: string) => {
    setIsLoadingTape(true);
    setTapeLoadError(null);

    try {
      const tape = await getMixtapeById(id);
      if (!tape) {
        setTapeLoadError('Mixtape not found.');
        setCurrentView('dashboard');
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

  // Route Resolver based on current URL
  const resolveRouteFromUrl = useCallback(() => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // 1. Shared mixtape playback (/m/:shareId or /tape/:id)
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

    // 2. Edit route /edit/:id or #edit/:id
    const editPathMatch = pathname.match(/^\/edit\/([a-zA-Z0-9_-]+)/);
    const editHashMatch = hash.match(/^#edit\/([a-zA-Z0-9_-]+)/);
    const editId = (editPathMatch && editPathMatch[1]) || (editHashMatch && editHashMatch[1]);
    if (editId) {
      loadTapeForEdit(editId);
      return;
    }

    // 3. Create route /create or #create
    if (pathname === '/create' || hash === '#create') {
      setEditingMixtape(null);
      setCurrentView('create');
      return;
    }

    // 4. Dashboard route /dashboard or #dashboard
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard') || hash === '#dashboard') {
      setCurrentView('dashboard');
      loadUserMixtapes();
      return;
    }

    // Default Landing View
    setCurrentView('landing');
  }, [loadTape, loadTapeForEdit, loadUserMixtapes]);

  // Initial and reactive routing when URL changes
  useEffect(() => {
    resolveRouteFromUrl();

    const onPopState = () => {
      resolveRouteFromUrl();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resolveRouteFromUrl]);

  // Navigation Helpers
  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('landing');
    setActiveMixtape(null);
    setEditingMixtape(null);
  };

  const navigateToCreate = () => {
    window.history.pushState({}, '', '/create');
    setEditingMixtape(null);
    setCurrentView('create');
  };

  const navigateToDashboard = () => {
    window.history.pushState({}, '', '/dashboard');
    setCurrentView('dashboard');
    loadUserMixtapes();
  };

  const navigateToListener = (idOrShareId: string) => {
    window.history.pushState({}, '', `/m/${idOrShareId}`);
    loadTape(idOrShareId);
  };

  const handleEditTape = (tape: Mixtape) => {
    setEditingMixtape(tape);
    window.history.pushState({}, '', `/edit/${tape.id}`);
    setCurrentView('edit');
  };

  // Called when wizard finishes saving/updating a mixtape
  const handleFinishCreate = async (tapeData: Mixtape) => {
    if (editingMixtape) {
      const updated = await updateMixtape(tapeData.id, tapeData);
      setActiveMixtape(updated);
      setEditingMixtape(null);
      const shareKey = updated.shareId || updated.share_id || updated.id;
      window.history.pushState({}, '', `/m/${shareKey}`);
      setCurrentView('listen');
      loadUserMixtapes();
    } else {
      const saved = await saveMixtape(tapeData);
      setActiveMixtape(saved);
      const shareKey = saved.shareId || saved.share_id || saved.id;
      window.history.pushState({}, '', `/m/${shareKey}`);
      setCurrentView('share-success');
      loadUserMixtapes();
    }
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

  return (
    <div className="min-h-screen bg-[#f5efe1] text-stone-800 font-sans flex flex-col justify-between selection:bg-amber-200">
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
                className="underline ml-2 cursor-pointer"
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
              onOpenDashboard={navigateToDashboard}
              savedTapesCount={userMixtapes.length}
            />
          )}

          {/* 2. Create Mixtape Wizard */}
          {currentView === 'create' && (
            <CreateWizard
              onCancel={navigateToLanding}
              onFinish={handleFinishCreate}
            />
          )}

          {/* 3. Edit Mixtape Wizard */}
          {currentView === 'edit' && (
            <CreateWizard
              initialMixtape={editingMixtape}
              onCancel={navigateToDashboard}
              onFinish={handleFinishCreate}
            />
          )}

          {/* 4. Share Success View */}
          {currentView === 'share-success' && activeMixtape && (
            <ShareSuccessView
              mixtape={activeMixtape}
              onOpenListener={(id) => navigateToListener(id)}
              onCreateAnother={navigateToCreate}
            />
          )}

          {/* 5. Listener View (Fully Public - Zero login barrier) */}
          {currentView === 'listen' && activeMixtape && (
            <ListenerView
              mixtape={activeMixtape}
              onMakeYourOwn={navigateToCreate}
              onGoHome={navigateToLanding}
              onEditTape={handleEditTape}
            />
          )}

          {/* 6. Creator Mixtape Library / Dashboard */}
          {currentView === 'dashboard' && (
            <UserDashboard
              mixtapes={userMixtapes}
              isLoadingTapes={isLoadingUserMixtapes}
              onCreateNew={navigateToCreate}
              onPlayTape={navigateToListener}
              onEditTape={handleEditTape}
              onDeleteTape={handleDeleteTape}
              onGoHome={navigateToLanding}
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

