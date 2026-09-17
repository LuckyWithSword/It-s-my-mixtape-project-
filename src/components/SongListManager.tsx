import React from 'react';
import { Song } from '../types';
import { ArrowUp, ArrowDown, Trash2, Music, GripVertical } from 'lucide-react';

interface SongListManagerProps {
  songs: Song[];
  onRemoveSong: (id: string) => void;
  onMoveSong: (index: number, direction: 'up' | 'down') => void;
}

export const SongListManager: React.FC<SongListManagerProps> = ({
  songs,
  onRemoveSong,
  onMoveSong
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-500">
          Track Order ({songs.length} / 5)
        </span>
        <span className="text-[11px] font-mono-retro text-stone-400">
          {songs.length === 0
            ? '5 slots remaining'
            : songs.length === 5
            ? 'Mixtape full'
            : 'Use arrows to reorder'}
        </span>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-5 sm:py-8 px-3 sm:px-4 bg-stone-100/70 rounded-2xl border-2 border-dashed border-stone-300">
          <Music className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-stone-400 mb-1.5 sm:mb-2" />
          <p className="font-marker text-stone-700 text-xs sm:text-sm">Your tape has no songs yet!</p>
          <p className="text-[11px] sm:text-xs font-mono-retro text-stone-500 mt-0.5 sm:mt-1">
            Paste a YouTube link above to start building your mixtape.
          </p>
        </div>
      ) : (
        <ol className="space-y-1.5 sm:space-y-2">
          {songs.map((song, index) => {
            const isFirst = index === 0;
            const isLast = index === songs.length - 1;

            return (
              <li
                key={song.id}
                className="flex items-center justify-between p-2 sm:p-2.5 bg-white border border-stone-200 rounded-xl shadow-xs hover:border-amber-300 transition group"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
                  {/* Track number badge */}
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-stone-100 border border-stone-300 flex items-center justify-center font-mono-retro text-[11px] sm:text-xs font-bold text-stone-700 shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  {song.thumbnailUrl && (
                    <img
                      src={song.thumbnailUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover border border-stone-200 shrink-0"
                    />
                  )}

                  {/* Track Info */}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate" title={song.title}>
                      {song.title}
                    </p>
                    <p className="text-[10px] font-mono-retro text-stone-500 truncate">
                      {song.artist || 'YouTube Audio'}
                    </p>
                  </div>
                </div>

                {/* Action Controls: Move Up, Move Down, Delete */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <button
                    type="button"
                    id={`move-up-song-${index}`}
                    onClick={() => onMoveSong(index, 'up')}
                    disabled={isFirst}
                    className="p-1 sm:p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-20 disabled:pointer-events-none transition"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    id={`move-down-song-${index}`}
                    onClick={() => onMoveSong(index, 'down')}
                    disabled={isLast}
                    className="p-1 sm:p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-20 disabled:pointer-events-none transition"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    id={`delete-song-${index}`}
                    onClick={() => onRemoveSong(song.id)}
                    className="p-1 sm:p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition ml-0.5 sm:ml-1"
                    title="Remove Song"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
