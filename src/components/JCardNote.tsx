import React, { useState } from 'react';
import { Song } from '../types';
import { Mail, Music, Calendar, ChevronDown, ChevronUp, Play } from 'lucide-react';

interface JCardNoteProps {
  name: string;
  creatorName?: string;
  message?: string;
  songs: Song[];
  createdAt?: string;
  currentSongIndex?: number;
  onSelectSong?: (index: number) => void;
  className?: string;
  allowSongClick?: boolean;
}

export const JCardNote: React.FC<JCardNoteProps> = ({
  name,
  creatorName,
  message,
  songs,
  createdAt,
  currentSongIndex = 0,
  onSelectSong,
  className = '',
  allowSongClick = true
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Recently created';

  return (
    <div
      id="jcard-inlay-container"
      className={`w-full max-w-[268px] sm:max-w-[420px] mx-auto bg-[#faf6ed] border-2 border-stone-300 rounded-xl sm:rounded-2xl shadow-md overflow-hidden relative ${className}`}
    >
      {/* Paper texture overlay */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0,transparent_27px,#eae3d2_27px,#eae3d2_28px)] opacity-40 pointer-events-none" />

      {/* J-Card Spine / Header */}
      <div className="relative z-10 bg-amber-100/80 border-b-2 border-dashed border-stone-300 p-2 sm:p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-600" />
          <div>
            <span className="text-[8px] sm:text-[10px] font-mono-retro font-bold uppercase tracking-widest text-stone-500">
              CASSETTE INLAY J-CARD
            </span>
            <h3 className="font-marker text-xs sm:text-lg text-stone-900 leading-tight">
              {name || 'Mixtape Notes'}
            </h3>
          </div>
        </div>

        <button
          type="button"
          id="toggle-jcard-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg hover:bg-amber-200/60 text-stone-600 transition"
          title={isExpanded ? 'Collapse notes' : 'Expand notes'}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="relative z-10 p-2 sm:p-4 space-y-2 sm:space-y-4">
          {/* Creator's Handwritten Note / Message */}
          {message && (
            <div className="bg-white/80 border border-amber-200/80 rounded-lg sm:rounded-xl p-2 sm:p-3.5 shadow-xs relative">
              <div className="flex items-center gap-1.5 mb-1 text-stone-500">
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700" />
                <span className="text-[8px] sm:text-[10px] font-mono-retro font-bold uppercase tracking-wider">
                  Personal Message
                </span>
              </div>
              <p className="font-handwriting text-sm sm:text-2xl text-stone-800 leading-snug whitespace-pre-wrap">
                "{message}"
              </p>
              {creatorName && (
                <p className="font-handwriting text-xs sm:text-lg text-amber-900 text-right mt-0.5 sm:mt-1 font-bold">
                  — {creatorName}
                </p>
              )}
            </div>
          )}

          {/* Tracklist on J-card */}
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[9px] sm:text-[11px] font-mono-retro font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1">
                <Music className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-700" />
                Track List ({songs.length} / 5 songs)
              </span>
              <span className="text-[8px] sm:text-[10px] font-mono-retro text-stone-400 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {formattedDate}
              </span>
            </div>

            {songs.length === 0 ? (
              <p className="text-[11px] sm:text-xs font-mono-retro text-stone-400 italic text-center py-2 sm:py-3 bg-white/40 rounded-lg border border-dashed border-stone-300">
                No songs added to this tape yet.
              </p>
            ) : (
              <ol className="space-y-1 sm:space-y-1.5">
                {songs.map((song, idx) => {
                  const isCurrent = idx === currentSongIndex;
                  return (
                    <li
                      key={song.id || idx}
                      onClick={() => {
                        if (allowSongClick && onSelectSong) {
                          onSelectSong(idx);
                        }
                      }}
                      className={`flex items-center justify-between p-1 sm:p-2 rounded-lg sm:rounded-xl transition border text-xs ${
                        isCurrent
                          ? 'bg-amber-100/90 border-amber-300 text-stone-900 font-semibold shadow-xs'
                          : 'bg-white/60 border-stone-200/80 text-stone-700 hover:bg-white hover:border-stone-300'
                      } ${allowSongClick ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 pr-1.5 sm:pr-2">
                        <span
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center font-mono-retro text-[9px] sm:text-[11px] shrink-0 ${
                            isCurrent
                              ? 'bg-amber-600 text-white font-bold'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {isCurrent ? <Play className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-white" /> : idx + 1}
                        </span>
                        <div className="min-w-0 truncate">
                          <p className="truncate font-medium text-stone-800 text-[11px] sm:text-xs">
                            {song.title}
                          </p>
                          {song.artist && (
                            <p className="text-[9px] sm:text-[10px] font-mono-retro text-stone-500 truncate">
                              {song.artist}
                            </p>
                          )}
                        </div>
                      </div>

                      {song.thumbnailUrl && (
                        <img
                          src={song.thumbnailUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-cover shrink-0 border border-stone-200"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
