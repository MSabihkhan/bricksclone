import { db } from '../../db';
import type { Session } from '../../db/types';

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

export async function getPeriodStats(period: Period): Promise<PeriodStats> {
  const { start, end } = periodRange(period);
  
  const sessionsList = await db.sessions.sessionsBetween(start, end);
  let focusSec = 0;
  for (const s of sessionsList) {
    if (s.durationSec != null) {
      focusSec += s.durationSec;
    } else {
      const e = s.endTime || end;
      focusSec += (e - s.startTime);
    }
  }
  
  const allAttempts = await db.getDriver().query(
    'SELECT COUNT(*) as count FROM blocked_attempts WHERE created_at >= ? AND created_at <= ?',
    [start, end]
  );
  const blockedCount = allAttempts[0] ? Number(allAttempts[0].count) : 0;
  
  const goalStr = await db.settings.get('daily_goal');
  const dailyGoal = goalStr ? Number(goalStr) : 210 * 60;
  
  let goalPct = 0;
  if (dailyGoal > 0) {
    goalPct = Math.min(100, Math.floor((focusSec / dailyGoal) * 100));
  }
  
  let daysInPeriod = 1;
  const now = new Date();
  if (period === 'week') daysInPeriod = 7;
  else if (period === 'month') daysInPeriod = now.getDate();

  const daysWithSession = new Set<string>();
  for (const s of sessionsList) {
    daysWithSession.add(dayKey(new Date(s.startTime * 1000)));
  }
  const consistencyPct = daysInPeriod > 0 ? Math.min(100, Math.floor((daysWithSession.size / daysInPeriod) * 100)) : 0;
  
  const allSessions = await db.sessions.listSessions();
  const streakDays = computeStreakDays(allSessions);
  
  return {
    focusSec,
    sessions: sessionsList.length,
    blocked: blockedCount,
    streakDays,
    goalPct,
    consistencyPct,
  };
}

