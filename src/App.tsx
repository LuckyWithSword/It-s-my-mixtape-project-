import React, { useState, useEffect } from 'react';
import { Mixtape, AppView } from './types';
import { LandingView } from './components/LandingView';
import { CreateWizard } from './components/CreateWizard';
import { ShareSuccessView } from './components/ShareSuccessView';
import { ListenerView } from './components/ListenerView';
import { getMixtapeById, saveMixtapeToServer } from './utils/storage';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeMixtape, setActiveMixtape] = useState<Mixtape | null>(null);
  const [activeMixtapeId, setActiveMixtapeId] = useState<string | null>(null);
  const [isLoadingTape, setIsLoadingTape] = useState<boolean>(false);
  const [tapeLoadError, setTapeLoadError] = useState<string | null>(null);

  // Parse current URL on mount and on popstate
  const resolveRouteFromUrl = async () => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    let tapeId: string | null = null;

    // Check pathname /tape/:id
    const pathMatch = pathname.match(/^\/tape\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      tapeId = pathMatch[1];
    } else if (hash.startsWith('#tape/')) {
      tapeId = hash.replace('#tape/', '').trim();
    } else if (searchParams.get('tape')) {
      tapeId = searchParams.get('tape');
    }

    if (tapeId) {
      loadTape(tapeId);
    } else if (hash === '#create') {
      setCurrentView('create');
    } else {
      setCurrentView('landing');
    }
  };

  useEffect(() => {
    resolveRouteFromUrl();

    const onPopState = () => {
      resolveRouteFromUrl();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadTape = async (id: string) => {
    setIsLoadingTape(true);
    setTapeLoadError(null);
    setActiveMixtapeId(id);

    try {
      const tape = await getMixtapeById(id);
      if (tape) {
        setActiveMixtape(tape);
        setCurrentView('listen');
      } else {
        setTapeLoadError(`We couldn't find a cassette mixtape with ID "${id}".`);
        setCurrentView('landing');
      }
    } catch (err: any) {
      setTapeLoadError('Failed to load this mixtape.');
      setCurrentView('landing');
    } finally {
      setIsLoadingTape(false);
    }
  };

  // Navigation helpers
  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('landing');
    setActiveMixtape(null);
  };

  const navigateToCreate = () => {
    window.history.pushState({}, '', '#create');
    setCurrentView('create');
  };

  const navigateToListener = (id: string) => {
    window.history.pushState({}, '', `/tape/${id}`);
    loadTape(id);
  };

  // Called when wizard finishes saving a mixtape
  const handleFinishCreate = async (newTape: Mixtape) => {
    const saved = await saveMixtapeToServer(newTape);
    setActiveMixtape(saved);
    window.history.pushState({}, '', `/tape/${saved.id}`);
    setCurrentView('share-success');
  };

  return (
    <div className="min-h-screen bg-[#f5efe1] text-stone-800 font-sans flex flex-col justify-between selection:bg-amber-200">
      {/* Loading overlay for tape retrieval */}
      {isLoadingTape && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
          <div className="p-4 bg-white/80 border border-stone-300 rounded-2xl shadow-md text-center max-w-xs">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
            <p className="font-marker text-stone-800 text-sm">Rewinding Cassette...</p>
            <p className="text-xs font-mono-retro text-stone-500 mt-1">
              Loading mixtape audio tracks from YouTube
            </p>
          </div>
        </div>
      )}

      {/* Main View Render */}
      {!isLoadingTape && (
        <main className="flex-1 flex flex-col items-center justify-center">
          {tapeLoadError && (
            <div className="w-full max-w-md mx-auto my-4 p-3.5 bg-rose-100 border border-rose-300 rounded-2xl text-rose-900 text-xs font-mono-retro flex items-center justify-between">
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

          {currentView === 'landing' && (
            <LandingView
              onStartCreate={navigateToCreate}
              onExploreSample={(sampleId) => navigateToListener(sampleId)}
            />
          )}

          {currentView === 'create' && (
            <CreateWizard
              onCancel={navigateToLanding}
              onFinish={handleFinishCreate}
            />
          )}

          {currentView === 'share-success' && activeMixtape && (
            <ShareSuccessView
              mixtape={activeMixtape}
              onOpenListener={(id) => navigateToListener(id)}
              onCreateAnother={navigateToCreate}
            />
          )}

          {currentView === 'listen' && activeMixtape && (
            <ListenerView
              mixtape={activeMixtape}
              onMakeYourOwn={navigateToCreate}
              onGoHome={navigateToLanding}
            />
          )}
        </main>
      )}

      {/* Footer */}
      <footer id="app-footer" className="w-full border-t border-stone-300/70 py-6 sm:py-8 px-4 text-center bg-[#fcf9f2]">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-1.5">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <h3 id="footer-brand-title" className="font-marker text-base sm:text-lg tracking-wider text-stone-900 uppercase drop-shadow-2xs">
              IT’S MY PLAYLIST
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          </div>
          <p id="footer-tagline" className="font-mono-retro text-xs sm:text-sm text-stone-600 tracking-wide font-medium">
            Make it. Personalize it. Share it.
          </p>
        </div>
      </footer>
    </div>
  );
}
