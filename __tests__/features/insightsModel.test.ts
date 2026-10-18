import { buildInsights, deltaText, formatDuration, periodWindow } from '../../src/features/insightsModel';

const at = (d: number, h = 0, m = 0) => Math.floor(new Date(2026, 9, d, h, m).getTime() / 1000);
const NOW = at(12, 15);   // Monday 12 Oct 2026, 3pm — the design's example week

const session = (start: number, minutes: number, extra: Partial<{ routineType: string; outcome: 'done' | 'partial' | 'not_done' | null; endedVia: string }> = {}) => ({
  startTime: start,
  endTime: start + minutes * 60,
  durationSec: minutes * 60,
  endedVia: extra.endedVia ?? 'nfc',
  routineType: extra.routineType ?? 'study',
  outcome: extra.outcome ?? null,
});

describe('insights periods', () => {
  it('labels the current week the way the design does', () => {
    const w = periodWindow('week', 0, NOW);
    expect(w.label).toBe('6 – 12 October');
    expect(w.isCurrent).toBe(true);
    expect(w.start).toBe(at(6));
    expect(w.end).toBe(NOW);
  });

  it('steps back a whole period, across month boundaries', () => {
    expect(periodWindow('week', -1, NOW).label).toBe('29 Sep – 5 Oct');
    expect(periodWindow('day', 0, NOW).label).toBe('Today, 12 October');
    expect(periodWindow('day', -1, NOW).label).toBe('Yesterday, 11 October');
    expect(periodWindow('month', -1, NOW).label).toBe('September 2026');
    expect(periodWindow('month', -1, NOW).end).toBe(Math.floor(new Date(2026, 8, 30, 23, 59, 59).getTime() / 1000));
  });

  it('formats durations like the design', () => {
    expect(formatDuration(220 * 60)).toBe('3h 40m');
    expect(formatDuration(50 * 60)).toBe('50m');
    expect(formatDuration(120 * 60)).toBe('2h');
  });

  it('compares with the last period in minutes, signed', () => {
    expect(deltaText(220 * 60, 160 * 60, 'week', true)).toBe('+38% vs last week');
    expect(deltaText(24 * 3600, 20 * 3600, 'month', true, 'September')).toBe('+4h vs September');
    expect(deltaText(77 * 60, 65 * 60, 'day', true)).toBe('+12m vs yesterday');
    expect(deltaText(60, 0, 'week', true)).toBe('no focus last week');
  });
});

describe('insights view', () => {
  const sessions = [
    session(at(7, 9), 120, { routineType: 'study', outcome: 'done' }),
    session(at(9, 10), 60, { routineType: 'work', outcome: 'not_done' }),
    session(at(12, 9), 50, { routineType: 'study', outcome: 'done' }),
    session(at(11, 9), 30, { endedVia: 'start_failed' }),
  ];
  const view = buildInsights('week', 0, NOW, sessions, [session(at(1, 9), 180)]);

  it('totals focus, ignoring sessions that never started', () => {
    expect(view.focusSec).toBe(230 * 60);
    expect(view.sessions).toBe(3);
    expect(view.deltaText).toBe('+28% vs last week');
  });

  it('highlights today in the current week', () => {
    expect(view.bars).toHaveLength(7);
    const today = view.bars[6];
    expect(today).toMatchObject({ label: 'M', highlight: true, value: 50 * 60 });
    expect(view.bars.filter(b => b.highlight)).toHaveLength(1);
  });

  it('counts only graded rituals as outcomes', () => {
    expect(view.outcomes).toEqual({ finished: 2, recorded: 3 });
  });

  it('splits time by ritual, largest first', () => {
    expect(view.rituals.map(r => r.label)).toEqual(['Study', 'Work']);
    expect(view.rituals[0].share).toBeCloseTo(170 / 230, 3);
  });
});
