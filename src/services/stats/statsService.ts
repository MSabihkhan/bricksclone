import { db } from '../../db';
import type { Session } from '../../db/types';
import { chartBuckets, countSessionsWithin, dayStarts, focusWithin, percentChange, previousRange, sessionInterval } from './statsMath';

export type Period = 'day' | 'week' | 'month';

export interface PeriodStats {
  focusSec: number;
  sessions: number;
  blocked: number;
  streakDays: number;
  goalPct: number;
  consistencyPct: number;
}

export interface BarDatum {
  label: string;
  value: number;
  isMax: boolean;
}

export interface TopApp {
  name: string;
  count: number;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function endOfDay(ts: number): number {
  const d = new Date(ts * 1000);
  d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function shiftDays(ts: number, days: number): number {
  const d = new Date(ts * 1000);
  d.setDate(d.getDate() + days);
  return Math.floor(d.getTime() / 1000);
}

export function periodRange(period: Period): { start: number; end: number } {
  const now = new Date();
  const end = Math.floor(now.getTime() / 1000);
  let start: number;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'day') {
    start = Math.floor(todayStart.getTime() / 1000);
  } else if (period === 'week') {
    start = Math.floor(todayStart.getTime() / 1000) - 6 * 86400;
  } else {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    start = Math.floor(monthStart.getTime() / 1000);
  }
  return { start, end };
}

export function isCompletedSession(session: Pick<Session, 'endedVia' | 'durationSec'>): boolean {
  return (session.endedVia === 'nfc' || session.endedVia === 'timer') && (session.durationSec ?? 0) > 0;
}

export function computeStreakDays(allSessions: Array<Pick<Session, 'startTime' | 'endedVia' | 'durationSec'>>): number {
  const daysSet = new Set<string>();
  const brokenDays = new Set<string>();
  for (const s of allSessions) {
    const key = dayKey(new Date(s.startTime * 1000));
    if (s.endedVia === 'override') brokenDays.add(key);
    if (isCompletedSession(s)) daysSet.add(key);
  }
  
  let streakDays = 0;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  
  const todayStr = dayKey(today);
  const yesterdayStr = dayKey(yesterday);
  
  let checkDate = new Date();
  if (brokenDays.has(todayStr)) return 0;
  if (!daysSet.has(todayStr) && daysSet.has(yesterdayStr) && !brokenDays.has(yesterdayStr)) {
    checkDate = yesterday;
  }
  
  while (daysSet.has(dayKey(checkDate)) && !brokenDays.has(dayKey(checkDate))) {
    streakDays++;
    checkDate = new Date(checkDate.getTime() - 86400000);
  }
  
  return streakDays;
}

const DEFAULT_DAILY_GOAL_SEC = 210 * 60;

async function dailyGoalSec(): Promise<number> {
  const goal = Number(await db.settings.get('daily_goal'));
  return goal > 0 ? goal : DEFAULT_DAILY_GOAL_SEC;
}

async function countAttempts(start: number, end: number): Promise<number> {
  const rows = await db.getDriver().query(
    'SELECT COUNT(*) as count FROM blocked_attempts WHERE created_at >= ? AND created_at <= ?',
    [start, end]
  );
  return rows[0] ? Number(rows[0].count) : 0;
}

export async function getPeriodStats(period: Period): Promise<PeriodStats> {
  const { start, end } = periodRange(period);
  const sessions = await db.sessions.sessionsOverlapping(start, end);
  const focusSec = focusWithin(sessions, start, end, end);

  // The goal is per day, so a week is measured against seven days of goal — not one.
  const days = dayStarts(period, end);
  const goal = (await dailyGoalSec()) * days.length;
  const goalPct = goal > 0 ? Math.min(100, Math.floor((focusSec / goal) * 100)) : 0;

  const activeDays = days.filter(dayStart => focusWithin(sessions, dayStart, dayStart + 86400, end) > 0).length;
  const consistencyPct = Math.min(100, Math.floor((activeDays / days.length) * 100));

  const streakDays = computeStreakDays(await db.sessions.listSessions());

  return {
    focusSec,
    sessions: countSessionsWithin(sessions, start, end, end),
    blocked: await countAttempts(start, end),
    streakDays,
    goalPct,
    consistencyPct,
  };
}

export async function getFocusBars(period: Period): Promise<BarDatum[]> {
  const { start, end } = periodRange(period);
  const buckets = chartBuckets(period, end);
  const sessions = await db.sessions.sessionsOverlapping(Math.min(start, buckets[0].start), end);
  const values = buckets.map(b => ({ label: b.label, value: focusWithin(sessions, b.start, b.end, end) }));
  const max = Math.max(0, ...values.map(v => v.value));
  return values.map(v => ({ ...v, isMax: max > 0 && v.value === max }));
}

export async function getTopBlocked(period: Period, limit: number = 5): Promise<TopApp[]> {
  const { start, end } = periodRange(period);
  const rows = await db.getDriver().query(
    'SELECT label, COUNT(*) as count FROM blocked_attempts WHERE created_at >= ? AND created_at <= ? GROUP BY package_name ORDER BY count DESC LIMIT ?',
    [start, end, limit]
  );
  return rows.map(r => ({
    name: String(r.label),
    count: Number(r.count),
  }));
}

export interface TodayStats { focusSec: number; goalSec: number; blocked: number; goalPct: number; streakDays: number; }

export async function getTodayStats(): Promise<TodayStats> {
  const now = Math.floor(Date.now() / 1000);
  const start = startOfDay(now);
  const sessions = await db.sessions.sessionsOverlapping(start, now);
  const focusSec = focusWithin(sessions, start, now, now);
  const goalSec = await dailyGoalSec();
  return {
    focusSec,
    goalSec,
    blocked: await countAttempts(start, now),
    goalPct: Math.min(100, Math.floor((focusSec / goalSec) * 100)),
    streakDays: computeStreakDays(await db.sessions.listSessions()),
  };
}

/** `deltaPct` is null when the previous period had no focus — there's nothing honest to compare. */
export async function getPeriodComparison(period: Period): Promise<{ focusSec: number; prevFocusSec: number; deltaPct: number | null }> {
  const { start, end } = periodRange(period);
  const prev = previousRange(period, start, end);
  const sessions = await db.sessions.sessionsOverlapping(prev.start, end);
  const focusSec = focusWithin(sessions, start, end, end);
  const prevFocusSec = focusWithin(sessions, prev.start, prev.end, end);
  return { focusSec, prevFocusSec, deltaPct: percentChange(focusSec, prevFocusSec) };
}

export async function getCompletionByMode(period: Period): Promise<Array<{ mode: string; label: string; completed: number; total: number; pct: number }>> {
  const { start, end } = periodRange(period);
  const sessions = (await db.sessions.sessionsOverlapping(start, end)).filter(s => s.endedVia !== 'start_failed');
  const labels: Record<string, string> = { deep: 'Deep Work', wind: 'Wind Down', custom: 'Custom', recovered: 'Recovered' };
  const modes: Record<string, { total: number; completed: number }> = {};
  const tagModes = new Map<string, string>();

  for (const s of sessions) {
    let mode = 'recovered';
    if (s.tagId) {
      if (!tagModes.has(s.tagId)) tagModes.set(s.tagId, (await db.tags.getTagById(s.tagId))?.mode ?? 'recovered');
      mode = tagModes.get(s.tagId)!;
    }
    modes[mode] = modes[mode] ?? { total: 0, completed: 0 };
    modes[mode].total++;
    if (isCompletedSession(s)) modes[mode].completed++;
  }

  return Object.entries(modes).map(([mode, data]) => ({
    mode,
    label: labels[mode] ?? mode,
    completed: data.completed,
    total: data.total,
    pct: Math.round((data.completed / data.total) * 100),
  }));
}

export async function getBestDay(period: Period): Promise<{ label: string; minutes: number } | null> {
  const { end } = periodRange(period);
  const days = dayStarts(period, end);
  const sessions = await db.sessions.sessionsOverlapping(days[0], end);
  let best: { start: number; sec: number } | null = null;
  for (const dayStart of days) {
    const sec = focusWithin(sessions, dayStart, dayStart + 86400, end);
    if (sec > 0 && (!best || sec > best.sec)) best = { start: dayStart, sec };
  }
  if (!best) return null;
  const label = best.start === startOfDay(end)
    ? 'Today'
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(best.start * 1000).getDay()];
  return { label, minutes: Math.round(best.sec / 60) };
}

/** Average length of sessions that finished properly (key tap or timer) in the period. */
export async function getAvgSessionSec(period: Period): Promise<number> {
  const { start, end } = periodRange(period);
  const completed = (await db.sessions.sessionsOverlapping(start, end)).filter(isCompletedSession);
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, s) => {
    const iv = sessionInterval(s, end);
    return sum + (iv ? iv.end - iv.start : 0);
  }, 0);
  return Math.round(total / completed.length);
}
