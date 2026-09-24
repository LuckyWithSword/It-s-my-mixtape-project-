import React, { useState } from 'react';
import { Mixtape } from '../types';
import { CassetteTape } from './CassetteTape';
import { Copy, Check, Play, Share2, ArrowRight } from 'lucide-react';
import { getPublicShareUrl } from '../utils/url';

interface ShareSuccessViewProps {
  mixtape: Mixtape;
  onOpenMixtape: (shareId: string) => void;
  onGoToDashboard: () => void;
}

export const ShareSuccessView: React.FC<ShareSuccessViewProps> = ({
  mixtape,
  onOpenMixtape,
  onGoToDashboard
}) => {
  const [copied, setCopied] = useState(false);

  // Canonical public share link (/m/:shareId)
  const shareId = mixtape.shareId || mixtape.share_id || mixtape.id;
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin.replace(/\/+$/, '')
    : '';
  const shareUrl = origin ? `${origin}/m/${encodeURIComponent(shareId)}` : getPublicShareUrl(shareId);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.getElementById('share-url-input') as HTMLInputElement;
        if (input) {
          input.select();
          document.execCommand('copy');
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById('share-url-input') as HTMLInputElement;
      if (input) {
        input.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: mixtape.title || mixtape.name || "It's My Playlist",
          text: 'I made you a mixtape.',
          url: shareUrl
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="w-full max-w-[420px] sm:max-w-md mx-auto px-4 py-6 text-center pb-16 animate-fadeIn">
      {/* Top Status Checkmark */}
      <div className="w-11 h-11 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto mb-2.5 shadow-2xs text-emerald-700">
        <Check className="w-5 h-5 stroke-[3]" />
      </div>

      {/* Header */}
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mb-1 block">
        MIXTAPE PUBLISHED
      </span>

      <h1 className="text-xl sm:text-2xl text-stone-900 font-extrabold tracking-tight mb-1.5 uppercase">
        YOUR MIXTAPE IS READY
      </h1>

      <p className="text-xs text-stone-600 max-w-xs mx-auto mb-5 leading-relaxed">
        Your tape is out in the world. Send it to someone who should hear it.
      </p>

      {/* Cassette Preview */}
      <div className="mb-5 flex flex-col items-center justify-center">
        <div className="w-full max-w-[320px] rounded-2xl shadow-cassette overflow-hidden border border-stone-300/70 bg-[#FAF7F0] p-1">
          <CassetteTape
            name={mixtape.title || mixtape.name}
            creatorName={mixtape.creatorName}
            customization={mixtape.customization}
            isPlaying={false}
            progressPercent={0}
            side="A"
            className="w-full"
          />
        </div>
      </div>

      {/* Share Link Card */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-soft-card mb-4 text-left max-w-sm mx-auto">
        <label
          htmlFor="share-url-input"
          className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5"
        >
          SHARE YOUR MIXTAPE
        </label>
        <div className="relative">
          <input
            type="text"
            id="share-url-input"
            readOnly
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="w-full bg-[#FAF7F2] border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 select-all focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 max-w-sm mx-auto">
        {/* Row with COPY LINK and SHARE */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            id="copy-link-btn"
            onClick={handleCopy}
            className="w-full py-2.5 px-3 bg-stone-900 hover:bg-stone-800 active:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY LINK</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="share-native-btn"
            onClick={handleNativeShare}
            className="w-full py-2.5 px-3 bg-white hover:bg-stone-50 border border-stone-200 active:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-orange-600" />
            <span>SHARE</span>
          </button>
        </div>

        {/* OPEN MIXTAPE */}
        <button
          type="button"
          id="open-mixtape-btn"
          onClick={() => onOpenMixtape(shareId)}
          className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>OPEN MIXTAPE</span>
        </button>

        {/* GO TO MY MIXTAPES */}
        <button
          type="button"
          id="go-to-my-mixtapes-btn"
          onClick={onGoToDashboard}
          className="w-full py-2 px-4 text-stone-600 hover:text-stone-900 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 mt-0.5"
        >
          <span>MY MIXTAPES</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
