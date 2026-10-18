/**
 * Insights v2: which stretch of time is on screen and what the numbers say about it. Pure; the
 * screen loads sessions and passes them in. `offset` 0 is the current period (so far), -1 the
 * one before it, and so on. Times are unix seconds, local calendar.
 */
import type { Session } from '../db/types';
import { Bucket, chartBuckets, overlap, previousRange, sessionInterval } from '../services/stats/statsMath';
import type { Period } from '../services/stats/statsService';
import { asksOutcome, getRoutine } from './rituals';

type SessionLike = Pick<Session, 'startTime' | 'endTime' | 'durationSec' | 'endedVia' | 'routineType' | 'outcome'>;

export interface PeriodWindow {
  start: number;
  end: number;
  /** The moment the window is drawn "as of": now for the current period, its last second otherwise. */
  anchor: number;
  isCurrent: boolean;
  label: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const unix = (d: Date) => Math.floor(d.getTime() / 1000);
const endOf = (d: Date) => unix(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));

export function periodWindow(period: Period, offset: number, now: number): PeriodWindow {
  const today = new Date(now * 1000);
  const isCurrent = offset >= 0;
  const k = Math.min(0, offset);
  if (period === 'day') {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
    const anchor = isCurrent ? now : endOf(day);
    const label = `${isCurrent ? 'Today' : k === -1 ? 'Yesterday' : DAYS[day.getDay()]}, ${day.getDate()} ${MONTHS_LONG[day.getMonth()]}`;
    return { start: unix(day), end: anchor, anchor, isCurrent, label };
  }
  if (period === 'week') {
    const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7 * k);
    const first = new Date(last.getFullYear(), last.getMonth(), last.getDate() - 6);
    const anchor = isCurrent ? now : endOf(last);
    const label = first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${MONTHS_LONG[last.getMonth()]}`
      : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
    return { start: unix(first), end: anchor, anchor, isCurrent, label };
  }
  const first = new Date(today.getFullYear(), today.getMonth() + k, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const anchor = isCurrent ? now : endOf(lastDay);
  const label = `${MONTHS_LONG[first.getMonth()]} ${first.getFullYear()}`;
  return { start: unix(first), end: anchor, anchor, isCurrent, label };
}

/** What to compare against: the same elapsed stretch of the last period, or the whole of it. */
export function comparisonWindow(period: Period, offset: number, now: number): { start: number; end: number } {
  const w = periodWindow(period, offset, now);
  if (w.isCurrent) return previousRange(period, w.start, now);
  const prev = periodWindow(period, offset - 1, now);
  return { start: prev.start, end: prev.end };
}

function focusIn(sessions: SessionLike[], start: number, end: number, now: number): number {
  let total = 0;
  for (const s of sessions) {
    const iv = sessionInterval(s, now);
    if (iv) total += overlap(iv, start, end);
  }
  return total;
}

export interface BarView { label: string; value: number; highlight: boolean }

export interface InsightsView {
  window: PeriodWindow;
  focusSec: number;
  sessions: number;
  deltaText: string;
  bars: BarView[];
  outcomes: { finished: number; recorded: number };
  rituals: Array<{ id: string; label: string; focusSec: number; share: number }>;
}

export function formatDuration(sec: number): string {
  const minutes = Math.round(sec / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * The design's comparison line: minutes for a day ("+12m vs yesterday"), percent for a week
 * ("+38% vs last week"), time vs the named month for a month ("+4h vs September").
 */
export function deltaText(currentSec: number, previousSec: number, period: Period, isCurrent: boolean, previousMonth?: string): string {
  const than = period === 'day' ? (isCurrent ? 'yesterday' : 'the day before') : period === 'week' ? (isCurrent ? 'last week' : 'the week before') : previousMonth ?? 'last month';
  if (previousSec <= 0) return currentSec > 0 ? `no focus ${period === 'month' ? 'in ' : ''}${than}` : 'nothing yet';
  const diff = Math.round((currentSec - previousSec) / 60) * 60;
  if (diff === 0) return `same as ${than}`;
  const sign = diff > 0 ? '+' : '−';
  if (period === 'week') return `${sign}${Math.round((Math.abs(diff) / previousSec) * 100)}% vs ${than}`;
  return `${sign}${formatDuration(Math.abs(diff))} vs ${than}`;
}

export function buildInsights(period: Period, offset: number, now: number, sessions: SessionLike[], previous: SessionLike[]): InsightsView {
  const window = periodWindow(period, offset, now);
  const inWindow = sessions.filter(s => {
    const iv = sessionInterval(s, now);
    return !!iv && overlap(iv, window.start, window.end) > 0;
  });
  const focusSec = focusIn(inWindow, window.start, window.end, now);
  const cmp = comparisonWindow(period, offset, now);
  const prevSec = focusIn(previous, cmp.start, cmp.end, now);

  const buckets: Bucket[] = chartBuckets(period, window.anchor);
  const values = buckets.map(b => focusIn(inWindow, b.start, Math.min(b.end, window.end), now));
  // Highlight "now" in the current period; otherwise the best stretch.
  const max = Math.max(0, ...values);
  const highlightAt = window.isCurrent
    ? buckets.findIndex(b => window.anchor >= b.start && window.anchor < b.end)
    : max > 0 ? values.indexOf(max) : -1;

  // Only study and work ask "did you finish?"; the others aren't graded.
  const graded = inWindow.filter(s => asksOutcome(s.routineType) && s.outcome);

  const perRitual = new Map<string, number>();
  for (const s of inWindow) {
    const iv = sessionInterval(s, now);
    if (iv) perRitual.set(s.routineType, (perRitual.get(s.routineType) ?? 0) + overlap(iv, window.start, window.end));
  }
  const rituals = [...perRitual.entries()]
    .filter(([, sec]) => sec >= 60)
    .sort((a, b) => b[1] - a[1])
    .map(([id, sec]) => ({ id, label: getRoutine(id).shortLabel, focusSec: sec, share: focusSec > 0 ? sec / focusSec : 0 }));

  return {
    window,
    focusSec,
    sessions: inWindow.length,
    deltaText: deltaText(focusSec, prevSec, period, window.isCurrent, MONTHS_LONG[new Date(cmp.start * 1000).getMonth()]),
    // Month bars are the design's W1…W5; day and week keep their own labels.
    bars: buckets.map((b, i) => ({ label: period === 'month' ? `W${i + 1}` : b.label, value: values[i], highlight: i === highlightAt })),
    outcomes: { finished: graded.filter(s => s.outcome === 'done').length, recorded: graded.length },
    rituals,
  };
}
