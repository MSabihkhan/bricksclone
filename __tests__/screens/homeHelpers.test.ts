import { formatToday, greetingFor, initialsFor, relativeTime } from '../../src/screens/homeHeaderModel';

describe('Home header helpers', () => {
  it('formats the date as weekday, month day', () => {
    expect(formatToday(new Date(2026, 7, 8))).toBe('Saturday, Aug 8');
  });

  it('picks the greeting from the hour', () => {
    expect(greetingFor(new Date(2026, 7, 8, 7))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 7, 8, 13))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 7, 8, 21))).toBe('Good evening');
  });

  it('derives avatar initials, falling back to the app mark', () => {
    expect(initialsFor('Alex Kim')).toBe('AK');
    expect(initialsFor('alex')).toBe('AL');
    expect(initialsFor('  ')).toBe('B');
  });

  it('renders relative times for blocked attempts', () => {
    const now = 1_000_000;
    expect(relativeTime(now - 10, now)).toBe('just now');
    expect(relativeTime(now - 120, now)).toBe('2m ago');
    expect(relativeTime(now - 7200, now)).toBe('2h ago');
    expect(relativeTime(now - 172800, now)).toBe('2d ago');
  });
});
