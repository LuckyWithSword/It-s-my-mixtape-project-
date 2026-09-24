import { CassetteCustomization } from '../types';
import { SHELL_COLORS } from '../components/CassetteTape';

export interface ThemeColors {
  name: string;
  shellBg: string;
  shellBorder: string;
  shellAccent: string;
  shellShadow: string;
  labelBg: string;
  labelBgColor: string;
  primaryHex: string;
  accentHex: string;
  textColor: string;
  subtextColor: string;
  barFill: string;
  barTrack: string;
  fontClass: string;
  reelHubColor: string;
}

const THEME_MAP: Record<string, Partial<ThemeColors>> = {
  'vintage-ivory': {
    primaryHex: '#8c6d48',
    accentHex: '#5a4838',
    textColor: 'text-stone-800',
    subtextColor: 'text-stone-600',
    barFill: 'bg-[#8c6d48]',
    barTrack: 'bg-[#ebdcc4]',
    reelHubColor: '#faf4e6'
  },
  'neon-magenta': {
    primaryHex: '#e03d7c',
    accentHex: '#b5265e',
    textColor: 'text-pink-950',
    subtextColor: 'text-pink-800',
    barFill: 'bg-[#e03d7c]',
    barTrack: 'bg-[#fcdde9]',
    reelHubColor: '#fff0f5'
  },
  'synth-teal': {
    primaryHex: '#188a8d',
    accentHex: '#0f6063',
    textColor: 'text-teal-950',
    subtextColor: 'text-teal-800',
    barFill: 'bg-[#188a8d]',
    barTrack: 'bg-[#d2f3f1]',
    reelHubColor: '#e6faf8'
  },
  'sunset-amber': {
    primaryHex: '#ea7035',
    accentHex: '#bd4e1a',
    textColor: 'text-amber-950',
    subtextColor: 'text-amber-800',
    barFill: 'bg-[#ea7035]',
    barTrack: 'bg-[#fedecb]',
    reelHubColor: '#fff7ed'
  },
  'matte-black': {
    primaryHex: '#292828',
    accentHex: '#181818',
    textColor: 'text-stone-900',
    subtextColor: 'text-stone-600',
    barFill: 'bg-[#292828]',
    barTrack: 'bg-stone-300',
    reelHubColor: '#f4f4f4'
  },
  'pastel-pink': {
    primaryHex: '#be5b6a',
    accentHex: '#6b4742',
    textColor: 'text-rose-950',
    subtextColor: 'text-rose-800',
    barFill: 'bg-[#be5b6a]',
    barTrack: 'bg-[#fae3dd]',
    reelHubColor: '#fdf6f5'
  },
  'matcha-green': {
    primaryHex: '#5a6842',
    accentHex: '#434b35',
    textColor: 'text-stone-900',
    subtextColor: 'text-stone-700',
    barFill: 'bg-[#5a6842]',
    barTrack: 'bg-[#e5ebd9]',
    reelHubColor: '#f8faf4'
  },
  'lavender-mist': {
    primaryHex: '#7c63a8',
    accentHex: '#3b2d52',
    textColor: 'text-purple-950',
    subtextColor: 'text-purple-800',
    barFill: 'bg-[#7c63a8]',
    barTrack: 'bg-[#e8dff4]',
    reelHubColor: '#f8f5fc'
  },
  'sky-blue': {
    primaryHex: '#2563eb',
    accentHex: '#344d57',
    textColor: 'text-sky-950',
    subtextColor: 'text-sky-800',
    barFill: 'bg-[#2563eb]',
    barTrack: 'bg-[#d6eaf3]',
    reelHubColor: '#f4fafc'
  },
  'cherry-red': {
    primaryHex: '#c52b2b',
    accentHex: '#991919',
    textColor: 'text-red-950',
    subtextColor: 'text-red-800',
    barFill: 'bg-[#c52b2b]',
    barTrack: 'bg-[#fcdada]',
    reelHubColor: '#fff5f5'
  },
  'clear-smoke': {
    primaryHex: '#42484d',
    accentHex: '#1b1e21',
    textColor: 'text-slate-900',
    subtextColor: 'text-slate-700',
    barFill: 'bg-[#42484d]',
    barTrack: 'bg-[#d5dde2]',
    reelHubColor: '#f0f3f5'
  }
};

export function getLabelFontClass(labelStyle?: string): string {
  switch (labelStyle) {
    case 'editorial-serif':
      return 'font-serif-display';
    case 'marker':
      return 'font-marker';
    case 'handwritten':
      return 'font-handwriting';
    case 'typewriter':
      return 'font-mono-retro';
    case 'bold-mono':
      return 'font-mono-retro font-bold';
    default:
      return 'font-mono-retro';
  }
}

export function getThemeDetails(customization?: CassetteCustomization | null): ThemeColors {
  const colorKey = customization?.color || 'vintage-ivory';
  const shell = SHELL_COLORS[colorKey] || SHELL_COLORS['vintage-ivory'];
  const specific = THEME_MAP[colorKey] || THEME_MAP['vintage-ivory'];
  const fontClass = getLabelFontClass(customization?.labelStyle);

  const customLabelColor = customization?.labelColor;

  return {
    name: colorKey,
    shellBg: shell.bg,
    shellBorder: shell.border,
    shellAccent: shell.accent,
    shellShadow: shell.shadow,
    labelBg: shell.labelBg,
    labelBgColor: customLabelColor || specific.reelHubColor || '#faf4e6',
    primaryHex: specific.primaryHex || '#8c6d48',
    accentHex: specific.accentHex || '#5a4838',
    textColor: specific.textColor || 'text-stone-800',
    subtextColor: specific.subtextColor || 'text-stone-600',
    barFill: specific.barFill || 'bg-[#8c6d48]',
    barTrack: specific.barTrack || 'bg-[#ebdcc4]',
    fontClass,
    reelHubColor: customLabelColor || specific.reelHubColor || '#ffffff'
  };
}
