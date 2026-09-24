import React, { useState, useRef, useEffect } from 'react';
import { CassetteCustomization, Mixtape, Song } from '../types';
import { CassetteTape } from './CassetteTape';
import { CassetteCustomizer } from './CassetteCustomizer';
import { SongInputForm } from './SongInputForm';
import { SongListManager } from './SongListManager';
import { JCardNote } from './JCardNote';
import { YouTubePlayer } from './YouTubePlayer';
import { MixtapeFlipCard } from './MixtapeFlipCard';
import { processImage, OptimizedImageResult } from '../utils/imageUpload';
import {
  uploadImageToCloudinary,
  isCloudinaryConfigured,
  getCloudinaryCustomConfig,
  setCloudinaryCustomConfig,
  clearCloudinaryCustomConfig
} from '../utils/cloudinaryUpload';
import { UploadProgress } from './UploadProgress';
import { CassetteSpool } from './MixtapeLoader';
import { auth } from '../lib/firebase';
import { ensureDraftMixtape, updateMixtapeArtwork } from '../utils/storage';
import { getThemeDetails } from '../utils/theme';
import {
  ArrowLeft,
  ArrowRight,
  Disc,
  Music,
  Palette,
  CheckCircle2,
  FileText,
  Eye,
  Check,
  RotateCw,
  Cloud,
  Settings,
  X
} from 'lucide-react';

interface CreateWizardProps {
  onCancel: () => void;
  onFinish: (mixtape: Mixtape) => Promise<Mixtape | void>;
  onPublishSuccess?: (mixtape: Mixtape) => void;
  initialMixtape?: Mixtape | null;
}

type WizardStep = 'tracklist' | 'theme' | 'details' | 'done';
type SaveStage = 'idle' | 'preparing' | 'uploading' | 'saving' | 'done' | 'error';

const DEFAULT_CUSTOMIZATION: CassetteCustomization = {
  color: 'vintage-ivory',
  pattern: 'none',
  labelStyle: 'editorial-serif',
  labelColor: '#faf4e6',
  stickers: [
    { id: 'st-init-1', type: 'stamp-editorial', xPercent: 18, yPercent: 22, rotationDeg: -2 },
    { id: 'st-init-2', type: 'barcode', xPercent: 82, yPercent: 20, rotationDeg: 0 }
  ],
  screwsColor: 'silver'
};

