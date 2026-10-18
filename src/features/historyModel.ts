/** History rows: what the design's RECENT list says about each finished session. Pure. */
import type { Session } from '../db/types';
import { formatDuration } from './insightsModel';
import { getRoutine } from './rituals';

type SessionLike = Pick<Session, 'id' | 'tagId' | 'startTime' | 'endTime' | 'durationSec' | 'endedVia' | 'routineType' | 'intention' | 'outcome'>;

export interface HistoryRow { id: number; title: string; meta: string; dur: string; done: boolean }

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today, 11:20", "Yesterday, 21:05", "Mon 5 Oct, 09:00" */
export function whenLabel(unix: number, now: number): string {
  const d = new Date(unix * 1000);
  const today = new Date(now * 1000);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${time}`;
}

/** Finished sessions only (never-started ones are left out), newest first. */
export function historyRows(sessions: SessionLike[], keyNames: Record<string, string>, now: number): HistoryRow[] {
  return sessions
    .filter(s => s.endTime !== null && s.endedVia !== 'start_failed')
    .sort((a, b) => b.startTime - a.startTime)
    .map(s => {
      const ritual = getRoutine(s.routineType).shortLabel;
      const key = (s.tagId && keyNames[s.tagId]) || 'No key';
      const sec = s.durationSec ?? Math.max(0, (s.endTime ?? s.startTime) - s.startTime);
      // Red dot: the session ran its course (the key, the timer, or a "done" outcome).
      const done = s.outcome ? s.outcome === 'done' : s.endedVia === 'nfc' || s.endedVia === 'timer';
      return { id: s.id, title: s.intention?.trim() || `${ritual} session`, meta: `${ritual} · ${key} · ${whenLabel(s.startTime, now)}`, dur: formatDuration(sec), done };
    });
}
