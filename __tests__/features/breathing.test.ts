import { breathAt, breathsFor, CYCLE_MS, formatClock } from '../../src/features/breathing';

describe('breathing reset (redesign timing)', () => {
  it('runs breathe in, one more sip, let it all out — 2 s, 1 s, 4 s', () => {
    expect(breathAt(0, 2)).toMatchObject({ phase: 'inhale', cue: 'Breathe in', breath: 1 });
    expect(breathAt(2000, 2)).toMatchObject({ phase: 'topUp', cue: 'One more sip of air' });
    expect(breathAt(3000, 2)).toMatchObject({ phase: 'exhale', cue: 'Let it all out' });
    expect(breathAt(CYCLE_MS, 2)).toMatchObject({ phase: 'inhale', breath: 2 });
    expect(CYCLE_MS).toBe(7000);
  });

  it('grows the circle in, tops it up, then empties it', () => {
    expect(breathAt(0, 2).scale).toBeCloseTo(0.55, 2);
    expect(breathAt(2000, 2).scale).toBeCloseTo(0.85, 2);
    expect(breathAt(3000, 2).scale).toBeCloseTo(1, 2);
    expect(breathAt(6999, 2).scale).toBeCloseTo(0.55, 1);
  });

  it('fits whole breaths into the chosen minutes', () => {
    expect(breathsFor(1)).toBe(9);
    expect(breathsFor(2)).toBe(17);
    expect(breathsFor(5)).toBe(43);
  });

  it('ends after the last full breath out', () => {
    const end = breathsFor(1) * CYCLE_MS;
    expect(breathAt(end - 1, 1).done).toBe(false);
    expect(breathAt(end, 1).done).toBe(true);
  });

  it('shows time left as m:ss', () => {
    expect(breathAt(0, 2).secondsLeft).toBe(120);
    expect(formatClock(112)).toBe('1:52');
  });
});
