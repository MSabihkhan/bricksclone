/**
 * Pure time maths behind every stat and chart. All times are unix seconds, local calendar.
 *
 * The rule throughout: a session contributes only the seconds that actually fall inside a
 * bucket. Attributing a whole session to the hour/day it *started* made an 11pm–1am session
 * count entirely as yesterday and left night-time sessions off the day chart altogether.
 */
import type { Session } from '../../db/types';
import type { Period } from './statsService';

export interface Interval { start: number; end: number }
export interface Bucket extends Interval { label: string }

type SessionTimes = Pick<Session, 'startTime' | 'endTime' | 'durationSec' | 'endedVia'>;

const DAY = 86400;

/** The span a session actually focused for, or null if it never really ran. */
export function sessionInterval(s: SessionTimes, now: number): Interval | null {
  if (s.endedVia === 'start_failed') return null;
  let end: number;
  if (s.durationSec != null) end = s.startTime + s.durationSec; // clamped duration is the source of truth
  else if (s.endTime != null) end = s.endTime;
  else end = now; // still running
  end = Math.min(end, now);
  return end > s.startTime ? { start: s.startTime, end } : null;
}

export function overlap(iv: Interval, start: number, end: number): number {
  return Math.max(0, Math.min(iv.end, end) - Math.max(iv.start, start));
}

export function focusWithin(sessions: SessionTimes[], start: number, end: number, now: number): number {
  let total = 0;
  for (const s of sessions) {
    const iv = sessionInterval(s, now);
    if (iv) total += overlap(iv, start, end);
  }
  return total;
}

/** Sessions that focused for at least one second inside the range. */
export function countSessionsWithin(sessions: SessionTimes[], start: number, end: number, now: number): number {
  return sessions.filter(s => {
    const iv = sessionInterval(s, now);
    return iv !== null && overlap(iv, start, end) > 0;
  }).length;
}

function localMidnight(ts: number): Date {
  const d = new Date(ts * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function unix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/** Calendar day starts covering the period up to and including today. */
export function dayStarts(period: Period, now: number): number[] {
  const today = localMidnight(now);
  if (period === 'day') return [unix(today)];
  const count = period === 'week' ? 7 : today.getDate();
  const first = period === 'week'
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    : new Date(today.getFullYear(), today.getMonth(), 1);
  return Array.from({ length: count }, (_, i) => unix(new Date(first.getFullYear(), first.getMonth(), first.getDate() + i)));
}

const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Chart buckets. Day: eight 3-hour blocks across the full 24 hours. Week: the last seven
 * days. Month: real 7-day spans from the 1st ("1–7" … "29–31"), not four "weeks" where the
 * last one silently holds up to ten days.
 */
export function chartBuckets(period: Period, now: number): Bucket[] {
  const today = localMidnight(now);
  if (period === 'day') {
    return HOUR_LABELS.map((label, i) => ({
      label,
      start: unix(new Date(today.getFullYear(), today.getMonth(), today.getDate(), i * 3)),
      end: unix(new Date(today.getFullYear(), today.getMonth(), today.getDate(), i * 3 + 3)),
    }));
  }
  if (period === 'week') {
    return dayStarts('week', now).map(start => {
      const d = new Date(start * 1000);
      return { label: DAY_INITIALS[d.getDay()], start, end: unix(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) };
    });
  }
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const buckets: Bucket[] = [];
  for (let first = 1; first <= daysInMonth; first += 7) {
    const last = Math.min(first + 6, daysInMonth);
    buckets.push({
      label: first === last ? `${first}` : `${first}–${last}`,
      start: unix(new Date(today.getFullYear(), today.getMonth(), first)),
      end: unix(new Date(today.getFullYear(), today.getMonth(), last + 1)),
    });
  }
  return buckets;
}

/**
 * The previous period, cut to the same elapsed length as the current one, so that "today
 * so far" is compared with "yesterday up to this time" rather than all of yesterday.
 */
export function previousRange(period: Period, start: number, now: number): Interval {
  const elapsed = Math.max(0, now - start);
  if (period === 'day') return { start: start - DAY, end: start - DAY + elapsed };
  if (period === 'week') return { start: start - 7 * DAY, end: start - 7 * DAY + elapsed };
  const s = new Date(start * 1000);
  const prevStart = unix(new Date(s.getFullYear(), s.getMonth() - 1, 1));
  return { start: prevStart, end: Math.min(prevStart + elapsed, start) };
}

/** Percent change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
