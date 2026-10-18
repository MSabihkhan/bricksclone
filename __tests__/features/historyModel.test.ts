import { historyRows, whenLabel } from '../../src/features/historyModel';

const at = (d: number, h = 0, m = 0) => Math.floor(new Date(2026, 9, d, h, m).getTime() / 1000);
const NOW = at(12, 15);

const s = (id: number, start: number, minutes: number, extra: Record<string, unknown> = {}) => ({
  id, tagId: 'a', startTime: start, endTime: start + minutes * 60, durationSec: minutes * 60,
  endedVia: 'nfc', routineType: 'study', intention: null, outcome: null, ...extra,
}) as Parameters<typeof historyRows>[0][number];

describe('history', () => {
  it('labels when a session started', () => {
    expect(whenLabel(at(12, 11, 20), NOW)).toBe('Today, 11:20');
    expect(whenLabel(at(11, 21, 5), NOW)).toBe('Yesterday, 21:05');
    expect(whenLabel(at(5, 9), NOW)).toBe('Mon 5 Oct, 09:00');
  });

  it('lists finished sessions newest first, like the design', () => {
    const rows = historyRows([
      s(1, at(11, 9), 50, { intention: 'Chapter 4 notes', outcome: 'done' }),
      s(2, at(12, 11, 20), 25, { endedVia: 'override' }),
      s(3, at(12, 13), 10, { endedVia: 'start_failed' }),
      s(4, at(12, 14), 0, { endTime: null }),
    ], { a: 'Desk' }, NOW);
    expect(rows.map(r => r.id)).toEqual([2, 1]);
    expect(rows[0]).toMatchObject({ title: 'Study session', meta: 'Study · Desk · Today, 11:20', dur: '25m', done: false });
    expect(rows[1]).toMatchObject({ title: 'Chapter 4 notes', dur: '50m', done: true });
  });
});
