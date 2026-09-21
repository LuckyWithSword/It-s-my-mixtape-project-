import React, { useState } from 'react';
import { Mixtape } from '../types';
import { CassetteTape } from './CassetteTape';
import { getPublicShareUrl } from '../utils/url';
import {
  Plus,
  Play,
  Edit3,
  Share2,
  Trash2,
  Disc,
  Check,
  Calendar,
  Music,
  ExternalLink,
  MoreVertical,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface UserDashboardProps {
  mixtapes: Mixtape[];
  isLoadingTapes?: boolean;
  onCreateNew: () => void;
  onPlayTape: (id: string) => void;
  onEditTape: (tape: Mixtape) => void;
  onDeleteTape: (id: string) => Promise<void>;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  mixtapes,
  isLoadingTapes = false,
  onCreateNew,
  onPlayTape,
  onEditTape,
  onDeleteTape
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-[500px] sm:max-w-xl mx-auto px-4 sm:px-5 py-3 sm:py-5">
      {/* Dashboard Section Title */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-stone-200/80">
        <div>
          <h1 className="font-marker text-base sm:text-lg text-stone-900 tracking-wider uppercase leading-tight">
            CREATOR DASHBOARD
          </h1>
          <span className="text-[10px] font-mono-retro text-stone-500 block leading-tight">
            Manage your cassettes and share links
          </span>
        </div>
      </div>

      {/* Main CTA: Create New Mixtape */}
      <div className="mb-4 sm:mb-5">
        <button
          type="button"
          id="dashboard-create-btn"
          onClick={onCreateNew}
          className="w-full py-2.5 sm:py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl sm:rounded-2xl font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>CREATE NEW MIXTAPE</span>
        </button>
      </div>

      {/* Section: Your Mixtapes */}
      <div>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-mono-retro font-bold uppercase tracking-wider text-stone-700">
              MY MIXTAPES
            </h2>
            <span className="text-[10px] font-mono-retro bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
              {mixtapes.length}
            </span>
          </div>
        </div>

        {isLoadingTapes ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
            <p className="text-xs font-mono-retro text-stone-500">Loading your cassette library...</p>
          </div>
        ) : mixtapes.length === 0 ? (
          /* Empty State */
          <div className="p-6 sm:p-8 bg-white border border-dashed border-stone-300 rounded-2xl text-center shadow-2xs">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <Music className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-marker text-stone-800 text-sm sm:text-base mb-1">
              You haven't created any mixtapes yet.
            </h3>
            <p className="text-xs font-sans text-stone-500 max-w-xs mx-auto mb-4">
              Turn up to 5 favorite YouTube songs into a personalized retro cassette and share it with someone special.
            </p>
            <button
              type="button"
              id="dashboard-create-first-btn"
              onClick={onCreateNew}
              className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CREATE YOUR FIRST MIXTAPE</span>
            </button>
          </div>
        ) : (
          /* Mixtapes Compact Cards Grid / List */
          <div className="space-y-2.5 sm:space-y-3">
            {mixtapes.map((tape) => {
              const songCount = tape.songs?.length || 0;
              const formattedDate = formatDate(tape.createdAt);
              const isDeleting = deletingId === tape.id;
              const isConfirmingDelete = confirmDeleteId === tape.id;

              return (
                <div
                  key={tape.id}
                  id={`tape-card-${tape.id}`}
                  className="bg-white border border-stone-200/90 hover:border-amber-400/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Compact Mini Cassette Visual Representation */}
                    <div
                      onClick={() => onPlayTape(tape.id)}
                      className="w-20 sm:w-24 shrink-0 aspect-[1.55/1] bg-stone-900 rounded-lg p-1 relative overflow-hidden cursor-pointer group shadow-2xs"
                      title="Click to play"
                    >
                      <div className="w-full h-full rounded border border-white/20 flex flex-col justify-between p-1 bg-stone-800">
                        {/* Tape label header */}
                        <div className="bg-amber-100/90 text-stone-900 rounded px-1 text-[7px] font-marker truncate text-center">
                          {tape.name}
                        </div>
                        {/* Two tape reels */}
                        <div className="flex items-center justify-around py-0.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/70 bg-stone-900 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white/60" />
                          </div>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/70 bg-stone-900 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white/60" />
                          </div>
                        </div>
                      </div>
                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>

                    {/* Mixtape Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3
                          onClick={() => onPlayTape(tape.id)}
                          className="font-marker text-xs sm:text-sm text-stone-900 truncate hover:text-amber-700 cursor-pointer"
                        >
                          {tape.name}
                        </h3>
                      </div>
                      <p className="text-[10px] sm:text-xs font-mono-retro text-stone-500 mt-0.5 flex items-center gap-1.5">
                        <span>{songCount} {songCount === 1 ? 'track' : 'tracks'}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </p>
                      {tape.message && (
                        <p className="text-[10px] font-sans text-stone-400 line-clamp-1 italic mt-0.5">
                          "{tape.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-stone-100 text-[11px] font-mono-retro">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {/* Play / View */}
                      <button
                        type="button"
                        id={`play-tape-btn-${tape.id}`}
                        onClick={() => onPlayTape(tape.id)}
                        className="py-1 px-2 sm:px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3 fill-amber-800" />
                        <span>Play</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        id={`edit-tape-btn-${tape.id}`}
                        onClick={() => onEditTape(tape)}
                        className="py-1 px-2 sm:px-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3 text-stone-500" />
                        <span>Edit</span>
                      </button>

                      {/* Share */}
                      <button
                        type="button"
                        id={`share-tape-btn-${tape.id}`}
                        onClick={(e) => handleCopyLink(e, tape)}
                        className="py-1 px-2 sm:px-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg flex items-center gap-1 transition"
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

                    {/* Delete / Confirm */}
                    <div>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, tape.id)}
                            disabled={isDeleting}
                            className="py-0.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="text-[10px] text-stone-500 underline"
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
                          className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition"
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
    </div>
  );
};
