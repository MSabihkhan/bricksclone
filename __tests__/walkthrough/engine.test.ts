import { markSeen, nextVisibleStep, parseSeen, shouldShow, tooltipSide, Tour, visibleStepCount } from '../../src/walkthrough/engine';
import { TOURS } from '../../src/walkthrough/tours';

const tour: Tour = {
  id: 't',
  version: 2,
  steps: [
    { target: 'a', title: 'A', body: '' },
    { target: 'gone', title: 'B', body: '' },
    { target: 'c', title: 'C', body: '' },
  ],
};
const viewport = { width: 400, height: 800 };
const rects = { a: { x: 0, y: 10, width: 100, height: 40 }, c: { x: 0, y: 600, width: 100, height: 40 } };

describe('walkthrough engine', () => {
  it('skips a step whose target is no longer on screen instead of breaking', () => {
    expect(nextVisibleStep(tour, 0, rects, viewport)).toBe(0);
    expect(nextVisibleStep(tour, 1, rects, viewport)).toBe(2);
    expect(nextVisibleStep(tour, 3, rects, viewport)).toBe(-1);
    expect(visibleStepCount(tour, rects, viewport)).toBe(2);
  });

  it('treats a target scrolled out of view as missing', () => {
    expect(nextVisibleStep(tour, 2, { c: { x: 0, y: 900, width: 100, height: 40 } }, viewport)).toBe(-1);
  });

  it('shows a tour again only when its version goes up', () => {
    expect(shouldShow(tour, {})).toBe(true);
    const seen = markSeen(tour, {});
    expect(shouldShow(tour, seen)).toBe(false);
    expect(shouldShow({ ...tour, version: 3 }, seen)).toBe(true);
  });

  it('survives corrupt stored state', () => {
    expect(parseSeen('{oops')).toEqual({});
    expect(parseSeen('{"home":1,"bad":"x"}')).toEqual({ home: 1 });
  });

  it('places the tooltip on the roomier side', () => {
    expect(tooltipSide({ x: 0, y: 50, width: 10, height: 10 }, 800)).toBe('below');
    expect(tooltipSide({ x: 0, y: 700, width: 10, height: 10 }, 800)).toBe('above');
  });

  it('keeps every shipped tour well-formed', () => {
    for (const t of Object.values(TOURS)) {
      expect(t.version).toBeGreaterThan(0);
      expect(t.steps.length).toBeGreaterThan(0);
      for (const step of t.steps) expect(step.target).toMatch(/^[a-z]+\.[A-Za-z]+$/);
    }
  });
});
