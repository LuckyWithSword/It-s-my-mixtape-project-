import React from 'react';
import { Song } from '../types';
import { X, ArrowUp, ArrowDown, Music } from 'lucide-react';

interface SongListManagerProps {
  songs: Song[];
  onRemoveSong: (id: string) => void;
  onMoveSong: (index: number, direction: 'up' | 'down') => void;
  maxSongs?: number;
}

export const SongListManager: React.FC<SongListManagerProps> = ({
  songs,
  onRemoveSong,
  onMoveSong
}) => {
  return (
    <div className="w-full space-y-2">
      {/* Selected Tracks List or Empty State */}
      {songs.length === 0 ? (
        <div className="text-center py-7 px-4 bg-white border border-dashed border-stone-300/80 rounded-2xl shadow-soft-card">
          <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-2 text-orange-600">
            <Music className="w-4 h-4" />
          </div>
          <p className="text-xs font-goga font-bold uppercase tracking-wider text-stone-800">
            NO TRACKS YET
          </p>
          <p className="text-[11px] font-goga text-stone-500 mt-1 max-w-xs mx-auto">
            Add up to 5 songs to build your tape.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {songs.map((song, index) => {
            const isFirst = index === 0;
            const isLast = index === songs.length - 1;
            const trackNum = String(index + 1).padStart(2, '0');

            return (
              <li
                key={song.id}
                className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-stone-200/90 rounded-xl shadow-soft-card hover:border-stone-300 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {/* Track Number Badge */}
                  <span className="w-5 h-5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-remixa font-bold text-[10px] flex items-center justify-center shrink-0 tabular-nums">
                    {trackNum}
                  </span>

                  {/* Track Info: Title & Artist - Goga */}
                  <div className="min-w-0">
                    <p
                      className="text-xs sm:text-sm font-goga font-semibold text-stone-900 truncate leading-snug"
                      title={song.title}
                    >
                      {song.title}
                    </p>
                    <p className="text-[11px] font-goga text-stone-500 truncate leading-tight mt-0.5">
                      {song.artist || 'YouTube Audio'}
                    </p>
                  </div>
                </div>

                {/* Track Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Reorder Buttons */}
                  {songs.length > 1 && (
                    <div className="flex items-center mr-0.5">
                      <button
                        type="button"
                        id={`move-up-song-${index}`}
                        onClick={() => onMoveSong(index, 'up')}
                        disabled={isFirst}
                        aria-label={`Move track ${index + 1} up`}
                        className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer rounded"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        id={`move-down-song-${index}`}
                        onClick={() => onMoveSong(index, 'down')}
                        disabled={isLast}
                        aria-label={`Move track ${index + 1} down`}
                        className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer rounded"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Remove Button (×) */}
                  <button
                    type="button"
                    id={`delete-song-${index}`}
                    onClick={() => onRemoveSong(song.id)}
                    aria-label={`Remove ${song.title}`}
                    className="w-6 h-6 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                    title="Remove Track"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.2]" />
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