export async function getFocusBars(period: Period): Promise<BarDatum[]> {
  const { start, end } = periodRange(period);
  const sessionsList = await db.sessions.sessionsBetween(start, end);
  
  const buckets: { label: string; value: number }[] = [];
  
  if (period === 'day') {
    for (let i = 0; i < 12; i++) {
      const hour = 6 + i;
      const label = hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`;
      buckets.push({ label, value: 0 });
    }
    for (const s of sessionsList) {
      const d = new Date(s.startTime * 1000);
      const hour = d.getHours();
      if (hour >= 6 && hour < 18) {
        const val = s.durationSec ?? ((s.endTime || end) - s.startTime);
        buckets[hour - 6].value += val;
      }
    }
  } else if (period === 'week') {
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 86400000);
      buckets.push({ label: dayNames[d.getDay()], value: 0 });
    }
    for (const s of sessionsList) {
      const d = new Date(s.startTime * 1000);
      const diffDays = Math.floor((todayStart.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < 7) {
        const val = s.durationSec ?? ((s.endTime || end) - s.startTime);
        buckets[6 - diffDays].value += val;
      }
    }
  } else {
    buckets.push({ label: 'W1', value: 0 });
    buckets.push({ label: 'W2', value: 0 });
    buckets.push({ label: 'W3', value: 0 });
    buckets.push({ label: 'W4', value: 0 });
    for (const s of sessionsList) {
      const d = new Date(s.startTime * 1000);
      const date = d.getDate();
      const val = s.durationSec ?? ((s.endTime || end) - s.startTime);
      if (date <= 7) buckets[0].value += val;
      else if (date <= 14) buckets[1].value += val;
      else if (date <= 21) buckets[2].value += val;
      else buckets[3].value += val;
    }
  }
  
  let max = -1;
  for (const b of buckets) {
    if (b.value > max) max = b.value;
  }
  
  return buckets.map(b => ({
    label: b.label,
    value: b.value,
    isMax: max > 0 && b.value === max,
  }));
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
  
  const sessionsList = await db.sessions.sessionsBetween(start, now);
  let focusSec = 0;
  for (const s of sessionsList) {
    focusSec += s.durationSec ?? ((s.endTime || now) - s.startTime);
  }
  
  const goalStr = await db.settings.get('daily_goal');
  const goalSec = goalStr ? Number(goalStr) : 210 * 60;
  const goalPct = Math.min(100, Math.floor((focusSec / goalSec) * 100));
  
  const allAttempts = await db.getDriver().query(
    'SELECT COUNT(*) as count FROM blocked_attempts WHERE created_at >= ? AND created_at <= ?',
    [start, now]
  );
  const blocked = allAttempts[0] ? Number(allAttempts[0].count) : 0;
  
  const allSessions = await db.sessions.listSessions();
  const streakDays = computeStreakDays(allSessions);
  
  return { focusSec, goalSec, blocked, goalPct, streakDays };
}

export async function getPeriodComparison(period: Period): Promise<{ focusSec: number; prevFocusSec: number; deltaPct: number }> {
  const { start, end } = periodRange(period);
  const currentSessions = await db.sessions.sessionsBetween(start, end);
  let focusSec = 0;
  for (const s of currentSessions) {
    focusSec += s.durationSec ?? ((s.endTime || end) - s.startTime);
  }
  
  let prevStart = 0;
  let prevEnd = start - 1;
  if (period === 'day') {
    prevStart = start - 86400;
  } else if (period === 'week') {
    prevStart = start - 7 * 86400;
  } else {
    const d = new Date(start * 1000);
    const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    prevStart = Math.floor(prevMonth.getTime() / 1000);
  }
  
  const prevSessions = await db.sessions.sessionsBetween(prevStart, prevEnd);
  let prevFocusSec = 0;
  for (const s of prevSessions) {
    prevFocusSec += s.durationSec ?? ((s.endTime || prevEnd) - s.startTime);
  }
  
  const deltaPct = prevFocusSec > 0
    ? Math.round(((focusSec - prevFocusSec) / prevFocusSec) * 100)
    : focusSec > 0 ? 100 : 0;
  
  return { focusSec, prevFocusSec, deltaPct };
}

export async function getCompletionByMode(period: Period): Promise<Array<{ mode: string; label: string; completed: number; total: number; pct: number }>> {
  const { start, end } = periodRange(period);
  const sessions = await db.sessions.sessionsBetween(start, end);
  
  const modes: Record<string, { total: number; completed: number; label: string }> = {
    deep: { total: 0, completed: 0, label: 'Deep Work' },
    wind: { total: 0, completed: 0, label: 'Wind Down' },
    custom: { total: 0, completed: 0, label: 'Custom' },
    recovered: { total: 0, completed: 0, label: 'Recovered' }
  };
  
  for (const s of sessions) {
    let mode = 'recovered';
    if (s.tagId) {
      const tag = await db.tags.getTagById(s.tagId);
      if (tag) mode = tag.mode;
    }
    
    if (!modes[mode]) {
      modes[mode] = { total: 0, completed: 0, label: mode === 'deep' ? 'Deep Work' : mode === 'wind' ? 'Wind Down' : mode === 'custom' ? 'Custom' : 'Recovered' };
    }
    
    modes[mode].total++;
    const isCompleted = isCompletedSession(s);
    if (isCompleted) {
      modes[mode].completed++;
    }
  }
  
  const result = [];
  for (const [modeKey, data] of Object.entries(modes)) {
    if (data.total > 0) {
      result.push({
        mode: modeKey,
        label: data.label,
        completed: data.completed,
        total: data.total,
        pct: Math.round((data.completed / data.total) * 100)
      });
    }
  }
  return result;
}

export async function getBestDay(period: Period): Promise<{ label: string; minutes: number } | null> {
  const { start, end } = periodRange(period);
  const sessions = await db.sessions.sessionsBetween(start, end);
  if (sessions.length === 0) return null;
  
  const daySums: Record<string, number> = {};
  for (const s of sessions) {
    const dKey = dayKey(new Date(s.startTime * 1000));
    const val = s.durationSec ?? ((s.endTime || end) - s.startTime);
    daySums[dKey] = (daySums[dKey] || 0) + val;
  }
  
  let maxDay = '';
  let maxSec = -1;
  for (const [dKey, sec] of Object.entries(daySums)) {
    if (sec > maxSec) {
      maxSec = sec;
      maxDay = dKey;
    }
  }
  if (maxSec < 0) return null;
  
  const todayStr = dayKey(new Date());
  let label = 'Today';
  if (maxDay !== todayStr) {
    const parts = maxDay.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]), Number(parts[2]));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    label = dayNames[d.getDay()];
  }
  
  return { label, minutes: Math.round(maxSec / 60) };
}

export async function getAvgSessionSec(period: Period): Promise<number> {
  const { start, end } = periodRange(period);
  const sessions = await db.sessions.sessionsBetween(start, end);
  let totalSec = 0;
  let count = 0;
  for (const s of sessions) {
    if (isCompletedSession(s)) {
      totalSec += s.durationSec ?? (s.endTime ? s.endTime - s.startTime : 0);
      count++;
    }
  }
  return count > 0 ? Math.round(totalSec / count) : 0;
}
