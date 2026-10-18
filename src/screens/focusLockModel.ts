/** Text on the focus screen and the Home "focus running" banner. Pure, so it can be tested. */

/** 24:17, or 1:05:09 past an hour. */
export function focusClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function clockTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Under the timer: how this session ends. */
export function focusCaption(keyOnly: boolean, keyName: string, plannedEndTime: number | null): string {
  if (keyOnly || plannedEndTime === null) return `elapsed · ends when you tap ${keyName}`;
  return `left · ends at ${clockTime(plannedEndTime)}, or tap ${keyName}`;
}

/** Parked thoughts are kept one per line in the session's note. */
export function parkedThoughts(note: string | null): string[] {
  return (note ?? '').split(/\r?\n/).map(t => t.trim()).filter(Boolean);
}
