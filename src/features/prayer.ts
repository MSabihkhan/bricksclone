/**
 * Prayer reminders are plain local notifications at fixed clock times. They never start a
 * session, never record a prayer as performed, and never leave the phone. Rationale and
 * limits (fixed times drift against real prayer times through the year): docs/RITUALS.md.
 */
export interface PrayerReminderConfig {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

/** Matches the number of alarm slots the native scheduler reserves. */
export const MAX_PRAYER_REMINDERS = 10;

export const SETTINGS_KEY = 'prayer_reminders';

/**
 * Starting points only — real times depend on location and date. Users are told to adjust
 * them to their local timetable.
 */
export const FIVE_DAILY_PRAYERS: Array<Omit<PrayerReminderConfig, 'id'>> = [
  { label: 'Fajr', hour: 5, minute: 0, enabled: true },
  { label: 'Dhuhr', hour: 13, minute: 0, enabled: true },
  { label: 'Asr', hour: 16, minute: 30, enabled: true },
  { label: 'Maghrib', hour: 18, minute: 30, enabled: true },
  { label: 'Isha', hour: 20, minute: 0, enabled: true },
];

let idCounter = 0;
export function newReminderId(): string {
  idCounter += 1;
  return `r${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function clampHour(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(23, Math.trunc(value))) : 0;
}

export function clampMinute(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(59, Math.trunc(value))) : 0;
}

export function formatTime(hour: number, minute: number): string {
  return `${String(clampHour(hour)).padStart(2, '0')}:${String(clampMinute(minute)).padStart(2, '0')}`;
}

export function sortReminders(list: PrayerReminderConfig[]): PrayerReminderConfig[] {
  return [...list].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

function sanitize(raw: unknown): PrayerReminderConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === 'string' && r.label.trim() ? r.label.trim().slice(0, 40) : 'Prayer';
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newReminderId(),
    label,
    hour: clampHour(Number(r.hour)),
    minute: clampMinute(Number(r.minute)),
    enabled: r.enabled !== false,
  };
}

/**
 * Reads the stored list. Falls back to the single reminder the first version of this
 * screen saved (`prayer_reminder_enabled/hour/minute`) so upgrading keeps it.
 */
export function parseReminders(settings: Record<string, string | undefined>): PrayerReminderConfig[] {
  const stored = settings[SETTINGS_KEY];
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return sortReminders(parsed.map(sanitize).filter((r): r is PrayerReminderConfig => r !== null)).slice(0, MAX_PRAYER_REMINDERS);
      }
    } catch {
      // fall through to legacy
    }
  }
  if (settings.prayer_reminder_hour !== undefined || settings.prayer_reminder_enabled !== undefined) {
    return [{
      id: newReminderId(),
      label: 'Prayer',
      hour: clampHour(Number(settings.prayer_reminder_hour ?? 12)),
      minute: clampMinute(Number(settings.prayer_reminder_minute ?? 30)),
      enabled: settings.prayer_reminder_enabled === '1',
    }];
  }
  return [];
}

/** Adds any of the five daily prayers not already in the list (matched by name), within the cap. */
export function addFiveDailyPrayers(list: PrayerReminderConfig[]): PrayerReminderConfig[] {
  const existing = new Set(list.map(r => r.label.trim().toLowerCase()));
  const additions = FIVE_DAILY_PRAYERS
    .filter(p => !existing.has(p.label.toLowerCase()))
    .map(p => ({ ...p, id: newReminderId() }));
  return sortReminders([...list, ...additions]).slice(0, MAX_PRAYER_REMINDERS);
}

export function hasAllFiveDailyPrayers(list: PrayerReminderConfig[]): boolean {
  const labels = new Set(list.map(r => r.label.trim().toLowerCase()));
  return FIVE_DAILY_PRAYERS.every(p => labels.has(p.label.toLowerCase()));
}
