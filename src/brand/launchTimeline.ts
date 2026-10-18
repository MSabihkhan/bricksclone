/**
 * Launch animation 2c, "the gap": the red f and full stop start touching, move apart while a
 * measuring line marks the distance between them, the gap fills in to spell fasla, and the
 * Urdu فاصلہ settles underneath. Timings (ms) are copied from the approved design file
 * ("Fasla App Launch", variant 2c); only the final hold is shortened, since the app is waiting.
 */

export type Easing = (x: number) => number;

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid; else hi = mid;
    }
    return by((lo + hi) / 2);
  };
}

export const EASE_OUT = cubicBezier(0, 0, 0.58, 1);            // CSS 'ease-out'
export const EASE_GAP = cubicBezier(0.65, 0, 0.35, 1);         // design's E
export const EASE_LETTER = cubicBezier(0.2, 0.8, 0.2, 1);

export const LAUNCH = {
  rowIn: [0, 400] as const,          // row fades in, scale .96 -> 1
  gap: [650, 1450] as const,         // f and full stop move apart
  lineIn: [800, 1000] as const,      // measuring line appears...
  lineOut: [1550, 1800] as const,    // ...and goes once the gap is measured
  letterStart: (i: number) => 1600 + i * 90,
  letterDuration: 380,
  urdu: [2250, 2650] as const,
  /** Everything has settled at 2650; hold briefly, then hand over to the app. */
  done: 2900,
  /** With "Remove animations" on, the finished frame shows for this long instead. */
  stillHold: 700,
};

export interface Track { inputRange: number[]; outputRange: number[] }

/**
 * One eased segment as a piecewise-linear track. Native-driver interpolation can't run JS easing
 * functions, so the curve is sampled into points; with `extrapolate: 'clamp'` it holds before/after.
 */
export function segment(t0: number, t1: number, from: number, to: number, ease: Easing = x => x, samples = 12): Track {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = i / samples;
    inputRange.push(t0 + (t1 - t0) * p);
    outputRange.push(from + (to - from) * ease(p));
  }
  return { inputRange, outputRange };
}
