import { chartBuckets, focusWithin, percentChange, previousRange, sessionInterval, countSessionsWithin, dayStarts } from '../../src/services/stats/statsMath';

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => Math.floor(new Date(y, mo, d, h, mi).getTime() / 1000);
const done = (start: number, sec: number) => ({ startTime: start, endTime: start + sec, durationSec: sec, endedVia: 'nfc' });

describe('sessionInterval', () => {
  it('ignores sessions that failed to start', () => {
    expect(sessionInterval({ startTime: 100, endTime: 200, durationSec: 100, endedVia: 'start_failed' }, 1000)).toBeNull();
  });

  it('runs a live session up to now', () => {
    expect(sessionInterval({ startTime: 100, endTime: null, durationSec: null, endedVia: null }, 400)).toEqual({ start: 100, end: 400 });
  });
});

describe('splitting focus across boundaries', () => {
  const now = at(2026, 9, 10, 12);

  it('splits an overnight session between the two days', () => {
    const overnight = done(at(2026, 9, 9, 23), 2 * 3600); // 11pm–1am
    const today = at(2026, 9, 10);
    expect(focusWithin([overnight], today - 86400, today, now)).toBe(3600);
    expect(focusWithin([overnight], today, today + 86400, now)).toBe(3600);
  });

  it('puts evening sessions on the day chart (it used to stop at 6pm)', () => {
    const evening = done(at(2026, 9, 10, 21), 3600);
    const buckets = chartBuckets('day', at(2026, 9, 10, 23));
    const nine = buckets.find(b => b.label === '9p')!;
    expect(buckets).toHaveLength(8);
    expect(focusWithin([evening], nine.start, nine.end, at(2026, 9, 10, 23))).toBe(3600);
  });

  it('counts a session once even when it spans two buckets', () => {
    const s = done(at(2026, 9, 10, 8), 2 * 3600); // 8–10am spans 6a and 9a blocks
    expect(countSessionsWithin([s], at(2026, 9, 10), at(2026, 9, 11), now)).toBe(1);
  });
});

describe('chartBuckets', () => {
  it('uses real 7-day spans for the month instead of a ten-day "W4"', () => {
    expect(chartBuckets('month', at(2026, 9, 10)).map(b => b.label)).toEqual(['1–7', '8–14', '15–21', '22–28', '29–31']);
  });

  it('ends the week on today', () => {
    const week = chartBuckets('week', at(2026, 9, 10, 9)); // Saturday 10 Oct 2026
    expect(week).toHaveLength(7);
    expect(week[6].label).toBe('S');
  });

  it('counts month days up to today only', () => {
    expect(dayStarts('month', at(2026, 9, 10, 9))).toHaveLength(10);
  });
});

describe('comparisons', () => {
  it('compares today so far with yesterday up to the same time', () => {
    const start = at(2026, 9, 10);
    const now = at(2026, 9, 10, 10);
    expect(previousRange('day', start, now)).toEqual({ start: start - 86400, end: start - 86400 + 10 * 3600 });
  });

  it('compares month-to-date with the same number of days last month', () => {
    const start = at(2026, 9, 1);
    const prev = previousRange('month', start, at(2026, 9, 10));
    expect(prev).toEqual({ start: at(2026, 8, 1), end: at(2026, 8, 10) });
  });

  it('returns no percentage when there is nothing to compare against', () => {
    expect(percentChange(300, 0)).toBeNull();
    expect(percentChange(300, 200)).toBe(50);
  });
});
