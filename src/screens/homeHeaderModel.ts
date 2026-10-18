import type { Tag } from '../db/types';
import { durationLabel } from '../utils/onboarding';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatToday(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export function greetingFor(d: Date): string {
  const hour = d.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'B';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function relativeTime(unixSec: number, nowSec: number): string {
  const diff = Math.max(0, nowSec - unixSec);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export type EndMode = 'brick' | 'timer';

/**
 * The two short facts that tell one key's setup apart from another's on the Home cards.
 * Under the global "Key only" ending, a key's saved duration never applies, so it is
 * not shown — showing "50 min" there would promise a time limit that won't happen.
 */
export function brickConfigLines(tag: Pick<Tag, 'duration' | 'strict'>, endMode: EndMode): [string, string] {
  const ending = endMode === 'brick' || tag.duration === 'inf' ? 'Ends on tap' : `${durationLabel(tag.duration)} limit`;
  return [ending, tag.strict === 1 ? 'Strict' : 'Flexible'];
}
