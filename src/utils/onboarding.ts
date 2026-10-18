import { isValidTagId } from '../services/nfc/tagUtils';
import { IconName } from '../components/Icon';

export interface BrickLocation {
  key: string;
  label: string;
  icon: IconName;
}

export const LOCATIONS: BrickLocation[] = [
  { key: 'desk', label: 'Desk', icon: 'monitor' },
  { key: 'bedroom', label: 'Bedroom', icon: 'bed' },
  { key: 'office', label: 'Office', icon: 'building' },
  { key: 'kitchen', label: 'Kitchen', icon: 'coffee' },
  { key: 'studio', label: 'Studio', icon: 'music' },
  { key: 'car', label: 'Car', icon: 'car' },
];

export function validateBrickName(name: string): boolean {
  return name.trim().length >= 1;
}

export function defaultCategories(): Record<string, boolean> {
  return {
    social: true,
    games: true,
    video: true,
    news: true,
    shopping: false,
    messaging: false,
  };
}

export function isTagIdInputValid(raw: string): boolean {
  return isValidTagId(raw);
}

export const BRICK_MODES = [
  { key: 'deep', label: 'Deep Work', desc: 'Long, single-task sessions' },
  { key: 'study', label: 'Study', desc: 'Coursework and revision' },
  { key: 'wind', label: 'Wind Down', desc: 'A gentler label for evening routines' },
  { key: 'custom', label: 'Custom', desc: 'Your own mode and duration' }
] as const;

export const MODE_PRESETS: Record<string, Record<string, boolean>> = {
  deep: { social: true, games: true, video: true, news: true, shopping: false, messaging: false },
  wind: { social: true, games: false, video: true, news: false, shopping: true, messaging: true }
};

export const DURATIONS = [
  { key: '25', label: '25 min' },
  { key: '50', label: '50 min' },
  { key: '90', label: '90 min' },
  { key: 'inf', label: 'Until I tap out' }
] as const;

export function modeLabel(mode: string): 'Deep Work' | 'Study' | 'Wind Down' | 'Custom' {
  if (mode === 'deep') return 'Deep Work';
  if (mode === 'study') return 'Study';
  if (mode === 'wind') return 'Wind Down';
  return 'Custom';
}

export function durationLabel(d: string): '25 min' | '50 min' | '90 min' | 'Until I tap out' {
  const match = DURATIONS.find(x => x.key === d);
  return match ? match.label : '50 min';
}

export function buildBrickSummary(
  mode: string,
  categoriesOrAppCount: Record<string, boolean> | number,
  duration: string
): Array<{ label: string; icon: 'target' | 'shield' | 'timer' }> {
  const nApps = typeof categoriesOrAppCount === 'number'
    ? categoriesOrAppCount
    : Object.values(categoriesOrAppCount).filter(Boolean).length;
  return [
    { label: modeLabel(mode), icon: 'target' },
    { label: `${nApps} apps`, icon: 'shield' },
    { label: durationLabel(duration), icon: 'timer' }
  ];
}

export const CATEGORY_META: Array<{ key: string; label: string; icon: IconName }> = [
  { key: 'social', label: 'Social', icon: 'social' },
  { key: 'games', label: 'Games', icon: 'gamepad' },
  { key: 'video', label: 'Video', icon: 'film' },
  { key: 'news', label: 'News', icon: 'newspaper' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping' },
  { key: 'messaging', label: 'Messaging', icon: 'message' }
];

export const CATEGORY_PACKAGES: Record<string, string[]> = {
  social: ['com.instagram.android', 'com.facebook.katana', 'com.tiktok'],
  games: ['com.supercell.clashofclans', 'com.roblox.client'],
  video: ['com.google.android.youtube', 'com.netflix.mediaclient'],
  news: ['com.google.android.apps.magazines', 'com.flipboard.app'],
  shopping: ['com.amazon.mShop.android.shopping', 'com.wish.wish'],
  messaging: ['com.whatsapp', 'com.facebook.orca']
};
