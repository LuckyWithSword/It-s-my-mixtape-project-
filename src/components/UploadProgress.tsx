import React from 'react';
import { CassetteCustomization } from '../types';
import { getThemeDetails } from '../utils/theme';
import { CassetteSpool } from './MixtapeLoader';
import { formatBytes } from '../utils/imageUpload';
import { Camera, Trash2, RotateCw, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export type UploadStatus = 'idle' | 'processing' | 'ready' | 'uploaded' | 'uploading' | 'error';

interface UploadProgressProps {
  status: UploadStatus;
  progress?: number;
  originalSizeBytes?: number | null;
  optimizedSizeBytes?: number | null;
  customization?: CassetteCustomization | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  onPickImage: () => void;
  onChangeImage: () => void;
  onRemoveImage: () => void;
  onRetryUpload?: () => void;
  disabled?: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  status,
  originalSizeBytes,
  optimizedSizeBytes,
  customization,
  previewUrl,
  errorMessage,
  onPickImage,
  onChangeImage,
  onRemoveImage,
  onRetryUpload,
  disabled = false
}) => {
  const theme = getThemeDetails(customization);

  // 1. IDLE STATE: "ADD IMAGE (OPTIONAL)"
  if (status === 'idle' || (!previewUrl && status !== 'processing' && status !== 'error')) {
    return (
      <div className="space-y-1.5 select-none">
        <label className="block text-xs font-mono-retro font-bold uppercase tracking-[0.2em] text-stone-700">
          ADD IMAGE (OPTIONAL)
        </label>
        <button
          type="button"
          id="add-image-box-btn"
          disabled={disabled}
          onClick={onPickImage}
          className="w-full border-2 border-dashed border-stone-300 hover:border-[#F54900]/80 bg-[#FAF7F0] hover:bg-[#F4EFE6] rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition group disabled:opacity-50 disabled:cursor-not-allowed shadow-soft-card"
        >
          <div className="w-10 h-10 rounded-full bg-stone-200/70 group-hover:bg-orange-100 flex items-center justify-center text-stone-500 group-hover:text-[#F54900] transition">
            <Camera className="w-5 h-5" />
          </div>
          <div className="text-center">
            <span className="font-mono-retro font-bold text-xs uppercase tracking-wider text-stone-700 group-hover:text-orange-900 block">
              ADD IMAGE
            </span>
            <span className="text-[11px] font-sans text-stone-400 mt-0.5 block">
              Tap to choose an image from your device or gallery
            </span>
          </div>
        </button>
      </div>
    );
  }

  // 2. CLIENT-SIDE OPTIMIZING STATE (Local resize & compression in browser, NO network upload)
  if (status === 'processing') {
    return (
      <div className="space-y-1.5 select-none">
        <label className="block text-xs font-mono-retro font-bold uppercase tracking-[0.2em] text-stone-700">
          ADD IMAGE (OPTIONAL)
        </label>
        <div
          className={`relative rounded-xl border p-3.5 sm:p-4 shadow-soft-card overflow-hidden transition-all bg-[#FAF7F0] ${theme.shellBorder}`}
        >
          <div className="relative z-10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CassetteSpool size={20} hubColor={theme.reelHubColor} spinning={true} />
                <span className={`text-xs font-mono-retro font-bold uppercase tracking-wider ${theme.textColor}`}>
                  OPTIMIZING ARTWORK...
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono-retro text-[#F54900] animate-pulse font-bold">
                <Sparkles className="w-3 h-3" />
                RESIZING
              </span>
            </div>

            <div className="relative w-full h-3 bg-stone-200/90 rounded-md overflow-hidden p-0.5 border border-stone-300">
              <div
                className="h-full rounded-xs animate-pulse opacity-80"
                style={{
                  width: '100%',
                  backgroundColor: theme.primaryHex,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 12px)'
                }}
              />
            </div>

            <div className="text-[11px] font-sans text-stone-500">
              {originalSizeBytes
                ? `Compressing ${formatBytes(originalSizeBytes)} photo locally...`
                : 'Resizing & optimizing for cassette...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. FAILED/ERROR STATE
  if (status === 'error') {
    return (
      <div className="space-y-1.5 select-none">
        <label className="block text-xs font-mono-retro font-bold uppercase tracking-[0.2em] text-stone-700">
          ADD IMAGE (OPTIONAL)
        </label>
        <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
          {previewUrl && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-stone-200 border border-rose-300 opacity-60 shrink-0">
              <img src={previewUrl} alt="Failed preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left gap-1">
            <div className="flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-mono-retro font-bold uppercase tracking-wider">
                IMAGE ERROR
              </span>
            </div>
            <p className="text-[11px] font-sans text-rose-600">
              {errorMessage || 'Could not process image. Please try again.'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              {onRetryUpload && (
                <button
                  type="button"
                  id="try-again-upload-btn"
                  onClick={onRetryUpload}
                  className="px-3 py-1.5 text-[11px] font-mono-retro font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>TRY AGAIN</span>
                </button>
              )}

              <button
                type="button"
                id="remove-failed-image-btn"
                onClick={onRemoveImage}
                className="px-3 py-1.5 text-[11px] font-mono-retro font-semibold text-stone-600 hover:text-stone-800 bg-white border border-stone-300 rounded-md transition cursor-pointer inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3 text-stone-500" />
                <span>REMOVE IMAGE</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. ARTWORK READY STATE (Optimized image preview stored in local state, ready for final Save)
  const hasReduction =
    originalSizeBytes &&
    optimizedSizeBytes &&
    originalSizeBytes > optimizedSizeBytes;

  const reductionPercent = hasReduction
    ? Math.round((1 - optimizedSizeBytes / originalSizeBytes) * 100)
    : 0;

  return (
    <div className="space-y-1.5 select-none">
      <label className="block text-xs font-mono-retro font-bold uppercase tracking-[0.2em] text-stone-700">
        ADD IMAGE (OPTIONAL)
      </label>
      <div className="bg-[#FAF7F0] border border-[#E8E2D8] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 shadow-soft-card">
        {/* Instant Image Preview */}
        {previewUrl && (
          <div className="relative w-28 h-28 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-stone-200 border border-stone-300 shrink-0">
            <img
              src={previewUrl}
              alt="Mixtape Artwork Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Image Actions, Success Badge & File Size Feedback */}
        <div className="flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left gap-2 w-full">
          <div>
            <div className="inline-flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-mono-retro font-bold uppercase tracking-wide">
                ARTWORK READY
              </span>
            </div>

            {/* File Size Feedback */}
            {hasReduction ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-mono-retro text-stone-600">
                <span className="text-stone-400 line-through">
                  {formatBytes(originalSizeBytes)}
                </span>
                <span>→</span>
                <span className="font-bold text-stone-800">
                  {formatBytes(optimizedSizeBytes)}
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-sm text-[10px] font-bold">
                  -{reductionPercent}%
                </span>
              </div>
            ) : optimizedSizeBytes ? (
              <span className="text-[11px] font-mono-retro text-stone-600 block mt-0.5">
                Optimized: {formatBytes(optimizedSizeBytes)}
              </span>
            ) : (
              <span className="text-[11px] font-sans text-stone-500 block mt-0.5">
                Featured as artwork on your shared mixtape.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              id="change-image-btn"
              onClick={onChangeImage}
              disabled={disabled}
              className="px-2.5 py-1 text-[11px] font-mono-retro font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-md transition cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Camera className="w-3 h-3 text-stone-500" />
              <span>CHANGE IMAGE</span>
            </button>

            <button
              type="button"
              id="remove-image-btn"
              onClick={onRemoveImage}
              disabled={disabled}
              className="px-2.5 py-1 text-[11px] font-mono-retro font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>REMOVE IMAGE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
