import React, { useState } from 'react';
import { Mixtape, Song } from '../types';
import { CassetteTape } from './CassetteTape';
import { TapeControls } from './TapeControls';
import { MixtapeFlipCard } from './MixtapeFlipCard';
import { YouTubePlayer } from './YouTubePlayer';
import { JCardNote } from './JCardNote';
import { Share2, Plus, ArrowLeft, Disc, Volume2, Sparkles, Check, Copy } from 'lucide-react';

interface ListenerViewProps {
  mixtape: Mixtape;
  onMakeYourOwn: () => void;
  onGoHome?: () => void;
  onEditTape?: (tape: Mixtape) => void;
}

export const ListenerView: React.FC<ListenerViewProps> = ({
  mixtape,
  onMakeYourOwn,
  onGoHome,
  onEditTape
}) => {
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [tapeSide, setTapeSide] = useState<'A' | 'B'>('A');
  const [copiedShare, setCopiedShare] = useState(false);

  const songs = mixtape.songs || [];
  const currentSong: Song | null = songs[currentSongIndex] || null;

  // Handle auto-advance to next song when current track ends
  const handleSongEnded = () => {
    if (currentSongIndex + 1 < songs.length) {
      setCurrentSongIndex(currentSongIndex + 1);
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      // Loop or pause at the end of the tape
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1 < songs.length ? prev + 1 : 0));
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev - 1 >= 0 ? prev - 1 : songs.length - 1));
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 20;

  return (
    <div className="w-full max-w-[460px] sm:max-w-xl mx-auto px-4 sm:px-6 py-2.5 sm:py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {onGoHome ? (
          <button
            type="button"
            id="listener-home-btn"
            onClick={onGoHome}
            className="flex items-center gap-1 text-[11px] sm:text-xs font-mono-retro font-semibold text-stone-500 hover:text-stone-800 transition py-0.5 px-2 rounded-lg hover:bg-stone-200/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Tapes</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-mono-retro font-bold text-amber-800">
            <Disc className="w-3.5 h-3.5 text-amber-600" />
            <span>Digital Mixtape</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {onEditTape && (
            <button
              type="button"
              id="listener-edit-tape-btn"
              onClick={() => onEditTape(mixtape)}
              className="flex items-center gap-1 text-[10px] sm:text-xs font-mono-retro text-stone-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 px-2 py-0.5 sm:py-1 rounded-lg shadow-2xs transition"
            >
              <span>Edit Tape</span>
            </button>
          )}

          <button
            type="button"
            id="listener-share-btn"
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-mono-retro text-stone-600 hover:text-stone-900 bg-white border border-stone-300 px-2 py-0.5 sm:py-1 rounded-lg shadow-xs transition"
          >
            {copiedShare ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-stone-500" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="listener-make-own-btn"
            onClick={onMakeYourOwn}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shadow-xs transition"
          >
            <Plus className="w-3 h-3" />
            <span>Make Tape</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Flip Card: Front = Cassette Cover, Back = Music Player + Physical Inlay J-Card */}
      <div className="mb-2.5 sm:mb-4">
        <MixtapeFlipCard
          customization={mixtape.customization}
          name={mixtape.name}
          creatorName={mixtape.creatorName}
          side={tapeSide}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          currentTrackIndex={currentSongIndex}
          totalTracks={songs.length}
          currentTrackTitle={currentSong?.title}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onStop={handleStop}
          onSeek={(newTime) => setCurrentTime(newTime)}
          jCard={
            <JCardNote
              name={mixtape.name}
              creatorName={mixtape.creatorName}
              message={mixtape.message}
              songs={songs}
              createdAt={mixtape.createdAt}
              currentSongIndex={currentSongIndex}
              onSelectSong={(idx) => {
                setCurrentSongIndex(idx);
                setIsPlaying(true);
              }}
              allowSongClick={true}
            />
          }
        />
      </div>

      {/* Background Audio Engine */}
      {currentSong && (
        <YouTubePlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayStateChange={(playing) => setIsPlaying(playing)}
          onSongEnded={handleSongEnded}
          onProgressUpdate={(cur, dur) => {
            setCurrentTime(cur);
            setDuration(dur);
          }}
        />
      )}

      {/* Viral Loop / "Make your own" footer */}
      <div className="p-2.5 sm:p-4 bg-amber-100/70 border border-amber-200 rounded-xl sm:rounded-2xl text-center shadow-xs mt-2.5 sm:mt-4">
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 mx-auto mb-0.5" />
        <h4 className="font-marker text-stone-900 text-xs sm:text-base mb-0.5">
          Loved this mixtape?
        </h4>
        <p className="text-[10px] sm:text-xs font-sans text-stone-600 max-w-xs mx-auto mb-2">
          Create your own customized retro cassette tape with up to 5 songs and send it to a friend.
        </p>
        <button
          type="button"
          id="footer-make-tape-btn"
          onClick={onMakeYourOwn}
          className="py-2 sm:py-2.5 px-4 sm:px-6 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:shadow-md transition inline-flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Your Own Mixtape</span>
        </button>
      </div>
    </div>
  );
};
