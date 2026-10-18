import { computeStreakDays, getPeriodStats, getFocusBars, getTopBlocked, startOfDay, endOfDay, dayKey, shiftDays, periodRange, getTodayStats, getPeriodComparison, getCompletionByMode, getBestDay, getAvgSessionSec } from '../../src/services/stats/statsService';
import { db } from '../../src/db';

const mockQuery = jest.fn();

jest.mock('../../src/db', () => ({
  db: {
    sessions: {
      sessionsBetween: jest.fn(),
      sessionsOverlapping: jest.fn(),
      listSessions: jest.fn(),
    },
    tags: {
      getTagById: jest.fn(),
    },
    getDriver: jest.fn(() => ({
      query: mockQuery,
    })),
    settings: {
      get: jest.fn(),
    }
  }
}));

describe('statsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('date helpers', () => {
    it('startOfDay and endOfDay', () => {
      const ts = 1672574400; // 2023-01-01T12:00:00Z
      const start = startOfDay(ts);
      const end = endOfDay(ts);
      const ds = new Date(start * 1000);
      const de = new Date(end * 1000);
      expect(ds.getHours()).toBe(0);
      expect(ds.getMinutes()).toBe(0);
      expect(de.getHours()).toBe(23);
      expect(de.getMinutes()).toBe(59);
    });
    
    it('dayKey formats correctly', () => {
      const d = new Date(2023, 5, 15); // Month is 0-indexed, so 5 is June
      expect(dayKey(d)).toBe('2023-5-15');
    });

    it('shiftDays shifts correctly', () => {
      const d = new Date(2023, 0, 10, 12, 0, 0);
      const shifted = shiftDays(Math.floor(d.getTime() / 1000), 2);
      expect(new Date(shifted * 1000).getDate()).toBe(12);
    });

    it('periodRange boundaries', () => {
      const dayRange = periodRange('day');
      expect(dayRange.start).toBeLessThanOrEqual(dayRange.end);
      const weekRange = periodRange('week');
      expect(weekRange.start).toBeLessThan(dayRange.start);
      const monthRange = periodRange('month');
      expect(monthRange.start).toBeLessThanOrEqual(dayRange.start);
    });
  });

  describe('getPeriodStats', () => {
    it('sums sessions + attempts, calculates streak and goalPct capped', async () => {
      const now = Math.floor(Date.now() / 1000);
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { id: 1, startTime: now - 3600, durationSec: 1800, strict: 0, apps: [] },
        { id: 2, startTime: now - 7200, durationSec: 1800, strict: 0, apps: [] }
      ]);
      mockQuery.mockResolvedValue([{ count: 5 }]);
      (db.settings.get as jest.Mock).mockResolvedValue('1800'); // goal 30 mins (1800s) -> focus 3600 -> capped 100%
      
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const todayUnix = Math.floor(today.getTime() / 1000);
      const yesterdayUnix = Math.floor(yesterday.getTime() / 1000);
      (db.sessions.listSessions as jest.Mock).mockResolvedValue([
        { id: 1, startTime: todayUnix, endedVia: 'nfc', durationSec: 1800 },
        { id: 2, startTime: yesterdayUnix, endedVia: 'timer', durationSec: 1800 }
      ]);

      const stats = await getPeriodStats('day');
      expect(stats.focusSec).toBe(3600);
      expect(stats.sessions).toBe(2);
      expect(stats.blocked).toBe(5);
      expect(stats.streakDays).toBe(2);
      expect(stats.goalPct).toBe(100);
      expect(stats.consistencyPct).toBe(100); // 1 day in period, 1 day with session
    });
  });

  describe('getFocusBars', () => {
    it('returns 8 three-hour buckets for the full day, sets isMax on highest', async () => {
      // Pinned: the day chart only covers time up to "now", so a real clock before 10am would
      // leave these 10am sessions in the future.
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 10, 15));
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      const unix10am = Math.floor(today.getTime() / 1000);
      
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { id: 1, startTime: unix10am, durationSec: 1200 },
        { id: 2, startTime: unix10am, durationSec: 600 }
      ]);
      
      const bars = await getFocusBars('day');
      expect(bars).toHaveLength(8);
      // 10am falls in the 9a block (index 3); both sessions overlap there in full
      expect(bars[3].label).toBe('9a');
      expect(bars[3].value).toBe(1800);
      expect(bars[3].isMax).toBe(true);
      expect(bars[0].isMax).toBe(false);
      jest.useRealTimers();
    });
    
    it('returns 7 buckets for week', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([]);
      const bars = await getFocusBars('week');
      expect(bars).toHaveLength(7);
    });

    it('returns real 7-day spans for the month', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([]);
      const bars = await getFocusBars('month');
      expect(bars[0].label).toBe('1–7');
      expect(bars.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getTopBlocked', () => {
    it('groups and orders limited items', async () => {
      mockQuery.mockResolvedValue([
        { label: 'Instagram', count: 10 },
        { label: 'TikTok', count: 5 }
      ]);
      const top = await getTopBlocked('week', 2);
      expect(top).toHaveLength(2);
      expect(top[0].name).toBe('Instagram');
      expect(top[0].count).toBe(10);
    });
  });

  describe('getTodayStats', () => {
    it('calculates today stats correctly', async () => {
      const now = Math.floor(Date.now() / 1000);
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { id: 1, startTime: now - 3600, durationSec: 1800 }
      ]);
      mockQuery.mockResolvedValue([{ count: 3 }]);
      (db.settings.get as jest.Mock).mockResolvedValue('3600');
      (db.sessions.listSessions as jest.Mock).mockResolvedValue([
        { id: 1, startTime: now, endedVia: 'nfc', durationSec: 1800 }
      ]);
      const stats = await getTodayStats();
      expect(stats.focusSec).toBe(1800);
      expect(stats.blocked).toBe(3);
      expect(stats.goalPct).toBe(50);
      expect(stats.streakDays).toBe(1);
    });
  });

  describe('getPeriodComparison', () => {
    // Fixed clock: 3pm, so "today so far" is 15 hours long.
    const at = (d: number, h: number) => Math.floor(new Date(2026, 9, d, h).getTime() / 1000);
    beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date(2026, 9, 10, 15)); });
    afterEach(() => { jest.useRealTimers(); });

    it('compares today so far with yesterday up to the same time', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { startTime: at(10, 9), durationSec: 200, endTime: at(10, 9) + 200, endedVia: 'nfc' },
        { startTime: at(9, 9), durationSec: 100, endTime: at(9, 9) + 100, endedVia: 'nfc' },
        // Yesterday evening is after "now" on yesterday's clock, so it must not count.
        { startTime: at(9, 20), durationSec: 5000, endTime: at(9, 20) + 5000, endedVia: 'nfc' },
      ]);
      const cmp = await getPeriodComparison('day');
      expect(cmp.focusSec).toBe(200);
      expect(cmp.prevFocusSec).toBe(100);
      expect(cmp.deltaPct).toBe(100);
    });

    it('gives no percentage when the previous period had no focus', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { startTime: at(10, 9), durationSec: 200, endTime: at(10, 9) + 200, endedVia: 'nfc' },
      ]);
      expect((await getPeriodComparison('day')).deltaPct).toBeNull();
    });

    it('gives no percentage when both periods are empty', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([]);
      expect((await getPeriodComparison('day')).deltaPct).toBeNull();
    });
  });

  describe('getCompletionByMode', () => {
    it('groups by mode and calculates pct', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { tagId: 't1', endedVia: 'override', durationSec: 600, endTime: 123 },
        { tagId: 't1', endedVia: 'nfc', durationSec: 600, endTime: 456 },
        { tagId: 't2', endedVia: 'timer', durationSec: 300, endTime: 456 }
      ]);
      (db.tags.getTagById as jest.Mock).mockImplementation((id) => {
        if (id === 't1') return Promise.resolve({ mode: 'deep' });
        if (id === 't2') return Promise.resolve({ mode: 'wind' });
        return Promise.resolve(null);
      });
      const res = await getCompletionByMode('week');
      expect(res).toHaveLength(2);
      const deep = res.find(r => r.mode === 'deep');
      expect(deep?.total).toBe(2);
      expect(deep?.completed).toBe(1);
      expect(deep?.pct).toBe(50);
      
      const wind = res.find(r => r.mode === 'wind');
      expect(wind?.total).toBe(1);
      expect(wind?.completed).toBe(1);
      expect(wind?.pct).toBe(100);
    });
  });

  describe('getBestDay', () => {
    it('returns max day and minutes', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 9, 10, 15));
      const todayUnix = Math.floor(new Date(2026, 9, 10, 9).getTime() / 1000);
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { startTime: todayUnix, durationSec: 1200 },
        { startTime: todayUnix - 86400 * 2, durationSec: 600 }
      ]);
      const best = await getBestDay('week');
      expect(best?.label).toBe('Today');
      expect(best?.minutes).toBe(20);
      jest.useRealTimers();
    });

    it('returns null when no sessions', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([]);
      const best = await getBestDay('week');
      expect(best).toBeNull();
    });
  });

  describe('getAvgSessionSec', () => {
    it('calculates average for ended sessions', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([
        { durationSec: 600, endedVia: 'nfc', startTime: 0, endTime: 600 },
        { durationSec: 1200, endedVia: 'timer', startTime: 0, endTime: 1200 },
        { durationSec: null, endedVia: null, startTime: 0, endTime: null }
      ]);
      const avg = await getAvgSessionSec('week');
      expect(avg).toBe(900);
    });
    
    it('returns 0 for no ended sessions', async () => {
      (db.sessions.sessionsOverlapping as jest.Mock).mockResolvedValue([]);
      const avg = await getAvgSessionSec('week');
      expect(avg).toBe(0);
    });
  });

  describe('computeStreakDays', () => {
    it('does not count an override as completion and breaks today streak', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(computeStreakDays([
        { startTime: now, endedVia: 'override', durationSec: 60 },
        { startTime: now - 86400, endedVia: 'nfc', durationSec: 60 },
      ])).toBe(0);
    });
  });
});
