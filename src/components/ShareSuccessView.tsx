import React, { useState } from 'react';
import { Mixtape } from '../types';
import { CassetteTape } from './CassetteTape';
import { Copy, Check, ExternalLink, Play, Share2, PlusCircle, Sparkles } from 'lucide-react';
import { getPublicShareUrl } from '../utils/url';

interface ShareSuccessViewProps {
  mixtape: Mixtape;
  onOpenListener: (id: string) => void;
  onCreateAnother: () => void;
}

export const ShareSuccessView: React.FC<ShareSuccessViewProps> = ({
  mixtape,
  onOpenListener,
  onCreateAnother
}) => {
  const [copied, setCopied] = useState(false);

  // Generate canonical public share link (/m/:shareId)
  const shareKey = mixtape.shareId || mixtape.share_id || mixtape.id;
  const shareUrl = getPublicShareUrl(shareKey);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback
        const input = document.getElementById('share-url-input') as HTMLInputElement;
        if (input) {
          input.select();
          document.execCommand('copy');
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Mixtape: ${mixtape.name}`,
          text: mixtape.message || `Listen to this personal cassette mixtape I made for you!`,
          url: shareUrl
        });
      } catch (err) {
        // User dismissed share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-8 text-center">
      {/* Celebration Header */}
      <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full text-[11px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider mb-2.5 sm:mb-3 shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>Tape Recorded Successfully!</span>
      </div>

      <h2 className="font-marker text-2xl sm:text-4xl text-stone-900 mb-1.5 sm:mb-2">
        Your Mixtape is Ready
      </h2>
      <p className="text-xs sm:text-sm font-sans text-stone-600 max-w-sm mx-auto mb-4 sm:mb-6">
        Share this unique link with someone special. They can open it and listen to your selected songs in order.
      </p>

      {/* Cassette Display */}
      <div className="mb-4 sm:mb-6 transform hover:scale-102 transition-transform">
        <CassetteTape
          name={mixtape.name}
          creatorName={mixtape.creatorName}
          customization={mixtape.customization}
          isPlaying={false}
          progressPercent={0}
          side="A"
        />
      </div>

      {/* Share Link Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-5 shadow-xs sm:shadow-sm mb-4 sm:mb-6 text-left">
        <label
          htmlFor="share-url-input"
          className="block text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-600 mb-1.5 sm:mb-2"
        >
          Permanent Share Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            id="share-url-input"
            readOnly
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-mono-retro text-stone-800 select-all focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            id="copy-share-url-btn"
            onClick={handleCopy}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Native Share */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            id="native-share-btn"
            onClick={handleNativeShare}
            className="w-full mt-2.5 sm:mt-3 py-2 sm:py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-700" />
            <span>Send via Messages / WhatsApp / Social</span>
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
        <button
          type="button"
          id="listen-my-tape-btn"
          onClick={() => onOpenListener(mixtape.id)}
          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
          <span>Listen to This Tape</span>
        </button>

        <button
          type="button"
          id="create-another-tape-btn"
          onClick={onCreateAnother}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Record Another Mixtape</span>
        </button>
      </div>
    </div>
  );
};
