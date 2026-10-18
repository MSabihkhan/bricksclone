import {
  addFiveDailyPrayers,
  formatTime,
  hasAllFiveDailyPrayers,
  MAX_PRAYER_REMINDERS,
  parseReminders,
  SETTINGS_KEY,
  sortReminders,
} from '../../src/features/prayer';

describe('prayer reminders', () => {
  it('migrates the single reminder saved by the first version', () => {
    const list = parseReminders({ prayer_reminder_enabled: '1', prayer_reminder_hour: '13', prayer_reminder_minute: '15' });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ label: 'Prayer', hour: 13, minute: 15, enabled: true });
  });

  it('keeps a disabled legacy reminder disabled', () => {
    expect(parseReminders({ prayer_reminder_enabled: '0', prayer_reminder_hour: '5' })[0].enabled).toBe(false);
  });

  it('prefers the stored list over legacy keys and sorts it by time', () => {
    const stored = JSON.stringify([
      { id: 'b', label: 'Isha', hour: 20, minute: 0, enabled: true },
      { id: 'a', label: 'Fajr', hour: 5, minute: 0, enabled: true },
    ]);
    const list = parseReminders({ [SETTINGS_KEY]: stored, prayer_reminder_hour: '12' });
    expect(list.map(r => r.label)).toEqual(['Fajr', 'Isha']);
  });

  it('clamps out-of-range times and survives corrupt JSON', () => {
    const list = parseReminders({ [SETTINGS_KEY]: JSON.stringify([{ id: 'x', label: '', hour: 30, minute: -4 }]) });
    expect(list[0]).toMatchObject({ label: 'Prayer', hour: 23, minute: 0 });
    expect(parseReminders({ [SETTINGS_KEY]: '{not json' })).toEqual([]);
  });

  it('adds only the daily prayers that are missing, by name', () => {
    const existing = [{ id: '1', label: 'asr', hour: 16, minute: 0, enabled: true }];
    const next = addFiveDailyPrayers(existing);
    expect(next).toHaveLength(5);
    expect(next.filter(r => r.label.toLowerCase() === 'asr')).toHaveLength(1);
    expect(hasAllFiveDailyPrayers(next)).toBe(true);
  });

  it('never exceeds the native alarm slot limit', () => {
    const many = Array.from({ length: MAX_PRAYER_REMINDERS }, (_, i) => ({ id: String(i), label: `R${i}`, hour: i, minute: 0, enabled: true }));
    expect(addFiveDailyPrayers(many)).toHaveLength(MAX_PRAYER_REMINDERS);
  });

  it('formats and sorts times', () => {
    expect(formatTime(5, 7)).toBe('05:07');
    expect(sortReminders([
      { id: '1', label: 'b', hour: 13, minute: 0, enabled: true },
      { id: '2', label: 'a', hour: 4, minute: 59, enabled: true },
    ])[0].label).toBe('a');
  });
});