export const CreateWizard: React.FC<CreateWizardProps> = ({
  onCancel,
  onFinish,
  onPublishSuccess,
  initialMixtape
}) => {
  const isEditing = !!initialMixtape;

  // Stable mixtape ID and shareId for this session
  const [draftMixtapeId] = useState<string>(() => {
    return initialMixtape?.id || `tape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });
  const [draftShareId] = useState<string>(() => {
    return initialMixtape?.shareId || initialMixtape?.share_id || Math.random().toString(36).substring(2, 8);
  });

  const [currentStep, setCurrentStep] = useState<WizardStep>('tracklist');
  const [name, setName] = useState<string>(initialMixtape?.name ?? initialMixtape?.title ?? '');
  const [creatorName, setCreatorName] = useState<string>(initialMixtape?.creatorName ?? '');
  const [message, setMessage] = useState<string>(initialMixtape?.message ?? '');

  // 100% Local In-Memory Artwork State (NO Firebase Storage upload until Save/Publish!)
  const [pendingOptimizedImage, setPendingOptimizedImage] = useState<OptimizedImageResult | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(initialMixtape?.imageUrl || null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save / Publish Pipeline State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStage, setSaveStage] = useState<SaveStage>('idle');
  const [saveUploadPercent, setSaveUploadPercent] = useState<number>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isArtworkUploadError, setIsArtworkUploadError] = useState<boolean>(false);
  const activeUploadRef = useRef<{ cancel: () => void } | null>(null);

  // Cloudinary in-app settings state
  const [showCloudinaryModal, setShowCloudinaryModal] = useState<boolean>(false);
  const [customCloudName, setCustomCloudName] = useState<string>(() => getCloudinaryCustomConfig().cloudName);
  const [customPreset, setCustomPreset] = useState<string>(() => getCloudinaryCustomConfig().uploadPreset);
  const [hasCloudinaryConfig, setHasCloudinaryConfig] = useState<boolean>(() => isCloudinaryConfigured());
  const [cloudinaryModalMsg, setCloudinaryModalMsg] = useState<string | null>(null);

  const [customization, setCustomization] = useState<CassetteCustomization>(
    initialMixtape?.customization || DEFAULT_CUSTOMIZATION
  );
  const [songs, setSongs] = useState<Song[]>(initialMixtape?.songs || []);

  // Playback State
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = getThemeDetails(customization);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (pendingOptimizedImage?.previewUrl) {
        try {
          URL.revokeObjectURL(pendingOptimizedImage.previewUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [pendingOptimizedImage]);

  const steps: { id: WizardStep; num: string; label: string }[] = [
    { id: 'tracklist', num: '01', label: 'TRACKS' },
    { id: 'theme', num: '02', label: 'STYLE' },
    { id: 'details', num: '03', label: 'DETAILS' },
    { id: 'done', num: '04', label: 'DONE' }
  ];

  // Song handlers
  const handleAddSong = (newSongData: Omit<Song, 'id' | 'position'>) => {
    if (songs.length >= 5) return;
    const newSong: Song = {
      ...newSongData,
      id: `song-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  // ============================================================================
  // Image Selection: Client-side resize and compression ONLY. NO STORAGE UPLOAD!
  // ============================================================================
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }

    setErrorMsg(null);
    setImageError(null);
    setIsProcessingImage(true);

    try {
      // Discard previous local preview ObjectURL to prevent memory leaks
      if (pendingOptimizedImage?.previewUrl) {
        try {
          URL.revokeObjectURL(pendingOptimizedImage.previewUrl);
        } catch {
          // ignore
        }
      }

      // Resize + Compress locally in browser. NO Firebase Storage upload yet!
      const result = await processImage(file);
      setPendingOptimizedImage(result);
      setImagePreviewUrl(result.previewUrl);
      setImageRemoved(false);
    } catch (err: any) {
      console.error('Image processing failed:', err);
      setImageError(err?.message || 'Could not process image. Please try another image.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (pendingOptimizedImage?.previewUrl) {
      try {
        URL.revokeObjectURL(pendingOptimizedImage.previewUrl);
      } catch {
        // ignore
      }
    }
    setPendingOptimizedImage(null);
    setImagePreviewUrl(null);
    setImageRemoved(true);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // SAVE / PUBLISH FLOW: Executes artwork upload and saves Mixtape
  // ============================================================================
  const handleFinalCreate = async (skipArtwork: boolean = false) => {
    // 1. Validate the mixtape data
    if (songs.length === 0) {
      setErrorMsg('Please add at least 1 song before creating your mixtape.');
      setCurrentStep('tracklist');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setErrorMsg('Please sign in to save your mixtape.');
      return;
    }

    // Disable duplicate Save/Publish actions while running
    if (isSaving || (saveStage !== 'idle' && saveStage !== 'error')) {
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSaveError(null);
    setIsArtworkUploadError(false);
    setSaveStage('preparing');
    setSaveUploadPercent(0);

    const targetId = draftMixtapeId;
    const permanentShareId = draftShareId;

    try {
      // 2 & 3. Create the initial Firestore mixtape document for ownership
      await ensureDraftMixtape(targetId, permanentShareId, {
        name,
        creatorName,
        message,
        customization,
        songs
      });

      let finalImageUrl: string | null = initialMixtape?.imageUrl || null;
      if (imageRemoved || skipArtwork) {
        finalImageUrl = null;
      }

      // 4. Upload the already-optimized image Blob to Cloudinary / server (ONLY NOW AT SAVE TIME)
      if (pendingOptimizedImage && !skipArtwork) {
        setSaveStage('uploading');
        setSaveUploadPercent(0);

        try {
          const uploadTask = uploadImageToCloudinary(
            pendingOptimizedImage.blob,
            (progress) => {
              // Real bytesTransferred / totalBytes percentage from XHR upload
              setSaveUploadPercent(progress.percent);
            }
          );
          activeUploadRef.current = uploadTask;

          // 5 & 6. Track REAL progress and get Cloudinary secure_url
          const result = await uploadTask.promise;
          activeUploadRef.current = null;
          finalImageUrl = result.secure_url;
          setSaveUploadPercent(100);

          // 7. Update the Firestore mixtape document with Cloudinary secure_url
          await updateMixtapeArtwork(targetId, result.secure_url);
        } catch (uploadErr: any) {
          activeUploadRef.current = null;
          setIsArtworkUploadError(true);
          throw uploadErr;
        }
      }

      // 8 & 9. Save/finish the remaining mixtape data & tracks
      setSaveStage('saving');

      const finalMixtape: Mixtape = {
        ...initialMixtape,
        id: targetId,
        ownerId: currentUser.uid,
        shareId: permanentShareId,
        share_id: permanentShareId,
        name: name.trim() || 'Untitled Mixtape',
        title: name.trim() || 'Untitled Mixtape',
        creatorName: creatorName.trim() || undefined,
        message: message.trim() || undefined,
        imageUrl: finalImageUrl,
        customization,
        songs,
        createdAt: initialMixtape?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 10 & 11. Save/commit to Firestore and display done state
      const savedTape = await onFinish(finalMixtape);
      setSaveStage('done');

      if (!isEditing) {
        // Allow user to clearly see "MIXTAPE PUBLISHED" and emerald completion bar
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (onPublishSuccess) {
          onPublishSuccess((savedTape as Mixtape) || finalMixtape);
        }
      }
    } catch (err: any) {
      console.warn('Save mixtape encountered an issue:', err);
      activeUploadRef.current = null;
      const msg = err?.message || 'Failed to save mixtape. Please try again.';
      setSaveError(msg);
      setSaveStage('error');
      setErrorMsg(msg);
    }
  };

  const currentSong = songs[currentSongIndex] || null;

  return (
    <div className="w-full max-w-[440px] sm:max-w-md mx-auto px-4 py-3 sm:py-5 flex flex-col pb-16 animate-fadeIn">
      {/* Top Header: Brand name & Cancel / Close button */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/80">
        <div className="flex items-center gap-2">
          <span className="font-azurio font-extrabold text-sm sm:text-base tracking-wider uppercase text-stone-900">
            IT'S MY PLAYLIST
          </span>
          {isEditing && (
            <span className="text-[10px] font-remixa bg-orange-100 text-orange-900 font-bold px-2 py-0.5 rounded-full">
              EDITING
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="text-xs font-goga font-semibold text-stone-500 hover:text-stone-800 transition py-1 px-2.5 rounded-lg border border-stone-200 hover:border-stone-300 bg-white cursor-pointer disabled:opacity-50"
        >
          {isEditing ? 'Close' : 'Cancel'}
        </button>
      </div>

      {/* Modern Minimal Step Indicator: 01 ── 02 ── 03 ── 04 */}
      <nav aria-label="Wizard Steps" className="w-full px-1 py-1 mb-4">
        <ol className="flex items-center justify-between w-full">
          {steps.map((s, idx) => {
            const stepOrder: Record<WizardStep, number> = {
              tracklist: 0,
              theme: 1,
              details: 2,
              done: 3
            };
            const currentIdx = stepOrder[currentStep];
            const isCompleted = currentIdx > idx;
            const isCurrent = currentStep === s.id;
            const canJump = !isSaving && (isCompleted || idx <= currentIdx);

            return (
              <React.Fragment key={s.id}>
                <li className="flex flex-col items-center shrink-0">
                  <button
                    type="button"
                    disabled={!canJump}
                    onClick={() => canJump && setCurrentStep(s.id)}
                    className={`flex flex-col items-center transition-all ${
                      canJump ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-remixa font-bold transition-all ${
                        isCurrent
                          ? 'bg-orange-600 text-white ring-2 ring-orange-200'
                          : isCompleted
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-400 border border-stone-200'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-goga tracking-wider uppercase font-semibold mt-1 transition-colors ${
                        isCurrent
                          ? 'text-orange-600 font-bold'
                          : isCompleted
                          ? 'text-stone-800'
                          : 'text-stone-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>

                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-[1px] mx-1.5 sm:mx-2.5 transition-colors ${
                      currentIdx > idx ? 'bg-stone-800' : 'bg-stone-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>

      {/* Top Banner Error Notification */}
      {errorMsg && saveStage !== 'error' && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* STEP 1: Tracklist */}
      {currentStep === 'tracklist' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-200/80 mb-1">
            <div>
              <h2 className="text-base sm:text-lg font-azurio font-bold text-stone-900 tracking-tight uppercase">
                ADD YOUR TRACKS
              </h2>
              <p className="text-xs font-goga text-stone-500 mt-0.5">
                Choose up to 5 songs for your tape.
              </p>
            </div>
            {/* Track Counter in exact badge style */}
            <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200/90 font-remixa font-bold text-xs text-orange-900 tracking-wider tabular-nums shrink-0">
              {songs.length} / 5 TRACKS
            </span>
          </div>

          <SongInputForm
            onAddSong={handleAddSong}
            currentSongCount={songs.length}
            maxSongs={5}
          />

          <SongListManager
            songs={songs}
            onRemoveSong={handleRemoveSong}
            onMoveSong={handleMoveSong}
            maxSongs={5}
          />

          <div className="pt-2">
            <button
              type="button"
              id="step-tracklist-next-btn"
              disabled={songs.length === 0}
              onClick={() => setCurrentStep('theme')}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl text-xs sm:text-sm font-goga font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>NEXT: STYLE →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Theme / Customization */}
      {currentStep === 'theme' && (
        <div className="space-y-3">
          <div className="text-left mb-1">
            <h2 className="text-base sm:text-lg font-azurio font-bold text-stone-900 tracking-tight uppercase">
              CHOOSE YOUR STYLE
            </h2>
            <p className="text-xs font-goga text-stone-500 mt-0.5">
              Select shell colors, retro patterns, label style, and stickers.
            </p>
          </div>

          {/* Interactive Live Cassette Preview */}
          <div className="flex justify-center my-1">
            <div className="w-full max-w-[340px] rounded-2xl overflow-hidden bg-[#FAF7F0] p-1 shadow-none border-0">
              <CassetteTape
                customization={customization}
                name={name || 'Untitled Mixtape'}
                creatorName={creatorName}
                side="A"
                noShadow={true}
                className="shadow-none border-0"
              />
            </div>
          </div>

          <CassetteCustomizer customization={customization} onChange={setCustomization} />

          <div className="pt-2 flex items-center justify-between border-t border-stone-200">
            <button
              type="button"
              onClick={() => setCurrentStep('tracklist')}
              className="px-4 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-goga font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>TRACKS</span>
            </button>
            <button
              type="button"
              id="step-theme-next-btn"
              onClick={() => setCurrentStep('details')}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-goga font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>NEXT: DETAILS →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Details & Artwork (No network upload happens here!) */}
      {currentStep === 'details' && (
        <div className="space-y-3">
          <div className="text-left mb-1">
            <h2 className="text-base sm:text-lg font-azurio font-bold text-stone-900 tracking-tight uppercase">
              TAPE DETAILS
            </h2>
            <p className="text-xs font-goga text-stone-500 mt-0.5">
              Personalize your cassette title, curator name, and dedication note.
            </p>
          </div>

          {/* Hidden File Input for Artwork selection */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={isProcessingImage || isSaving}
              onChange={handleImageSelect}
              className="hidden"
              id="mixtape-image-file-input"
            />
            <UploadProgress
              status={
                imageError
                  ? 'error'
                  : isProcessingImage
                  ? 'processing'
                  : imagePreviewUrl
                  ? 'ready'
                  : 'idle'
              }
              originalSizeBytes={pendingOptimizedImage?.originalSizeBytes}
              optimizedSizeBytes={pendingOptimizedImage?.optimizedSizeBytes}
              customization={customization}
              previewUrl={imagePreviewUrl}
              errorMessage={imageError}
              onPickImage={() => fileInputRef.current?.click()}
              onChangeImage={() => fileInputRef.current?.click()}
              onRemoveImage={handleRemoveImage}
              disabled={isProcessingImage || isSaving}
            />

            {/* Cloudinary Status & Config Button */}
            <div className="flex items-center justify-between px-1 text-[11px] font-goga">
              <span className="flex items-center gap-1.5 text-stone-500">
                <Cloud className={`w-3.5 h-3.5 ${hasCloudinaryConfig ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span>
                  {hasCloudinaryConfig
                    ? 'Cloudinary: Connected (Direct Browser Upload)'
                    : 'Cloudinary: Not configured (Local storage active)'}
                </span>
              </span>
              <button
                type="button"
                id="open-cloudinary-settings-btn"
                onClick={() => {
                  setCloudinaryModalMsg(null);
                  setShowCloudinaryModal(true);
                }}
                className="text-stone-600 hover:text-stone-900 underline flex items-center gap-1 cursor-pointer font-goga"
              >
                <Settings className="w-3 h-3" />
                <span>{hasCloudinaryConfig ? 'Settings' : 'Configure'}</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="mixtape-name-input"
              className="block text-xs font-goga font-bold uppercase tracking-wider text-stone-700 mb-1"
            >
              Mixtape Title
            </label>
            <input
              type="text"
              id="mixtape-name-input"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your mixtape a title"
              className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#E8E2D8] rounded-xl text-stone-900 font-azurio font-bold text-base sm:text-lg focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 tracking-tight"
            />
            <span className="text-[10px] font-remixa text-stone-400 block text-right mt-1">
              {name.length}/40 characters
            </span>
          </div>

          <div>
            <label
              htmlFor="creator-name-input"
              className="block text-xs font-goga font-bold uppercase tracking-wider text-stone-700 mb-1"
            >
              Curator Name (Optional)
            </label>
            <input
              type="text"
              id="creator-name-input"
              value={creatorName}
              maxLength={30}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#E8E2D8] rounded-xl text-xs sm:text-sm font-goga text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400"
            />
          </div>

          <div>
            <label
              htmlFor="mixtape-message-input"
              className="block text-xs font-goga font-bold uppercase tracking-wider text-stone-700 mb-1"
            >
              J-Card Dedication Note (Optional)
            </label>
            <textarea
              id="mixtape-message-input"
              rows={3}
              value={message}
              maxLength={250}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a dedication..."
              className="w-full px-3 py-2 bg-[#FAF7F0] border border-[#E8E2D8] rounded-xl text-xs sm:text-sm font-goga text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400"
            />
            <span className="text-[10px] font-remixa text-stone-400 block text-right mt-1">
              {message.length}/250 characters
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-200">
            <button
              type="button"
              onClick={() => setCurrentStep('theme')}
              className="px-4 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-goga font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>STYLE</span>
            </button>
            <button
              type="button"
              id="step-details-next-btn"
              disabled={isProcessingImage}
              onClick={() => setCurrentStep('done')}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 text-white rounded-xl text-xs font-goga font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>NEXT: DONE →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Done / Full Interactive Review */}
      {currentStep === 'done' && (
        <div className="space-y-3">
          <div className="text-left mb-1">
            <h2 className="text-base sm:text-lg font-azurio font-bold text-stone-900 tracking-tight uppercase">
              REVIEW YOUR TAPE
            </h2>
            <p className="text-xs font-goga text-stone-500 mt-0.5">
              Test playback, flip to read the J-card, and publish your mixtape.
            </p>
          </div>

          {/* Interactive 3D Flip Card */}
          <div className="flex justify-center my-1">
            <div className="w-full max-w-[340px] rounded-2xl overflow-hidden bg-[#FAF7F0] p-1 shadow-none border-0">
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
                    imageUrl={imagePreviewUrl}
                    songs={songs}
                    currentSongIndex={currentSongIndex}
                    onSelectSong={(idx) => {
                      setCurrentSongIndex(idx);
                      setIsPlaying(true);
                    }}
                  />
                }
              />
            </div>
          </div>

          {/* YouTube Audio Player Monitor */}
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

          {/* Final Action Bar */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              id="preview-back-details-btn"
              disabled={isSaving}
              onClick={() => setCurrentStep('details')}
              className="px-4 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-goga font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>DETAILS</span>
            </button>

            <button
              type="button"
              id="create-final-mixtape-btn"
              onClick={() => handleFinalCreate(false)}
              disabled={isSaving || isProcessingImage || songs.length === 0}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-goga font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <CassetteSpool size={16} hubColor="#faf4e6" spinning={true} />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{isEditing ? 'SAVE CHANGES' : 'PUBLISH MIXTAPE'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* THEMED SAVE / PUBLISH PROGRESS MODAL (Only when user presses Save/Publish)   */}
      {/* ============================================================================ */}
      {isSaving && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`relative max-w-sm w-full rounded-2xl border ${theme.shellBorder} bg-[#FAF7F0] p-6 shadow-2xl overflow-hidden`}
          >
            {/* Subtle vintage texture overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(45deg,#000_0,#000_2px,transparent_2px,transparent_8px)]" />

            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              {/* Dual Cassette Spools */}
              <div className="flex items-center justify-center gap-4">
                <CassetteSpool
                  size={32}
                  hubColor={theme.reelHubColor}
                  spinning={saveStage !== 'done' && saveStage !== 'error'}
                />
                <CassetteSpool
                  size={32}
                  hubColor={theme.reelHubColor}
                  spinning={saveStage !== 'done' && saveStage !== 'error'}
                />
              </div>

              <div>
                <h3 className={`font-mono-retro font-bold text-sm uppercase tracking-wider ${theme.textColor}`}>
                  {saveStage === 'preparing' && 'PREPARING YOUR MIXTAPE...'}
                  {saveStage === 'uploading' && 'UPLOADING ARTWORK'}
                  {saveStage === 'saving' && (isEditing ? 'SAVING CHANGES...' : 'SAVING MIXTAPE...')}
                  {saveStage === 'done' && (isEditing ? 'CHANGES SAVED' : 'MIXTAPE PUBLISHED')}
                  {saveStage === 'error' && (isArtworkUploadError ? 'ARTWORK UPLOAD FAILED' : 'SAVE FAILED')}
                </h3>
                <p className="text-xs font-sans-ui text-stone-500 mt-1">
                  {saveStage === 'preparing' && 'Validating and setting up your mixtape...'}
                  {saveStage === 'uploading' && `${saveUploadPercent}% transferred`}
                  {saveStage === 'saving' && 'Writing tracks and dedication...'}
                  {saveStage === 'done' && (isEditing ? 'Your changes have been saved.' : 'Your tape is ready to share!')}
                  {saveStage === 'error' && (saveError || 'An error occurred during save.')}
                </p>
              </div>

              {/* Progress Bar with Real Upload Percent */}
              <div className="w-full bg-stone-200/90 rounded-md overflow-hidden p-0.5 border border-stone-300">
                {saveStage === 'uploading' ? (
                  <div
                    className="h-3 rounded-xs transition-[width] duration-150 ease-out"
                    style={{
                      width: `${saveUploadPercent}%`,
                      backgroundColor: theme.primaryHex,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 8px)'
                    }}
                  />
                ) : saveStage === 'done' ? (
                  <div
                    className="h-3 rounded-xs bg-emerald-600 transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                ) : saveStage === 'error' ? (
                  <div className="h-3 rounded-xs bg-rose-500" style={{ width: '100%' }} />
                ) : (
                  <div
                    className="h-3 rounded-xs animate-pulse opacity-80"
                    style={{
                      width: '100%',
                      backgroundColor: theme.primaryHex,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 12px)'
                    }}
                  />
                )}
              </div>

              {saveStage === 'uploading' && (
                <div className="text-[11px] font-mono-retro font-bold text-stone-600">
                  {saveUploadPercent}%
                </div>
              )}

              {saveStage === 'error' && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <button
                    type="button"
                    id="retry-save-btn"
                    onClick={() => handleFinalCreate(false)}
                    className="px-4 py-1.5 text-xs font-mono-retro font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>TRY AGAIN</span>
                  </button>

                  {(isArtworkUploadError || pendingOptimizedImage) && (
                    <button
                      type="button"
                      id="save-without-artwork-btn"
                      onClick={() => handleFinalCreate(true)}
                      className="px-3.5 py-1.5 text-xs font-mono-retro font-bold text-orange-900 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded-lg cursor-pointer shadow-2xs"
                    >
                      SAVE WITHOUT ARTWORK
                    </button>
                  )}

                  {isArtworkUploadError && (
                    <button
                      type="button"
                      id="configure-cloudinary-err-btn"
                      onClick={() => {
                        setShowCloudinaryModal(true);
                      }}
                      className="px-3.5 py-1.5 text-xs font-mono-retro font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer shadow-2xs inline-flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>CONFIG CLOUDINARY</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="dismiss-save-error-btn"
                    onClick={() => {
                      setIsSaving(false);
                      setSaveStage('idle');
                    }}
                    className="px-3.5 py-1.5 text-xs font-mono-retro font-bold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 cursor-pointer shadow-2xs"
                  >
                    DISMISS
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloudinary Configuration Modal */}
      {showCloudinaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#FAF7F0] border-2 border-stone-300 rounded-2xl p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCloudinaryModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif-display text-base font-bold text-stone-900">
                  Cloudinary Configuration
                </h3>
                <p className="text-[11px] font-sans-ui text-stone-500">
                  Direct browser unsigned image upload
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <div>
                <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Cloud Name (VITE_CLOUDINARY_CLOUD_NAME)
                </label>
                <input
                  type="text"
                  value={customCloudName}
                  onChange={(e) => setCustomCloudName(e.target.value)}
                  placeholder="e.g. your-cloud-name"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono-retro text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-retro font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Unsigned Upload Preset (VITE_CLOUDINARY_UPLOAD_PRESET)
                </label>
                <input
                  type="text"
                  value={customPreset}
                  onChange={(e) => setCustomPreset(e.target.value)}
                  placeholder="e.g. ml_default"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono-retro text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
                <p className="text-[10px] text-stone-500 mt-1 font-sans-ui leading-tight">
                  In Cloudinary Console &gt; Settings &gt; Upload &gt; Upload presets, add an unsigned preset. Never use your API Secret.
                </p>
              </div>

              {cloudinaryModalMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-sans-ui">
                  {cloudinaryModalMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  clearCloudinaryCustomConfig();
                  setCustomCloudName('');
                  setCustomPreset('');
                  setHasCloudinaryConfig(isCloudinaryConfigured());
                  setCloudinaryModalMsg('Custom Cloudinary credentials cleared. Local server storage fallback will be used.');
                }}
                className="text-[11px] font-mono-retro text-stone-500 hover:text-red-700 underline cursor-pointer"
              >
                Clear
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloudinaryModal(false)}
                  className="px-3 py-1.5 text-xs font-mono-retro text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  id="save-cloudinary-config-btn"
                  onClick={() => {
                    if (!customCloudName.trim() || !customPreset.trim()) {
                      setCloudinaryModalMsg('Please enter both Cloud Name and Unsigned Preset, or clear to use local server storage.');
                      return;
                    }
                    setCloudinaryCustomConfig(customCloudName, customPreset);
                    setHasCloudinaryConfig(true);
                    setCloudinaryModalMsg('Cloudinary settings saved! Direct browser upload is active.');
                    setTimeout(() => {
                      setShowCloudinaryModal(false);
                    }, 1200);
                  }}
                  className="px-4 py-1.5 text-xs font-mono-retro font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer shadow-2xs"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
