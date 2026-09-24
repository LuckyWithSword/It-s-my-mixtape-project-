export interface Song {
  id: string;
  youtubeId: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  position: number;
}

export type CassetteColor = 
  | 'vintage-ivory'
  | 'neon-magenta'
  | 'synth-teal'
  | 'sunset-amber'
  | 'matte-black'
  | 'lavender-mist'
  | 'cherry-red'
  | 'clear-smoke'
  | 'pastel-pink'
  | 'matcha-green'
  | 'sky-blue';

export type CassettePattern = 
  | 'none'
  | 'retro-stripes'
  | 'synth-grid'
  | 'memphis'
  | 'sound-waves'
  | 'polka-dots';

export type LabelStyle = 
  | 'marker'
  | 'handwritten'
  | 'typewriter'
  | 'bold-mono'
  | 'editorial-serif';

export type StickerType = 
  | 'mix-vol-1'
  | 'heart'
  | 'side-a'
  | 'do-not-erase'
  | 'lo-fi'
  | 'sparkles'
  | 'retro-smile'
  | 'for-you'
  | 'audio-cassette'
  | 'rainbow'
  | 'stamp-editorial'
  | 'tape-lines'
  | 'star'
  | 'barcode';

export interface StickerItem {
  id: string;
  type: StickerType;
  xPercent: number; // 0-100%
  yPercent: number; // 0-100%
  rotationDeg: number;
}

export interface CassetteCustomization {
  color: CassetteColor;
  pattern: CassettePattern;
  labelStyle: LabelStyle;
  labelColor: string; // e.g. '#ffffff', '#fef3c7', '#fdf2f8'
  stickers: StickerItem[];
  screwsColor: 'silver' | 'gold' | 'black';
}

export interface Mixtape {
  id: string;
  ownerId?: string;
  name: string;
  title?: string;
  shareId?: string;
  share_id?: string;
  message?: string;
  creatorName?: string;
  imageUrl?: string | null;
  customization: CassetteCustomization;
  songs: Song[];
  createdAt: string;
  updatedAt?: string;
}

export type AppView = 
  | 'landing'
  | 'account'
  | 'create'
  | 'edit'
  | 'preview'
  | 'share-success'
  | 'listen'
  | 'dashboard';

