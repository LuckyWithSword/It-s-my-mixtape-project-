import React, { useState } from 'react';
import { Mixtape } from '../types';
import { getPublicShareUrl } from '../utils/url';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Play,
  Edit3,
  Share2,
  Trash2,
  Check,
  Music,
  ArrowLeft,
  Loader2,
  LogOut,
  Disc
} from 'lucide-react';
import { MixtapeLoader } from './MixtapeLoader';

interface UserDashboardProps {
  mixtapes: Mixtape[];
  isLoadingTapes?: boolean;
  onCreateNew: () => void;
  onPlayTape: (id: string) => void;
  onEditTape: (tape: Mixtape) => void;
  onDeleteTape: (id: string) => Promise<void>;
  onGoHome?: () => void;
  onGoToAccount?: () => void;
}

// Mini cassette shell colors matching the cassette customizer palette
const SHELL_COLORS: Record<string, { bg: string; border: string; labelBg: string; text: string }> = {
  'vintage-ivory': { bg: 'bg-[#d8cbb8]', border: 'border-[#b8a791]', labelBg: 'bg-[#f4efe4]', text: 'text-stone-800' },
  'neon-magenta': { bg: 'bg-[#b81d6d]', border: 'border-[#911354]', labelBg: 'bg-[#fdf2f8]', text: 'text-pink-900' },
  'synth-teal': { bg: 'bg-[#1b7a7a]', border: 'border-[#135959]', labelBg: 'bg-[#f0fdfa]', text: 'text-teal-900' },
  'sunset-amber': { bg: 'bg-[#c26217]', border: 'border-[#9c4c0e]', labelBg: 'bg-[#fffbeb]', text: 'text-amber-900' },
  'matte-black': { bg: 'bg-[#2b2b2d]', border: 'border-[#1a1a1c]', labelBg: 'bg-[#f5f5f4]', text: 'text-stone-900' },
  'pastel-pink': { bg: 'bg-[#d99da8]', border: 'border-[#bf818d]', labelBg: 'bg-[#fff1f2]', text: 'text-rose-900' },
  'matcha-green': { bg: 'bg-[#7a8863]', border: 'border-[#626e4e]', labelBg: 'bg-[#f8faf4]', text: 'text-stone-900' },
  'lavender-mist': { bg: 'bg-[#7d6c9c]', border: 'border-[#63547f]', labelBg: 'bg-[#f8f5fc]', text: 'text-purple-950' },
  'sky-blue': { bg: 'bg-[#4a859c]', border: 'border-[#36687c]', labelBg: 'bg-[#f4fafc]', text: 'text-sky-950' },
  'cherry-red': { bg: 'bg-[#a31f1f]', border: 'border-[#7d1414]', labelBg: 'bg-[#fff5f5]', text: 'text-red-950' },
  'clear-smoke': { bg: 'bg-[#3d4247]', border: 'border-[#292d30]', labelBg: 'bg-[#f0f3f5]', text: 'text-stone-900' },
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
  mixtapes,
  isLoadingTapes = false,
  onCreateNew,
  onPlayTape,
  onEditTape,
  onDeleteTape,
  onGoHome,
}) => {
  const { user, signOut } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState(false);

  // STRICT REQUIREMENT: Only show mixtapes where ownerId === currentUser.uid
  const userOwnedMixtapes = mixtapes.filter((tape) => {
    if (!user) return false;
    return tape.ownerId === user.uid;
  });

  const handleCopyLink = (e: React.MouseEvent, tape: Mixtape) => {
    e.stopPropagation();
    const shareKey = tape.shareId || tape.share_id || tape.id;
    const url = getPublicShareUrl(shareKey);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedId(tape.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (e: React.MouseEvent, tapeId: string) => {
    e.stopPropagation();
    setDeletingId(tapeId);
    try {
      await onDeleteTape(tapeId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* 1. Compact Secondary Account Section & Navigation Bar */}
      <div className="bg-white/80 border border-stone-200/90 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-2xs backdrop-blur-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* User Profile Avatar */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-orange-300 bg-orange-50 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
            {user?.photoURL && !avatarErr ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Profile'}
                onError={() => setAvatarErr(true)}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono-retro font-bold text-orange-900 text-sm bg-orange-100">
                {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>

          {/* User Google Name & Email */}
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-stone-900 truncate font-mono-retro leading-tight">
              {user?.displayName || 'Creator'}
            </h2>
            <p className="text-[11px] text-stone-500 font-mono-retro truncate leading-tight">
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Action Controls: Sign Out and Home */}
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              type="button"
              id="dashboard-back-home-btn"
              onClick={onGoHome}
              className="inline-flex items-center gap-1.5 text-xs font-mono-retro font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Homepage</span>
            </button>
          )}

          {user && (
            <button
              type="button"
              id="dashboard-signout-btn"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-xs font-mono-retro font-semibold text-stone-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-stone-300 hover:border-rose-200 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SIGN OUT</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dashboard Header with Title & Subtitle */}
      <div className="mb-4 sm:mb-6 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-stone-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            <Disc className="w-3 h-3 text-orange-600" />
            <span>IT'S MY PLAYLIST</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight uppercase leading-tight">
            MY MIXTAPES
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Your songs. Your tapes. All in one place.
          </p>
        </div>

        {/* Tape Count Badge */}
        {!isLoadingTapes && (
          <div className="inline-flex items-center self-start sm:self-auto gap-1 text-xs text-stone-600 bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs font-medium">
            <span className="font-bold text-orange-600">{userOwnedMixtapes.length}</span>
            <span>{userOwnedMixtapes.length === 1 ? 'cassette' : 'cassettes'}</span>
          </div>
        )}
      </div>

      {/* 3. Prominent Top CTA: + CREATE NEW MIXTAPE */}
      <div className="mb-5 sm:mb-6">
        <button
          type="button"
          id="dashboard-create-new-mixtape-btn"
          onClick={onCreateNew}
          className="w-full py-3 sm:py-3.5 px-5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 group cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
          <span>+ CREATE NEW MIXTAPE</span>
        </button>
      </div>

      {/* 4. Mixtapes Grid / Empty State */}
      {isLoadingTapes ? (
        <div className="py-8">
          <MixtapeLoader
            message="LOADING YOUR TAPES..."
            subMessage="Reading analog cassettes from cloud library..."
            size="md"
          />
        </div>
      ) : userOwnedMixtapes.length === 0 ? (
        /* Empty Dashboard State */
        <div className="p-8 sm:p-12 bg-white border border-dashed border-stone-300 rounded-2xl text-center shadow-xs">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-orange-200">
            <Music className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-stone-900 text-base sm:text-lg font-bold mb-1 uppercase tracking-tight">
            NO MIXTAPES YET
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto mb-5 leading-relaxed">
            Make your first tape and give your favorite songs a place to live.
          </p>
          <button
            type="button"
            id="dashboard-create-first-mixtape-btn"
            onClick={onCreateNew}
            className="py-2.5 sm:py-3 px-5 sm:px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE YOUR FIRST MIXTAPE</span>
          </button>
        </div>
      ) : (
        /* Responsive Mixtape Cards: 1 column on mobile, 2 columns on larger screens */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {userOwnedMixtapes.map((tape) => {
            const songCount = tape.songs?.length || 0;
            const formattedDate = formatDate(tape.updatedAt || tape.createdAt);
            const isDeleting = deletingId === tape.id;
            const isConfirmingDelete = confirmDeleteId === tape.id;
            const shareKey = tape.shareId || tape.share_id || tape.id;
            const colorKey = tape.customization?.color || 'sunset-amber';
            const shellStyle = SHELL_COLORS[colorKey] || SHELL_COLORS['sunset-amber'];

            return (
              <div
                key={tape.id}
                id={`mixtape-card-${tape.id}`}
                className="bg-white border border-stone-200/90 hover:border-stone-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-3 group/card"
              >
                {/* Top Section: Cassette Cover Preview & Info */}
                <div className="flex items-start gap-3">
                  {/* Cassette Cover Preview */}
                  <div
                    onClick={() => onPlayTape(shareKey)}
                    className={`w-20 sm:w-24 shrink-0 aspect-[1.55/1] rounded-lg p-1 relative overflow-hidden cursor-pointer group shadow-2xs border ${shellStyle.bg} ${shellStyle.border}`}
                    title="Click to play tape"
                  >
                    <div className="w-full h-full rounded border border-black/20 flex flex-col justify-between p-1 bg-black/10">
                      {/* Mini Tape Label */}
                      <div className={`rounded px-1 text-[7px] font-bold truncate text-center shadow-2xs ${shellStyle.labelBg} ${shellStyle.text}`}>
                        {tape.title || tape.name || 'Mixtape'}
                      </div>
                      {/* Mini Reels */}
                      <div className="flex items-center justify-around py-0.5">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/80 bg-stone-900 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-white/60" />
                        </div>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/80 bg-stone-900 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-white/60" />
                        </div>
                      </div>
                    </div>
                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  {/* Title and Metadata */}
                  <div className="flex-1 min-w-0">
                    <h3
                      onClick={() => onPlayTape(shareKey)}
                      className="font-bold text-sm sm:text-base text-stone-900 truncate hover:text-orange-600 cursor-pointer transition leading-snug flex items-center gap-1.5"
                      title={tape.title || tape.name}
                    >
                      {tape.imageUrl && (
                        <img
                          src={tape.imageUrl}
                          alt="Cover Art"
                          className="w-4 h-4 rounded-xs object-cover border border-stone-300 inline-block shrink-0"
                        />
                      )}
                      <span className="truncate">{tape.title || tape.name || 'Untitled Tape'}</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{songCount} {songCount === 1 ? 'track' : 'tracks'}</span>
                      {formattedDate && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span>{formattedDate}</span>
                        </>
                      )}
                    </p>
                    {tape.message ? (
                      <p className="text-[11px] text-stone-500 line-clamp-1 italic mt-1">
                        "{tape.message}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-stone-400 mt-1">
                        /m/{shareKey}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    {/* Open Button: opens public /m/:shareId link */}
                    <button
                      type="button"
                      id={`open-tape-btn-${tape.id}`}
                      onClick={() => onPlayTape(shareKey)}
                      className="py-1 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-900 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer border border-orange-200/60"
                      title="Open and play this mixtape"
                    >
                      <Play className="w-3 h-3 fill-orange-900" />
                      <span>Open</span>
                    </button>

                    {/* Edit Button: opens /edit/:id */}
                    <button
                      type="button"
                      id={`edit-tape-btn-${tape.id}`}
                      onClick={() => onEditTape(tape)}
                      className="py-1 px-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Edit this mixtape"
                    >
                      <Edit3 className="w-3 h-3 text-stone-500" />
                      <span>Edit</span>
                    </button>

                    {/* Share Button: copies public share link */}
                    <button
                      type="button"
                      id={`share-tape-btn-${tape.id}`}
                      onClick={(e) => handleCopyLink(e, tape)}
                      className="py-1 px-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Copy public share link"
                    >
                      {copiedId === tape.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3 text-stone-500" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Discreet Delete / Confirm Delete Control */}
                  <div>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, tape.id)}
                          disabled={isDeleting}
                          className="py-0.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="text-[10px] text-stone-500 underline cursor-pointer px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`delete-tape-btn-${tape.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(tape.id);
                        }}
                        className="p-1 text-stone-300 hover:text-rose-600 rounded-md transition cursor-pointer"
                        title="Delete mixtape"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
