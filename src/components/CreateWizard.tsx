import React, { useState } from 'react';
import { CassetteCustomization, Mixtape, Song } from '../types';
import { CassetteTape } from './CassetteTape';
import { CassetteCustomizer } from './CassetteCustomizer';
import { SongInputForm } from './SongInputForm';
import { SongListManager } from './SongListManager';
import { JCardNote } from './JCardNote';
import { YouTubePlayer } from './YouTubePlayer';
import { TapeControls } from './TapeControls';
import { MixtapeFlipCard } from './MixtapeFlipCard';
import {
  ArrowLeft,
  ArrowRight,
  Disc,
  Music,
  Palette,
  CheckCircle2,
  FileText,
  Eye,
  Loader2,
  Sparkles
} from 'lucide-react';

interface CreateWizardProps {
  onCancel: () => void;
  onFinish: (mixtape: Mixtape) => Promise<void>;
  initialMixtape?: Mixtape | null;
}

type WizardStep = 'details' | 'customize' | 'songs' | 'preview';

const DEFAULT_CUSTOMIZATION: CassetteCustomization = {
  color: 'vintage-ivory',
  pattern: 'none',
  labelStyle: 'marker',
  labelColor: '#faf4e6',
  stickers: [
    { id: 'st-init-1', type: 'mix-vol-1', xPercent: 18, yPercent: 22, rotationDeg: -6 },
    { id: 'st-init-2', type: 'heart', xPercent: 82, yPercent: 20, rotationDeg: 8 }
  ],
  screwsColor: 'silver'
};

