import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA or standalone APK, don't show
  if (isInstalled) {
    return null;
  }

  // If not installable and not iOS, don't render anything
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleClick}
          id="pwa-install-header-btn"
          title="Install app to your home screen"
          aria-label="Install App"
          className={`h-9 px-3 rounded-full border border-orange-500/40 bg-orange-50 hover:bg-orange-100/80 text-orange-950 text-xs font-bold tracking-wide uppercase transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span className="hidden xs:inline">Install App</span>
          <span className="xs:hidden">Install</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          id="pwa-install-card-btn"
          className={`w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition ${className}`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Install App on Device</span>
        </button>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-stone-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Install on iPhone / iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-stone-600 leading-relaxed font-sans">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">1</span>
                <span>Tap the <strong>Share</strong> button in the Safari toolbar at the bottom of your screen.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">3</span>
                <span>Tap <strong>Add</strong> in the top right to install It's My Playlist.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-stone-100 hover:bg-stone-200 py-2.5 text-xs font-bold text-stone-800 uppercase tracking-wider cursor-pointer transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
