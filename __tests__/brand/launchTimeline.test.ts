import { cubicBezier, EASE_GAP, LAUNCH, segment } from '../../src/brand/launchTimeline';

describe('launch animation 2c timeline', () => {
  it('matches CSS cubic-bezier at the ends and is monotonic', () => {
    const ease = cubicBezier(0.65, 0, 0.35, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5, 2);          // symmetric curve
    let last = 0;
    for (let x = 0.05; x <= 1; x += 0.05) { const y = ease(x); expect(y).toBeGreaterThanOrEqual(last); last = y; }
  });

  it('samples a segment into an increasing input range with exact endpoints', () => {
    const tr = segment(650, 1450, 40, 0, EASE_GAP);
    expect(tr.inputRange[0]).toBe(650);
    expect(tr.inputRange[tr.inputRange.length - 1]).toBe(1450);
    expect(tr.outputRange[0]).toBe(40);
    expect(tr.outputRange[tr.outputRange.length - 1]).toBe(0);
    tr.inputRange.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(tr.inputRange[i]));
  });

  it('plays in the designed order: row, gap opens, line, letters, Urdu, then hands over', () => {
    expect(LAUNCH.rowIn[1]).toBeLessThanOrEqual(LAUNCH.gap[0]);
    expect(LAUNCH.lineIn[0]).toBeGreaterThan(LAUNCH.gap[0]);
    expect(LAUNCH.letterStart(0)).toBeGreaterThan(LAUNCH.gap[1]);
    expect(LAUNCH.letterStart(3) + LAUNCH.letterDuration).toBeLessThanOrEqual(LAUNCH.urdu[1]);
    expect(LAUNCH.done).toBeGreaterThan(LAUNCH.urdu[1]);
    expect(LAUNCH.done).toBeLessThan(3400);            // never longer than the design file
  });
});