export const CreateWizard: React.FC<CreateWizardProps> = ({ onCancel, onFinish, initialMixtape }) => {
  const isEditing = !!initialMixtape;
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [name, setName] = useState<string>(initialMixtape?.name || 'Mixtape');
  const [creatorName, setCreatorName] = useState<string>(initialMixtape?.creatorName || '');
  const [message, setMessage] = useState<string>(initialMixtape?.message || 'Recorded with love. Put your headphones on and enjoy.');
  const [customization, setCustomization] = useState<CassetteCustomization>(initialMixtape?.customization || DEFAULT_CUSTOMIZATION);
  const [songs, setSongs] = useState<Song[]>(initialMixtape?.songs || []);

  // Preview Playback State
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Info & Note', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'customize', label: 'Cassette', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'songs', label: 'Songs', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="w-3.5 h-3.5" /> }
  ];

  // Song handlers
  const handleAddSong = (newSongData: Omit<Song, 'id' | 'position'>) => {
    if (songs.length >= 5) return;
    const newSong: Song = {
      ...newSongData,
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      position: songs.length + 1
    };
    setSongs([...songs, newSong]);
  };

  const handleRemoveSong = (id: string) => {
    const updated = songs
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, position: idx + 1 }));
    setSongs(updated);
    if (currentSongIndex >= updated.length) {
      setCurrentSongIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleMoveSong = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === songs.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSongs = [...songs];
    const temp = newSongs[index];
    newSongs[index] = newSongs[targetIndex];
    newSongs[targetIndex] = temp;

    const renumbered = newSongs.map((s, idx) => ({ ...s, position: idx + 1 }));
    setSongs(renumbered);
  };

  // Playback Navigation
  const handleNextSong = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1 < songs.length ? prev + 1 : 0));
    setCurrentTime(0);
  };

  const handlePreviousSong = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev - 1 >= 0 ? prev - 1 : songs.length - 1));
    setCurrentTime(0);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Submit & Create
  const handleFinalCreate = async () => {
    if (songs.length === 0) {
      setErrorMsg('Please add at least 1 song before creating your mixtape!');
      setCurrentStep('songs');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const targetId = initialMixtape?.id || Math.random().toString(36).substring(2, 8);
    const newMixtape: Mixtape = {
      ...initialMixtape,
      id: targetId,
      name: name.trim() || 'Untitled Mixtape',
      creatorName: creatorName.trim() || undefined,
      message: message.trim() || undefined,
      customization,
      songs,
      createdAt: initialMixtape?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await onFinish(newMixtape);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save mixtape. Please try again.');
      setIsSaving(false);
    }
  };

  const currentSong = songs[currentSongIndex] || null;

  return (
    <div className="w-full max-w-[460px] sm:max-w-xl mx-auto px-4 sm:px-6 py-2.5 sm:py-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <button
          type="button"
          id="wizard-cancel-btn"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-mono-retro font-semibold text-stone-500 hover:text-stone-800 transition py-0.5 px-2 rounded-lg hover:bg-stone-200/50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Home</span>
        </button>

        <span className="text-[10px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-amber-200">
          {isEditing ? 'Editing Mixtape' : 'Mixtape Studio'}
        </span>
      </div>

      {/* Step Pills */}
      <div className="flex items-center justify-between gap-1 mb-2.5 sm:mb-5 bg-white/70 p-1 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.id;
          return (
            <button
              key={s.id}
              type="button"
              id={`step-pill-${s.id}`}
              onClick={() => setCurrentStep(s.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 px-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono-retro transition ${
                isActive
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Live Cassette Visual Preview - Visible during customization steps */}
      {currentStep !== 'preview' && (
        <div className="mb-2.5 sm:mb-5">
          <div className="flex items-center justify-between px-1 mb-1 sm:mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-mono-retro font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <Disc className="w-2.5 h-2.5 text-amber-600" />
              Live Cassette Preview
            </span>
            {songs.length > 0 && (
              <span className="text-[9px] sm:text-[10px] font-mono-retro text-stone-400">
                {songs.length} / 5 songs loaded
              </span>
            )}
          </div>
          <CassetteTape
            name={name}
            creatorName={creatorName}
            customization={customization}
            isPlaying={isPlaying}
            progressPercent={duration > 0 ? (currentTime / duration) * 100 : 25}
            side="A"
          />
        </div>
      )}

      {errorMsg && (
        <div className="mb-2.5 sm:mb-3 p-2 sm:p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-mono-retro">
          ⚠ {errorMsg}
        </div>
      )}

      {/* STEP 1: Details (Name, Creator, Message) */}
      {currentStep === 'details' && (
        <div className="space-y-2.5 sm:space-y-3.5 bg-white border border-stone-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs">
          <div>
            <label
              htmlFor="mixtape-name-input"
              className="block text-[11px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700 mb-0.5 sm:mb-1"
            >
              Mixtape Title *
            </label>
            <input
              type="text"
              id="mixtape-name-input"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Road Trip Classics, For Sarah, Late Night Lo-Fi"
              className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 font-marker text-sm sm:text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-[8px] sm:text-[9px] font-mono-retro text-stone-400 block text-right mt-0.5">
              {name.length}/40 characters
            </span>
          </div>

          <div>
            <label
              htmlFor="creator-name-input"
              className="block text-[11px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700 mb-0.5 sm:mb-1"
            >
              Your Name (Optional)
            </label>
            <input
              type="text"
              id="creator-name-input"
              value={creatorName}
              maxLength={30}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-2.5 py-1 sm:px-3 sm:py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="mixtape-message-input"
              className="block text-[11px] sm:text-xs font-mono-retro font-bold uppercase tracking-wider text-stone-700 mb-0.5 sm:mb-1"
            >
              Personal Note / Inlay Letter (Optional)
            </label>
            <textarea
              id="mixtape-message-input"
              rows={3}
              value={message}
              maxLength={250}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a heartfelt note for the listener..."
              className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-800 font-sans focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-[8px] sm:text-[9px] font-mono-retro text-stone-400 block text-right mt-0.5">
              {message.length}/250 characters
            </span>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              id="step-details-next-btn"
              onClick={() => setCurrentStep('customize')}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Customize Cassette</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Customize Cassette */}
      {currentStep === 'customize' && (
        <div className="space-y-3 sm:space-y-4">
          <CassetteCustomizer
            customization={customization}
            onChange={(newCust) => setCustomization(newCust)}
          />

          <div className="flex items-center justify-between pt-1.5 sm:pt-2">
            <button
              type="button"
              id="step-cust-back-btn"
              onClick={() => setCurrentStep('details')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-mono-retro text-[11px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              id="step-cust-next-btn"
              onClick={() => setCurrentStep('songs')}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-mono-retro text-[11px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Add Songs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Add Songs */}
      {currentStep === 'songs' && (
        <div className="space-y-2.5 sm:space-y-4">
          <SongInputForm
            onAddSong={handleAddSong}
            currentSongCount={songs.length}
            maxSongs={5}
          />

          <SongListManager
            songs={songs}
            onRemoveSong={handleRemoveSong}
            onMoveSong={handleMoveSong}
          />

          <div className="flex items-center justify-between pt-1.5 sm:pt-3">
            <button
              type="button"
              id="step-songs-back-btn"
              onClick={() => setCurrentStep('customize')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-mono-retro text-[11px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              id="step-songs-next-btn"
              onClick={() => setCurrentStep('preview')}
              disabled={songs.length === 0}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl font-mono-retro text-[11px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Preview Tape ({songs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Preview and Test */}
      {currentStep === 'preview' && (
        <div className="space-y-3 sm:space-y-5">
          <div className="p-2.5 sm:p-3 bg-amber-100/90 border border-amber-300 rounded-xl text-[11px] sm:text-xs font-mono-retro text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 shrink-0" />
              This is how your recipient will experience your mixtape!
            </span>
          </div>

          {/* Interactive 3D Flip Card Preview: Front = Cassette Cover, Back = Music Player + Physical Inlay J-Card */}
          <MixtapeFlipCard
            customization={customization}
            name={name}
            creatorName={creatorName}
            side="A"
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            currentTrackIndex={currentSongIndex}
            totalTracks={songs.length}
            currentTrackTitle={currentSong?.title}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onNext={handleNextSong}
            onPrevious={handlePreviousSong}
            onStop={handleStop}
            onSeek={(t) => setCurrentTime(t)}
            jCard={
              <JCardNote
                name={name}
                creatorName={creatorName}
                message={message}
                songs={songs}
                currentSongIndex={currentSongIndex}
                onSelectSong={(idx) => {
                  setCurrentSongIndex(idx);
                  setIsPlaying(true);
                }}
              />
            }
          />

          {/* YouTube Video Player Monitor */}
          {currentSong && (
            <YouTubePlayer
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlayStateChange={(playing) => setIsPlaying(playing)}
              onSongEnded={handleNextSong}
              onProgressUpdate={(cur, tot) => {
                setCurrentTime(cur);
                setDuration(tot);
              }}
            />
          )}

          {/* Bottom Action: Create Mixtape */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-stone-200">
            <button
              type="button"
              id="preview-back-songs-btn"
              onClick={() => setCurrentStep('songs')}
              className="w-full sm:w-auto px-4 py-2 sm:py-2.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-mono-retro text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Edit Songs</span>
            </button>

            <button
              type="button"
              id="create-final-mixtape-btn"
              onClick={handleFinalCreate}
              disabled={isSaving || songs.length === 0}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-stone-400 text-white rounded-xl font-mono-retro text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md sm:shadow-lg shadow-emerald-900/20 hover:shadow-xl transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'Saving Changes...' : 'Recording Mixtape...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create & Share Mixtape'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
